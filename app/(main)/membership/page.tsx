import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CLIENT_TIERS, getClientTier, nextClientTier, type ClientTier } from "@/lib/tiers";
import { TierBadge } from "@/components/badges/tier-badge";

export const metadata = { title: "Membership — EliteSeek" };

export default async function MembershipPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientProfile } = await supabase
    .from("client_profiles")
    .select("client_tier")
    .eq("user_id", user.id)
    .single();

  // Total spent on completed bookings
  const { data: bookings } = await supabase
    .from("bookings")
    .select("total_amount, status")
    .eq("client_id", user.id)
    .eq("status", "completed");

  const totalSpent = (bookings ?? []).reduce((s, b) => s + (b.total_amount ?? 0), 0);
  const currentTierKey = (clientProfile?.client_tier ?? "bronze") as ClientTier;
  const current = getClientTier(currentTierKey);
  const next = nextClientTier(currentTierKey);
  const currentIdx = CLIENT_TIERS.findIndex((t) => t.key === currentTierKey);

  let progress = 0;
  if (next) {
    progress = Math.min(100, Math.max(0, (totalSpent / next.minSpend) * 100));
  } else {
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
          <h1 className="text-4xl font-light text-white" style={{ fontFamily: "var(--font-cormorant)" }}>
            Your Membership
          </h1>
          <p className="mt-2 text-sm text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Unlock more of EliteSeek as you spend and engage
          </p>
        </div>

        {/* Ring + current tier */}
        <div className="mb-10 flex flex-col items-center gap-6">
          <div className="relative flex items-center justify-center">
            <div
              className="absolute h-44 w-44 rounded-full blur-2xl opacity-20"
              style={{ background: current.color }}
            />
            <svg width="176" height="176" className="relative">
              <circle cx="88" cy="88" r={R} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="6" />
              <circle
                cx="88" cy="88" r={R}
                fill="none"
                stroke={current.color}
                strokeWidth="6"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circ - dash}`}
                strokeDashoffset={circ / 4}
                style={{ filter: `drop-shadow(0 0 8px ${current.color}80)` }}
              />
              <text x="88" y="82" textAnchor="middle" fill={current.color} fontSize="26" fontWeight="300" style={{ fontFamily: "var(--font-cormorant)" }}>
                {current.label}
              </text>
              <text x="88" y="100" textAnchor="middle" fill="rgba(255,255,255,0.35)" fontSize="10" style={{ fontFamily: "var(--font-dm-sans)" }}>
                MEMBER
              </text>
            </svg>
          </div>

          {/* Total spent */}
          <div className="flex gap-8">
            <div className="flex flex-col items-center gap-0.5">
              <span className="text-2xl font-light text-white" style={{ fontFamily: "var(--font-cormorant)" }}>
                ${totalSpent.toLocaleString()}
              </span>
              <span className="text-[10px] uppercase tracking-widest text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Total Spent
              </span>
            </div>
          </div>

          {/* Progress toward next tier */}
          {next ? (
            <div className="w-full max-w-sm">
              <div className="mb-2 flex items-center justify-between text-xs text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                <span>{current.label} ($0)</span>
                <span>{next.label} (${next.minSpend.toLocaleString()})</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/[0.06]">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: `linear-gradient(90deg, ${current.color}, ${next.color})`,
                    boxShadow: `0 0 8px ${next.color}60`,
                    transition: "width 1s ease",
                  }}
                />
              </div>
              <p className="mt-2 text-center text-[11px] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                ${Math.max(0, next.minSpend - totalSpent).toLocaleString()} more to reach {next.label}
              </p>
            </div>
          ) : (
            <p className="text-sm text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              You have reached the highest tier ✦
            </p>
          )}
        </div>

        {/* Tier cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          {CLIENT_TIERS.map((tier, idx) => {
            const isUnlocked = idx <= currentIdx;
            const isCurrent = tier.key === currentTierKey;
            const canBuy = !isUnlocked;

            return (
              <div
                key={tier.key}
                className="relative rounded-2xl border p-5 transition-all"
                style={{
                  borderColor: isCurrent ? `${tier.color}50` : "rgba(255,255,255,0.06)",
                  background: isCurrent ? `${tier.color}08` : "rgba(255,255,255,0.02)",
                  opacity: isUnlocked ? 1 : 0.65,
                }}
              >
                {isCurrent && (
                  <span
                    className="absolute -top-2.5 left-5 rounded-full px-2.5 py-0.5 text-[10px] font-medium"
                    style={{ background: tier.color, color: "#080810", fontFamily: "var(--font-dm-sans)" }}
                  >
                    Current
                  </span>
                )}

                <div className="mb-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div
                      className="flex h-8 w-8 items-center justify-center rounded-full"
                      style={{
                        background: `${tier.color}18`,
                        border: `1px solid ${tier.color}35`,
                        boxShadow: isCurrent ? `0 0 12px ${tier.color}40` : "none",
                      }}
                    >
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: tier.color }} />
                    </div>
                    <div>
                      <p className="text-base font-light" style={{ color: tier.color, fontFamily: "var(--font-cormorant)" }}>
                        {tier.label}
                      </p>
                      <p className="text-[10px] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                        {tier.minSpend === 0 ? "Free" : `$${tier.minSpend.toLocaleString()}+ spent`}
                      </p>
                    </div>
                  </div>
                  <TierBadge type="client" tier={tier.key} />
                </div>

                <ul className="mb-4 space-y-1.5">
                  {tier.perks.map((perk) => (
                    <li key={perk} className="flex items-start gap-2 text-xs text-white/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      <span className="mt-0.5 h-1 w-1 shrink-0 rounded-full" style={{ background: tier.color }} />
                      {perk}
                    </li>
                  ))}
                </ul>

                {canBuy && (
                  <button
                    disabled
                    className="w-full rounded-xl border py-2 text-sm opacity-50 cursor-not-allowed"
                    style={{
                      borderColor: `${tier.color}40`,
                      color: tier.color,
                      fontFamily: "var(--font-dm-sans)",
                    }}
                  >
                    Buy Now — coming soon
                  </button>
                )}
                {isCurrent && tier.key !== "bronze" && (
                  <div
                    className="rounded-xl border py-2 text-center text-xs text-white/30"
                    style={{ borderColor: "rgba(255,255,255,0.06)", fontFamily: "var(--font-dm-sans)" }}
                  >
                    Active
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <p className="mt-8 text-center text-[11px] text-white/20" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Tiers are earned automatically when spending thresholds are met, or can be purchased instantly. Payment coming soon.
        </p>
      </div>
    </div>
  );
}
