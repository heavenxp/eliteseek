"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { toggleFollow } from "@/app/actions/feed";
import { BookingModal } from "@/components/booking/booking-modal";
import { MessageButton } from "@/components/messages/message-button";
import { SubscribeButton } from "@/components/subscriptions/subscribe-button";

// ── Types ──────────────────────────────────────────────────────

type FeedPostPreview = {
  id: string;
  content: string;
  image_url: string | null;
  tags: string[];
  created_at: string;
};

type ContentPostPreview = {
  id: string;
  title: string | null;
  media_urls: Array<{ url: string; type: string }>;
  is_ppv: boolean;
  ppv_price: number | null;
  is_subscribers_only: boolean;
  published_at: string | null;
};

type CompanionData = {
  id: string;
  user_id: string;
  displayName: string;
  username: string;
  bio: string | null;
  tagline: string | null;
  location: string | null;
  age: number | null;
  tags: string[];
  languages: string[];
  verification_tier: string;
  is_available: boolean;
  average_rating: number | null;
  total_reviews: number;
  booking_rate_hourly: number | null;
  subscription_price: number | null;
  profile_unlock_fee: number | null;
  cover_image_url: string | null;
  available_from: string | null;
  available_until: string | null;
};

type OwnerData = {
  pendingBookings: number;
  confirmedBookings: number;
  pendingAccessRequests: number;
  unreadMessages: number;
  totalNetEarnings: number;
};

type VisitorData = {
  isFollowing: boolean;
  clientTier: string;
  isSubscribed: boolean;
  accessRequestStatus: string | null;
  hasUnlocked: boolean;
  lockStatus: "public" | "locked" | "elite_only";
  isFullyVisible: boolean;
};

type ProfileBodyProps = {
  companion: CompanionData;
  viewerUserId: string | null;
  isOwner: boolean;
  followerCount: number;
  followingCount: number;
  postCount: number;
  feedPosts: FeedPostPreview[];
  contentPosts: ContentPostPreview[];
  stripeConfigured: boolean;
  ownerData?: OwnerData;
  visitorData?: VisitorData;
};

// ── Main component ─────────────────────────────────────────────

