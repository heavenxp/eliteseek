# EliteSeek — Master Project Brief

> **Superseded by PIVOT.md (the events pivot) for positioning, and PHASES.md for roadmap.** Read order: PIVOT.md → PHASES.md → this file. This brief remains background reference for brand/stack/schema history.

## What is EliteSeek?

EliteSeek is a **verified companion booking + paid content platform**, built as a PWA. Two legal product categories, one brand:

- **Bookings** — strictly non-sexual social companionship: dates, plus-ones, events, dinners, travel companions. Airbnb-style language throughout ("book", "host", "experience").
- **Content** — creator subscriptions, PPV, profile unlocks, tips. Standard creator-platform model.

Core product surface beyond the two revenue categories (all schema-backed, all held to the PHASES.md Quality bar): the social layer (posts, likes, comments, follows, stories), event-based group messaging (events, members, invite codes, group chat), and structured availability (`availability_posts`).

**Core positioning: "the one where everyone's real and everyone's safe."** Verification and safety are the product, not features.

The "no sexual services" rule is enforced in the product, not just the ToS: moderated photography and copy, hourly/event-based pricing only (no menu structures), active moderation of reviews/messages/profiles, and bookings and content never cross-sold as one thing.

### Cut from scope
- ❌ **Gifting/wishlist system** — removed from launch entirely (this feature pattern got WishTender terminated by Stripe). Feature-flagged off via `GIFTING_ENABLED` in `lib/flags.ts`; DB tables remain. Revisit post-traction only, with processor sign-off first.
- ❌ Any escort-advertising or adult-booking framing — permanently out.

---

## Brand

- **Name** — EliteSeek
- **Tagline** — Curated Elite Hosts
- **Aesthetic** — Dark glassmorphism, warm gold accents, quiet luxury, Monaco feel
- **Primary font** — Cormorant Garamond (serif, elegant)
- **Secondary font** — DM Sans (UI elements, labels)
- **Primary colour** — Gold `#d4af37`
- **Background** — Deep dark `#080810` with warm radial gradients
- **Style reference** — Glassmorphism throughout, frosted glass cards, gold accents, blurred backgrounds
- **Copy tone** — Airbnb Experiences / high-end matchmaking. Never dating-app or adult-industry language (no "discreet", no desirability framing).

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 16 (App Router) |
| Styling | Tailwind CSS v4 + shadcn/ui (restyled in EliteSeek tokens) |
| Backend & Database | Supabase |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Payments | Stripe (Connect escrow for bookings) |
| KYC Verification | Stripe Identity |
| AI Content Moderation | Hive Moderation |
| Email | Resend |
| Real-time (chat/notifications) | Supabase Realtime |
| Deployment | Vercel |
| PWA | Next.js PWA config |

shadcn MCP server is configured in `.mcp.json`; community registries (`@aceternity`, `@magicui`) in `components.json`. See "Quality bar" in PHASES.md.

---

## User Roles

### Elite Host
- Creates profile with photos, bio, availability (home city + travel windows)
- Sets hourly/event rates for bookings and prices for content (above platform minimums)
- Posts content (photos, videos) — clean content only, Hive-scanned
- Receives bookings, subscriptions, PPV purchases, profile unlocks, tips (creator-set tip menu)
- Gets paid out via Stripe Connect (escrow, auto-release post-booking)

### Client
- Browses and discovers Elite Hosts
- Requests or pays to unlock locked profiles
- Books Elite Hosts for experiences (ID verification required to book, not to browse)
- Subscribes to Elite Hosts, purchases PPV content, sends tips
- Participates in the social layer: feed posts, comments, follows, stories, events + group chat

---

## Revenue Model

| Revenue Type | Who Sets Price | Platform Cut | Creator Keeps |
|---|---|---|---|
| Bookings | Creator sets hourly/event rate | 15% | 85% |
| Subscriptions | Creator (min $9.99/month) | 20% | 80% |
| PPV Content Unlock | Creator (min $3) | 20% | 80% |
| Profile Unlock Fee | Creator (min $10) | 20% | 80% |
| Tips | Creator sets tip menu | 20% | 80% |

(Gifting/wishlist revenue removed with the gifting cut — `wishlist_items`/`gifts` only. Tips are standard creator-platform monetization and stay active.)

---

## Content Rules

- All content must be clean — lifestyle, fashion, behind the scenes
- Bikini, swimwear, lingerie allowed; explicit sexual content strictly prohibited
- Content stays non-explicit while on Stripe — an explicit-content policy change would require migrating to a specialist processor (Segpay/CCBill class) FIRST
- Every upload scanned by Hive Moderation AI before going live
- Strike system: 3 strikes = account suspended
- Manual review queue for borderline content (70–90% confidence score)
- Auto-removal for anything above 90% explicit score

---

## Profile Lock System

Elite Hosts choose their visibility level:

- **Public** — basic profile visible to all users
- **Locked** — full profile hidden, client must request access or pay unlock fee
- **Elite Only** — profile hidden from lower client membership tiers

---

## Verification & Tiers

### Host verification
- **Unverified** — not visible (KYC required before profile goes live, per Phase 2)
- **Verified** — ID checked via Stripe Identity, badge awarded
- **EliteSeek Select** — handpicked by platform, top placement, application required

### Host quality tiers (rating-based, `lib/tiers.ts`)
Pearl (New) → Rose (Rising) → Ruby (Established) → Sapphire (Acclaimed) → Diamond (Elite)

### Client membership tiers (spend-based, `lib/tiers.ts`)
Bronze → Silver → Gold → Platinum. Membership tier info stays inside the app; pricing never on profiles.

---

## Sitemap (current)

1. **Onboarding** — landing, signup/login, KYC, host setup, client setup
2. **Discovery & Social** — browse feed, search, experiences, host profiles (public/unlocked), social feed (posts/likes/comments/follows), stories, events + group chat, availability posts
3. **Access & Locks** — lock system, access requests, paid unlock, Elite-only access
4. **Content & Creator** — content studio (`/companion/content`), browse feed (`/content`), PPV, subscriptions, moderation
5. **Booking** — request, confirmation, my bookings, safety flow (check-in/out, trusted contact — Phase 4)
6. **Membership** — tiers, billing
7. **Messaging** — inbox, chat, notifications
8. **Account** — profile, earnings, unlocks, settings, verification
9. **Admin** — moderation queue, user management, analytics

---

## Key Legal Considerations

- Platform is an Australian entity
- T&Cs explicitly prohibit sexual services — and the product enforces it (moderation, pricing structure, copy)
- Age verification mandatory (Australian Online Safety Act)
- No misleading claims (fake stats are an Australian Consumer Law risk)
- AI content moderation documented and enforced from day one
- Payment processor: Stripe — content stays non-explicit while on Stripe
- Consult Australian internet lawyer before launch

---

## Build Status

Tracked in PHASES.md (Phase 2 — Trust Layer is current; Phase 1 complete; note the 14 Jul 2026 reorder — Content Engine is Phase 3, Safe Bookings is Phase 4). Shipped so far: Next.js app, Supabase (auth/DB/storage/realtime), landing, onboarding, browse, profiles + locks, content/PPV, bookings, messaging, membership, Stripe payments, PWA, Vercel deploy. Gifting: built, then feature-flagged off (cut from scope).

---

## How to Use This Brief

At the start of every session: read PHASES.md, then this file. State which phase/checkbox is being worked, complete it, tick the box, commit with a phase-prefixed message (e.g. `p1: hide gifting UI`).
