# EliteSeek — Master Project Brief

## What is EliteSeek?

EliteSeek is a premium Elite Host and social experience marketplace built as a Progressive Web App (PWA). It combines three proven platform models into one:

- **Booking platform** — clients book Elite Hosts for dinners, events, travel, social outings
- **Creator platform** — Elite Hosts post exclusive content, clients subscribe and unlock PPV
- **Gifting platform** — clients send physical and virtual gifts from Elite Host wishlists

The platform is legally positioned as an Elite Host/social experience marketplace. It is not an escort platform. All sexual services are strictly prohibited in T&Cs and enforced via AI content moderation.

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

---

## Tech Stack

| Layer | Tool |
|---|---|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Framer Motion |
| Backend & Database | Supabase |
| Authentication | Supabase Auth |
| File Storage | Supabase Storage |
| Payments | Stripe |
| KYC Verification | Stripe Identity |
| AI Content Moderation | Hive Moderation |
| Email | Resend |
| Real-time (chat/notifications) | Supabase Realtime |
| Deployment | Vercel |
| PWA | Next.js PWA config |

---

## User Roles

### Elite Host
- Creates profile with photos, bio, services, availability
- Sets their own prices for everything
- Posts content (photos, videos) — clean content only
- Manages wishlist for gifting
- Receives bookings, subscriptions, PPV purchases, tips, gifts
- Gets paid out via Stripe Connect

### Client
- Browses and discovers Elite Hosts
- Requests or pays to unlock profiles
- Books Elite Hosts for experiences
- Subscribes to Elite Hosts
- Purchases PPV content
- Sends gifts from wishlists
- Tips Elite Hosts

---

## Revenue Model

| Revenue Type | Who Sets Price | Platform Cut | Creator Keeps |
|---|---|---|---|
| Subscriptions | Creator (min $9.99/month) | 20% | 80% |
| PPV Content Unlock | Creator (min $3) | 20% | 80% |
| Profile Unlock Fee | Creator (min $10) | 20% | 80% |
| Tips & Virtual Gifts | Creator sets menu | 20% | 80% |
| Bookings | Creator sets rate | 15% | 85% |
| Physical Gifts (wishlist) | Retail price | 20% | 80% |

---

## Content Rules

- All content must be clean — lifestyle, fashion, behind the scenes
- Bikini, swimwear, lingerie allowed
- Explicit sexual content strictly prohibited
- Every upload scanned by Hive Moderation AI before going live
- Strike system: 3 strikes = account suspended
- Manual review queue for borderline content (70–90% confidence score)
- Auto-removal for anything above 90% explicit score

---

## Profile Lock System

Elite Hosts choose their visibility level:

- **Public** — basic profile visible to all users
- **Locked** — full profile hidden, client must request access or pay unlock fee
- **Elite Only** — profile hidden from non-Elite membership tier members

---

## Verification Tiers (Elite Host)

- **Unverified** — basic listing, lower search ranking
- **Verified** — ID checked via Stripe Identity, badge awarded, priority placement
- **EliteSeek Select** — handpicked by platform, top placement, featured slots, application required

---

## Membership Tiers (Client)

- **Bronze** — basic browse, limited access to locked profiles
- **Silver** — priority booking, can request access to locked profiles
- **Elite** — full access including Elite Only profiles, concierge service, early access

---

## Full Sitemap

### 1. Onboarding
- Landing Page
- Sign Up / Login
- KYC Verification
- Elite Host Setup
- Client Setup

### 2. Discovery
- Browse Feed
- Search
- Experiences Marketplace
- Elite Host Profile (Public)
- Elite Host Profile (Unlocked)

### 3. Access & Locks
- Profile Lock System
- Access Request Flow
- Profile Unlock (Pay to View)
- Elite Only Access
- Verification Tiers

### 4. Content & Creator
- Content Studio
- PPV Unlock
- Subscription Feed
- Content Moderation
- Elite Host Dashboard
- Live / Virtual Sessions

### 5. Booking
- Booking Request
- Booking Confirmation
- My Bookings
- Concierge Layer
- Post-Experience

### 6. Gifting
- Wishlist Builder
- Gift Browser
- Gift Checkout
- Virtual Gifting
- Gift History

### 7. Membership
- Membership Tiers
- Elite Lounge
- Status & Rewards
- Billing

### 8. Messaging
- Inbox
- Chat
- Notifications

### 9. Account
- My Profile
- Earnings (Elite Host)
- My Unlocks (Client)
- Settings
- Verification Centre

### 10. Admin
- User Management
- Content Moderation
- Payments Dashboard
- Analytics
- Platform Settings

---

## Key Legal Considerations

- Platform is Australian entity
- T&Cs explicitly prohibit sexual services
- Age verification mandatory (Australian Online Safety Act)
- AI content moderation documented and enforced from day one
- No explicit content permitted at any tier
- Payment processors: Stripe primary, adult-friendly processor as backup
- Consult Australian internet lawyer before launch

---

## Build Status

- [x] Brand identity decided
- [x] Tech stack decided
- [x] Full sitemap completed
- [x] Revenue model decided
- [ ] Project created (Next.js)
- [ ] Supabase connected
- [ ] Authentication built
- [ ] Database schema designed
- [ ] Landing page built
- [ ] Onboarding flow built
- [ ] Browse feed built
- [ ] Profile system built
- [ ] Content / PPV system built
- [ ] Gifting system built
- [ ] Booking system built
- [ ] Messaging built
- [ ] Payments (Stripe) integrated
- [ ] KYC (Stripe Identity) integrated
- [ ] Content moderation (Hive) integrated
- [ ] Admin dashboard built
- [ ] PWA configured
- [ ] Deployed to Vercel

---

## How to Use This Brief

At the start of every Cursor or Claude Code session, reference this file:

> "Read BRIEF.md and continue building EliteSeek. Current status is [paste current build status]."

This brings any Claude session fully up to speed instantly.
