import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrigin } from "@/lib/stripe";
import { checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

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

  const { limited } = await checkRateLimit(supabase, user.id, "stripe_connect_onboard", 3, 3600);
  if (limited) {
    return NextResponse.json(
      { error: "Too many onboarding attempts. Please try again later." },
      { status: 429 }
    );
  }

  // Verify this is a companion
  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id, stripe_account_id")
    .eq("user_id", user.id)
    .single();

  if (!companion) {
    return NextResponse.json({ error: "Companion profile not found" }, { status: 404 });
  }

  // Reuse existing account if already created
  let accountId = companion.stripe_account_id;

  if (!accountId) {
    const account = await stripe.accounts.create({
      type: "express",
      email: user.email,
    });
    accountId = account.id;

    // Persist the Stripe account ID
    await supabase
      .from("companion_profiles")
      .update({ stripe_account_id: accountId })
      .eq("id", companion.id);
  }

  const origin = getOrigin();
  const accountLink = await stripe.accountLinks.create({
    account: accountId,
    refresh_url: `${origin}/api/stripe/connect/onboard`,
    return_url: `${origin}/api/stripe/connect/return`,
    type: "account_onboarding",
  });

  return NextResponse.redirect(accountLink.url);
}
