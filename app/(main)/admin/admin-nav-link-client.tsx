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
          ? "bg-white/[0.04] text-gold"
          : "text-muted/70 hover:text-foreground",
      ].join(" ")}

    >
      {label}
    </Link>
  );
}
