import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { RequestActions } from "./request-actions";
import type { AccessRequestStatus } from "@/lib/database.types";

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
  client: { full_name: string } | null;
};

export default async function AccessRequestsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id, visibility")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");

  const { data: raw } = await supabase
    .from("access_requests")
    .select(`
      id,
      status,
      message,
      created_at,
      responded_at,
      client:profiles!client_id (full_name)
    `)
    .eq("companion_id", companion.id)
    .order("created_at", { ascending: false });

  const requests = (raw ?? []).map((r) => ({
    ...r,
    client: Array.isArray(r.client) ? r.client[0] ?? null : r.client,
  })) as RequestRow[];

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
  const clientName = request.client?.full_name ?? "Anonymous";
  const initials = clientName.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[rgba(212,175,55,0.1)] text-xs font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {initials}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm text-foreground/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {clientName}
              </p>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] ${STATUS_COLORS[request.status]}`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {STATUS_LABELS[request.status]}
              </span>
            </div>
            <p className="mt-0.5 text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Requested {new Date(request.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
            </p>
            {request.message && (
              <p className="mt-2 text-xs italic text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                &ldquo;{request.message}&rdquo;
              </p>
            )}
          </div>
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
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.05)]">
        <Icon name="lock" className="h-6 w-6 text-gold/40" />
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
