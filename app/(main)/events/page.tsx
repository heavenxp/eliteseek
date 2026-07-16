import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getPulseFeed } from "@/app/actions/events";
import { PulseCard } from "@/components/events/pulse-card";
import { Icon } from "@/components/icons";

export const metadata = {
  title: "Events — EliteSeek",
  description: "What's alive in Melbourne right now.",
};

// The pulse: discovery is a feed of live-feeling event cards, not a
// calendar grid (PIVOT §2). The full calendar lives at /events/all.
export default async function PulsePage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const feed = await getPulseFeed();
  const now = new Date();

  return (
    <div className="mx-auto max-w-xl px-4 py-4 md:py-6">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-foreground">Home</h1>
        <div className="flex items-center gap-3 text-sm">
          <Link href="/events/all" className="text-muted/60 transition-colors hover:text-foreground">
            All events
          </Link>
          <Link href="/events/join" className="text-muted/60 transition-colors hover:text-foreground">
            Enter code
          </Link>
        </div>
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Icon name="calendar" className="h-6 w-6 text-muted/40" />
          </div>
          <p className="text-base font-semibold text-foreground/60">
            Nothing coming up yet
          </p>
          <p className="text-sm text-muted/40">
            Be the first — host something small.
          </p>
          <Link
            href="/events/create"
            className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"

          >
            Create an event
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {feed.map((event) => (
            <PulseCard key={event.id} event={event} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
