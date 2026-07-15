import { createClient } from "@/lib/supabase/server";
import { AdminActionButton } from "../admin-action-button";
import { approveKyc, rejectKyc } from "@/app/actions/admin";
import type { Profile } from "@/lib/database.types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function RoleBadge({ role }: { role: string }) {
  const isCompanion = role === "companion";
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs",
        isCompanion
          ? "bg-white/[0.07] text-gold border-white/10"
          : "bg-white/5 text-muted/70 border-white/10",
      ].join(" ")}
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {role}
    </span>
  );
}

type KycRow = Pick<Profile, "id" | "full_name" | "role" | "created_at">;

export default async function AdminKycPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("kyc_status", "pending")
    .order("created_at", { ascending: false });

  const profiles = (data as KycRow[] | null) ?? [];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1
          className="text-3xl font-light text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          KYC Reviews
        </h1>
        <p
          className="mt-1 text-sm text-muted/50"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {profiles.length} verification{profiles.length !== 1 ? "s" : ""} pending
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Failed to load KYC queue.
        </p>
      ) : profiles.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p
            className="text-xl font-light text-foreground/50"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            No pending verifications
          </p>
          <p
            className="mt-1 text-sm text-muted/40"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            All KYC submissions are resolved.
          </p>
        </div>
      ) : (
        <div className="glass-card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <thead>
                <tr className="border-b border-white/10">
                  {["Name", "Role", "User ID", "Submitted", "Actions"].map((h) => (
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
                {profiles.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-white/[0.04] transition-colors"
                  >
                    <td className="px-4 py-3 text-foreground/80">{p.full_name}</td>
                    <td className="px-4 py-3">
                      <RoleBadge role={p.role} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-muted/40">
                      {p.id.slice(0, 8)}…
                    </td>
                    <td className="px-4 py-3 text-xs text-muted/50">
                      {formatDate(p.created_at)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AdminActionButton
                          action={() => approveKyc(p.id)}
                          label="Approve"
                          variant="gold"
                        />
                        <AdminActionButton
                          action={() => rejectKyc(p.id)}
                          label="Reject"
                          variant="danger"
                        />
                      </div>
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
