import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/app/actions/events";
import { EventsList } from "../events-list";

export const metadata = { title: "All events — EliteSeek" };

export default async function EventsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [events, membershipsData] = await Promise.all([
    getEvents(),
    supabase.from("event_members").select("event_id").eq("user_id", user.id),
  ]);

  const joinedEventIds = (membershipsData.data ?? []).map((m) => m.event_id as string);

  return (
    <div className="mx-auto max-w-3xl px-4 py-4 md:px-6 md:py-6">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1
            className="text-xl font-bold tracking-tight text-foreground"
           
          >
            All events
          </h1>
          <p className="mt-1 text-sm text-muted/50">
            The full calendar ·{" "}
            <Link href="/events" className="text-gold hover:text-gold-light">back to the pulse</Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/events/join"
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white/60 hover:border-white/20 hover:text-white/80 transition-colors"

          >
            Enter Code
          </Link>
          <Link
            href="/events/create"
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black hover:bg-gold-light transition-colors"

          >
            + Create
          </Link>
        </div>
      </div>

      <EventsList
        events={events}
        joinedEventIds={joinedEventIds}
        currentUserId={user.id}
      />
    </div>
  );
}
