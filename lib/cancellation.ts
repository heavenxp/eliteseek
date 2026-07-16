// ── Decaying-refund escrow (PIVOT §2 "the escrow timer") ───────
// One curve for bookings AND event tickets — replaces the Phase 4
// host-set tiers (flexible/moderate/strict), removed 16 Jul 2026.
//   ≥ 7 days out            → 100%
//   7 days → 48h            → linear slide to a 50% floor
//   inside 48h              → locked (0%)
// Host/creator cancellations always refund 100% regardless.

export const DISPUTE_WINDOW_HOURS = 48;

export const REFUND_FULL_HOURS = 168; // 7 days
export const REFUND_LOCK_HOURS = 48;

export function decayRefundFraction(hoursUntilStart: number): number {
  if (hoursUntilStart >= REFUND_FULL_HOURS) return 1;
  if (hoursUntilStart < REFUND_LOCK_HOURS) return 0;
  return (
    0.5 +
    0.5 * ((hoursUntilStart - REFUND_LOCK_HOURS) / (REFUND_FULL_HOURS - REFUND_LOCK_HOURS))
  );
}

// The two moments the refund terms change — feeds the transparent visual.
export function refundBreakpoints(start: Date): { slideAt: Date; lockAt: Date } {
  return {
    slideAt: new Date(start.getTime() - REFUND_FULL_HOURS * 3600_000),
    lockAt: new Date(start.getTime() - REFUND_LOCK_HOURS * 3600_000),
  };
}
