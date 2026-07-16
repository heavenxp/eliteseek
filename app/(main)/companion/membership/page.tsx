"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { HOST_TIERS, getHostTier, nextHostTier, type HostTier } from "@/lib/tiers";

export default function HostMembershipPage() {
  const [data, setData] = useState<{
    hostTier: HostTier;
    avgRating: number | null;
    totalReviews: number;
    totalEarned: number;
    completedBookings: number;
  } | null>(null);

  useEffect(() => {
    const supabase = createClient();
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [cpRes, bookingsRes] = await Promise.all([
        supabase
          .from("host_profiles")
          .select("host_tier, average_rating, total_reviews")
          .eq("user_id", user.id)
          .single(),
        supabase
          .from("bookings")
          .select("companion_earnings, status")
          .eq("companion_id",
            // need host_profiles.id — fetch separately
            (await supabase.from("host_profiles").select("id").eq("user_id", user.id).single()).data?.id ?? ""
          ),
      ]);

      const cp = cpRes.data;
      const completed = (bookingsRes.data ?? []).filter((b) => b.status === "completed");
      const totalEarned = completed.reduce((s, b) => s + (b.companion_earnings ?? 0), 0);

      setData({
        hostTier: (cp?.host_tier ?? "pearl") as HostTier,
        avgRating: cp?.average_rating ?? null,
        totalReviews: cp?.total_reviews ?? 0,
        totalEarned,
        completedBookings: completed.length,
      });
    })();
  }, []);

  if (!data) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-gold" />
      </div>
    );
  }

  return <HostMembershipContent {...data} />;
}

