import Link from "next/link";
import { heroStats } from "@/data/landing";
import { Icon, IconArrowRight } from "@/components/icons";

// ── Guest landing: hero + sign-in only (unauthenticated visitors) ──
export function GuestLanding() {
  return (
    <div className="page-bg relative min-h-screen overflow-x-hidden">
      {/* Ambient background glows */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-1/4 -right-48 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(180,120,40,0.06)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_70%)]" />
      </div>

      {/* Navigation */}
      <header className="relative z-20 border-b border-[rgba(212,175,55,0.1)]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          <Link href="/" className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)]">
              <Icon name="diamond" className="h-4 w-4 text-gold" />
            </div>
            <span
              className="text-xl font-semibold tracking-[0.08em] text-foreground"
              style={{ fontFamily: "var(--font-cormorant)", letterSpacing: "0.12em" }}
            >
              ELITESEEK
            </span>
          </Link>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="hidden text-sm text-muted transition-colors hover:text-foreground md:block"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Sign In
            </Link>
            <Link
              href="/signup"
              className="btn-gold rounded-full px-5 py-2 text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Join EliteSeek
            </Link>
          </div>
        </nav>
      </header>

      {/* Hero */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <div className="space-y-8">
            <div className="badge-verified inline-flex items-center gap-2 rounded-full px-4 py-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-[#d4af37]" />
              Now accepting applications — EliteSeek Select
            </div>

            <h1
              className="text-balance text-5xl font-light leading-[1.08] text-foreground md:text-7xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Curated{" "}
              <span className="text-gold-gradient italic">Elite Hosts</span>
              <br />
              for the{" "}
              <span className="text-gold-gradient">Discerning</span>
            </h1>

            <p
              className="max-w-lg text-lg leading-relaxed text-muted"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Discover extraordinary social experiences with handpicked Elite Hosts.
              Private dinners, exclusive events, travel, and more — on your terms.
            </p>

            <div className="flex flex-wrap justify-center gap-3">
              <Link
                href="/signup"
                className="btn-gold flex items-center gap-2 rounded-full px-7 py-3.5 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Get Started
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/login"
                className="btn-ghost flex items-center gap-2 rounded-full px-7 py-3.5 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Sign In
              </Link>
            </div>

            {/* Stats */}
            <div className="flex justify-center gap-12 pt-2">
              {heroStats.map((stat) => (
                <div key={stat.label} className="text-center">
                  <p
                    className="text-2xl font-medium text-gold"
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {stat.value}
                  </p>
                  <p className="mt-0.5 text-xs text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    {stat.label}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-[rgba(212,175,55,0.1)] py-10">
        <div className="mx-auto max-w-7xl px-6 text-center">
          <p
            className="text-xs text-muted/40"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            © 2026 EliteSeek Pty Ltd · All Elite Hosts are age-verified (18+) under the Australian Online Safety Act.
          </p>
        </div>
      </footer>
    </div>
  );
}
