import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getEvents } from "@/app/actions/events";
import { EventsList } from "./events-list";

export const metadata = { title: "Events — EliteSeek" };

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
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1
            className="text-3xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Events
          </h1>
          <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Discover and join exclusive experiences
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/events/join"
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white/60 hover:border-[rgba(212,175,55,0.3)] hover:text-white/80 transition-colors"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Enter Code
          </Link>
          <Link
            href="/events/create"
            className="rounded-xl bg-[#d4af37] px-4 py-2 text-sm font-semibold text-black hover:bg-[#c9a432] transition-colors"
            style={{ fontFamily: "var(--font-dm-sans)" }}
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
