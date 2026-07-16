import Link from "next/link";
import { VerifiedBadge } from "@/components/badges/verified-badge";
import { Icon } from "@/components/icons";
import { eventStart, melbourneDayDiff, EVENT_TZ } from "@/lib/event-time";
import type { PulseEvent } from "@/app/actions/events";

// "What's alive right now" — countdown chip is the heartbeat of the card.
// All wall-clock math goes through Australia/Melbourne (lib/event-time).
export function countdownLabel(date: string, time: string, now: Date): string {
  const start = eventStart(date, time);
  const mins = Math.round((start.getTime() - now.getTime()) / 60000);
  if (mins <= 0) return "Happening now";
  if (mins < 60) return `Starts in ${mins}m`;
  if (mins < 12 * 60) return `Starts in ${Math.round(mins / 60)}h`;

  const days = melbourneDayDiff(now, start);
  const hhmm = time.slice(0, 5);
  if (days === 0) return `Tonight ${hhmm}`;
  if (days === 1) return `Tomorrow ${hhmm}`;
  if (days < 7)
    return `${start.toLocaleDateString("en-AU", { weekday: "long", timeZone: EVENT_TZ })} ${hhmm}`;
  return start.toLocaleDateString("en-AU", { day: "numeric", month: "short", timeZone: EVENT_TZ });
}

export function PulseCard({ event, now }: { event: PulseEvent; now: Date }) {
  const spotsLeft =
    event.capacity !== null ? Math.max(0, event.capacity - event.memberCount) : null;
  const soldOut = spotsLeft === 0;
  const urgent = countdownLabel(event.date, event.time, now);

  return (
    <Link
      href={`/events/${event.id}`}
      className="group block overflow-hidden rounded-2xl border border-white/[0.08] bg-white/[0.03] transition-colors hover:border-white/20"
    >
      {/* Cover */}
      <div className="relative aspect-[1.91/1] w-full overflow-hidden">
        {event.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={event.cover_image_url}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.02]"
          />
        ) : (
          <div className="companion-placeholder h-full w-full" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[rgba(8,8,16,0.85)] to-transparent" />

        {/* Countdown chip — the live signal */}
        <span
          className="absolute left-3 top-3 rounded-full bg-[rgba(8,8,16,0.75)] px-3 py-1 text-[11px] font-medium text-gold backdrop-blur-sm"

        >
          {urgent}
        </span>

        <span className="absolute right-3 top-3 flex gap-1.5">
          {event.event_type === "online" && (
            <span
              className="rounded-full bg-[rgba(8,8,16,0.75)] px-2.5 py-1 text-[11px] text-foreground/80 backdrop-blur-sm"

            >
              Online
            </span>
          )}
          <span
            className="rounded-full bg-[rgba(8,8,16,0.75)] px-2.5 py-1 text-[11px] font-medium text-foreground backdrop-blur-sm"

          >
            {event.price > 0 ? `$${event.price}` : "Free"}
          </span>
        </span>

        {/* Host on the cover edge */}
        <div className="absolute bottom-3 left-3 flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/[0.08]">
            {event.host.avatar_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={event.host.avatar_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <span className="text-[11px] text-foreground/70">
                {event.host.name.charAt(0)}
              </span>
            )}
          </div>
          <span className="text-xs text-foreground/90">
            {event.host.name}
          </span>
          {event.host.verification_tier && (
            <VerifiedBadge tier={event.host.verification_tier} size="sm" />
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-3.5">
        <h2
          className="text-[15px] font-semibold leading-snug text-foreground"
         
        >
          {event.title}
        </h2>
        <p className="mt-1 text-xs text-muted/50">
          {event.time.slice(0, 5)}–{event.end_time.slice(0, 5)}
          {event.location ? ` · ${event.location}` : ""}
        </p>

        <div className="mt-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            {event.memberAvatars.length > 0 && (
              <div className="flex -space-x-2">
                {event.memberAvatars.map((m) => (
                  <div
                    key={m.id}
                    className="flex h-6 w-6 items-center justify-center overflow-hidden rounded-full border-2 border-[#0a0a13] bg-white/[0.08]"
                    title={m.name}
                  >
                    {m.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={m.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-[9px] text-muted/70">{m.name.charAt(0)}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
            <span className="text-xs text-muted/50">
              {event.memberCount} going
            </span>
          </div>

          {soldOut ? (
            <span className="text-xs text-muted/40">
              Sold out
            </span>
          ) : spotsLeft !== null && spotsLeft <= 5 ? (
            <span className="text-xs font-medium text-gold">
              {spotsLeft} spot{spotsLeft === 1 ? "" : "s"} left
            </span>
          ) : (
            <Icon name="arrow-right" className="h-4 w-4 text-muted/30 transition-transform group-hover:translate-x-0.5" />
          )}
        </div>
      </div>
    </Link>
  );
}
