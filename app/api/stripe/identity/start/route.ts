import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrigin } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

// Starts (or resumes) a Stripe Identity verification session for the
// logged-in host and redirects to Stripe's hosted verification page.
export async function GET() {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(new URL("/login", getOrigin()));
  }

  const { limited } = await checkRateLimit(supabase, user.id, "stripe_identity_start", 5, 3600);
  if (limited) {
    return NextResponse.json(
      { error: "Too many verification attempts. Please try again later." },
      { status: 429 }
    );
  }

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id, identity_status, stripe_identity_session_id")
    .eq("user_id", user.id)
    .single();

  if (!companion) {
    return NextResponse.json({ error: "Companion profile not found" }, { status: 404 });
  }

  const origin = getOrigin();

  if (companion.identity_status === "verified") {
    return NextResponse.redirect(new URL("/companion/verification", origin));
  }

  // Resume an in-flight session when possible so retries (blurry photo,
  // wrong document) continue where the host left off.
  if (companion.stripe_identity_session_id) {
    try {
      const existing = await stripe.identity.verificationSessions.retrieve(
        companion.stripe_identity_session_id
      );
      if (
        (existing.status === "requires_input" || existing.status === "processing") &&
        existing.url
      ) {
        return NextResponse.redirect(existing.url);
      }
    } catch {
      // Session expired or unretrievable — fall through and create a new one
    }
  }

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata: {
      user_id: user.id,
      companion_id: companion.id,
    },
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
    return_url: `${origin}/companion/verification?complete=1`,
  });

  await supabase
    .from("companion_profiles")
    .update({
      stripe_identity_session_id: session.id,
      identity_status: "pending",
    })
    .eq("id", companion.id);

  if (!session.url) {
    return NextResponse.json({ error: "Could not start verification" }, { status: 502 });
  }
  return NextResponse.redirect(session.url);
}
