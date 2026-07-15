import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrigin } from "@/lib/stripe";

export const runtime = "nodejs";

export async function GET() {
  const origin = getOrigin();
  const stripe = getStripe();

  if (!stripe) {
    return NextResponse.redirect(`${origin}/account/settings?stripe_connect=error`);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(`${origin}/login`);
  }

  const { data: companion } = await supabase
    .from("host_profiles")
    .select("id, stripe_account_id")
    .eq("user_id", user.id)
    .single();

  if (!companion?.stripe_account_id) {
    return NextResponse.redirect(`${origin}/account/settings?stripe_connect=error`);
  }

  try {
    const account = await stripe.accounts.retrieve(companion.stripe_account_id);

    if (account.details_submitted) {
      // Update account status to reflect onboarding is complete
      await supabase
        .from("host_profiles")
        .update({ stripe_account_status: "active" })
        .eq("id", companion.id);
    }
  } catch {
    // If retrieval fails we still redirect to settings — the account ID is stored
  }

  return NextResponse.redirect(`${origin}/account/settings?stripe_connect=success`);
}
