import Link from "next/link";
import { Icon } from "@/components/icons";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="page-bg relative flex min-h-screen flex-col">
      {/* Top nav */}
      <header className="relative z-10 px-6 pt-6">
        <Link href="/login" className="inline-flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
            <Icon name="diamond" className="h-3.5 w-3.5 text-gold" />
          </div>
          <span
            className="text-base tracking-[0.12em] text-foreground/80"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            ELITESEEK
          </span>
        </Link>
      </header>

      <main className="relative z-10 flex flex-1 items-center justify-center px-4 py-12">
        {children}
      </main>

      {/* Legally required line (Australian Online Safety Act) */}
      <footer className="relative z-10 px-6 pb-8 text-center">
        <p className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          © 2026 EliteSeek Pty Ltd · All Elite Hosts are age-verified (18+) under the Australian Online Safety Act.
        </p>
      </footer>
    </div>
  );
}
