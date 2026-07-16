import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { AdminNavLinkClient as NavLinkClient } from "./admin-nav-link-client";

const NAV_LINKS = [
  { label: "Overview", href: "/admin" },
  { label: "Users", href: "/admin/users" },
  { label: "Moderation", href: "/admin/moderation" },
  { label: "KYC", href: "/admin/kyc" },
  { label: "Transactions", href: "/admin/transactions" },
];

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/browse");

  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!adminEmails.includes(user.email ?? "")) redirect("/browse");

  return (
    <div className="flex min-h-screen">
      {/* Sidebar — hidden on mobile, fixed on desktop */}
      <aside className="hidden md:flex md:flex-col md:fixed md:inset-y-0 md:top-[65px] md:left-0 md:w-56 shrink-0 border-r border-white/10 bg-[rgba(8,8,16,0.6)] backdrop-blur-sm z-30">
        <div className="px-4 pt-8 pb-4">
          <p className="text-[10px] uppercase tracking-widest text-muted/40 mb-4">
            Admin
          </p>
          <nav className="flex flex-col gap-1">
            {NAV_LINKS.map((link) => (
              <AdminNavLink key={link.href} href={link.href} label={link.label} />
            ))}
          </nav>
        </div>
      </aside>

      {/* Mobile top nav strip */}
      <div className="md:hidden fixed top-[57px] inset-x-0 z-30 bg-[rgba(8,8,16,0.92)] border-b border-white/10 px-4 py-2 overflow-x-auto">
        <nav className="flex gap-2 whitespace-nowrap">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-lg px-3 py-1.5 text-xs text-muted/70 hover:text-foreground transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Content */}
      <main className="flex-1 md:ml-56 min-h-screen px-4 py-8 md:px-8 mt-10 md:mt-0">
        {children}
      </main>
    </div>
  );
}

// Active-state nav link delegated to a client component
function AdminNavLink({ href, label }: { href: string; label: string }) {
  return <NavLinkClient href={href} label={label} />;
}
