import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings — EliteSeek" };

export default async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, phone, avatar_url, searchable")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  let companion = null;
  if (profile.role === "companion") {
    const { data } = await supabase
      .from("companion_profiles")
      .select(`
        id, visibility, profile_unlock_fee, subscription_price,
        booking_rate_hourly, bio, tagline, location, is_available,
        cover_image_url, stripe_account_id
      `)
      .eq("user_id", user.id)
      .single();
    companion = data;
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8">
        <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Settings
        </h1>
        <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Manage your profile and account preferences
        </p>
      </div>

      <SettingsForm
        role={profile.role as "companion" | "client"}
        companion={companion}
        clientFullName={profile.full_name}
        clientPhone={profile.phone}
        avatarUrl={profile.avatar_url}
        searchable={profile.searchable ?? true}
      />
    </div>
  );
}
