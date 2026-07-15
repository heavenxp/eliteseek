# PIVOT.md — The Events Pivot (Final Repositioning)

> **This document supersedes the positioning in BRIEF.md and reframes PHASES.md.**
> Read order for any new session: PIVOT.md → PHASES.md → BRIEF.md.
> This is the final pivot. The idea is settled; everything from here is execution.

---

## 1. What this app is now

**A social platform for real-world (and online) events — where hosts get paid to bring people together, and everyone in the room is verified.**

One sentence: **the creator economy for real life.**

The mission: every major social platform is engineered to keep people inside, scrolling alone. This platform's success metric is the opposite — people actually meeting. The loneliness problem is real, named, and growing; the market proof is current (Timeleft: €18M ARR seating strangers at dinners; Partiful: 500k MAU, 400% YoY, as the Gen Z events layer). Nobody yet combines **events + a host economy + hard trust infrastructure**. That combination is this product.

### The three pillars (what makes it different)
1. **Host economy** — hosts earn from ticketed events, paid communities, tips, and paywalled content. Hosting is an income and an audience, not a favor. (Timeleft has no hosts; Partiful has no money; Meetup has no quality bar.)
2. **Trust infrastructure** — ID verification (hosts required, guests to book), escrow, ratings/badges, SOS. Already built in Phases 2–4. "Everyone in the room is verified" is the moat.
3. **Community persistence** — every event opens into a paid group with chat + feed. Events aren't one-offs; they're entry points into small ongoing communities. (Friendship psychology: repetition builds bonds; the group keeps people coming back.)

---

## 2. Core product decisions (settled — do not relitigate)

### Roles: one account, "host" is a mode not an identity
- Everyone signs up as a **person** (single account type). Browse, join, pay, chat, post.
- **"Become a host"** is an upgrade flow available to anyone: ID verification (existing Stripe Identity flow) + payout onboarding (existing Stripe Connect) + host profile fields.
- Hosts can attend others' events; guests can graduate into hosting. No wall between roles.
- Migration note: collapse the companion_profiles/client_profiles split into profile + optional host_profile. Existing verification, tier, and payout columns move with it.

### Events: structured by design
Event creation **forces structure** (structure is what kills social anxiety — "hang out" is scary, "trivia at 7, ends at 9" is safe):
- Required: activity/title, start time, **end time**, group size cap, venue type (physical address / online link), price (can be $0 for private friend events)
- Types: physical or **online** (streams, watch parties, study sessions — zero venue logistics, the on-ramp for new hosts)
- Visibility: public / invite-only (existing invite codes) / friends
- Size: 1-on-1 (max_guests=1 covers the "date" case) up to large groups
- First-time physical hosts: public venues required

### Money: decaying-refund escrow ("the escrow timer")
Built on the existing Phase 4 Stripe-native escrow. Refund availability decays as the event approaches — protects hosts from late flakes without scaring guests at purchase:
- **Until 7 days out: 100% refund**
- **7 days → 48h: slides gently to a 50% floor**
- **Inside 48h: locked (0%)**
- Non-refunded remainder releases to the host; host cancellation always refunds guests 100%.
- Shown as a simple visual on every event page ("Cancel now: full refund · changes {date}") — reads as fairness, not a trap.
- Payment doubles as the **anti-flake mechanism** — sell it to hosts that way: "people who pay, show up."

### Communities: the paid group behind every event
- Every event has a group space: **chat + a feed** (posts, photos, video) — existing event_messages + posts infrastructure, merged.
- Hosts can keep the group alive after the event and charge for membership (one-off join fee or recurring — existing subscriptions engine).
- Posts inside a group can be **paywalled** (existing PPV/unlock engine).
- This is the Patreon layer fused with friendship-repetition psychology: recurring events + persistent paid communities = hosts as recurring earners.

### Discovery: the pulse, not a calendar
No calendar grid as the front door. The discovery surface is a **feed of live-feeling event cards**:
- Cover image, host face + verified seal, **avatars of real attendees who've joined**, "starts in 3h" / "this Friday", spots left
- Sorted by: soonest + nearest + accounts you follow
- Calendar view exists only as a secondary toggle
- The mental model: "what's alive near me right now," scrolled like a social feed — because it is the social feed.

### Growth: the invite is the growth loop (Partiful's lesson)
- Every event gets a **beautiful public share page**: viewable with **no account**, joinable with minimal friction (view → pay → account creation last, not first).
- Hosts promoting events on their socials are marketing the platform for free.
- Waitlists on full events (real FOMO), "sold out" states on past events, honest "3 spots left" scarcity **only when true**.

### ❌ Hard rules — never build
- **No bots, no fake attendees, no fake events, no fabricated fullness. Ever.** Fabricated activity that induces payment is misleading & deceptive conduct (Australian Consumer Law) and would destroy the "everyone is real and verified" brand on first discovery — and discovery is guaranteed in a product where people physically meet the group. FOMO comes from real seeded hosts, waitlists, and honest scarcity — never manufactured.
- No dark-pattern countdown pressure; the refund timer must always be transparent and slow enough not to scare.
- Pricing never rendered in ways that imply anything beyond the event (carried over: no act-menus, no adult-industry signals).

