# EliteSeek — Phased Build Roadmap

> **Reframed by PIVOT.md (15 Jul 2026) — the events pivot.** Read order for any new session: PIVOT.md → this file → BRIEF.md. Phases 1–5 below are history/in-flight as written; Phases 6–8 are replaced by PIVOT.md §4 (The Refocus, Communities, Melbourne Launch revised).

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

- [x] Stripe Identity KYC for **hosts** (required before profile goes live) — migration 025 live; hosted flow at /api/stripe/identity/start; webhook promotes verification_tier (single source of truth for visibility); unverified hosts hidden from browse/search/experiences/feed/stories/profile+metadata; Verification Centre at /companion/verification. ⚠️ Ops: enable Stripe Identity on the account + add identity.verification_session.verified / .requires_input to the webhook endpoint's events, then run one real verification end-to-end
- [x] Stripe Identity for **clients** — required to book, NOT required to browse or subscribe to content — same hosted flow (profiles.kyc_status is client truth), createBookingRequest gated, /account/verification page
- [x] "Verified" badge system (this replaces the planned membership badges as the primary badge) — custom SVG seal component (`components/badges/verified-badge.tsx`, outlined=verified / filled=select) on browse cards + profile headers; no purchased SVGs needed
- [x] Hive moderation integration (code complete, env-gated on HIVE_API_KEY):
  - All profile photos and content scanned on upload (content posts: reject/hold-for-review; feed/stories: reject synchronously, flag async; photos: rejected images cleared)
  - Message scanning for booking chat (intimate-services language → flag for review; scanned post-response via next/server after(), never blocks sends)
- [x] Manual review queue in admin (ajkibira@gmail.com account) for flagged content — /admin/moderation now covers content posts AND Hive flags on messages/feed/stories/photos, with dismiss/remove; admin KYC approve now genuinely verifies (promotes verification_tier)

**Exit criteria:** no unverified host visible, no unverified client can book, moderation pipeline live.

