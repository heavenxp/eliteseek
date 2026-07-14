import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrigin } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";
import type Stripe from "stripe";

export const runtime = "nodejs";

// Starts (or resumes) a Stripe Identity verification session for the
// logged-in user and redirects to Stripe's hosted verification page.
// Hosts: gates profile visibility. Clients: gates booking only.
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

  const origin = getOrigin();

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id, identity_status, stripe_identity_session_id")
    .eq("user_id", user.id)
    .maybeSingle();

  const isHost = !!companion;
  const returnPath = isHost ? "/companion/verification" : "/account/verification";

  // Existing status + resumable session id per role
  let existingSessionId: string | null;
  if (isHost) {
    if (companion.identity_status === "verified") {
      return NextResponse.redirect(new URL(returnPath, origin));
    }
    existingSessionId = companion.stripe_identity_session_id;
  } else {
    const { data: profile } = await supabase
      .from("profiles")
      .select("kyc_status, kyc_session_id")
      .eq("id", user.id)
      .single();
    if (!profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 });
    }
    if (profile.kyc_status === "verified") {
      return NextResponse.redirect(new URL(returnPath, origin));
    }
    existingSessionId = profile.kyc_session_id;
  }

  // Resume an in-flight session when possible so retries (blurry photo,
  // wrong document) continue where the user left off.
  if (existingSessionId) {
    try {
      const existing = await stripe.identity.verificationSessions.retrieve(existingSessionId);
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

  const metadata: Stripe.MetadataParam = { user_id: user.id };
  if (isHost) metadata.companion_id = companion.id;

  const session = await stripe.identity.verificationSessions.create({
    type: "document",
    metadata,
    options: {
      document: {
        require_matching_selfie: true,
      },
    },
    return_url: `${origin}${returnPath}?complete=1`,
  });

  if (isHost) {
    await supabase
      .from("companion_profiles")
      .update({
        stripe_identity_session_id: session.id,
        identity_status: "pending",
      })
      .eq("id", companion.id);
  }

  // profiles.kyc_status is the client-side truth and the admin-facing
  // mirror for hosts; kyc_session_id lets the webhook match client sessions.
  await supabase
    .from("profiles")
    .update({ kyc_status: "pending", kyc_session_id: session.id })
    .eq("id", user.id);

  if (!session.url) {
    return NextResponse.json({ error: "Could not start verification" }, { status: 502 });
  }
  return NextResponse.redirect(session.url);
}
