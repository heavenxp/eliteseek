import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminActionButton } from "../admin-action-button";
import { suspendUser, unsuspendUser } from "@/app/actions/admin";
import type { Profile } from "@/lib/database.types";

const PAGE_SIZE = 20;

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    not_started: "bg-white/5 text-muted/50 border-white/10",
    companion: "bg-white/[0.07] text-gold border-white/10",
    client: "bg-white/5 text-muted/70 border-white/10",
    true: "bg-red-500/10 text-red-400 border-red-500/20",
    false: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
  };
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs",
        colors[String(status)] ?? "bg-white/5 text-muted/50 border-white/10",
      ].join(" ")}

    >
      {status.toString().replace(/_/g, " ")}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type UserRow = Pick<
  Profile,
  "id" | "full_name" | "role" | "kyc_status" | "is_suspended" | "created_at"
>;

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const roleFilter = typeof sp.role === "string" ? sp.role : "";
  const search = typeof sp.search === "string" ? sp.search.trim() : "";
  const page = Math.max(1, parseInt(typeof sp.page === "string" ? sp.page : "1", 10) || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const supabase = await createClient();

  let query = supabase
    .from("profiles")
    .select("id, full_name, role, kyc_status, is_suspended, created_at", {
      count: "exact",
    })
    .order("created_at", { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1);

  if (roleFilter === "companion" || roleFilter === "client") {
    query = query.eq("role", roleFilter);
  }
  if (search) {
    query = query.ilike("full_name", `%${search}%`);
  }

  const { data, count, error } = await query;
  const users = (data as UserRow[] | null) ?? [];
  const totalPages = Math.ceil((count ?? 0) / PAGE_SIZE);

  const buildUrl = (params: Record<string, string>) => {
    const base: Record<string, string> = {};
    if (roleFilter) base.role = roleFilter;
    if (search) base.search = search;
    base.page = String(page);
    const merged = { ...base, ...params };
    const qs = new URLSearchParams(merged).toString();
    return `/admin/users?${qs}`;
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
         
        >
          Users
        </h1>
        <p
          className="mt-1 text-sm text-muted/50"

        >
          {count ?? 0} total users
        </p>
      </div>

      {/* Filters */}
      <form method="GET" className="flex flex-wrap gap-3 items-center">
        <input
          type="text"
          name="search"
          defaultValue={search}
          placeholder="Search name..."
          className="auth-input w-48 text-sm"

        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="auth-input w-36 text-sm"

        >
          <option value="">All roles</option>
          <option value="client">Client</option>
          <option value="companion">Companion</option>
        </select>
        <button type="submit" className="btn-ghost text-sm px-4 py-2">
          Filter
        </button>
        {(search || roleFilter) && (
          <Link href="/admin/users" className="text-xs text-muted/50 hover:text-muted transition-colors">
            Clear
          </Link>
        )}
      </form>

      {/* Table */}
      <div className="glass-card overflow-hidden">
        {error ? (
          <p className="p-6 text-sm text-red-400">
            Failed to load users.
          </p>
        ) : users.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted/40">
            No users found.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10">
                  {["Name", "Role", "KYC Status", "Suspended", "Joined", "Actions"].map((h) => (
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
                {users.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.04] transition-colors">
                    <td className="px-4 py-3 text-foreground/80">{u.full_name}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.role} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.kyc_status} />
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={u.is_suspended ? "true" : "false"} />
                    </td>
                    <td className="px-4 py-3 text-muted/50 text-xs">{formatDate(u.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {u.is_suspended ? (
                          <AdminActionButton
                            action={() => unsuspendUser(u.id)}
                            label="Unsuspend"
                            variant="ghost"
                          />
                        ) : (
                          <AdminActionButton
                            action={() => suspendUser(u.id)}
                            label="Suspend"
                            variant="danger"
                          />
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center gap-2">
          {page > 1 && (
            <Link href={buildUrl({ page: String(page - 1) })} className="btn-ghost text-xs px-3 py-1.5">
              Previous
            </Link>
          )}
          <span className="text-xs text-muted/40">
            Page {page} of {totalPages}
          </span>
          {page < totalPages && (
            <Link href={buildUrl({ page: String(page + 1) })} className="btn-ghost text-xs px-3 py-1.5">
              Next
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
