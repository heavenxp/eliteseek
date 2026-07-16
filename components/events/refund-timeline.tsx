import { decayRefundFraction, refundBreakpoints } from "@/lib/cancellation";
import { EVENT_TZ } from "@/lib/event-time";

// The transparent refund visual (PIVOT: "reads as fairness, not a trap").
// Server-rendered from the event start instant; no countdown ticker.
export function RefundTimeline({ start, now = new Date() }: { start: Date; now?: Date }) {
  const hoursUntil = (start.getTime() - now.getTime()) / 3600_000;
  const pct = Math.round(decayRefundFraction(hoursUntil) * 100);
  const { slideAt, lockAt } = refundBreakpoints(start);

  const fmt = (d: Date) =>
    d.toLocaleDateString("en-AU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: EVENT_TZ });

  const phase =
    hoursUntil >= 168
      ? { headline: "Cancel now: full refund", detail: `Slides toward 50% from ${fmt(slideAt)} · locks ${fmt(lockAt)}` }
      : hoursUntil >= 48
        ? { headline: `Cancel now: ${pct}% refund`, detail: `Sliding to 50% · locks ${fmt(lockAt)}` }
        : { headline: "Refunds locked", detail: "Cancellations inside 48 hours aren't refunded" };

  // Position marker along full → 50% → locked
  const progress =
    hoursUntil >= 168 ? 0 : hoursUntil >= 48 ? (168 - hoursUntil) / (168 - 48) * 0.8 : 1;

  return (
    <div className="rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-sm text-foreground/85" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {phase.headline}
        </p>
        <span className="text-[11px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          the refund timer
        </span>
      </div>
      <div className="relative mt-2.5 h-1 rounded-full bg-white/[0.07]">
        <div
          className="absolute inset-y-0 left-0 rounded-full bg-gold/60"
          style={{ width: `${Math.min(100, Math.max(2, progress * 100))}%` }}
        />
        <div
          className="absolute top-1/2 h-2.5 w-2.5 -translate-y-1/2 rounded-full border-2 border-[#080810] bg-gold"
          style={{ left: `calc(${Math.min(98, Math.max(0, progress * 100))}% - 5px)` }}
        />
      </div>
      <p className="mt-2 text-[11px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {phase.detail}
      </p>
    </div>
  );
}
