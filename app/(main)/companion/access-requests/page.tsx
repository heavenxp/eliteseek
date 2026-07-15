import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icons";
import { RequestActions } from "./request-actions";
import { TierBadge } from "@/components/badges/tier-badge";
import type { AccessRequestStatus, MembershipTier } from "@/lib/database.types";

export const metadata = { title: "Access Requests — EliteSeek" };

const STATUS_LABELS: Record<AccessRequestStatus, string> = {
  pending: "Pending",
  approved: "Approved",
  declined: "Declined",
};

const STATUS_COLORS: Record<AccessRequestStatus, string> = {
  pending: "bg-[rgba(251,191,36,0.12)] text-amber-400",
  approved: "bg-[rgba(52,211,153,0.1)] text-emerald-400",
  declined: "bg-[rgba(248,113,113,0.1)] text-red-400/80",
};

type RequestRow = {
  id: string;
  status: AccessRequestStatus;
  message: string | null;
  created_at: string;
  responded_at: string | null;
  clientName: string;
  clientHandle: string;
  membershipTier: MembershipTier;
  clientTier: string;
  memberSince: string;
};

export default async function AccessRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("host_profiles")
    .select("id, visibility")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");

  const { data: raw } = await supabase
    .from("access_requests")
    .select("id, status, message, created_at, responded_at, client_id")
    .eq("companion_id", companion.id)
    .order("created_at", { ascending: false });

  const rawList = raw ?? [];
  const clientIds = [...new Set(rawList.map((r) => r.client_id))];

  const admin = createAdminClient();
  const [profilesRes, tierRes] = await Promise.all([
    clientIds.length > 0
      ? admin.from("profiles").select("id, full_name, created_at").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string; created_at: string }[] }),
    clientIds.length > 0
      ? admin.from("profiles").select("id, membership_tier, client_tier").in("id", clientIds)
      : Promise.resolve({ data: [] as { id: string; membership_tier: MembershipTier; client_tier: string }[] }),
  ]);

  const profileMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p]));
  const tierMap = new Map((tierRes.data ?? []).map((p) => [p.id, p]));

  const requests: RequestRow[] = rawList.map((r) => {
    const profile = profileMap.get(r.client_id);
    const fullName = profile?.full_name ?? "Anonymous";
    const handle = "@" + fullName.split(" ")[0].toLowerCase();
    const memberSince = profile?.created_at
      ? new Date(profile.created_at).toLocaleDateString("en-US", { month: "long", year: "numeric" })
      : "—";
    return {
      id: r.id,
      status: r.status as AccessRequestStatus,
      message: r.message,
      created_at: r.created_at,
      responded_at: r.responded_at,
      clientName: fullName,
      clientHandle: handle,
      membershipTier: (tierMap.get(r.client_id)?.membership_tier ?? "bronze") as MembershipTier,
      clientTier: tierMap.get(r.client_id)?.client_tier ?? "bronze",
      memberSince,
    };
  });

  const pending = requests.filter((r) => r.status === "pending");
  const approved = requests.filter((r) => r.status === "approved");
  const declined = requests.filter((r) => r.status === "declined");

  const isProfileLocked = companion.visibility !== "public";

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
            Access Requests
          </h1>
          <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {pending.length} pending · {approved.length} approved
          </p>
        </div>
        <Link
          href="/account/settings"
          className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <Icon name="lock" className="h-4 w-4" />
          Lock settings
        </Link>
      </div>

      {/* Profile lock status notice */}
      {!isProfileLocked && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-[rgba(251,191,36,0.2)] bg-[rgba(251,191,36,0.05)] p-4">
          <Icon name="eye" className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/70" />
          <div>
            <p className="text-sm text-amber-400/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Your profile is currently public — no access control is active.
            </p>
            <Link href="/account/settings" className="mt-1 text-xs text-amber-400/60 underline underline-offset-2 hover:text-amber-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Set to Locked or Elite Only to use access control →
            </Link>
          </div>
        </div>
      )}

      {requests.length === 0 ? (
        <EmptyState isLocked={isProfileLocked} />
      ) : (
        <div className="space-y-8">
          {pending.length > 0 && (
            <Section title="Awaiting Review" count={pending.length}>
              {pending.map((r) => (
                <RequestCard key={r.id} request={r} showActions />
              ))}
            </Section>
          )}
          {approved.length > 0 && (
            <Section title="Approved" count={approved.length}>
              {approved.map((r) => (
                <RequestCard key={r.id} request={r} />
              ))}
            </Section>
          )}
          {declined.length > 0 && (
            <Section title="Declined" count={declined.length} faded>
              {declined.map((r) => (
                <RequestCard key={r.id} request={r} />
              ))}
            </Section>
          )}
        </div>
      )}
    </div>
  );
}

function Section({
  title,
  count,
  children,
  faded = false,
}: {
  title: string;
  count: number;
  children: React.ReactNode;
  faded?: boolean;
}) {
  return (
    <section className={faded ? "opacity-60" : ""}>
      <p className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {title} · {count}
      </p>
      <div className="space-y-3">{children}</div>
    </section>
  );
}

function RequestCard({
  request,
  showActions = false,
}: {
  request: RequestRow;
  showActions?: boolean;
}) {
  const initials = request.clientName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex items-start gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-xs font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {initials}
        </div>
        <div className="flex-1 min-w-0">
          {/* Name row */}
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-medium text-foreground/90" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {request.clientName}
            </p>
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[request.status]}`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {STATUS_LABELS[request.status]}
            </span>
          </div>

          {/* Handle + tier + member since */}
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {request.clientHandle}
            </span>
            <TierBadge type="client" tier={request.clientTier} />
            <span className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Member since {request.memberSince}
            </span>
          </div>

          {/* Request date */}
          <p className="mt-1.5 text-xs text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Requested {new Date(request.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
          </p>

          {/* Optional message */}
          {request.message && (
            <p className="mt-2 text-xs italic text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              &ldquo;{request.message}&rdquo;
            </p>
          )}
        </div>
      </div>

      {showActions && (
        <div className="mt-4 border-t border-[rgba(255,255,255,0.05)] pt-3">
          <RequestActions requestId={request.id} />
        </div>
      )}
    </div>
  );
}

function EmptyState({ isLocked }: { isLocked: boolean }) {
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Icon name="lock" className="h-6 w-6 text-muted/40" />
      </div>
      <p className="text-xl font-light text-foreground/60" style={{ fontFamily: "var(--font-cormorant)" }}>
        No access requests yet
      </p>
      <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {isLocked
          ? "When clients request to view your locked profile, they'll appear here."
          : "Lock your profile to start receiving access requests."}
      </p>
      {!isLocked && (
        <Link
          href="/account/settings"
          className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Configure profile lock
        </Link>
      )}
    </div>
  );
}
