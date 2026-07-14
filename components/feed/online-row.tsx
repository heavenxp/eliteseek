import Link from "next/link";
import type { OnlineUser } from "@/app/actions/presence";

function OnlineBubble({ user }: { user: OnlineUser }) {
  const href =
    user.role === "companion"
      ? user.username
        ? `/profile/${user.username}`
        : `/companion/${user.id}`
      : `/profile/client/${user.id}`;

  const initial = user.full_name.charAt(0).toUpperCase();
  const firstName = user.full_name.split(" ")[0];

  return (
    <Link href={href} className="flex flex-col items-center gap-1 shrink-0">
      <div className="relative">
        <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border-2 border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.08)] text-sm font-medium text-gold">
          {user.avatar_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={user.avatar_url} alt="" className="h-full w-full object-cover" />
          ) : (
            <span style={{ fontFamily: "var(--font-dm-sans)" }}>{initial}</span>
          )}
        </div>
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-[rgba(8,8,16,1)] bg-emerald-400" />
      </div>
      <span
        className="max-w-[52px] truncate text-[9px] text-foreground/60"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {firstName}
      </span>
    </Link>
  );
}

export function OnlineRow({
  hosts,
  clients,
}: {
  hosts: OnlineUser[];
  clients: OnlineUser[];
}) {
  if (hosts.length === 0 && clients.length === 0) return null;

  return (
    <div className="border-b border-white/[0.06] px-4 py-3">
      <p
        className="mb-3 text-[10px] font-medium uppercase tracking-[0.12em] text-muted/40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Online Now
      </p>
      <div className="overflow-x-auto" style={{ scrollbarWidth: "none" }}>
        <div className="flex gap-4 pb-1">
          {hosts.length > 0 && (
            <div className="flex items-start gap-3 shrink-0">
              <div className="flex flex-col justify-center pt-1 shrink-0">
                <span
                  className="text-[9px] uppercase tracking-widest text-muted/30"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Hosts
                </span>
              </div>
              {hosts.map((u) => (
                <OnlineBubble key={u.id} user={u} />
              ))}
            </div>
          )}

          {hosts.length > 0 && clients.length > 0 && (
            <div className="mx-1 w-px shrink-0 self-stretch bg-white/[0.07]" />
          )}

          {clients.length > 0 && (
            <div className="flex items-start gap-3 shrink-0">
              <div className="flex flex-col justify-center pt-1 shrink-0">
                <span
                  className="text-[9px] uppercase tracking-widest text-muted/30"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Clients
                </span>
              </div>
              {clients.map((u) => (
                <OnlineBubble key={u.id} user={u} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
