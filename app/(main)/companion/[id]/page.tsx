import { notFound, redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";

export default async function CompanionProfileRedirect({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const { data } = await createAdminClient()
    .from("host_profiles")
    .select("username")
    .eq("id", id)
    .maybeSingle();

  if (!data) notFound();
  if (!data.username) notFound();

  redirect(`/profile/${data.username}`);
}