export function ProfileBody({
  companion,
  viewerUserId,
  isOwner,
  followerCount: initialFollowerCount,
  followingCount,
  postCount,
  feedPosts,
  contentPosts,
  stripeConfigured,
  ownerData,
  visitorData,
}: ProfileBodyProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"posts" | "media" | "videos">("posts");
  const [isFollowing, setIsFollowing] = useState(visitorData?.isFollowing ?? false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followPending, startFollowTransition] = useTransition();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const optionsRef = useRef<HTMLDivElement>(null);

  const isSelect = companion.verification_tier === "select";
  const isVerified = companion.verification_tier === "verified";

  const mediaItems = contentPosts.flatMap((p) =>
    (Array.isArray(p.media_urls) ? p.media_urls : [])
      .filter((m) => !m.type.includes("video"))
      .map((m) => ({ ...m, post: p }))
  );
  const videoItems = contentPosts.flatMap((p) =>
    (Array.isArray(p.media_urls) ? p.media_urls : [])
      .filter((m) => m.type.includes("video"))
      .map((m) => ({ ...m, post: p }))
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  function handleFollow() {
    startFollowTransition(async () => {
      const result = await toggleFollow(companion.user_id);
      if (!result?.error) {
        setIsFollowing((f) => {
          setFollowerCount((n) => (f ? n - 1 : n + 1));
          return !f;
        });
      }
    });
  }

  function formatTravelDates(from: string, until: string | null): string {
    const fmt = (d: string) =>
      new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return until ? `${fmt(from)} – ${fmt(until)}` : `from ${fmt(from)}`;
  }

  const vd = visitorData;
  const od = ownerData;

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,1)]">
      {/* ── Banner ── */}
      <div className="relative h-56 w-full overflow-hidden md:h-72">
        <button
          onClick={() => router.back()}
          className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(8,8,16,0.6)] backdrop-blur-sm transition-colors hover:bg-[rgba(8,8,16,0.8)]"
          aria-label="Go back"
        >
          <Icon name="chevron-left" className="h-5 w-5 text-white" />
        </button>

        {companion.cover_image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={companion.cover_image_url}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="companion-placeholder h-full w-full" />
        )}

        <div className="absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-[rgba(8,8,16,1)] to-transparent" />
      </div>

      {/* ── Profile header ── */}
      <div className="mx-auto max-w-2xl px-4">
        {/* Avatar + action row */}
        <div className="-mt-12 flex items-end justify-between md:-mt-14">
          <div className="companion-placeholder h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-[rgba(8,8,16,1)] md:h-28 md:w-28">
            <div className="flex h-full w-full items-center justify-center">
              <span
                className="text-3xl font-light text-gold/40 md:text-4xl"
                style={{ fontFamily: "var(--font-cormorant)" }}
              >
                {companion.displayName.charAt(0)}
              </span>
            </div>
          </div>

          {/* Action buttons — only rendered for authenticated viewers */}
          <div className="mb-2 flex items-center gap-2">
            {isOwner ? (
              <>
                <Link
                  href="/companion/posts/new"
                  className="btn-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  <Icon name="plus" className="h-4 w-4" />
                  New Post
                </Link>
                <Link
                  href="/account/settings"
                  className="btn-ghost rounded-xl px-4 py-2 text-sm"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Edit
                </Link>
              </>
            ) : viewerUserId ? (
              <button
                onClick={handleFollow}
                disabled={followPending}
                className={`rounded-xl px-5 py-2 text-sm transition-colors disabled:opacity-50 ${
                  isFollowing
                    ? "border border-[rgba(212,175,55,0.3)] bg-transparent text-gold hover:bg-[rgba(212,175,55,0.06)]"
                    : "btn-gold"
                }`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            ) : null}

            {/* Options ••• — only for authenticated users */}
            {(isOwner || viewerUserId) && <div className="relative" ref={optionsRef}>
              <button
                onClick={() => setOptionsOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(255,255,255,0.03)] text-muted/70 transition-colors hover:border-[rgba(212,175,55,0.35)] hover:text-muted"
                aria-label="More options"
              >
                <span className="text-sm leading-none tracking-wider">•••</span>
              </button>

              {optionsOpen && (
                <div className="absolute right-0 top-11 z-30 min-w-[180px] overflow-hidden rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(12,12,24,0.97)] shadow-xl backdrop-blur-sm">
                  {isOwner ? (
                    <>
                      <OptionsItem href="/companion/bookings">
                        <Icon name="calendar" className="h-4 w-4" /> Manage Bookings
                      </OptionsItem>
                      <OptionsItem href="/companion/access-requests">
                        <Icon name="lock" className="h-4 w-4" /> Access Requests
                      </OptionsItem>
                      <OptionsItem href="/messages">
                        <Icon name="message" className="h-4 w-4" /> Messages
                      </OptionsItem>
                      <OptionsItem href="/account/earnings">
                        <Icon name="currency-dollar" className="h-4 w-4" /> Earnings
                      </OptionsItem>
                      <OptionsItem href="/account/settings">
                        <Icon name="camera" className="h-4 w-4" /> Settings
                      </OptionsItem>
                    </>
                  ) : (
                    <>
                      {companion.booking_rate_hourly && vd?.isFullyVisible && (
                        <OptionsItem
                          onClick={() => { setShowBookingModal(true); setOptionsOpen(false); }}
                        >
                          <Icon name="calendar" className="h-4 w-4" /> Request Booking
                        </OptionsItem>
                      )}
                      <div className="px-1 py-0.5" onClick={() => setOptionsOpen(false)}>
                        <MessageButton otherUserId={companion.user_id} />
                      </div>
                      {companion.subscription_price && !vd?.isSubscribed && vd?.isFullyVisible && (
                        <div className="px-1 py-0.5" onClick={() => setOptionsOpen(false)}>
                          <SubscribeButton
                            companionId={companion.id}
                            price={companion.subscription_price}
                            stripeConfigured={stripeConfigured}
                          />
                        </div>
                      )}
                      {vd?.isFullyVisible && (
                        <OptionsItem href={`/gifts?companion=${companion.id}`}>
                          <Icon name="gift" className="h-4 w-4" /> Send Gift
                        </OptionsItem>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>}
          </div>
        </div>

        {/* Name + handle */}
        <div className="mt-3">
          <div className="flex flex-wrap items-center gap-2">
            <h1
              className="text-2xl font-semibold text-foreground md:text-3xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {companion.displayName}
              {companion.age && (
                <span className="ml-1.5 text-xl font-light text-muted/50">
                  {companion.age}
                </span>
              )}
            </h1>
            {isSelect && (
              <span className="badge-select flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs">
                <Icon name="star" className="h-2.5 w-2.5" />
                Select
              </span>
            )}
            {isVerified && !isSelect && (
              <span className="badge-verified rounded-full px-2.5 py-0.5 text-xs">
                Verified
              </span>
            )}
          </div>
          <p
            className="mt-0.5 text-sm text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            @{companion.username}
          </p>
        </div>

        {/* Stats row */}
        <div
          className="mt-4 flex gap-5 border-b border-[rgba(255,255,255,0.06)] pb-4"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <StatItem value={followerCount} label="Followers" />
          <StatItem value={followingCount} label="Following" />
          <StatItem value={postCount} label="Posts" />
          {companion.average_rating && companion.total_reviews > 0 && (
            <div className="flex flex-col items-start">
              <span className="flex items-center gap-1 text-base font-semibold text-gold">
                <Icon name="star" className="h-3.5 w-3.5" />
                {Number(companion.average_rating).toFixed(1)}
              </span>
              <span className="text-[10px] text-muted/40">
                {companion.total_reviews} review
                {companion.total_reviews !== 1 ? "s" : ""}
              </span>
            </div>
          )}
        </div>

        {/* Bio */}
        {companion.bio && (
          <p
            className="mt-4 text-sm leading-relaxed text-foreground/70"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {companion.bio}
          </p>
        )}

        {/* Location + travel */}
        {(companion.location || companion.available_from) && (
          <div
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted/60"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {companion.location && (
              <span className="flex items-center gap-1.5">
                <Icon name="map-pin" className="h-3.5 w-3.5 shrink-0 text-gold/50" />
                {companion.location}
              </span>
            )}
            {companion.available_from && (
              <span className="flex items-center gap-1.5">
                <span className="text-base leading-none">✈️</span>
                {formatTravelDates(companion.available_from, companion.available_until)}
              </span>
            )}
          </div>
        )}

        {/* Availability dot */}
        <div className="mt-2 flex items-center gap-1.5">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              companion.is_available
                ? "animate-pulse bg-emerald-400"
                : "bg-muted/30"
            }`}
          />
          <span
            className={`text-xs ${
              companion.is_available ? "text-emerald-400" : "text-muted/40"
            }`}
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {companion.is_available
              ? "Available for bookings"
              : "Not taking bookings"}
          </span>
        </div>

        {/* Tags */}
        {companion.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {companion.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] px-2.5 py-0.5 text-[11px] text-gold/70"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* ── Owner dashboard section ── */}
        {isOwner && od && (
          <div className="mt-6">
            <p
              className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Dashboard
            </p>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <DashCard
                href="/companion/bookings"
                label="Bookings"
                value={od.pendingBookings}
                sub={`${od.confirmedBookings} confirmed`}
                badge={od.pendingBookings > 0 ? od.pendingBookings : undefined}
                icon="calendar"
              />
              <DashCard
                href="/companion/access-requests"
                label="Requests"
                value={od.pendingAccessRequests}
                sub="pending"
                badge={od.pendingAccessRequests > 0 ? od.pendingAccessRequests : undefined}
                icon="lock"
              />
              <DashCard
                href="/messages"
                label="Messages"
                value={od.unreadMessages}
                sub="unread"
                badge={od.unreadMessages > 0 ? od.unreadMessages : undefined}
                icon="message"
              />
              <DashCard
                href="/account/earnings"
                label="Earnings"
                value={`$${od.totalNetEarnings.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                sub="lifetime net"
                icon="currency-dollar"
              />
            </div>
          </div>
        )}

        {/* ── Visitor lock notice ── */}
        {!isOwner && vd && !vd.isFullyVisible && (
          <LockNotice
            lockStatus={vd.lockStatus}
            accessRequestStatus={vd.accessRequestStatus}
            companionId={companion.id}
            profile_unlock_fee={companion.profile_unlock_fee}
            clientTier={vd.clientTier}
            viewerUserId={viewerUserId}
          />
        )}

        {/* ── Tabs ── */}
        <div className="sticky top-[65px] z-20 mt-6 -mx-4 bg-[rgba(8,8,16,0.95)] px-4 backdrop-blur-sm">
          <div className="flex border-b border-[rgba(255,255,255,0.06)]">
            {(["posts", "media", "videos"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-gold font-medium text-gold"
                    : "text-muted/50 hover:text-muted/80"
                }`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="pb-20 pt-4">
          {activeTab === "posts" && (
            <PostsTab posts={feedPosts} isOwner={isOwner} />
          )}
          {activeTab === "media" && (
            <MediaTab
              items={mediaItems}
              isSubscribed={vd?.isSubscribed ?? true}
              isFullyVisible={isOwner || (vd?.isFullyVisible ?? false)}
            />
          )}
          {activeTab === "videos" && (
            <VideosTab
              items={videoItems}
              isSubscribed={vd?.isSubscribed ?? true}
              isFullyVisible={isOwner || (vd?.isFullyVisible ?? false)}
            />
          )}
        </div>
      </div>

      {/* Booking modal */}
      {showBookingModal && companion.booking_rate_hourly && (
        <BookingModal
          companionId={companion.id}
          companionName={companion.displayName}
          hourlyRate={companion.booking_rate_hourly}
          onClose={() => setShowBookingModal(false)}
          onSuccess={() => setShowBookingModal(false)}
          stripeConfigured={stripeConfigured}
        />
      )}
    </div>
  );
}

// ── Dashboard card ─────────────────────────────────────────────

function DashCard({
  href,
  label,
  value,
  sub,
  badge,
  icon,
}: {
  href: string;
  label: string;
  value: number | string;
  sub: string;
  badge?: number;
  icon: string;
}) {
  return (
    <Link
      href={href}
      className="group relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[rgba(255,255,255,0.02)] p-4 transition-all hover:border-[rgba(212,175,55,0.25)] hover:bg-[rgba(255,255,255,0.04)]"
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-[rgba(8,8,16,1)]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <Icon name={icon} className="h-4 w-4 text-gold/50 transition-colors group-hover:text-gold/70" />
      <p
        className="text-xl font-semibold text-foreground"
        style={{ fontFamily: "var(--font-cormorant)" }}
      >
        {value}
      </p>
      <div>
        <p className="text-xs font-medium text-foreground/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {label}
        </p>
        <p className="text-[10px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {sub}
        </p>
      </div>
    </Link>
  );
}

// ── Shared sub-components ──────────────────────────────────────

function StatItem({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-start">
      <span className="text-base font-semibold text-foreground">
        {value >= 1000 ? `${(value / 1000).toFixed(1)}k` : value}
      </span>
      <span className="text-[10px] text-muted/40">{label}</span>
    </div>
  );
}

function OptionsItem({
  href,
  onClick,
  children,
}: {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
}) {
  const cls =
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted/70 transition-colors hover:bg-[rgba(212,175,55,0.06)] hover:text-foreground";
  if (href) {
    return (
      <Link href={href} className={cls} style={{ fontFamily: "var(--font-dm-sans)" }}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls} style={{ fontFamily: "var(--font-dm-sans)" }}>
      {children}
    </button>
  );
}

function LockNotice({
  lockStatus,
  accessRequestStatus,
  companionId,
  profile_unlock_fee,
  clientTier,
  viewerUserId,
}: {
  lockStatus: "public" | "locked" | "elite_only";
  accessRequestStatus: string | null;
  companionId: string;
  profile_unlock_fee: number | null;
  clientTier: string;
  viewerUserId: string | null;
}) {
  return (
    <div className="mt-4 rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] px-4 py-4">
      <div className="flex items-start gap-3">
        <Icon name="lock" className="mt-0.5 h-4 w-4 shrink-0 text-gold/50" />
        <div className="flex-1">
          <p
            className="text-sm font-medium text-foreground/80"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {lockStatus === "elite_only" ? "Elite Members Only" : "Profile Locked"}
          </p>
          <p
            className="mt-0.5 text-xs text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {!viewerUserId
              ? "Sign in to unlock this profile"
              : lockStatus === "elite_only" && clientTier !== "elite"
              ? clientTier === "silver"
                ? "Request access or upgrade to Elite to view this profile"
                : "Upgrade to Elite membership to access this profile"
              : "Unlock to see full photos, bio, and book experiences"}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {/* Guest CTA */}
            {!viewerUserId && (
              <Link
                href="/login"
                className="btn-gold rounded-lg px-4 py-1.5 text-xs"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Sign in
              </Link>
            )}
            {/* Authenticated unlock/request actions */}
            {viewerUserId && lockStatus === "locked" && profile_unlock_fee && (
              <form action="/api/access/unlock" method="post">
                <input type="hidden" name="companion_id" value={companionId} />
                <input
                  type="hidden"
                  name="amount_paid"
                  value={String(profile_unlock_fee)}
                />
                <button
                  type="submit"
                  className="btn-gold rounded-lg px-4 py-1.5 text-xs"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Unlock · ${profile_unlock_fee}
                </button>
              </form>
            )}
            {viewerUserId &&
              (lockStatus === "locked" ||
                (lockStatus === "elite_only" && clientTier === "silver")) &&
              accessRequestStatus === null && (
                <form action="/api/access/request" method="post">
                  <input type="hidden" name="companion_id" value={companionId} />
                  <button
                    type="submit"
                    className="btn-ghost rounded-lg px-4 py-1.5 text-xs"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Request Free Access
                  </button>
                </form>
              )}
            {accessRequestStatus === "pending" && (
              <span
                className="text-xs text-muted/50"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Access request pending…
              </span>
            )}
            {accessRequestStatus === "declined" && (
              <span
                className="text-xs text-red-400/70"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Access request was not approved
              </span>
            )}
            {lockStatus === "elite_only" && clientTier !== "elite" && (
              <Link
                href="/membership"
                className="btn-gold rounded-lg px-4 py-1.5 text-xs"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Upgrade to Elite
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Posts tab ──────────────────────────────────────────────────

function PostsTab({
  posts,
  isOwner,
}: {
  posts: FeedPostPreview[];
  isOwner: boolean;
}) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)]">
          <Icon name="feed" className="h-5 w-5 text-gold/30" />
        </div>
        <p
          className="text-sm text-muted/40"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {isOwner ? "You haven't posted anything yet" : "No posts yet"}
        </p>
        {isOwner && (
          <Link
            href="/companion/posts/new"
            className="btn-gold rounded-xl px-5 py-2 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Create your first post
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <FeedPostCard key={post.id} post={post} />
      ))}
    </div>
  );
}

function FeedPostCard({ post }: { post: FeedPostPreview }) {
  return (
    <div className="glass-card overflow-hidden rounded-2xl px-4 py-4">
      <p
        className="text-sm leading-relaxed text-foreground/80"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {post.content}
      </p>
      {post.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={post.image_url}
          alt=""
          className="mt-3 max-h-[400px] w-full rounded-xl object-cover"
        />
      )}
      {post.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[rgba(212,175,55,0.07)] px-2 py-0.5 text-[10px] text-muted/60"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <p
        className="mt-2 text-[10px] text-muted/30"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {formatDate(post.created_at)}
      </p>
    </div>
  );
}

// ── Media tab ──────────────────────────────────────────────────

type MediaItem = { url: string; type: string; post: ContentPostPreview };

function MediaTab({
  items,
  isSubscribed,
  isFullyVisible,
}: {
  items: MediaItem[];
  isSubscribed: boolean;
  isFullyVisible: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)]">
          <Icon name="photo" className="h-5 w-5 text-gold/30" />
        </div>
        <p
          className="text-sm text-muted/40"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          No media yet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item, i) => {
        const locked =
          !isFullyVisible &&
          (item.post.is_ppv || (item.post.is_subscribers_only && !isSubscribed));
        return (
          <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={item.url}
              alt=""
              className={`h-full w-full object-cover transition-all ${
                locked ? "blur-xl scale-110 brightness-50" : ""
              }`}
            />
            {locked && (
              <div className="absolute inset-0 flex items-center justify-center">
                <Icon name="lock" className="h-4 w-4 text-gold/60" />
              </div>
            )}
            {item.post.is_ppv && !locked && (
              <div className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[9px] text-gold">
                PPV
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Videos tab ─────────────────────────────────────────────────

function VideosTab({
  items,
  isSubscribed,
  isFullyVisible,
}: {
  items: MediaItem[];
  isSubscribed: boolean;
  isFullyVisible: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)]">
          <Icon name="video" className="h-5 w-5 text-gold/30" />
        </div>
        <p
          className="text-sm text-muted/40"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          No videos yet
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const locked =
          !isFullyVisible &&
          (item.post.is_ppv || (item.post.is_subscribers_only && !isSubscribed));
        return (
          <div key={i} className="relative overflow-hidden rounded-2xl">
            <video
              src={item.url}
              controls={!locked}
              muted
              playsInline
              className={`aspect-video w-full object-cover transition-all ${
                locked ? "blur-xl brightness-50" : ""
              }`}
            />
            {locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(8,8,16,0.7)]">
                  <Icon name="lock" className="h-4 w-4 text-gold" />
                </div>
                {item.post.is_ppv && item.post.ppv_price && (
                  <span
                    className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(8,8,16,0.7)] px-3 py-1 text-xs text-gold"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    Unlock for ${item.post.ppv_price}
                  </span>
                )}
              </div>
            )}
            {item.post.title && !locked && (
              <p
                className="mt-1.5 px-1 text-xs text-muted/50"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {item.post.title}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
