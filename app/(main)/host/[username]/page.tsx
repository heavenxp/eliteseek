import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { PostCard } from "@/components/posts/post-card";
import { PhotoGallery } from "@/components/profile/photo-gallery";
import { WishlistPreview } from "@/components/profile/wishlist-preview";
import { ProfileActionButtons } from "./profile-client";
import { stripeConfigured } from "@/lib/stripe";
import type {
  AvailabilityPost,
  AvailabilityCategory,
  ProfilePhoto,
  WishlistItem,
  Service,
} from "@/lib/database.types";

const CATEGORY_LABELS: Record<AvailabilityCategory, string> = {
  lunch: "Lunch",
  dinner: "Dinner",
  private_dining: "Private Dining",
  business_coaching: "Business Coaching",
  social_coaching: "Social Coaching",
  travel_companion: "Travel Experience",
  event_plus_one: "Event Plus-One",
  yacht_luxury: "Yacht / Luxury",
  gallery_art: "Gallery & Art",
  weekend_getaway: "Weekend Getaway",
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const supabase = await createClient();

  const { data } = await supabase
    .from("companion_profiles")
    .select("display_name, tagline, bio, cover_image_url")
    .eq("username", username)
    .single();

  if (!data) {
    return { title: "Elite Host — EliteSeek" };
  }

  const name = data.display_name ?? username;
  const description = data.tagline ?? data.bio?.slice(0, 155) ?? `Book ${name} for exclusive social experiences on EliteSeek.`;

  return {
    title: `${name} — Elite Host on EliteSeek`,
    description,
    openGraph: {
      title: `${name} — Elite Host on EliteSeek`,
      description,
      type: "profile",
      url: `https://eliteseek.com/@${username}`,
      ...(data.cover_image_url ? { images: [{ url: data.cover_image_url, width: 1200, height: 630, alt: name }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Elite Host on EliteSeek`,
      description,
      ...(data.cover_image_url ? { images: [data.cover_image_url] } : {}),
    },
  };
}

export default async function HostProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Fetch companion profile by username
  const { data: companion } = await supabase
    .from("companion_profiles")
    .select(
      `
      id, user_id, display_name, bio, tagline, location, age,
      tags, languages, visibility, verification_tier,
      is_featured, is_available, average_rating, total_reviews,
      booking_rate_hourly, subscription_price, profile_unlock_fee,
      cover_image_url, username, services_offered,
      available_from, available_until,
      profiles!inner(full_name)
    `
    )
    .eq("username", username)
    .single();

  if (!companion) notFound();

  const profile = companion.profiles as unknown as { full_name: string };
  const displayName = companion.display_name ?? profile.full_name;

  const isOwner = user?.id === companion.user_id;

  // Determine access level for logged-in users
  let hasUnlocked = false;
  let accessRequestStatus: string | null = null;
  let clientMembershipTier = "bronze";
  let isSubscribed = false;

  if (user && !isOwner) {
    const [unlockResult, requestResult, clientResult, subResult] =
      await Promise.all([
        supabase
          .from("profile_unlocks")
          .select("id")
          .eq("client_id", user.id)
          .eq("companion_id", companion.id)
          .maybeSingle(),
        supabase
          .from("access_requests")
          .select("status")
          .eq("client_id", user.id)
          .eq("companion_id", companion.id)
          .maybeSingle(),
        supabase
          .from("client_profiles")
          .select("membership_tier")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("subscriptions")
          .select("id")
          .eq("client_id", user.id)
          .eq("companion_id", companion.id)
          .eq("status", "active")
          .maybeSingle(),
      ]);

    hasUnlocked = !!unlockResult.data;
    accessRequestStatus = requestResult.data?.status ?? null;
    clientMembershipTier = clientResult.data?.membership_tier ?? "bronze";
    isSubscribed = !!subResult.data;
  }

  const lockStatus = companion.visibility as "public" | "locked" | "elite_only";

  // Unauthenticated guests can only see public profiles
  const isGuest = !user;
  const isFullyVisible =
    isOwner ||
    lockStatus === "public" ||
    hasUnlocked ||
    accessRequestStatus === "approved" ||
    (lockStatus === "elite_only" && clientMembershipTier === "elite");

  const isEliteBlocked =
    lockStatus === "elite_only" &&
    !isOwner &&
    !hasUnlocked &&
    accessRequestStatus !== "approved" &&
    clientMembershipTier !== "elite";

  // Parallel data fetches — photos, wishlist, upcoming posts
  const [photosResult, wishlistResult, postsResult] = await Promise.all([
    isFullyVisible
      ? supabase
          .from("profile_photos")
          .select("*")
          .eq("companion_id", companion.id)
          .eq("is_public", true)
          .eq("moderation_status", "approved")
          .order("sort_order", { ascending: true })
      : Promise.resolve({ data: [] }),
    isFullyVisible
      ? supabase
          .from("wishlist_items")
          .select("*")
          .eq("companion_id", companion.id)
          .eq("is_purchased", false)
          .limit(4)
      : Promise.resolve({ data: [] }),
    isFullyVisible
      ? supabase
          .from("availability_posts")
          .select("*")
          .eq("companion_id", companion.id)
          .eq("is_booked", false)
          .gt("date_from", new Date().toISOString())
          .order("date_from", { ascending: true })
          .limit(6)
      : Promise.resolve({ data: [] }),
  ]);

  const photos = (photosResult.data ?? []) as ProfilePhoto[];
  const wishlistItems = (wishlistResult.data ?? []) as WishlistItem[];
  const upcomingPosts = (postsResult.data ?? []) as AvailabilityPost[];
  const services = (Array.isArray(companion.services_offered)
    ? companion.services_offered
    : []) as Service[];

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,1)]">
      {/* ── Hero ── */}
      <div className="relative bg-[rgba(8,8,16,1)]">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgba(212,175,55,0.08),transparent_60%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-10 md:px-6 md:py-14">
          <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center">
            {/* Avatar */}
            <div className="companion-placeholder flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-full border-2 border-[rgba(212,175,55,0.4)] shadow-[0_0_24px_rgba(212,175,55,0.15)]">
              <span
                className="text-3xl font-light text-gold/40"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {displayName.charAt(0)}
              </span>
            </div>

            {/* Identity */}
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex flex-wrap items-center gap-3">
                <h1
                  className="text-gold-gradient text-3xl font-light md:text-4xl"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  @{username}
                </h1>
                {companion.verification_tier === "select" && (
                  <span className="badge-select flex items-center gap-1 rounded-full px-3 py-1 text-xs">
                    <Icon name="star" className="h-3 w-3" />
                    EliteSeek Select
                  </span>
                )}
                {companion.verification_tier === "verified" && (
                  <span className="badge-verified flex items-center gap-1 rounded-full px-3 py-1 text-xs">
                    <Icon name="shield" className="h-3 w-3" />
                    Verified
                  </span>
                )}
              </div>

              {companion.tagline && (
                <p
                  className="text-base italic text-muted/70 md:text-lg"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {companion.tagline}
                </p>
              )}

              <div className="flex flex-wrap items-center gap-4">
                {companion.location && (
                  <span
                    className="flex items-center gap-1.5 text-sm text-muted/60"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    <Icon name="map-pin" className="h-4 w-4 text-gold/50" />
                    {companion.location}
                  </span>
                )}
                {companion.average_rating && (
                  <span
                    className="flex items-center gap-1.5 text-sm text-muted/60"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    <Icon name="star" className="h-4 w-4 text-gold" />
                    {Number(companion.average_rating).toFixed(1)}
                    {companion.total_reviews > 0 &&
                      ` (${companion.total_reviews})`}
                  </span>
                )}
                <span
                  className={`flex items-center gap-1.5 text-sm ${companion.is_available ? "text-emerald-400" : "text-muted/40"}`}
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  <span
                    className={`h-1.5 w-1.5 rounded-full ${companion.is_available ? "animate-pulse bg-emerald-400" : "bg-muted/30"}`}
                  />
                  {companion.is_available ? "Available" : "Unavailable"}
                </span>
              </div>

              {/* Action buttons (always visible) */}
              <div className="mt-2">
                <ProfileActionButtons
                  companionId={companion.id}
                  companionName={displayName}
                  companionUserId={companion.user_id}
                  username={username}
                  subscriptionPrice={companion.subscription_price}
                  bookingRate={companion.booking_rate_hourly}
                  profileUnlockFee={companion.profile_unlock_fee}
                  isOwner={isOwner}
                  isSubscribed={isSubscribed}
                  hasUnlocked={hasUnlocked}
                  accessRequestStatus={accessRequestStatus}
                  lockStatus={lockStatus}
                  clientTier={clientMembershipTier}
                  stripeConfigured={stripeConfigured()}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Divider ── */}
      <div className="gold-divider mx-auto max-w-5xl px-4 md:px-6" />

      {/* ── Content area ── */}
      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-8 md:px-6">
        {/* Lock gate overlay */}
        {!isFullyVisible && (
          isGuest ? (
            <GuestLockGate username={username} lockStatus={lockStatus} />
          ) : (
            <LockGate
              companionName={displayName}
              username={username}
              lockStatus={lockStatus}
              profileUnlockFee={companion.profile_unlock_fee}
              companionId={companion.id}
              accessRequestStatus={accessRequestStatus}
              isEliteBlocked={isEliteBlocked}
              clientTier={clientMembershipTier}
            />
          )
        )}

        {/* Visible content */}
        {isFullyVisible && (
          <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
            {/* ── Sidebar ── */}
            <aside className="w-full shrink-0 lg:w-64">
              {/* Pricing */}
              {(companion.booking_rate_hourly ||
                companion.subscription_price) && (
                <div className="glass-card mb-6 rounded-2xl p-5">
                  <p
                    className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Pricing
                  </p>
                  <div className="flex flex-col gap-3">
                    {companion.booking_rate_hourly && (
                      <div>
                        <p
                          className="text-2xl font-light text-foreground"
                          style={{ fontFamily: "var(--font-cormorant)" }}
                        >
                          ${companion.booking_rate_hourly.toLocaleString()}
                          <span className="ml-1 text-base text-muted/50">
                            /hr
                          </span>
                        </p>
                        <p
                          className="text-xs text-muted/50"
                          style={{ fontFamily: "var(--font-dm-sans)" }}
                        >
                          Hourly booking rate
                        </p>
                      </div>
                    )}
                    {companion.subscription_price && (
                      <div>
                        <p
                          className="text-2xl font-light text-foreground"
                          style={{ fontFamily: "var(--font-cormorant)" }}
                        >
                          ${companion.subscription_price}
                          <span className="ml-1 text-base text-muted/50">
                            /mo
                          </span>
                        </p>
                        <p
                          className="text-xs text-muted/50"
                          style={{ fontFamily: "var(--font-dm-sans)" }}
                        >
                          Monthly subscription
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Languages */}
              {companion.languages?.length > 0 && (
                <div className="glass-card mb-6 rounded-2xl p-5">
                  <p
                    className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Languages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {companion.languages.map((lang: string) => (
                      <span
                        key={lang}
                        className="rounded-full border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-muted/70"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Experience tags */}
              {companion.tags?.length > 0 && (
                <div className="glass-card mb-6 rounded-2xl p-5">
                  <p
                    className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Experiences
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {companion.tags.map((tag: string) => (
                      <span
                        key={tag}
                        className="rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] px-3 py-1 text-xs text-gold/70"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Availability hours */}
              {(companion.available_from || companion.available_until) && (
                <div className="glass-card rounded-2xl p-5">
                  <p
                    className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Availability
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted/60">
                    <Icon name="clock" className="h-4 w-4 text-gold/40" />
                    <span style={{ fontFamily: "var(--font-dm-sans)" }}>
                      {companion.available_from ?? "—"} –{" "}
                      {companion.available_until ?? "—"}
                    </span>
                  </div>
                </div>
              )}
            </aside>

            {/* ── Main content ── */}
            <div className="flex-1 min-w-0 space-y-10">
              {/* Bio */}
              {companion.bio && (
                <section>
                  <p
                    className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    About
                  </p>
                  <p
                    className="text-base leading-relaxed text-muted/80"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {companion.bio}
                  </p>
                </section>
              )}

              {/* Services grid */}
              {services.length > 0 && (
                <section>
                  <div className="gold-divider mb-6" />
                  <p
                    className="mb-4 text-xs uppercase tracking-[0.1em] text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Services Offered
                  </p>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {services.map((svc, i) => (
                      <div
                        key={i}
                        className="rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(255,255,255,0.02)] p-4"
                      >
                        <p
                          className="text-base font-light text-foreground"
                          style={{ fontFamily: "var(--font-cormorant)" }}
                        >
                          {svc.name}
                        </p>
                        {svc.description && (
                          <p
                            className="mt-1 text-xs text-muted/55"
                            style={{ fontFamily: "var(--font-dm-sans)" }}
                          >
                            {svc.description}
                          </p>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-3">
                          {svc.price !== undefined && (
                            <span
                              className="text-sm text-gold/80"
                              style={{ fontFamily: "var(--font-cormorant)" }}
                            >
                              ${svc.price.toLocaleString()}
                            </span>
                          )}
                          {svc.duration && (
                            <span
                              className="text-xs text-muted/50"
                              style={{ fontFamily: "var(--font-dm-sans)" }}
                            >
                              {svc.duration}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}

              {/* Photo gallery */}
              <section>
                <div className="gold-divider mb-6" />
                <p
                  className="mb-4 text-xs uppercase tracking-[0.1em] text-muted/40"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Photos
                </p>
                <PhotoGallery photos={photos} isOwner={isOwner} />
              </section>

              {/* Upcoming posts */}
              <section>
                <div className="gold-divider mb-6" />
                <div className="mb-4 flex items-center justify-between">
                  <p
                    className="text-xs uppercase tracking-[0.1em] text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Upcoming Availability
                  </p>
                  {isOwner && (
                    <a
                      href="/companion/posts/new"
                      className="text-xs text-gold/60 underline underline-offset-2 hover:text-gold"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      + Add post
                    </a>
                  )}
                </div>
                {upcomingPosts.length === 0 ? (
                  <p
                    className="py-4 text-sm text-muted/40"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {isOwner
                      ? "No upcoming posts yet."
                      : "No availability right now."}
                  </p>
                ) : (
                  <div className="space-y-4">
                    {upcomingPosts.map((post) => (
                      <PostCard key={post.id} post={post} />
                    ))}
                  </div>
                )}
              </section>

              {/* Wishlist */}
              <section>
                <div className="gold-divider mb-6" />
                <p
                  className="mb-4 text-xs uppercase tracking-[0.1em] text-muted/40"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Wishlist
                </p>
                <WishlistPreview
                  items={wishlistItems}
                  companionId={companion.id}
                />
              </section>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Guest lock gate ─────────────────────────────────────────────────────────

function GuestLockGate({
  username,
  lockStatus,
}: {
  username: string;
  lockStatus: "public" | "locked" | "elite_only";
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)]">
      <div className="companion-placeholder h-48 w-full blur-md" style={{ opacity: 0.4 }} />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 bg-[rgba(8,8,16,0.75)] px-6 py-10 text-center backdrop-blur-md">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(8,8,16,0.8)]">
          <Icon name="lock" className="h-7 w-7 text-gold/70" />
        </div>
        <p className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          {lockStatus === "elite_only" ? "Elite Members Only" : `@${username}'s profile is locked`}
        </p>
        <p className="max-w-sm text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {lockStatus === "elite_only"
            ? "Create an account and upgrade to Elite membership to access this profile."
            : "Sign in to unlock this profile or request free access."}
        </p>
        <div className="flex flex-wrap justify-center gap-3">
          <a
            href="/signup"
            className="btn-gold rounded-xl px-8 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Join EliteSeek
          </a>
          <a
            href="/login"
            className="btn-ghost rounded-xl px-6 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Sign in
          </a>
        </div>
      </div>
    </div>
  );
}

// ── Authenticated lock gate ──────────────────────────────────────────────────

function LockGate({
  companionName,
  username,
  lockStatus,
  profileUnlockFee,
  companionId,
  accessRequestStatus,
  isEliteBlocked,
  clientTier,
}: {
  companionName: string;
  username: string;
  lockStatus: "public" | "locked" | "elite_only";
  profileUnlockFee: number | null;
  companionId: string;
  accessRequestStatus: string | null;
  isEliteBlocked: boolean;
  clientTier: string;
}) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)]">
      {/* Blurred background preview */}
      <div
        className="companion-placeholder h-48 w-full blur-md"
        style={{ opacity: 0.4 }}
      />

      {/* Glassmorphism overlay */}
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 backdrop-blur-md bg-[rgba(8,8,16,0.75)] px-6 py-10 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(8,8,16,0.8)]">
          <Icon name="lock" className="h-7 w-7 text-gold/70" />
        </div>

        {isEliteBlocked ? (
          <>
            <p
              className="text-2xl font-light text-foreground"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Elite Members Only
            </p>
            <p
              className="max-w-sm text-sm text-muted/60"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {clientTier === "silver"
                ? "You can request access — @" +
                  username +
                  " may approve you directly."
                : "Upgrade to Elite membership to access this profile."}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {clientTier === "silver" && accessRequestStatus === null && (
                <form action="/api/access/request" method="post">
                  <input
                    type="hidden"
                    name="companion_id"
                    value={companionId}
                  />
                  <button
                    type="submit"
                    className="btn-ghost rounded-xl px-6 py-2.5 text-sm"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Request Access
                  </button>
                </form>
              )}
              {clientTier === "silver" && accessRequestStatus === "pending" && (
                <span
                  className="text-xs text-muted/50"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Access request pending…
                </span>
              )}
              <a
                href="/membership"
                className="btn-gold rounded-xl px-8 py-2.5 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Upgrade to Elite
              </a>
            </div>
          </>
        ) : (
          <>
            <p
              className="text-2xl font-light text-foreground"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              @{username}&apos;s profile is locked
            </p>
            <p
              className="max-w-sm text-sm text-muted/60"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Unlock to see full bio, photos, and book exclusive experiences
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              {profileUnlockFee && (
                <form action="/api/access/unlock" method="post">
                  <input
                    type="hidden"
                    name="companion_id"
                    value={companionId}
                  />
                  <input
                    type="hidden"
                    name="amount_paid"
                    value={String(profileUnlockFee)}
                  />
                  <button
                    type="submit"
                    className="btn-gold rounded-xl px-8 py-2.5 text-sm"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Unlock Profile · ${profileUnlockFee}
                  </button>
                </form>
              )}
              {accessRequestStatus === null && (
                <form action="/api/access/request" method="post">
                  <input
                    type="hidden"
                    name="companion_id"
                    value={companionId}
                  />
                  <button
                    type="submit"
                    className="btn-ghost rounded-xl px-6 py-2.5 text-sm"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Request Free Access
                  </button>
                </form>
              )}
              {accessRequestStatus === "pending" && (
                <p
                  className="text-xs text-muted/50"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Your access request is pending review.
                </p>
              )}
              {accessRequestStatus === "declined" && (
                <p
                  className="text-xs text-red-400/70"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Your access request was not approved.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
