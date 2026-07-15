"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// ── "Become a host" (PIVOT.md: host is a mode, not an identity) ──
// Anyone can upgrade: creates the host_profiles row and flips role so the
// existing host surfaces (nav, studio, bookings) light up, then routes into
// host onboarding → Identity verification → Connect payouts.
export async function becomeHost(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: existing } = await supabase
    .from("host_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!existing) {
    const { error } = await supabase
      .from("host_profiles")
      .insert({ user_id: user.id });
    if (error) redirect("/account?error=become_host");
  }

  // role still drives nav/routing until the mode-based cleanup lands
  const { error: roleError } = await supabase
    .from("profiles")
    .update({ role: "companion" })
    .eq("id", user.id);
  if (roleError) redirect("/account?error=become_host");

  redirect("/onboarding/companion");
}
