import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import type { TransactionType } from "@/lib/database.types";

// ── helpers ─────────────────────────────────────────────────────────────────

function fmt(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(cents);
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const TYPE_LABELS: Record<TransactionType, string> = {
  subscription: "Subscription",
  ppv: "Pay-Per-View",
  booking: "Booking",
  tip: "Tip",
  gift: "Gift",
  profile_unlock: "Profile Unlock",
  membership: "Membership",
};

// ── page ────────────────────────────────────────────────────────────────────

export default async function EarningsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Confirm companion profile exists
  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id, stripe_account_id, stripe_account_status")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/account");

  // Fetch completed transactions where this companion is the recipient (to_user_id),
  // OR where reference_id matches companion.id (for transactions linked via profile).
  // We do two separate queries and merge to be resilient to schema variations.
  const { data: txByRecipient } = await supabase
    .from("transactions")
    .select("id, type, gross_amount, platform_fee, net_amount, status, created_at, reference_type, reference_id")
    .eq("to_user_id", user.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);

  const { data: txByRef } = await supabase
    .from("transactions")
    .select("id, type, gross_amount, platform_fee, net_amount, status, created_at, reference_type, reference_id")
    .eq("reference_id", companion.id)
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(100);

  // Merge & deduplicate
  const seen = new Set<string>();
  const allTx: Array<{
    id: string;
    type: TransactionType;
    gross_amount: number;
    platform_fee: number;
    net_amount: number;
    status: string;
    created_at: string;
    reference_type: string | null;
    reference_id: string | null;
  }> = [];

  for (const tx of [...(txByRecipient ?? []), ...(txByRef ?? [])]) {
    if (!seen.has(tx.id)) {
      seen.add(tx.id);
      allTx.push(tx as typeof allTx[number]);
    }
  }

  // Sort merged list desc by created_at
  allTx.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

  // ── Aggregates ──────────────────────────────────────────────────────────
  const totalGross = allTx.reduce((s, t) => s + t.gross_amount, 0);
  const totalFees = allTx.reduce((s, t) => s + t.platform_fee, 0);
  const totalNet = allTx.reduce((s, t) => s + t.net_amount, 0);

  // Pending = completed txs without stripe_transfer_id — approximate using a
  // separate query for pending-status transactions (pre-transfer)
  const { data: pendingTx } = await supabase
    .from("transactions")
    .select("net_amount")
    .or(`to_user_id.eq.${user.id},reference_id.eq.${companion.id}`)
    .eq("status", "pending");

  const pendingPayouts = (pendingTx ?? []).reduce((s, t) => s + t.net_amount, 0);

  // ── Breakdown by type ───────────────────────────────────────────────────
  const byType = allTx.reduce<Record<string, number>>((acc, t) => {
    const key = t.type ?? "other";
    acc[key] = (acc[key] ?? 0) + t.net_amount;
    return acc;
  }, {});

  const recentTx = allTx.slice(0, 20);

  const hasStripe =
    companion.stripe_account_id &&
    companion.stripe_account_status === "active";

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-4xl px-4 py-10">

        {/* Header */}
        <div className="mb-8 flex items-center gap-3">
          <Link
            href="/account"
            className="rounded-xl p-2 text-muted/50 transition-colors hover:bg-white/[0.04] hover:text-gold"
            aria-label="Back"
          >
            ‹
          </Link>
          <h1
            className="text-3xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Earnings
          </h1>
        </div>

        {/* Summary cards */}
        <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: "Total Gross", value: fmt(totalGross), sub: "all time" },
            { label: "Platform Fees", value: fmt(totalFees), sub: "deducted" },
            { label: "Net Earnings", value: fmt(totalNet), sub: "received" },
            { label: "Pending Payouts", value: fmt(pendingPayouts), sub: "in queue" },
          ].map((card) => (
            <div
              key={card.label}
              className="glass-card rounded-2xl p-5 text-center"
            >
              <p
                className="text-2xl font-light text-gold"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {card.value}
              </p>
              <p
                className="mt-1 text-xs text-muted/60"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {card.label}
              </p>
              <p
                className="text-[10px] text-muted/30"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {card.sub}
              </p>
            </div>
          ))}
        </div>

        {/* Breakdown by type */}
        {Object.keys(byType).length > 0 && (
          <div className="glass-card mb-8 rounded-2xl p-6">
            <h2
              className="mb-4 text-lg font-light text-foreground"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Earnings by Category
            </h2>
            <ul className="space-y-2">
              {Object.entries(byType)
                .sort(([, a], [, b]) => b - a)
                .map(([type, net]) => (
                  <li
                    key={type}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-white/[0.04]"
                  >
                    <span
                      className="text-sm text-foreground/80"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {TYPE_LABELS[type as TransactionType] ?? type}
                    </span>
                    <span
                      className="text-sm font-medium text-gold"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {fmt(net)}
                    </span>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Recent transactions */}
        <div className="glass-card mb-8 rounded-2xl p-6">
          <h2
            className="mb-4 text-lg font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Recent Transactions
          </h2>

          {recentTx.length === 0 ? (
            <p
              className="py-8 text-center text-sm text-muted/40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              No completed transactions yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm" style={{ fontFamily: "var(--font-dm-sans)" }}>
                <thead>
                  <tr className="border-b border-white/10">
                    {["Date", "Type", "Gross", "Fee", "Net"].map((h) => (
                      <th
                        key={h}
                        className="pb-3 text-left text-xs font-medium uppercase tracking-wider text-muted/40 first:pl-0 last:pr-0"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(212,175,55,0.06)]">
                  {recentTx.map((tx) => (
                    <tr
                      key={tx.id}
                      className="transition-colors hover:bg-white/[0.04]"
                    >
                      <td className="py-3 text-muted/50 text-xs">
                        {fmtDate(tx.created_at)}
                      </td>
                      <td className="py-3 text-foreground/80">
                        {TYPE_LABELS[tx.type] ?? tx.type}
                      </td>
                      <td className="py-3 text-foreground/70">
                        {fmt(tx.gross_amount)}
                      </td>
                      <td className="py-3 text-red-400/70">
                        −{fmt(tx.platform_fee)}
                      </td>
                      <td className="py-3 font-medium text-gold">
                        {fmt(tx.net_amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Payout status */}
        <div className="glass-card rounded-2xl p-6">
          <h2
            className="mb-3 text-lg font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Payout Status
          </h2>

          {hasStripe ? (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                <span
                  className="text-sm text-emerald-400"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Stripe connected · payouts active
                </span>
              </div>
              <p
                className="text-xs text-muted/40"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Earnings are transferred automatically within 2–3 business days
                of each completed transaction. Visit your{" "}
                <Link
                  href="/account/settings"
                  className="text-gold/70 underline underline-offset-2"
                >
                  Settings
                </Link>{" "}
                to manage your payout account.
              </p>
            </div>
          ) : (
            <div>
              <div className="mb-4 flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-amber-500" />
                <span
                  className="text-sm text-amber-500"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Stripe payouts — not connected
                </span>
              </div>
              <p
                className="mb-4 text-xs text-muted/40"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Connect your Stripe account to receive direct payouts for your
                earnings. Setup takes less than five minutes.
              </p>
              <Link
                href="/account/settings"
                className="btn-gold inline-block rounded-xl px-4 py-2 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Connect in Settings
              </Link>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