### Deferred ops (external config, not code)
- [ ] **Hive — do this first** (thehive.ai → create account → API key → `HIVE_API_KEY` in Vercel env). The entire moderation pipeline (content, feed, stories, messages, photos) is live but INACTIVE without it — everything auto-approves as "unscanned". Verification-and-safety is the positioning; this is the gap that matters most. Requires a human signup (Claude can't create third-party accounts).
- [ ] Stripe dashboard: enable Stripe Identity; add `identity.verification_session.verified` + `identity.verification_session.requires_input` to the webhook endpoint events; then run one real host + one real client verification end-to-end

> **Reordered 14 Jul 2026:** the Content Engine now comes before Safe Bookings — finish all product surface first; payment/escrow work sits just before the design pass.

## Phase 3 — Content Engine

**Goal: complete the creator side.**

- [x] Subscriptions (min $9.99/mo), PPV ($3 min), profile unlocks ($10) — floors now enforced in every write path (settings was open to under-floor pricing); shared constants in `lib/pricing.ts`; DB check constraint backs the subscription floor
- [x] Studio view: content upload, pricing, subscriber management, earnings dashboard — studio rebuilt with stat tiles, active-subscriber list (renewal dates, recurring total), month/all-time net earnings, moderation-status badges on posts
- [x] Browse feed with discovery (city, category, verified-only filter) — city filter added (location match); category = experience-type tags; verified-only is structural post-KYC (only verified/select hosts are visible), tier filter narrows to Select
- [ ] Content stays behind paywall + Hive scan before publish — code complete, pending migration 026 + deploy: `content-media` bucket flips private (Supabase advisor: public bucket let anyone enumerate paywalled files); media served via server-signed 2h URLs only after a per-post entitlement check; locked posts ship NO urls/body to the client (old UI blurred the real files — a paywall bypass); new public `shared-media` bucket for stories/chat/events media (6 legacy prod files already copied + rows repointed via storage API)
- [x] Fix SECURITY DEFINER views (Supabase ERROR-level): `companion_cards` + `client_membership` flip to security_invoker in migration 026 — definer semantics bypassed base-table RLS; client_membership exposed stripe_customer_id and has no code consumers; companion_cards' only consumer (authed browse) is covered by base policies
- [x] Stories viewer: rebuilt UI (per Quality bar), story media routed through the same Hive moderation pipeline before going live — load-gated timer, loading/error states, owner delete; scan wired at createStory
- [x] Event group chat: rebuilt UI (per Quality bar) for events / invite codes / group messages, event messages routed through the same Hive moderation pipeline — send/upload/voice error surfacing, responsive height; scan wired post-send via after()
- [x] Availability display: rebuilt UI (per Quality bar) for availability_posts on profiles and discovery, availability post content routed through the same Hive moderation pipeline — Booked/urgency states, verified seal in discovery, structured "Based in X · Y {dates}" line on profiles; scan wired at createAvailabilityPost
- [ ] Payment note: keep content non-explicit while on Stripe. If explicit content is ever allowed, that requires migrating content payments to a specialist processor (Segpay/CCBill class) FIRST — do not flip the content policy before the processor.

**Exit criteria:** a host can earn from both bookings and content; a client can pay for both.

## Phase 4 — Safe Bookings

**Goal: the booking flow that makes hosts choose this platform.**

- [x] Escrow payments via Stripe Connect: client pays at booking → funds held → auto-release to host after booking completion (minus 15%) — **Stripe-native, no custom ledger**: separate charges & transfers (full amount captured to the platform Stripe balance with transfer_group; release = stripe.transfers.create of the 85% net; refunds via stripe.refunds.create). escrow_status on bookings mirrors Stripe state. Release runs in /api/cron/escrow every 30min (vercel.json)
- [x] Dispute window (48h post-booking) before payout release — release_at = checkout + 48h; client dispute inside the window freezes escrow and pings admins
- [x] Booking check-in / check-out: host confirms arrival and safe completion in-app — check-out is what starts the release clock
- [x] Trusted-contact / SOS feature: host nominates a contact; check-in misses trigger notification — trusted contact in settings; cron alerts host in-app + emails the contact (Resend) when checked-in but not checked-out 2h past scheduled end
- [x] Hosts can decline any booking, no penalty, no reason required — pre-payment decline existed; post-payment host cancel now fully refunds the client with nothing recorded against the host
- [x] Client ratings visible to hosts **before** accepting a booking — hosts rate clients (1–5 + note) after completion; requests show "★ 4.8 · 12 host reviews" or "New client"
- [x] Host availability as structured data on profiles: home city + upcoming travel windows (e.g. "Based in Melbourne · Sydney Jun 7–9") — powers city-based discovery and booking (shipped with the P3 availability rebuild + browse city filter)
- [x] Cancellation policy engine (host-set: flexible/moderate/strict, Airbnb-style) — lib/cancellation.ts; policy snapshotted per booking; client cancel refunds per policy with the remainder still released to the host

⚠️ Deploy gates: apply migration 027 BEFORE pushing (bookings/companion/client_reviews columns), set `CRON_SECRET` in Vercel env, and note payouts require hosts to complete Stripe Connect onboarding (cron skips + nudges otherwise). Admin dispute-resolution UI (release vs refund) is a follow-up — disputes currently freeze funds and notify admins.

**Exit criteria:** end-to-end booking with escrow works in production; safety flow tested on real devices.

## Phase 5 — Design Pass

**Goal: premium feel that makes an unusual transaction feel normal, safe, classy.**

> **Direction settled 15 Jul 2026:** evolve the existing dark theme — the "baby blue glassmorphism" reference came from a superseded pre-rebuild design doc and is removed. Target: simple, clean, modern dark UI (mainstream social-app clarity — flat surfaces, strong typography, generous spacing), not ornate luxury. **Simplicity is the premium signal.**

- [x] Theme evolution: near-black base, flat surfaces, signal-only brand color — completed, then color pivoted gold → azure #4c9eff (Bluesky-family) per direction; token names keep "gold" (naming debt). Cormorant display + DM Sans
- [x] Kill the marketing landing entirely: root behaves like a social app — signed-in → /feed, signed-out → /login front door with positioning line + legal age-verification footer; GuestLanding + data/landing deleted; verified live (/ 307s to /login in prod)
- [ ] shadcn/ui components integrated where wanted (see UI notes below)
- [x] Host profile layout modeled on Bluesky's profile structure: banner + overlapping avatar, tight name block (age/tags → About), stat row, availability line, tabs Posts / Events / Media / About — verified in-browser
- [x] Copy pass — events/host/guest language per PIVOT.md: all "Elite Host" copy → host/hosts, metadata/manifest/browse/signup repositioned ("Real events, verified people", Join as Guest/Host); full booking-flow + email copy continues into Phase 6's events rework
- [ ] Membership tier info stays inside the app, pricing never on profiles (per original decisions)

## Phases 6–8 — see PIVOT.md §4

The events pivot replaces the original Phase 6 (Melbourne Launch). Tracking:

### Phase 6 — The Refocus
- [x] One-account model: profile split merged (migrations 028–031: host_profiles rename with all 10 FKs intact, client_profiles folded into profiles, signup-trigger fix, compat views dropped after deploy, self-insert policy); code swept (43 files + 10 rekeyed reads); signup collapsed to one account type; "become a host" upgrade flow (account CTA → host_profiles row + role flip → existing onboarding/Identity/Connect chain)
- [x] Events extended: end time (DB NOT NULL), ticketing on the P4 escrow (event_tickets, webhook-admitted, cron-released at end+48h, 15% cut), online type with member-gated meeting links (separate RLS table — column would leak via PostgREST), capacity DB-required for physical; create form + event page (ticket CTA, sold-out, spots-left) — migration 032 applied, deployed, verified in-browser
- [ ] Public share pages: no-account view, join-first flow (view → pay → account creation last)
- [ ] Discovery pulse feed (event cards: host + verified avatars, countdown, spots left) + waitlists; calendar as secondary toggle only
- [ ] Decaying-refund curve on event escrow (100% → 7d slide → 50% floor → locked inside 48h) with the transparent refund visual
- [ ] Copy: remaining booking-flow + email copy → events language (bulk done in P5)
- [ ] **Decision needed:** profile locks + membership_tier (companion-era DNA) — keep, kill, or fold into client_tier; parked from the 028 review
- [ ] Role-column retirement: nav/routing still gate on profiles.role; move to "has host_profiles row" as the host-mode signal

### Phase 7 — Communities
- [ ] Event group = chat + feed (merge event_messages with posts engine)
- [ ] Post-event persistence: host keeps group open, sets join fee / recurring membership
- [ ] Paywalled posts inside groups (existing PPV engine); all group content through Hive

### Phase 8 — Melbourne Launch (revised)
- [ ] 15–20 founding hosts with existing audiences; inner-Melbourne depth; online events funnel; "this week in Melbourne" launch surface
- [ ] Ops gates: HIVE_API_KEY, Stripe dashboard items, dispute-resolution admin UI, USD→AUD decision, end-to-end escrow test, rename/domain decision
- [x] ~~CRON_SECRET + GH Actions cron~~ — CLOSED 16 Jul 2026: secret live in Vercel (Production+Preview, Sensitive) and GitHub Actions; escrow-cron.yml on main firing every 30 min; manual dispatch verified end-to-end (200, {"released":0,"releaseSkipped":0,"sosNotified":0})

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
