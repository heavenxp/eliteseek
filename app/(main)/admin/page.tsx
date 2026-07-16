import { createClient } from "@/lib/supabase/server";
import type { Profile, ContentPost } from "@/lib/database.types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    verified: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    failed: "bg-red-500/10 text-red-400 border-red-500/20",
    not_started: "bg-white/5 text-muted/60 border-white/10",
    companion: "bg-white/[0.07] text-gold border-white/10",
    client: "bg-white/5 text-muted/70 border-white/10",
    flagged: "bg-orange-500/10 text-orange-400 border-orange-500/20",
  };
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs",
        colors[status] ?? "bg-white/5 text-muted/50 border-white/10",
      ].join(" ")}

    >
      {status.replace("_", " ")}
    </span>
  );
}

export default async function AdminOverviewPage() {
  const supabase = await createClient();

  const [
    usersCount,
    companionsCount,
    pendingModCount,
    pendingKycCount,
    recentUsers,
    pendingMod,
    pendingKyc,
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase
      .from("host_profiles")
      .select("*", { count: "exact", head: true })
      .eq("is_available", true),
    supabase
      .from("content_posts")
      .select("*", { count: "exact", head: true })
      .eq("moderation_status", "pending"),
    supabase
      .from("profiles")
      .select("*", { count: "exact", head: true })
      .eq("kyc_status", "pending"),
    supabase
      .from("profiles")
      .select("id, full_name, role, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("content_posts")
      .select("id, title, companion_id, created_at, moderation_status")
      .eq("moderation_status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("profiles")
      .select("id, full_name, created_at")
      .eq("kyc_status", "pending")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalUsers = usersCount.count ?? 0;
  const activeCompanions = companionsCount.count ?? 0;
  const pendingActions = (pendingModCount.count ?? 0) + (pendingKycCount.count ?? 0);

  const statCards = [
    {
      label: "Total Users",
      value: totalUsers.toLocaleString(),
      note: "registered profiles",
    },
    {
      label: "Active Companions",
      value: activeCompanions.toLocaleString(),
      note: "marked available",
    },
    {
      label: "Pending Actions",
      value: pendingActions.toLocaleString(),
      note: "moderation + KYC",
      highlight: pendingActions > 0,
    },
    {
      label: "Platform Revenue",
      value: "$0",
      note: "Stripe not yet live",
    },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-8">
      <div>
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
         
        >
          Admin Overview
        </h1>
        <p
          className="mt-1 text-sm text-muted/50"

        >
          EliteSeek platform dashboard
        </p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {statCards.map((card) => (
          <div key={card.label} className="glass-card p-5">
            <p
              className="text-xs uppercase tracking-widest text-muted/50"

            >
              {card.label}
            </p>
            <p
              className={[
                "mt-2 text-2xl font-bold tracking-tight",
                card.highlight ? "text-amber-400" : "text-foreground",
              ].join(" ")}
             
            >
              {card.value}
            </p>
            <p
              className="mt-1 text-xs text-muted/40"

            >
              {card.note}
            </p>
          </div>
        ))}
      </div>

      {/* Three data sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent signups */}
        <div className="glass-card p-5">
          <h2
            className="mb-4 text-base font-light text-foreground"
           
          >
            Recent Signups
          </h2>
          {recentUsers.data && recentUsers.data.length > 0 ? (
            <ul className="divide-y divide-white/[0.06]">
              {(recentUsers.data as Pick<Profile, "id" | "full_name" | "role" | "created_at">[]).map(
                (u) => (
                  <li key={u.id} className="flex items-center justify-between py-3">
                    <div>
                      <p
                        className="text-sm text-foreground/80"

                      >
                        {u.full_name}
                      </p>
                      <p
                        className="text-xs text-muted/40"

                      >
                        {formatDate(u.created_at)}
                      </p>
                    </div>
                    <StatusBadge status={u.role} />
                  </li>
                )
              )}
            </ul>
          ) : (
            <p
              className="py-6 text-center text-sm text-muted/40"

            >
              No users yet
            </p>
          )}
        </div>

        {/* Pending moderation */}
        <div className="glass-card p-5">
          <h2
            className="mb-4 text-base font-light text-foreground"
           
          >
            Pending Moderation
          </h2>
          {pendingMod.data && pendingMod.data.length > 0 ? (
            <ul className="divide-y divide-white/[0.06]">
              {(
                pendingMod.data as Pick<
                  ContentPost,
                  "id" | "title" | "companion_id" | "created_at" | "moderation_status"
                >[]
              ).map((post) => (
                <li key={post.id} className="py-3">
                  <p
                    className="truncate text-sm text-foreground/80"

                  >
                    {post.title ?? "(untitled)"}
                  </p>
                  <div className="mt-1 flex items-center justify-between gap-2">
                    <p
                      className="truncate text-xs text-muted/40"

                    >
                      {formatDate(post.created_at)}
                    </p>
                    <StatusBadge status={post.moderation_status} />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="py-6 text-center text-sm text-muted/40"

            >
              No pending posts
            </p>
          )}
        </div>

        {/* Pending KYC */}
        <div className="glass-card p-5">
          <h2
            className="mb-4 text-base font-light text-foreground"
           
          >
            Pending KYC
          </h2>
          {pendingKyc.data && pendingKyc.data.length > 0 ? (
            <ul className="divide-y divide-white/[0.06]">
              {(
                pendingKyc.data as Pick<Profile, "id" | "full_name" | "created_at">[]
              ).map((p) => (
                <li key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p
                      className="text-sm text-foreground/80"

                    >
                      {p.full_name}
                    </p>
                    <p
                      className="text-xs text-muted/40"

                    >
                      {formatDate(p.created_at)}
                    </p>
                  </div>
                  <StatusBadge status="pending" />
                </li>
              ))}
            </ul>
          ) : (
            <p
              className="py-6 text-center text-sm text-muted/40"

            >
              No pending KYC
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
