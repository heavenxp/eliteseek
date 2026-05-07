"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AdminNavLinkClient({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const isActive =
    href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);

  return (
    <Link
      href={href}
      className={[
        "rounded-lg px-3 py-2 text-sm transition-colors",
        isActive
          ? "bg-[rgba(212,175,55,0.08)] text-gold"
          : "text-muted/70 hover:text-foreground",
      ].join(" ")}
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {label}
    </Link>
  );
}
