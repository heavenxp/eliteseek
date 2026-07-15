import { useId } from "react";
import type { VerificationTier } from "@/lib/database.types";

// The primary trust mark (Phase 2). A 12-scallop seal:
//  - verified → outlined gold seal with check
//  - select   → filled gold seal with check (handpicked hosts)
// Renders nothing for unverified — absence of the seal is the signal.

const SEAL_POINTS =
  "12.00,1.00 14.41,3.02 17.50,2.47 18.58,5.42 21.53,6.50 20.98,9.59 23.00,12.00 20.98,14.41 21.53,17.50 18.58,18.58 17.50,21.53 14.41,20.98 12.00,23.00 9.59,20.98 6.50,21.53 5.42,18.58 2.47,17.50 3.02,14.41 1.00,12.00 3.02,9.59 2.47,6.50 5.42,5.42 6.50,2.47 9.59,3.02";

const SIZES = { sm: 14, md: 18, lg: 24 } as const;

type Props = {
  tier: VerificationTier | string;
  size?: keyof typeof SIZES;
  showLabel?: boolean;
  className?: string;
};

export function VerifiedBadge({ tier, size = "md", showLabel = false, className }: Props) {
  const gradientId = useId();
  if (tier !== "verified" && tier !== "select") return null;
  const isSelect = tier === "select";
  const px = SIZES[size];
  const label = isSelect ? "Select" : "Verified";

  const seal = (
    <svg
      width={px}
      height={px}
      viewBox="0 0 24 24"
      aria-label={`${label} host`}
      role="img"
      className="shrink-0"
    >
      {isSelect ? (
        <>
          <polygon points={SEAL_POINTS} fill={`url(#${gradientId})`} />
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="24" y2="24">
              <stop offset="0" stopColor="var(--gold-light)" />
              <stop offset="1" stopColor="#2b7fe0" />
            </linearGradient>
          </defs>
          <path
            d="M7.5 12.2l3 3 6-6.2"
            fill="none"
            stroke="#080810"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      ) : (
        <>
          <polygon
            points={SEAL_POINTS}
            fill="var(--gold-dim)"
            stroke="var(--gold)"
            strokeWidth="1.4"
            strokeLinejoin="round"
          />
          <path
            d="M7.5 12.2l3 3 6-6.2"
            fill="none"
            stroke="var(--gold)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </>
      )}
    </svg>
  );

  if (!showLabel) {
    return <span className={className} title={`${label} host`}>{seal}</span>;
  }

  return (
    <span
      className={[
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1",
        isSelect ? "badge-select" : "badge-verified",
        className ?? "",
      ].join(" ")}
    >
      {seal}
      {label}
    </span>
  );
}
