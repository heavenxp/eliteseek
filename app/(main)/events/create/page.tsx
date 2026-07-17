import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CreateEventForm } from "./create-event-form";

export const metadata = { title: "Create Event — EliteSeek" };

export default async function CreateEventPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  return (
    <div className="mx-auto max-w-xl px-4 py-4 md:px-6 md:py-6">
      <div className="mb-8">
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
         
        >
          Create Event
        </h1>
        <p className="mt-1 text-sm text-muted/50">
          Host a private or public experience for your guests
        </p>
      </div>
      <CreateEventForm userId={user.id} />
    </div>
  );
}
