import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppShell } from "@/components/layout/app-shell";
import { PresenceTracker } from "@/components/layout/presence-tracker";

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role, avatar_url")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  let companionUsername: string | null = null;
  if (profile.role === "companion") {
    const { data: cp } = await supabase
      .from("host_profiles")
      .select("username")
      .eq("user_id", user.id)
      .maybeSingle();
    companionUsername = cp?.username ?? null;
  }

  return (
    <div className="page-bg min-h-screen">
      <PresenceTracker />
      <AppShell
        user={{
          fullName: profile.full_name,
          role: profile.role as "companion" | "client",
          avatarUrl: profile.avatar_url,
          username: companionUsername,
        }}
      >
        {children}
      </AppShell>
    </div>
  );
}
