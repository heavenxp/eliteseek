import Link from "next/link";
import { Icon } from "@/components/icons";
import type { CompanionCard as CompanionCardType, VisibilityLevel } from "@/lib/database.types";

function PricingHint({ companion }: { companion: CompanionCardType }) {
  if (companion.booking_rate_hourly) {
    return (
      <span className="text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
        from <span className="text-foreground/80">${companion.booking_rate_hourly.toLocaleString()}</span>/hr
      </span>
    );
  }
  if (companion.subscription_price) {
    return (
      <span className="text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
        subscribe from <span className="text-foreground/80">${companion.subscription_price}</span>/mo
      </span>
    );
  }
  return null;
}

type LockStatus = "unlocked" | "locked" | "elite_only";

export function CompanionCard({
  companion,
  lockStatus = "unlocked",
}: {
  companion: CompanionCardType;
  lockStatus?: LockStatus;
}) {
  const isSelect = companion.verification_tier === "select";
  const isLocked = companion.visibility === "locked";
  const isEliteOnly = companion.visibility === "elite_only";
  const showLockOverlay = lockStatus === "locked" || lockStatus === "elite_only";

  const card = (
    <div className="group block overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[rgba(255,255,255,0.03)] transition-all duration-300 hover:-translate-y-1 hover:border-[rgba(212,175,55,0.28)] hover:shadow-[0_8px_32px_rgba(212,175,55,0.08)]">
      {/* Image area */}
      <div className={`companion-placeholder relative h-64 w-full overflow-hidden ${showLockOverlay ? "blur-[3px]" : ""}`}>
        {/* Gradient overlay at bottom */}
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(8,8,16,0.7)] to-transparent" />

        {/* Top badges */}
        <div className="absolute left-3 top-3 flex items-center gap-2">
          {companion.is_available ? (
            <span className="flex items-center gap-1.5 rounded-full bg-[rgba(8,8,16,0.65)] px-2.5 py-1 text-[10px] text-emerald-400 backdrop-blur-sm" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
              Available
            </span>
          ) : (
            <span className="flex items-center gap-1.5 rounded-full bg-[rgba(8,8,16,0.65)] px-2.5 py-1 text-[10px] text-muted/60 backdrop-blur-sm" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <span className="h-1.5 w-1.5 rounded-full bg-muted/40" />
              Unavailable
            </span>
          )}
        </div>

        {/* Tier badge */}
        <div className="absolute right-3 top-3">
          {isSelect ? (
            <span className="badge-select rounded-full px-2.5 py-1 text-[10px]">
              <span className="flex items-center gap-1">
                <Icon name="star" className="h-2.5 w-2.5" />
                Select
              </span>
            </span>
          ) : companion.verification_tier === "verified" ? (
            <span className="badge-verified rounded-full px-2.5 py-1 text-[10px]">
              Verified
            </span>
          ) : null}
        </div>

        {/* Lock indicator */}
        {(isLocked || isEliteOnly) && lockStatus === "unlocked" && (
          <div className="absolute bottom-3 right-3">
            <span className="flex items-center gap-1 rounded-full bg-[rgba(8,8,16,0.7)] px-2.5 py-1 text-[10px] text-gold/80 backdrop-blur-sm" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <Icon name="lock" className="h-3 w-3" />
              {isEliteOnly ? "Elite Only" : "Locked"}
            </span>
          </div>
        )}

        {/* Location */}
        <div className="absolute bottom-3 left-3">
          <span className="rounded-full bg-[rgba(8,8,16,0.65)] px-2.5 py-1 text-[10px] text-muted/80 backdrop-blur-sm" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {companion.location}
          </span>
        </div>
      </div>

      {/* Card body */}
      <div className={`p-4 ${showLockOverlay ? "blur-[2px]" : ""}`}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-lg font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              {companion.display_name}
              {companion.age && (
                <span className="ml-1.5 text-base text-muted/50">{companion.age}</span>
              )}
            </p>
          </div>

          {/* Rating */}
          {companion.average_rating && (
            <div className="flex shrink-0 items-center gap-1">
              <Icon name="star" className="h-3.5 w-3.5 text-gold" />
              <span className="text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {Number(companion.average_rating).toFixed(1)}
              </span>
              {companion.total_reviews > 0 && (
                <span className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  ({companion.total_reviews})
                </span>
              )}
            </div>
          )}
        </div>

        {companion.tagline && (
          <p className="mt-1 line-clamp-1 text-xs text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {companion.tagline}
          </p>
        )}

        {companion.tags && companion.tags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {companion.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="rounded-full bg-[rgba(212,175,55,0.07)] px-2 py-0.5 text-[10px] text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {tag}
              </span>
            ))}
            {companion.tags.length > 3 && (
              <span className="text-[10px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                +{companion.tags.length - 3}
              </span>
            )}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <PricingHint companion={companion} />
          <span className="text-xs text-gold/70 transition-all duration-200 group-hover:text-gold group-hover:translate-x-0.5" style={{ fontFamily: "var(--font-dm-sans)" }}>
            View profile →
          </span>
        </div>
      </div>

      {/* Lock overlay */}
      {showLockOverlay && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded-2xl bg-[rgba(8,8,16,0.55)] backdrop-blur-[1px]">
          <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(8,8,16,0.8)]">
            <Icon name="lock" className="h-5 w-5 text-gold/80" />
          </div>
          <div className="text-center">
            <p className="text-sm font-light text-foreground/90" style={{ fontFamily: "var(--font-cormorant)" }}>
              {lockStatus === "elite_only" ? "Elite Members Only" : "Locked Profile"}
            </p>
            {companion.profile_unlock_fee && lockStatus === "locked" && (
              <p className="text-xs text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Unlock for ${companion.profile_unlock_fee}
              </p>
            )}
          </div>
          <span className="text-xs text-gold/60 underline underline-offset-2" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {lockStatus === "elite_only" ? "Upgrade membership" : "View options →"}
          </span>
        </div>
      )}
    </div>
  );

  const profileHref = companion.username
    ? `/@${companion.username}`
    : `/companion/${companion.id}`;

  return showLockOverlay ? (
    <Link href={profileHref} className="relative block">
      {card}
    </Link>
  ) : (
    <Link href={profileHref} className="block">
      {card}
    </Link>
  );
}
