# EliteSeek — Phased Build Roadmap

> Companion to BRIEF.md. This document supersedes the previous scope. Read this first in any new session.

## Repositioning (read before building anything)

EliteSeek is a **verified companion booking + paid content platform**. Two legal product categories, one brand:

1. **Bookings** — strictly non-sexual social companionship: dates, plus-ones, events, dinners, travel companions. Airbnb-style language throughout ("book", "host", "experience"). Never dating-app or adult-industry language.
2. **Content** — creator subscriptions, PPV, profile unlocks. Standard creator-platform model.

**Core positioning: "the one where everyone's real and everyone's safe."** Verification and safety are the product, not features.

### Non-negotiable product discipline
The "no sexual services" rule must be true in the product, not just the ToS:
- Host photography and copy stay in professional-companion territory (moderated)
- Pricing is hourly/event-based only — no menu structures that imply extras
- No reviews, messaging, or profile content referencing anything intimate (actively moderated, not just prohibited)
- Booking and content are two things a host offers — never cross-sold as one thing

### Cut from scope
- ❌ Gifting/wishlist system (`wishlist_items`, `gifts` tables) — removed from launch entirely (this exact feature pattern got WishTender terminated by Stripe). Revisit post-traction only, with processor sign-off first.
- ❌ Any escort-advertising or adult-booking framing — permanently out.
- ✅ **Tips stay** — the `tips` table/feature (tip menus on content) is standard creator-platform monetization and is NOT part of the gifting cut.

### Core product surface (not extras)
The schema already supports a full social layer (`posts`/likes/comments/follows/`stories`), event-based group messaging (`events`, `event_members`, `event_messages`, `event_invite_codes`), and structured availability (`availability_posts`). All of these are **core product**: the Quality bar below applies to every screen backed by these tables.

---

## Phase 1 — Stabilize & Strip (current sprint)

**Goal: working deployment of the reduced scope.**

- [x] Verify the old Internal Server Error is gone (checked 14 Jul 2026: homepage returns 200, all deployments READY, no runtime errors in 7 days — confirmed /login, /signup, /content, /feed, /bookings, /companion/bookings, /account/settings, /membership, /messages all 200 in production, no error text in rendered pages)
- [x] Fix content page routing: creators → studio view; clients → browse feed
- [x] Remove/feature-flag the gifting & wishlist system (tables can stay; hide all UI + API routes) — `GIFTING_ENABLED=false` in `lib/flags.ts` gates /gifts (404) and the sendGift action; gift links, gift-locked feed posts, tier/onboarding gift perks, and gift metadata copy all removed
- [x] Replace fake trust stats on landing ("500+ Verified Elite Hosts", "4.9★ Average Rating") with honest premium copy, e.g. "Invite-only · ID-verified hosts · Melbourne first" — misleading stats are an Australian Consumer Law risk and undercut the trust positioning
- [x] Replace "100% Discreet & Private" with "Private & Secure" — "discreet" is adult-industry signal vocabulary (no "discreet/discretion" vocabulary remains anywhere; also deleted the unused full-marketing LandingPage which contained fake featured-host profiles and a gifting card)
- [x] Audit all copy sitewide against the repositioning above — replace anything that reads adult-industry, including page metadata (current meta description still mentions "luxury gifts") — meta descriptions rewritten (layout + manifest), "Intimate dinner" placeholder fixed, host tier subtitles reframed (Desired/Sought After → Established/Acclaimed), onboarding bio placeholder neutralized; grep sweep for signal vocabulary (escort/intimate/discreet/GFE/incall/etc.) is clean outside the flag-gated gifts code
- [x] Update BRIEF.md to reflect this document

**Exit criteria:** site loads clean in production, both user types route correctly, no gifting surface visible.

## Phase 2 — Trust Layer

**Goal: verification as the moat.**

- [ ] Stripe Identity KYC for **hosts** (required before profile goes live)
- [ ] Stripe Identity for **clients** — required to book, NOT required to browse or subscribe to content
- [ ] "Verified" badge system (this replaces the planned membership badges as the primary badge; SVGs from Creative Market/Flaticon per original plan)
- [ ] Hive moderation integration:
  - All profile photos and content scanned on upload
  - Message scanning for booking chat (intimate-services language → flag for review)
- [ ] Manual review queue in admin (ajkibira@gmail.com account) for flagged content

**Exit criteria:** no unverified host visible, no unverified client can book, moderation pipeline live.

## Phase 3 — Safe Bookings

**Goal: the booking flow that makes hosts choose this platform.**

