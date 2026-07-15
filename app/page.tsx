import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

// Social-app root: signed-in → feed, signed-out → login (the front door).
export default async function Home() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  redirect(user ? "/feed" : "/login");
}
