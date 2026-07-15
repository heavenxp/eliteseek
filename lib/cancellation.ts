// ── Cancellation policy engine (Phase 4, Airbnb-style tiers) ───
// Refund fraction is a function of the policy and hours until the booking
// starts. Hosts pick a tier; the booking snapshots it at creation.

export type CancellationPolicy = "flexible" | "moderate" | "strict";

export const DISPUTE_WINDOW_HOURS = 48;

export const CANCELLATION_POLICIES: Record<
  CancellationPolicy,
  { label: string; description: string }
> = {
  flexible: {
    label: "Flexible",
    description: "Full refund until 24 hours before the booking; 50% after that.",
  },
  moderate: {
    label: "Moderate",
    description:
      "Full refund until 5 days before the booking; 50% until 24 hours before; no refund inside 24 hours.",
  },
  strict: {
    label: "Strict",
    description:
      "50% refund until 7 days before the booking; no refund inside 7 days.",
  },
};

// Fraction of the total refunded to the client when THEY cancel.
// Host declines/cancellations always refund 100% regardless of policy.
export function refundFraction(
  policy: CancellationPolicy,
  hoursUntilStart: number
): number {
  switch (policy) {
    case "flexible":
      return hoursUntilStart >= 24 ? 1 : 0.5;
    case "moderate":
      if (hoursUntilStart >= 120) return 1;
      if (hoursUntilStart >= 24) return 0.5;
      return 0;
    case "strict":
      return hoursUntilStart >= 168 ? 0.5 : 0;
  }
}

export function isCancellationPolicy(v: unknown): v is CancellationPolicy {
  return v === "flexible" || v === "moderate" || v === "strict";
}
