import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { GuestLanding } from "@/components/landing/landing-page";

export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/feed");
  return <GuestLanding />;
}
