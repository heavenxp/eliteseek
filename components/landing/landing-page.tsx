import Link from "next/link";
import {
  featuredCompanions,
  heroStats,
  membershipTiers,
  navLinks,
  platforms,
  trustFeatures,
} from "@/data/landing";
import { GlassCard } from "@/components/ui/glass-card";
import { Icon, IconArrowRight, IconCheck, IconStar } from "@/components/icons";

export function LandingPage() {
  return (
    <div className="page-bg relative min-h-screen overflow-x-hidden">
      {/* ── Ambient background glows ── */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 h-[600px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.08)_0%,transparent_70%)]" />
        <div className="absolute top-1/4 -right-48 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(180,120,40,0.06)_0%,transparent_70%)]" />
        <div className="absolute bottom-0 left-1/4 h-[400px] w-[600px] rounded-full bg-[radial-gradient(circle,rgba(212,175,55,0.05)_0%,transparent_70%)]" />
      </div>

      {/* ── Navigation ── */}
      <header className="relative z-20 border-b border-[rgba(212,175,55,0.1)]">
        <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5">
          {/* Logo */}
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

          {/* Links */}
          <div className="hidden items-center gap-8 md:flex">
            {navLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="text-sm text-muted transition-colors hover:text-foreground"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Actions */}
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

      {/* ── Hero ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 pb-20 pt-24">
        <div className="grid items-center gap-16 lg:grid-cols-[1fr_440px]">
          {/* Left */}
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

            <div className="flex flex-wrap gap-3">
              <Link
                href="/browse"
                className="btn-gold flex items-center gap-2 rounded-full px-7 py-3.5 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Discover Elite Hosts
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?role=companion"
                className="btn-ghost flex items-center gap-2 rounded-full px-7 py-3.5 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Become an Elite Host
              </Link>
            </div>

            {/* Stats */}
            <div className="flex gap-10 pt-2">
              {heroStats.map((stat) => (
                <div key={stat.label}>
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

          {/* Right — Featured companion preview */}
          <div className="relative hidden lg:block">
            <GlassCard gold className="relative overflow-hidden p-0.5">
              <div className="companion-placeholder h-[480px] w-full rounded-[14px]">
                {/* Decorative companion silhouette */}
                <div className="flex h-full flex-col justify-end p-6">
                  <div className="space-y-3">
                    <div className="badge-select inline-flex items-center gap-1.5 rounded-full px-3 py-1">
                      <Icon name="star" className="h-3 w-3" />
                      EliteSeek Select
                    </div>
                    <div>
                      <p
                        className="text-2xl font-light text-foreground"
                        style={{ fontFamily: "var(--font-cormorant)" }}
                      >
                        Isabelle M.
                      </p>
                      <p className="text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
                        Monaco · Art, Dinners, Travel
                      </p>
                    </div>
                    <div className="flex items-center gap-1">
                      {[...Array(5)].map((_, i) => (
                        <IconStar key={i} className="h-3.5 w-3.5 text-[#d4af37]" />
                      ))}
                      <span className="ml-1 text-xs text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
                        5.0 · 48 reviews
                      </span>
                    </div>
                    <button
                      className="btn-gold w-full rounded-xl py-2.5 text-sm"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      View Profile
                    </button>
                  </div>
                </div>
              </div>
            </GlassCard>

            {/* Floating accent card */}
            <div className="absolute -left-10 top-12">
              <GlassCard className="w-48 p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(212,175,55,0.1)]">
                    <Icon name="calendar" className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-xs text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      Next available
                    </p>
                    <p
                      className="text-sm font-medium text-foreground"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      Tomorrow, 7PM
                    </p>
                  </div>
                </div>
              </GlassCard>
            </div>
          </div>
        </div>
      </section>

      {/* ── Gold divider ── */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="gold-divider" />
      </div>

      {/* ── How It Works (3 platforms) ── */}
      <section
        id="how-it-works"
        className="relative z-10 mx-auto max-w-7xl px-6 py-24"
      >
        <div className="mb-14 text-center">
          <p
            className="mb-3 text-xs uppercase tracking-[0.2em] text-gold"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            The Platform
          </p>
          <h2
            className="text-4xl font-light text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Three ways to connect
          </h2>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {platforms.map((platform) => (
            <GlassCard
              key={platform.title}
              gold={platform.accent}
              className={`group p-8 transition-all duration-300 hover:-translate-y-1 ${platform.accent ? "gold-glow" : ""}`}
            >
              <div className="mb-6 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-[rgba(212,175,55,0.1)]">
                <Icon name={platform.icon} className="h-6 w-6 text-gold" />
              </div>
              <h3
                className="mb-3 text-2xl font-light text-foreground"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {platform.title}
              </h3>
              <p
                className="mb-6 text-sm leading-relaxed text-muted"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {platform.description}
              </p>
              <Link
                href="/browse"
                className="inline-flex items-center gap-2 text-sm text-gold transition-all group-hover:gap-3"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {platform.cta}
                <IconArrowRight className="h-4 w-4" />
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── Featured Companions ── */}
      <section className="relative z-10 py-24">
        <div className="mx-auto mb-14 max-w-7xl px-6">
          <div className="flex items-end justify-between">
            <div>
              <p
                className="mb-3 text-xs uppercase tracking-[0.2em] text-gold"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Featured
              </p>
              <h2
                className="text-4xl font-light text-foreground md:text-5xl"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                Meet our Elite Hosts
              </h2>
            </div>
            <Link
              href="/browse"
              className="hidden items-center gap-2 text-sm text-gold md:flex"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              View all Elite Hosts
              <IconArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Horizontal scroll grid */}
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {featuredCompanions.map((companion) => (
              <GlassCard
                key={companion.name}
                className="group cursor-pointer overflow-hidden transition-all duration-300 hover:-translate-y-1"
              >
                {/* Image area */}
                <div className="companion-placeholder relative h-64 w-full">
                  <div className="absolute right-3 top-3">
                    {companion.tier === "select" ? (
                      <span className="badge-select rounded-full px-2.5 py-1">Select</span>
                    ) : (
                      <span className="badge-verified rounded-full px-2.5 py-1">Verified</span>
                    )}
                  </div>
                  {/* Location tag */}
                  <div className="absolute bottom-3 left-3">
                    <span
                      className="rounded-full bg-[rgba(8,8,16,0.7)] px-3 py-1 text-xs text-muted backdrop-blur-md"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {companion.location}
                    </span>
                  </div>
                </div>

                <div className="p-5">
                  <div className="flex items-start justify-between">
                    <div>
                      <p
                        className="text-xl font-light text-foreground"
                        style={{ fontFamily: "var(--font-cormorant)" }}
                      >
                        {companion.name}
                      </p>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {companion.tags.map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full bg-[rgba(212,175,55,0.08)] px-2 py-0.5 text-[10px] text-muted"
                            style={{ fontFamily: "var(--font-dm-sans)" }}
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <IconStar className="h-3.5 w-3.5 text-gold" />
                      <span
                        className="text-sm text-muted"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {companion.rating}
                      </span>
                    </div>
                  </div>

                  <p
                    className="mt-3 text-xs leading-relaxed text-muted"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {companion.blurb}
                  </p>

                  <button
                    className="btn-ghost mt-4 w-full rounded-xl py-2.5 text-xs"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    View Profile
                  </button>
                </div>
              </GlassCard>
            ))}
          </div>
        </div>
      </section>

      {/* ── Gold divider ── */}
      <div className="mx-auto max-w-7xl px-6">
        <div className="gold-divider" />
      </div>

      {/* ── Membership Tiers ── */}
      <section
        id="membership"
        className="relative z-10 mx-auto max-w-7xl px-6 py-24"
      >
        <div className="mb-14 text-center">
          <p
            className="mb-3 text-xs uppercase tracking-[0.2em] text-gold"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Membership
          </p>
          <h2
            className="text-4xl font-light text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Choose your access level
          </h2>
          <p
            className="mx-auto mt-4 max-w-md text-base text-muted"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            From casual discovery to full Elite concierge service — find the tier that matches your ambition.
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {membershipTiers.map((tier) => (
            <GlassCard
              key={tier.name}
              gold={tier.highlighted}
              className={`relative flex flex-col p-8 ${tier.highlighted ? "gold-glow" : ""}`}
            >
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <span className="badge-select rounded-full px-4 py-1.5 text-xs">
                    Most Popular
                  </span>
                </div>
              )}

              <div className="mb-6">
                <p
                  className="text-xs uppercase tracking-[0.15em] text-muted"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {tier.description}
                </p>
                <h3
                  className="mt-1 text-3xl font-light text-foreground"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {tier.name}
                </h3>
                <div className="mt-3 flex items-baseline gap-1">
                  <span
                    className={`text-4xl font-light ${tier.highlighted ? "text-gold" : "text-foreground"}`}
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {tier.price}
                  </span>
                  {tier.period && (
                    <span
                      className="text-sm text-muted"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {tier.period}
                    </span>
                  )}
                </div>
              </div>

              <ul className="mb-8 flex-1 space-y-3">
                {tier.features.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-3 text-sm text-muted"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    <IconCheck className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
                    {feature}
                  </li>
                ))}
              </ul>

              <Link
                href="/signup"
                className={`${tier.highlighted ? "btn-gold" : "btn-ghost"} rounded-xl py-3 text-center text-sm`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {tier.cta}
              </Link>
            </GlassCard>
          ))}
        </div>
      </section>

      {/* ── Trust & Safety ── */}
      <section className="relative z-10 border-y border-[rgba(212,175,55,0.08)] bg-[rgba(212,175,55,0.02)] py-24">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-14 text-center">
            <p
              className="mb-3 text-xs uppercase tracking-[0.2em] text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Trust & Safety
            </p>
            <h2
              className="text-4xl font-light text-foreground md:text-5xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Built on trust
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {trustFeatures.map((feature) => (
              <div key={feature.title} className="group space-y-4">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.07)]">
                  <Icon name={feature.icon} className="h-5 w-5 text-gold" />
                </div>
                <h3
                  className="text-xl font-light text-foreground"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {feature.title}
                </h3>
                <p
                  className="text-sm leading-relaxed text-muted"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {feature.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative z-10 mx-auto max-w-7xl px-6 py-28">
        <GlassCard gold className="gold-glow overflow-hidden p-12 text-center md:p-20">
          {/* Inner glow */}
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_120%,rgba(212,175,55,0.12),transparent)]" />

          <div className="relative">
            <p
              className="mb-4 text-xs uppercase tracking-[0.25em] text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Begin Your Journey
            </p>
            <h2
              className="mb-6 text-balance text-4xl font-light text-foreground md:text-6xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Join the inner circle
            </h2>
            <p
              className="mx-auto mb-10 max-w-lg text-base text-muted"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              EliteSeek is invitation-first. Apply today to be among the first to access
              our curated network of extraordinary Elite Hosts.
            </p>
            <div className="flex flex-wrap justify-center gap-4">
              <Link
                href="/signup"
                className="btn-gold flex items-center gap-2 rounded-full px-8 py-4 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Request Access
                <IconArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href="/signup?role=companion"
                className="btn-ghost rounded-full px-8 py-4 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Apply as Elite Host
              </Link>
            </div>
          </div>
        </GlassCard>
      </section>

      {/* ── Footer ── */}
      <footer className="relative z-10 border-t border-[rgba(212,175,55,0.1)] py-12">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col items-center gap-8 md:flex-row md:justify-between">
            {/* Brand */}
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)]">
                <Icon name="diamond" className="h-3.5 w-3.5 text-gold" />
              </div>
              <span
                className="text-base tracking-[0.1em] text-foreground"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                ELITESEEK
              </span>
            </div>

            {/* Links */}
            <div
              className="flex flex-wrap justify-center gap-6 text-xs text-muted"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <Link href="/terms" className="transition hover:text-foreground">Terms & Conditions</Link>
              <Link href="/privacy" className="transition hover:text-foreground">Privacy Policy</Link>
              <Link href="/safety" className="transition hover:text-foreground">Safety</Link>
              <Link href="/contact" className="transition hover:text-foreground">Contact</Link>
            </div>

            {/* Legal */}
            <p
              className="text-center text-xs text-muted/50"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              © 2026 EliteSeek Pty Ltd · Australian entity
            </p>
          </div>

          <div className="mt-8 text-center">
            <p
              className="text-xs text-muted/40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              EliteSeek is an Elite Host and social experience marketplace. Sexual services are strictly prohibited.
              All Elite Hosts are age-verified (18+) under the Australian Online Safety Act.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