- [ ] Escrow payments via Stripe Connect: client pays at booking → funds held → auto-release to host after booking completion (minus 15%)
- [ ] Dispute window (48h post-booking) before payout release
- [ ] Booking check-in / check-out: host confirms arrival and safe completion in-app
- [ ] Trusted-contact / SOS feature: host nominates a contact; check-in misses trigger notification
- [ ] Hosts can decline any booking, no penalty, no reason required
- [ ] Client ratings visible to hosts **before** accepting a booking
- [ ] Host availability as structured data on profiles: home city + upcoming travel windows (e.g. "Based in Melbourne · Sydney Jun 7–9") — powers city-based discovery and booking
- [ ] Cancellation policy engine (host-set: flexible/moderate/strict, Airbnb-style)

**Exit criteria:** end-to-end booking with escrow works in production; safety flow tested on real devices.

## Phase 4 — Content Engine

**Goal: complete the creator side.**

- [ ] Subscriptions (min $9.99/mo), PPV ($3 min), profile unlocks ($10) — per existing pricing model, creator-set above minimums
- [ ] Studio view: content upload, pricing, subscriber management, earnings dashboard
- [ ] Browse feed with discovery (city, category, verified-only filter)
- [ ] Content stays behind paywall + Hive scan before publish
- [ ] Stories viewer: rebuilt UI (per Quality bar), story media routed through the same Hive moderation pipeline before going live
- [ ] Event group chat: rebuilt UI (per Quality bar) for events / invite codes / group messages, event messages routed through the same Hive moderation pipeline
- [ ] Availability display: rebuilt UI (per Quality bar) for availability_posts on profiles and discovery, availability post content routed through the same Hive moderation pipeline
- [ ] Payment note: keep content non-explicit while on Stripe. If explicit content is ever allowed, that requires migrating content payments to a specialist processor (Segpay/CCBill class) FIRST — do not flip the content policy before the processor.

**Exit criteria:** a host can earn from both bookings and content; a client can pay for both.

## Phase 5 — Design Pass

**Goal: premium feel that makes an unusual transaction feel normal, safe, classy.**

- [ ] UI8 design pass (per original plan) — keep baby blue glassmorphism + champagne gold, Cormorant Garamond + DM Sans
- [ ] shadcn/ui components integrated where wanted (see UI notes below)
- [ ] Host profile layout modeled on Bluesky's profile structure (open source, safe to draw from): banner + overlapping avatar, tight name/bio block, stat row, availability line, tabs (Posts / Media / About), card feed — restyled entirely in EliteSeek tokens. Borrow the layout only: no photos, bio wording, or advertising conventions from any real profile; host copy stays in Airbnb-experience territory
- [ ] Copy pass: study Airbnb Experiences and high-end matchmaking tone — not OnlyFans, not dating apps
- [ ] Landing page: keep floating glass balloons, minimal copy, no profile cards (per original decisions)
- [ ] Membership tier info stays inside the app, pricing never on profiles (per original decisions)

## Phase 6 — Melbourne Launch

**Goal: dense in one city, not thin everywhere.**

- [ ] Geo-scope launch to Melbourne: host onboarding invite-only or hand-approved
- [ ] Target: ~20 excellent, fully verified hosts before public marketing
- [ ] Connect eliteseek.com custom domain (final step, per original plan)
- [ ] Standard business marketing is now possible (this is a legal, normal business — real ads, socials, PR)
- [ ] Instrument: booking conversion, content attach rate, host retention

**Expansion rule:** don't open city #2 until Melbourne has repeat bookings.

---

## Quality bar

Much of the existing UI predates Fable 5 and is below current standard. The rule: **when a phase touches a screen, rebuild that screen to current quality — don't patch it.** Concretely:

- Use the shadcn MCP server to pull better components rather than hand-rolling: the shadcn registry first, and community registries (`@aceternity` — Aceternity UI, `@magicui` — Magic UI) for hero/motion/polish pieces. Both are configured in `components.json`.
- Everything pulled gets restyled in EliteSeek tokens (dark `#080810`, gold `#d4af37`, glassmorphism, Cormorant Garamond + DM Sans) — never ship default-shadcn or default-registry look. The shadcn semantic variables in `app/globals.css` are already mapped to the palette, so most components inherit correctly; verify against the glass system anyway.
- A screen counts as rebuilt when layout, spacing, hierarchy, motion, and empty/loading/error states all hold up next to the best screens in the app — not when the diff is minimal.

## UI notes (shadcn + reference site)

- **shadcn/ui**: open source and explicitly designed to be copied into your codebase — use freely. In the repo: `npx shadcn@latest add <component>` and restyle with the existing token palette so it matches the glassmorphism system rather than shipping default-shadcn look.
- **Reference site you like**: use it as *reference*, don't clone it. Instead of scraping its code: screenshot the specific sections you like and give the screenshots to Claude Code with notes on what specifically appeals (spacing, hierarchy, motion, card treatment). You'll get an original implementation in your own design language, which is both cleaner legally and will fit your existing token system instead of fighting it.

## Session workflow

Each Claude Code session: read BRIEF.md + this file → state which phase/checkbox is being worked → complete → tick the box → commit with phase-prefixed message (e.g. `p3: escrow release job`).
