import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ClientOnboarding } from "@/components/onboarding/client-onboarding";

export const metadata = { title: "Welcome to EliteSeek" };

export default async function ClientOnboardingPage() {
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

  if (profile?.role !== "client") redirect("/onboarding/companion");

  const { data: clientProfile } = await supabase
    .from("profiles")
    .select("membership_tier")
    .eq("id", user.id)
    .single();

  const existingInterests =
    (user.user_metadata?.interests as string[] | undefined) ?? [];
  const existingCity = (user.user_metadata?.city as string | undefined) ?? "";

  return (
    <ClientOnboarding
      fullName={profile.full_name}
      currentTier={clientProfile?.membership_tier ?? "bronze"}
      existingInterests={existingInterests}
      existingCity={existingCity}
    />
  );
}
