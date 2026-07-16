"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { NotificationBell } from "@/components/layout/notification-bell";

// ── The app shell (redesign, 16 Jul 2026) ──────────────────────
// Mobile: persistent bottom tab bar + slim top bar (wordmark + bell).
// Desktop: slim left rail. Replaces the old top-nav layout entirely.

type ShellUser = {
  fullName: string;
  role: "companion" | "client";
  avatarUrl: string | null;
  username: string | null;
};

const TABS = (user: ShellUser) => [
  { label: "Home", href: "/events", icon: "feed" as const },
  { label: "Browse", href: "/browse", icon: "search" as const },
  { label: "Create", href: "/events/create", icon: "plus" as const, accent: true },
  { label: "Messages", href: "/messages", icon: "message" as const },
  {
    label: "Profile",
    href: user.role === "companion" && user.username ? `/profile/${user.username}` : "/account",
    icon: "user" as const,
  },
];

export function AppShell({ user, children }: { user: ShellUser; children: React.ReactNode }) {
  const pathname = usePathname();
  const tabs = TABS(user);

  const isActive = (href: string) => {
    if (href === "/events") return pathname === "/events" || pathname === "/events/all";
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="min-h-screen">
      {/* ── Mobile top bar ── */}
      <header className="sticky top-0 z-40 flex h-12 items-center justify-between border-b border-white/[0.06] bg-[rgba(8,8,16,0.9)] px-4 backdrop-blur-md md:hidden">
        <Link href="/events" className="flex items-center gap-2">
          <span
            className="text-lg tracking-[0.1em] text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ELITESEEK
          </span>
        </Link>
        <NotificationBell />
      </header>

      {/* ── Desktop left rail ── */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-16 flex-col items-center border-r border-white/[0.06] bg-[#0a0a13] py-4 md:flex lg:w-56 lg:items-stretch lg:px-3">
        <Link href="/events" className="mb-6 flex items-center justify-center gap-2 lg:justify-start lg:px-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold/15">
            <Icon name="diamond" className="h-4 w-4 text-gold" />
          </span>
          <span
            className="hidden text-lg tracking-[0.1em] text-foreground lg:block"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ELITESEEK
          </span>
        </Link>

        <nav className="flex flex-1 flex-col items-center gap-1 lg:items-stretch">
          {tabs.map((tab) =>
            tab.accent ? (
              <Link
                key={tab.label}
                href={tab.href}
                className="my-2 flex h-10 w-10 items-center justify-center rounded-full bg-gold text-black transition-colors hover:bg-gold-light lg:h-11 lg:w-auto lg:justify-start lg:gap-3 lg:rounded-xl lg:px-3"
              >
                <Icon name={tab.icon} className="h-5 w-5" />
                <span className="hidden text-sm font-semibold lg:block">{tab.label}</span>
              </Link>
            ) : (
              <Link
                key={tab.label}
                href={tab.href}
                className={`flex h-10 w-10 items-center justify-center rounded-xl transition-colors lg:h-11 lg:w-auto lg:justify-start lg:gap-3 lg:px-3 ${
                  isActive(tab.href)
                    ? "bg-white/[0.07] text-foreground"
                    : "text-muted/60 hover:bg-white/[0.04] hover:text-foreground"
                }`}
              >
                <Icon name={tab.icon} className="h-5 w-5" />
                <span className={`hidden text-sm lg:block ${isActive(tab.href) ? "font-semibold" : ""}`}>
                  {tab.label}
                </span>
              </Link>
            )
          )}
        </nav>

        <div className="flex flex-col items-center gap-2 lg:flex-row lg:items-center lg:justify-between lg:px-3">
          <NotificationBell />
          <Link
            href="/account"
            className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-white/[0.08] text-xs font-semibold text-foreground/80"
            title={user.fullName}
          >
            {user.avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              user.fullName.charAt(0).toUpperCase()
            )}
          </Link>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="pb-16 md:pb-0 md:pl-16 lg:pl-56">{children}</main>

      {/* ── Mobile bottom tabs ── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex h-14 items-stretch border-t border-white/[0.06] bg-[rgba(10,10,19,0.95)] backdrop-blur-md md:hidden">
        {tabs.map((tab) =>
          tab.accent ? (
            <Link key={tab.label} href={tab.href} className="flex flex-1 items-center justify-center">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-gold text-black">
                <Icon name={tab.icon} className="h-5 w-5" />
              </span>
            </Link>
          ) : (
            <Link
              key={tab.label}
              href={tab.href}
              className={`flex flex-1 flex-col items-center justify-center gap-0.5 ${
                isActive(tab.href) ? "text-foreground" : "text-muted/50"
              }`}
            >
              <Icon name={tab.icon} className="h-[22px] w-[22px]" />
              <span className="text-[10px] font-medium">{tab.label}</span>
            </Link>
          )
        )}
      </nav>
    </div>
  );
}
