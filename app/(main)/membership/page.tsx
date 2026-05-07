import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { membershipTiers } from "@/data/landing";
import type { MembershipTier } from "@/lib/database.types";

export default async function MembershipPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: clientProfile } = await supabase
    .from("client_profiles")
    .select("membership_tier, membership_expires_at")
    .eq("user_id", user.id)
    .single();

  const currentTier: MembershipTier = clientProfile?.membership_tier ?? "bronze";

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="mb-10 text-center">
          <h1
            className="text-4xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Your Membership
          </h1>
          <p
            className="mt-2 text-sm text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {currentTier === "bronze"
              ? "Upgrade to unlock exclusive access and benefits"
              : `You're on the ${currentTier.charAt(0).toUpperCase() + currentTier.slice(1)} plan`}
          </p>
        </div>

        <div className="grid gap-5 md:grid-cols-3">
          {membershipTiers.map((tier) => {
            const tierKey = tier.name.toLowerCase() as MembershipTier;
            const isCurrent = tierKey === currentTier;
            const isDowngrade =
              (currentTier === "elite" && tierKey !== "elite") ||
              (currentTier === "silver" && tierKey === "bronze");

            return (
              <div
                key={tier.name}
                className={`glass-card relative flex flex-col rounded-2xl p-6 ${
                  tier.highlighted
                    ? "border border-[rgba(212,175,55,0.35)] shadow-[0_0_40px_rgba(212,175,55,0.07)]"
                    : ""
                } ${isCurrent ? "ring-1 ring-[rgba(212,175,55,0.4)]" : ""}`}
              >
                {isCurrent && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full border border-[rgba(212,175,55,0.4)] bg-[#080810] px-3 py-0.5 text-xs text-gold"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Current Plan
                  </span>
                )}
                {tier.highlighted && !isCurrent && (
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-0.5 text-xs text-[#080810]"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Most Popular
                  </span>
                )}

                <div className="mb-5">
                  <h2
                    className="text-2xl font-light text-foreground"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {tier.name}
                  </h2>
                  <p
                    className="mt-0.5 text-xs text-muted/50"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {tier.description}
                  </p>
                  <div className="mt-4 flex items-baseline gap-1">
                    <span
                      className="text-4xl font-light text-gold"
                      style={{ fontFamily: "var(--font-cormorant)" }}
                    >
                      {tier.price}
                    </span>
                    {tier.period && (
                      <span
                        className="text-sm text-muted/40"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {tier.period}
                      </span>
                    )}
                  </div>
                </div>

                <ul className="mb-6 flex-1 space-y-2.5">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5">
                      <Icon name="check" className="mt-0.5 h-3.5 w-3.5 shrink-0 text-gold/60" />
                      <span
                        className="text-sm text-foreground/70"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>

                <TierCta
                  tierKey={tierKey}
                  currentTier={currentTier}
                  isCurrent={isCurrent}
                  isDowngrade={isDowngrade}
                  cta={tier.cta}
                  highlighted={tier.highlighted}
                />
              </div>
            );
          })}
        </div>

        <p
          className="mt-8 text-center text-xs text-muted/30"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Billing is managed securely via Stripe. Cancel anytime.{" "}
          <Link href="/privacy" className="underline hover:text-muted/60">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  );
}

function TierCta({
  tierKey,
  currentTier,
  isCurrent,
  isDowngrade,
  cta,
  highlighted,
}: {
  tierKey: MembershipTier;
  currentTier: MembershipTier;
  isCurrent: boolean;
  isDowngrade: boolean;
  cta: string;
  highlighted: boolean;
}) {
  if (tierKey === "bronze") {
    if (isCurrent) {
      return (
        <span
          className="block rounded-xl border border-[rgba(212,175,55,0.15)] px-5 py-2.5 text-center text-sm text-muted/40"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Free forever
        </span>
      );
    }
    return (
      <span
        className="block rounded-xl border border-[rgba(212,175,55,0.15)] px-5 py-2.5 text-center text-sm text-muted/30"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Downgrade
      </span>
    );
  }

  if (isCurrent) {
    return (
      <form action="/api/membership/manage" method="post">
        <button
          type="submit"
          className="btn-ghost w-full rounded-xl px-5 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Manage Plan
        </button>
      </form>
    );
  }

  if (isDowngrade) {
    return (
      <form action="/api/membership/downgrade" method="post">
        <input type="hidden" name="tier" value={tierKey} />
        <button
          type="submit"
          className="btn-ghost w-full rounded-xl px-5 py-2.5 text-sm text-muted/50"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Downgrade
        </button>
      </form>
    );
  }

  return (
    <form action="/api/membership/upgrade" method="post">
      <input type="hidden" name="tier" value={tierKey} />
      <button
        type="submit"
        className={`w-full rounded-xl px-5 py-2.5 text-sm ${highlighted ? "btn-gold" : "btn-ghost"}`}
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {cta}
      </button>
    </form>
  );
}
