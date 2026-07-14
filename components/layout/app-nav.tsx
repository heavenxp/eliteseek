"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";
import { NotificationBell } from "@/components/layout/notification-bell";
import { createClient } from "@/lib/supabase/client";

type NavUser = {
  fullName: string;
  role: "companion" | "client";
  avatarUrl?: string | null;
  username: string | null;
};

const CLIENT_NAV = [
  { label: "Browse", href: "/browse", icon: "eye" },
  { label: "Search", href: "/search", icon: "search" },
  { label: "Feed", href: "/feed", icon: "feed" },
  { label: "Bookings", href: "/bookings", icon: "check" },
  { label: "Messages", href: "/messages", icon: "message" },
  { label: "Profile", href: "/account", icon: "user" },
];

// ── Account dropdown ──────────────────────────────────────────

function AccountMenu({ fullName, compact = false }: { fullName: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const initial = fullName.charAt(0).toUpperCase();
  const firstName = fullName.split(" ")[0];

  useEffect(() => {
    function handleOutside(e: MouseEvent | TouchEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutside);
    document.addEventListener("touchstart", handleOutside as EventListener, { passive: true });
    return () => {
      document.removeEventListener("mousedown", handleOutside);
      document.removeEventListener("touchstart", handleOutside as EventListener);
    };
  }, []);

  async function handleSignOut() {
    setSigningOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = "/";
  }

  const avatar = (
    <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[rgba(212,175,55,0.2)] text-[10px] font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
      {initial}
    </div>
  );

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      {compact ? (
        // Mobile: stacked icon + label
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 text-muted/60 transition-colors"
        >
          <div className="flex h-6 w-6 items-center justify-center rounded-full border border-[rgba(212,175,55,0.55)] bg-[rgba(212,175,55,0.2)] text-[10px] font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {initial}
          </div>
          <span className="whitespace-nowrap text-[9px]" style={{ fontFamily: "var(--font-dm-sans)" }}>Profile</span>
        </button>
      ) : (
        // Desktop: pill button
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-2.5 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.03)] px-3 py-1.5 transition-all hover:border-[rgba(212,175,55,0.25)]"
        >
          {avatar}
          <span className="text-xs text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {firstName}
          </span>
          <Icon name="chevron-down" className={`h-3 w-3 text-muted/40 transition-transform ${open ? "rotate-180" : ""}`} />
        </button>
      )}

      {/* Dropdown */}
      {open && (
        <div className={`absolute z-50 w-52 overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[rgba(8,8,16,0.98)] shadow-[0_8px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl ${compact ? "bottom-full right-0 mb-2" : "right-0 top-11"}`}>
          {/* Name */}
          <div className="border-b border-[rgba(212,175,55,0.08)] px-4 py-3">
            <p className="truncate text-sm font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              {fullName}
            </p>
          </div>

          {/* Links */}
          <div className="py-1">
            <Link
              href="/account"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-[rgba(212,175,55,0.06)] hover:text-foreground"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <Icon name="user" className="h-4 w-4 shrink-0 text-muted/50" />
              My Profile
            </Link>
            <Link
              href="/account/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-foreground/70 transition-colors hover:bg-[rgba(212,175,55,0.06)] hover:text-foreground"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <Icon name="settings" className="h-4 w-4 shrink-0 text-muted/50" />
              Settings
            </Link>
          </div>

          {/* Divider */}
          <div className="border-t border-[rgba(255,255,255,0.06)]" />

          {/* Sign out */}
          <div className="py-1">
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-red-400/80 transition-colors hover:bg-[rgba(239,68,68,0.06)] hover:text-red-400 disabled:opacity-40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <Icon name="logout" className="h-4 w-4 shrink-0" />
              {signingOut ? "Signing out…" : "Sign Out"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── App nav ───────────────────────────────────────────────────

export function AppNav({ user }: { user: NavUser }) {
  const pathname = usePathname();

  const companionNav = [
    ...(user.username ? [{ label: "Profile", href: `/profile/${user.username}`, icon: "user" }] : []),
    { label: "Feed", href: "/feed", icon: "feed" },
    { label: "Search", href: "/search", icon: "search" },
    { label: "Schedule", href: "/companion/posts", icon: "calendar" },
    { label: "Bookings", href: "/companion/bookings", icon: "check" },
    { label: "Messages", href: "/messages", icon: "message" },
  ];

  const links = user.role === "companion" ? companionNav : CLIENT_NAV;

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

          <div className="flex items-center gap-3">
            <NotificationBell />
            <AccountMenu fullName={user.fullName} />
          </div>
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
                "flex flex-col items-center gap-0.5 rounded-xl px-2 py-2 transition-colors",
                isActive(link.href) ? "text-gold" : "text-muted/60",
              ].join(" ")}
            >
              <Icon name={link.icon} className="h-5 w-5" />
              <span className="whitespace-nowrap text-[9px]" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {link.label}
              </span>
            </Link>
          ))}
          <AccountMenu fullName={user.fullName} compact />
        </div>
      </nav>
    </>
  );
}
