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
    <div className="mx-auto max-w-xl px-4 py-8 md:px-6 md:py-12">
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
            What&apos;s alive right now ·{" "}
            <Link href="/events/all" className="text-gold hover:text-gold-light">all events</Link>
          </p>
        </div>
        <div className="flex gap-2">
          <Link
            href="/events/join"
            className="rounded-xl border border-white/[0.1] px-4 py-2 text-sm text-white/60 transition-colors hover:border-white/20 hover:text-white/80"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Enter Code
          </Link>
          <Link
            href="/events/create"
            className="rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-black transition-colors hover:bg-gold-light"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            + Create
          </Link>
        </div>
      </div>

      {/* Feed */}
      {feed.length === 0 ? (
        <div className="flex flex-col items-center gap-4 py-24 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <Icon name="calendar" className="h-6 w-6 text-muted/40" />
          </div>
          <p className="text-xl font-light text-foreground/60" style={{ fontFamily: "var(--font-cormorant)" }}>
            Nothing coming up yet
          </p>
          <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Be the first — host something small.
          </p>
          <Link
            href="/events/create"
            className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Create an event
          </Link>
        </div>
      ) : (
        <div className="space-y-5">
          {feed.map((event) => (
            <PulseCard key={event.id} event={event} now={now} />
          ))}
        </div>
      )}
    </div>
  );
}
