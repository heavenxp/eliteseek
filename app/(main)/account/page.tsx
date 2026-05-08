import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";

export default async function AccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isCompanion = profile.role === "companion";

  const [bookingResult, clientResult, companionResult] = await Promise.all([
    supabase
      .from("bookings")
      .select("id, status")
      .eq(isCompanion ? "companion_id" : "client_id", user.id),
    !isCompanion
      ? supabase
          .from("client_profiles")
          .select("membership_tier")
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
    isCompanion
      ? supabase
          .from("companion_profiles")
          .select("username, verification_tier")
          .eq("user_id", user.id)
          .single()
      : Promise.resolve({ data: null }),
  ]);

  const bookings = bookingResult.data ?? [];
  const pendingCount = bookings.filter((b) => b.status === "pending").length;
  const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
  const completedCount = bookings.filter((b) => b.status === "completed").length;

  const clientProfile = clientResult.data;
  const companionProfile = companionResult.data;

  const initials = (profile.full_name ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const tierLabel =
    clientProfile?.membership_tier === "elite"
      ? "Elite"
      : clientProfile?.membership_tier === "silver"
        ? "Silver"
        : "Bronze";

  const verificationLabel =
    companionProfile?.verification_tier === "select"
      ? "EliteSeek Select"
      : companionProfile?.verification_tier === "verified"
        ? "Verified Host"
        : "Host";

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-10">
        {/* Profile card */}
        <div className="glass-card mb-6 rounded-2xl p-6">
          <div className="flex items-center gap-5">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.1)] text-xl font-semibold text-gold">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <h1
                className="text-2xl font-light text-foreground"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {profile.full_name}
              </h1>
              <p
                className="text-sm text-muted/60"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {isCompanion ? "Elite Host" : "Member"} · Since {memberSince}
              </p>
              <span
                className="mt-1.5 inline-block rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-0.5 text-xs text-gold"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {isCompanion ? verificationLabel : `${tierLabel} Tier`}
              </span>
            </div>
            <Link
              href="/account/settings"
              className="btn-ghost rounded-xl p-2.5"
              aria-label="Settings"
            >
              <Icon name="camera" className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          {[
            { label: "Pending", value: pendingCount },
            { label: "Confirmed", value: confirmedCount },
            { label: "Completed", value: completedCount },
          ].map((stat) => (
            <div key={stat.label} className="glass-card rounded-2xl p-4 text-center">
              <p
                className="text-3xl font-light text-gold"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {stat.value}
              </p>
              <p
                className="mt-0.5 text-xs text-muted/50"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Quick navigation */}
        <div className="glass-card overflow-hidden rounded-2xl">
          {isCompanion ? (
            <CompanionLinks username={companionProfile?.username ?? null} />
          ) : (
            <ClientLinks tier={clientProfile?.membership_tier ?? "bronze"} />
          )}
        </div>
      </div>
    </div>
  );
}

function ClientLinks({ tier }: { tier: string }) {
  const links = [
    { href: "/bookings", icon: "calendar" as const, label: "My Bookings", desc: "View booking history" },
    { href: "/messages", icon: "message" as const, label: "Messages", desc: "Your conversations" },
    {
      href: "/membership",
      icon: "star" as const,
      label: "Membership",
      desc: `${tier.charAt(0).toUpperCase() + tier.slice(1)} plan · Manage`,
    },
    { href: "/account/settings", icon: "camera" as const, label: "Profile Settings", desc: "Edit your details" },
  ];
  return <QuickLinkList links={links} />;
}

function CompanionLinks({ username }: { username: string | null }) {
  const links: { href: string; icon: Parameters<typeof Icon>[0]["name"]; label: string; desc: string }[] = [
    { href: "/companion/posts/new", icon: "plus", label: "New Availability Post", desc: "Share when you're available" },
    { href: "/companion/bookings", icon: "calendar", label: "Bookings", desc: "Manage booking requests" },
    { href: "/companion/access-requests", icon: "lock", label: "Access Requests", desc: "Profile access queue" },
    { href: "/messages", icon: "message", label: "Messages", desc: "Your conversations" },
    { href: "/account/earnings", icon: "star", label: "Earnings", desc: "Revenue & payouts" },
    { href: "/account/settings", icon: "camera", label: "Settings", desc: "Profile & pricing" },
    ...(username
      ? [{ href: `/profile/${username}`, icon: "eye" as const, label: "View My Profile", desc: `/profile/${username}` }]
      : []),
  ];
  return <QuickLinkList links={links} />;
}

function QuickLinkList({
  links,
}: {
  links: { href: string; icon: Parameters<typeof Icon>[0]["name"]; label: string; desc: string }[];
}) {
  return (
    <ul className="divide-y divide-[rgba(212,175,55,0.08)]">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(212,175,55,0.04)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.06)]">
              <Icon name={link.icon} className="h-4 w-4 text-gold/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p
                className="text-sm text-foreground"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {link.label}
              </p>
              <p
                className="truncate text-xs text-muted/40"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {link.desc}
              </p>
            </div>
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-muted/30" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
