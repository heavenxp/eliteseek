import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/layout/app-nav";

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

  return (
    <div className="page-bg min-h-screen">
      <AppNav
        user={{
          fullName: profile.full_name,
          role: profile.role as "companion" | "client",
          avatarUrl: profile.avatar_url,
        }}
      />
      {/* Offset for fixed top nav on desktop, bottom nav on mobile */}
      <div className="pb-20 pt-0 md:pb-0 md:pt-[65px]">{children}</div>
    </div>
  );
}