function HostMembershipContent({
  hostTier,
  avgRating,
  totalReviews,
  totalEarned,
  completedBookings,
}: {
  hostTier: HostTier;
  avgRating: number | null;
  totalReviews: number;
  totalEarned: number;
  completedBookings: number;
}) {
  const current = getHostTier(hostTier);
  const next = nextHostTier(hostTier);
  const currentIdx = HOST_TIERS.findIndex((t) => t.key === hostTier);

  // Progress to next tier: how far the rating is between current and next thresholds
  let progress = 0;
  if (next && avgRating !== null) {
    const range = next.minRating - current.minRating;
    const achieved = avgRating - current.minRating;
    progress = range > 0 ? Math.min(100, Math.max(0, (achieved / range) * 100)) : 100;
  } else if (!next) {
    progress = 100;
  }

  // Circumference for SVG ring
  const R = 68;
  const circ = 2 * Math.PI * R;
  const dash = (progress / 100) * circ;

  return (
    <div className="min-h-screen bg-[#080810] px-4 py-10 md:px-8">
      <div className="mx-auto max-w-3xl">

        {/* Header */}
        <div className="mb-10 text-center">
          <h1
            className="text-2xl font-bold tracking-tight text-white"
           
          >
            host Status
          </h1>
          <p className="mt-2 text-sm text-white/40">
            Your tier is earned automatically through client ratings
          </p>
        </div>

        {/* Animated ring + current tier */}
        <div className="mb-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            {/* Glow */}
            <div
              className="absolute h-44 w-44 rounded-full blur-2xl opacity-20"
              style={{ background: current.color }}
            />
            <svg width="176" height="176" className="relative">
              {/* Track */}
              <circle
                cx="88" cy="88" r={R}
                fill="none"
                stroke="rgba(255,255,255,0.06)"
                strokeWidth="6"
              />
              {/* Progress */}
              <circle
                cx="88" cy="88" r={R}
                fill="none"
                stroke={current.color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={circ / 4}
                style={{ transition: "stroke-dasharray 1.2s cubic-bezier(.4,0,.2,1)" }}
                filter={`drop-shadow(0 0 8px ${current.color}80)`}
              />
              {/* Center */}
              <text x="88" y="82" textAnchor="middle" fill={current.color} fontSize="26" fontWeight="300">
                {current.label}
              </text>
              <text x="88" y="100" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="11">
                {current.subtitle}
              </text>
            </svg>
          </div>

          {/* Stats row */}
          <div className="flex gap-8">
            {[
              { label: "Avg Rating", value: avgRating ? avgRating.toFixed(2) : "—" },
              { label: "Reviews", value: totalReviews },
              { label: "Bookings", value: completedBookings },
              { label: "Earned", value: `$${totalEarned.toLocaleString()}` },
            ].map((s) => (
              <div key={s.label} className="flex flex-col items-center gap-0.5">
                <span className="text-base font-semibold text-white">
                  {s.value}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-white/30">
                  {s.label}
                </span>
              </div>
            ))}
          </div>

          {/* Progress toward next tier */}
          {next && (
            <div className="w-full max-w-sm">
              <div className="mb-2 flex items-center justify-between text-xs text-white/40">
                <span>{current.label} ({current.minRating.toFixed(1)}★)</span>
                <span>{next.label} ({next.minRating.toFixed(1)}★)</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full transition-all duration-1000"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
                    boxShadow: `0 0 8px ${next.color}60`,
                  }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-white/30">
                {avgRating !== null
                  ? `${Math.max(0, next.minRating - avgRating).toFixed(2)} more rating points to ${next.label}`
                  : `Earn ${next.minRating.toFixed(1)}★ average to reach ${next.label}`}
              </p>
            </div>
          )}
          {!next && (
            <p className="text-sm text-white/40">
              You have reached the highest tier ✦
            </p>
          )}
        </div>

        {/* Tier grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          {HOST_TIERS.map((tier, idx) => {
            const isUnlocked = idx <= currentIdx;
            const isCurrent = tier.key === hostTier;
            return (
              <div
                key={tier.key}
                className="relative flex flex-col items-center gap-2 rounded-2xl border p-4 transition-all"
                style={{
                  borderColor: isCurrent ? `${tier.color}50` : "rgba(255,255,255,0.06)",
                  background: isCurrent ? `${tier.color}08` : "rgba(255,255,255,0.02)",
                  opacity: isUnlocked ? 1 : 0.4,
                }}
              >
                {isCurrent && (
                  <span
                    className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full px-2 py-0.5 text-[9px] font-medium"
                    style={{
                      background: tier.color,
                      color: "#080810",
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    Current
                  </span>
                )}

                {/* Gem icon */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-full"
                  style={{
                    background: `${tier.color}15`,
                    border: `1px solid ${tier.color}30`,
                    boxShadow: isCurrent ? `0 0 16px ${tier.color}40` : "none",
                  }}
                >
                  <GemIcon color={tier.color} unlocked={isUnlocked} />
                </div>

                <div className="text-center">
                  <p
                    className="text-sm font-light"
                    style={{ color: isUnlocked ? tier.color : "rgba(255,255,255,0.3)", fontFamily: "var(--font-cormorant)" }}
                  >
                    {tier.label}
                  </p>
                  <p className="text-[9px] text-white/30">
                    {tier.minRating > 0 ? `${tier.minRating.toFixed(1)}★+` : "Starting tier"}
                  </p>
                </div>

                {/* Mystery progress bar on locked tiers */}
                {!isUnlocked && (
                  <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full w-1/3 rounded-full opacity-40"
                      style={{ background: tier.color }}
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* How tiers work */}
        <div className="mt-8 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
          <p className="mb-3 text-sm font-light text-white/70">
            How tiers are earned
          </p>
          <ul className="space-y-1.5">
            {HOST_TIERS.slice(1).map((tier) => (
              <li key={tier.key} className="flex items-center gap-3 text-xs text-white/40">
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: tier.color }} />
                <span style={{ color: tier.color }}>{tier.label}</span>
                <span>— {tier.minRating.toFixed(1)}★ average rating from clients</span>
              </li>
            ))}
          </ul>
          <p className="mt-3 text-[11px] text-white/25">
            Tier updates automatically when your average rating changes.
          </p>
        </div>

      </div>
    </div>
  );
}

function GemIcon({ color, unlocked }: { color: string; unlocked: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2L2 9l10 13L22 9z"
        fill={unlocked ? `${color}30` : "rgba(255,255,255,0.05)"}
        stroke={unlocked ? color : "rgba(255,255,255,0.15)"}
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="M2 9h20M7 2l-5 7M17 2l5 7M12 2l-4 7M12 2l4 7"
        stroke={unlocked ? `${color}80` : "rgba(255,255,255,0.1)"}
        strokeWidth="1"
        strokeLinecap="round"
      />
    </svg>
  );
}