### Trust & badges (replaces "trusting strangers")
- Host card everywhere: verified seal + "Hosted 12 events · 4.9★" + tenure ("hosting since 2026")
- **Show verified-attendee count/avatars on every event** — knowing the *room* is verified changes the calculus, not just the host.
- Guest ratings (existing client_reviews) surface to hosts before accepting joins.

### Women's safety: opt-in tools, never surveillance
Every mechanism is **guest-controlled** — power given to her, not monitoring of her:
- Women-only event filter (host-chosen, clearly labeled; Timeleft validates demand — women-only dinners in 50+ cities)
- Trusted-contact/SOS (already built, Phase 4): share event + live check-in with a friend, one tap, armed by her
- Public-venue requirement for first-time hosts
- Visible verified-attendee counts
Nothing passive, nothing tracked without an explicit opt-in.

---

## 3. What survives / what changes (from the current build)

| Existing | Fate |
|---|---|
| events, event_members, event_invite_codes, event_messages | **Becomes the core.** Extended: end time, price, capacity→paid tickets, online type, group feed |
| Bookings + escrow (Phase 4) | **Survives.** 1-on-1 booking = event with max_guests=1; escrow gains the decay curve |
| Stripe Identity (hosts + clients) | **Survives as-is** — "become a host" flow + verify-to-join |
| Content engine (subs/PPV/unlocks, signed URLs) | **Survives** — powers paid communities + paywalled group posts |
| Stories, feed, follows, search | **Survive** — the social layer around events |
| Verified seal, badges, client_reviews | **Survive** — trust system |
| SOS / trusted contact / check-in | **Survives** — safety toolkit |
| Hive moderation pipeline | **Survives** — still needs HIVE_API_KEY |
| companion_profiles / client_profiles split | **Merged** → single profile + optional host_profile |
| "Companion booking" positioning & copy | **Replaced** everywhere by events/host/guest language |
| Availability posts | **Absorbed** into events (an availability post is just an event offer) |
| Blue theme, dark UI, no landing page (Phase 5 work) | **Survives untouched** |

Estimated survival: ~75–80% of the codebase. This is a refocus, not a rebuild.

### Naming
"EliteSeek" reads companion-platform. A rename is likely warranted but is **not a blocker** — flag it as a pre-launch decision alongside the domain purchase. Do not stall the build on it.

---

## 4. Revised phases (continuing from the current Phase 5)

**Phase 5 — Design Pass** *(in flight, unchanged)*: finish the blue pivot, Bluesky-style profile restructure, shadcn integration, copy pass — but the copy pass now uses events/host/guest language per this doc.

**Phase 6 — The Refocus**
- One-account model: merge profile split, "become a host" upgrade flow
- Events extended: end time, ticketing (price × capacity via escrow), online event type, public share pages (no-account view, join-first flow)
- Discovery pulse feed (event cards: host, verified avatars, countdown, spots left) + waitlists
- Decaying-refund curve on event escrow, with the transparent refund visual
- Copy: all "companion/booking" language → events language, sitewide + metadata

**Phase 7 — Communities**
- Event group = chat + feed (merge event_messages with posts engine)
- Post-event persistence: host keeps group open, sets join fee / recurring membership
- Paywalled posts inside groups (existing PPV engine)
- All group content through Hive pipeline

**Phase 8 — Melbourne Launch (revised)**
- Recruit 15–20 **founding hosts who already run things** (run clubs, language exchanges, dance teachers, streamers, study groups) — each imports their existing audience = honest density from day one
- Depth over breadth: inner Melbourne only until events reliably fill (Timeleft's confessed mistake: 325 cities, small ones fizzled; they cut to ~220 and went deep)
- Online events open the funnel for hosts anywhere
- Launch surface: "this week in Melbourne" — short, dense, curated; never an empty grid
- Ops gates still standing (see PHASES.md pre-launch list): HIVE_API_KEY, CRON_SECRET + GitHub Actions cron, Stripe Identity dashboard items, dispute-resolution admin UI, USD→AUD currency decision, one end-to-end escrow test, rename/domain decision

---

## 5. Cold start playbook (reference)
1. **Founding hosts import audiences** — recruit organizers with existing followings; every host is a pre-packaged network.
2. **Online events** need no venue and no city density — the zero-logistics on-ramp.
3. **The invite loop**: every shared event page recruits users who never heard of the platform.
4. **Ritual beats novelty**: push hosts toward recurring events ("every Tuesday") — repetition is both the friendship mechanic and the retention mechanic.
5. **Honest FOMO only**: waitlists, real scarcity, sold-out states. Five genuinely full events beat fifty listings.
