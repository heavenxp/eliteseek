import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanionOnboarding } from "@/components/onboarding/companion-onboarding";

export const metadata = { title: "Set Up Your Profile — EliteSeek" };

export default async function CompanionOnboardingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "companion") redirect("/onboarding/client");

  const { data: companion } = await supabase
    .from("host_profiles")
    .select(
      "display_name, age, location, tagline, bio, tags, languages, subscription_price, booking_rate_hourly, profile_unlock_fee, tip_menu, visibility, is_available"
    )
    .eq("user_id", user.id)
    .single();

  return (
    <CompanionOnboarding
      fullName={profile.full_name}
      initialData={companion ?? {}}
    />
  );
}
