import { createClient } from "@/lib/supabase/server";
import type { Transaction } from "@/lib/database.types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  }).format(amount);
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    refunded: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  };
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs",
        colors[status] ?? "bg-white/5 text-muted/50 border-white/10",
      ].join(" ")}

    >
      {status}
    </span>
  );
}

export default async function AdminTransactionsPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("transactions")
    .select(
      "id, type, gross_amount, platform_fee, net_amount, status, created_at"
    )
    .order("created_at", { ascending: false })
    .limit(50);

  const transactions = (data as Pick<
    Transaction,
    "id" | "type" | "gross_amount" | "platform_fee" | "net_amount" | "status" | "created_at"
  >[] | null) ?? [];

  const totalGross = transactions.reduce((sum, t) => sum + t.gross_amount, 0);
  const totalFees = transactions.reduce((sum, t) => sum + t.platform_fee, 0);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
         
        >
          Transactions
        </h1>
        <p
          className="mt-1 text-sm text-muted/50"

        >
          Last {transactions.length} transactions
        </p>
      </div>

      {/* Summary row */}
      {transactions.length > 0 && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
          <div className="glass-card p-4">
            <p
              className="text-xs uppercase tracking-widest text-muted/40"

            >
              Total Gross
            </p>
            <p
              className="mt-2 text-xl font-bold tracking-tight text-foreground"
             
            >
              {formatCurrency(totalGross)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p
              className="text-xs uppercase tracking-widest text-muted/40"

            >
              Platform Fees
            </p>
            <p
              className="mt-2 text-xl font-bold tracking-tight text-gold"
             
            >
              {formatCurrency(totalFees)}
            </p>
          </div>
          <div className="glass-card p-4">
            <p
              className="text-xs uppercase tracking-widest text-muted/40"

            >
              Net to Companions
            </p>
            <p
              className="mt-2 text-xl font-bold tracking-tight text-foreground"
             
            >
              {formatCurrency(totalGross - totalFees)}
            </p>
          </div>
        </div>
      )}

      {/* Table */}
      {error ? (
        <p
          className="text-sm text-red-400"

        >
          Failed to load transactions.
        </p>
      ) : transactions.length === 0 ? (
        <div className="glass-card p-16 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <svg
              className="h-6 w-6 text-muted/40"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M2.25 18.75a60.07 60.07 0 0115.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 013 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 00-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 01-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 003 15h-.75"
              />
            </svg>
          </div>
          <p
            className="text-base font-semibold text-foreground/50"
           
          >
            No transactions yet
          </p>
          <p
            className="mt-1 text-sm text-muted/40"

          >
            Stripe integration is not yet live. Transactions will appear here once payments are enabled.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Date", "Type", "Gross", "Platform Fee", "Net", "Status"].map((h) => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-xs uppercase tracking-widest text-muted/40 font-normal"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06]">
                {transactions.map((t) => (
                  <tr
                    key={t.id}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-4 py-3 text-xs text-muted/50">
                      {formatDate(t.created_at)}
                    </td>
                    <td className="px-4 py-3 text-foreground/70 capitalize">
                      {t.type.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-3 text-foreground/80 font-mono text-xs">
                      {formatCurrency(t.gross_amount)}
                    </td>
                    <td className="px-4 py-3 text-gold font-mono text-xs">
                      {formatCurrency(t.platform_fee)}
                    </td>
                    <td className="px-4 py-3 text-foreground/60 font-mono text-xs">
                      {formatCurrency(t.net_amount)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={t.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
