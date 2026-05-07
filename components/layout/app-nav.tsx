"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { NotificationBell } from "@/components/layout/notification-bell";

type NavUser = {
  fullName: string;
  role: "companion" | "client";
  avatarUrl?: string | null;
};

const CLIENT_NAV = [
  { label: "Browse", href: "/browse", icon: "eye" },
  { label: "Experiences", href: "/browse/experiences", icon: "calendar" },
  { label: "Messages", href: "/messages", icon: "message" },
  { label: "Bookings", href: "/bookings", icon: "check" },
];

const COMPANION_NAV = [
  { label: "Browse", href: "/browse", icon: "eye" },
  { label: "Availability", href: "/companion/posts", icon: "calendar" },
  { label: "Messages", href: "/messages", icon: "message" },
  { label: "Bookings", href: "/companion/bookings", icon: "check" },
];

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();
  const links = user.role === "companion" ? COMPANION_NAV : CLIENT_NAV;

  const isActive = (href: string) =>
    href === "/browse" ? pathname === href : pathname.startsWith(href);

  return (
    <>
      {/* ── Desktop top nav ─────────────────────────────── */}
      <header className="fixed inset-x-0 top-0 z-40 hidden border-b border-[rgba(212,175,55,0.1)] bg-[rgba(8,8,16,0.85)] backdrop-blur-xl md:block">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)]">
              <Icon name="diamond" className="h-3.5 w-3.5 text-gold" />
            </div>
            <span
              className="text-base tracking-[0.1em] text-foreground/80"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              ELITESEEK
            </span>
          </Link>

          {/* Links */}
          <div className="flex items-center gap-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={[
                  "rounded-lg px-4 py-2 text-sm transition-colors",
                  isActive(link.href)
                    ? "bg-[rgba(212,175,55,0.08)] text-gold"
                    : "text-muted hover:text-foreground",
                ].join(" ")}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Notification bell */}
          <NotificationBell />

          {/* Account */}
          <Link
            href="/account"
            className="flex items-center gap-2.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 transition-all hover:border-[rgba(212,175,55,0.25)]"
          >
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(212,175,55,0.15)] text-xs font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <span className="text-xs text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {user.fullName.split(" ")[0]}
            </span>
          </Link>
        </nav>
      </header>

      {/* ── Mobile bottom nav ───────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-[rgba(212,175,55,0.1)] bg-[rgba(8,8,16,0.92)] backdrop-blur-xl md:hidden">
        <div className="flex items-center justify-around px-2 py-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={[
                "flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors",
                isActive(link.href) ? "text-gold" : "text-muted/60",
              ].join(" ")}
            >
              <Icon name={link.icon} className="h-5 w-5" />
              <span className="text-[10px]" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {link.label}
              </span>
            </Link>
          ))}
          <Link
            href="/account"
            className={[
              "flex flex-col items-center gap-1 rounded-xl px-4 py-2 transition-colors",
              pathname.startsWith("/account") ? "text-gold" : "text-muted/60",
            ].join(" ")}
          >
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(212,175,55,0.2)] text-[10px] font-medium text-gold">
              {user.fullName.charAt(0).toUpperCase()}
            </div>
            <span className="text-[10px]" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Me
            </span>
          </Link>
        </div>
      </nav>
    </>
  );
}
