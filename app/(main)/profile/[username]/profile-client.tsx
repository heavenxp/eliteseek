"use client";

import { useState, useTransition, useRef, useEffect, useActionState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { VerifiedBadge } from "@/components/badges/verified-badge";
import { toggleFollow, deletePost } from "@/app/actions/feed";
import { sendAccessRequest, type AccessState } from "@/app/actions/access";
import { BookingModal } from "@/components/booking/booking-modal";
import { MessageButton } from "@/components/messages/message-button";
import { SubscribeButton } from "@/components/subscriptions/subscribe-button";
import type { AvailabilityPost } from "@/lib/database.types";
import { getFollowerList, getFollowingList, type FollowListItem } from "@/app/actions/follows";
import { TierBadge } from "@/components/badges/tier-badge";

// ── Types ──────────────────────────────────────────────────────

type FeedPostItem = {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  tags: string[] | null;
  audience: "public" | "followers" | "private";
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

type FeedImageItem = { url: string; post: FeedPostItem };

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
  host_tier: string;
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
  feedPosts: FeedPostItem[];
  availabilityPosts: AvailabilityPost[];
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
  availabilityPosts,
  contentPosts,
  stripeConfigured,
  ownerData,
  visitorData,
}: ProfileBodyProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"posts" | "events" | "media" | "about">("posts");
  const [isFollowing, setIsFollowing] = useState(visitorData?.isFollowing ?? false);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [followPending, startFollowTransition] = useTransition();
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [newPostOpen, setNewPostOpen] = useState(false);
  const [showBookingModal, setShowBookingModal] = useState(false);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followingModalOpen, setFollowingModalOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<AvailabilityPost | null>(null);
  const optionsRef = useRef<HTMLDivElement>(null);
  const newPostRef = useRef<HTMLDivElement>(null);


  const mediaItems: FeedImageItem[] = feedPosts
    .filter((p): p is FeedPostItem & { image_url: string } => p.image_url != null)
    .map((p) => ({ url: p.image_url, post: p }));
  const videoItems = contentPosts.flatMap((p) =>
    (Array.isArray(p.media_urls) ? p.media_urls : [])
      // Locked posts arrive with stripped URLs (server-enforced paywall)
      .filter((m) => m.type.includes("video") && m.url)
      .map((m) => ({ ...m, post: p }))
  );

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (optionsRef.current && !optionsRef.current.contains(e.target as Node)) {
        setOptionsOpen(false);
      }
      if (newPostRef.current && !newPostRef.current.contains(e.target as Node)) {
        setNewPostOpen(false);
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

  // Next upcoming availability post in a different city — powers the
  // "Based in Melbourne · Sydney Jun 7 – 9" line (city-based discovery)
  const nextAwayPost = availabilityPosts.find(
    (p) =>
      p.location_city &&
      new Date(p.date_from) > new Date() &&
      (!companion.location ||
        !companion.location.toLowerCase().includes(p.location_city.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,1)]">
      {/* ── Banner ── */}
      <div className="relative h-36 w-full overflow-hidden md:h-44">
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
        <div className="-mt-10 flex items-end justify-between md:-mt-12">
          <div className="companion-placeholder h-20 w-20 shrink-0 overflow-hidden rounded-full border-4 border-[rgba(8,8,16,1)] md:h-24 md:w-24">
            <div className="flex h-full w-full items-center justify-center">
              <span
                className="text-xl font-bold tracking-tight text-muted/40 md:text-4xl"
               
              >
                {companion.displayName.charAt(0)}
              </span>
            </div>
          </div>

          {/* Action buttons — only rendered for authenticated viewers */}
          <div className="mb-2 flex items-center gap-2">
            {isOwner ? (
              <>
                <div className="relative" ref={newPostRef}>
                  <button
                    onClick={() => setNewPostOpen((o) => !o)}
                    className="btn-gold flex items-center gap-1.5 rounded-xl px-4 py-2 text-sm"

                  >
                    <Icon name="plus" className="h-4 w-4" />
                    New Post
                    <Icon name="chevron-down" className="h-3 w-3 ml-0.5 opacity-70" />
                  </button>
                  {newPostOpen && (
                    <div className="absolute right-0 top-11 z-30 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[rgba(12,12,24,0.97)] shadow-xl backdrop-blur-sm">
                      <Link
                        href="/feed"
                        onClick={() => setNewPostOpen(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted/70 transition-colors hover:bg-white/[0.04] hover:text-foreground"

                      >
                        <Icon name="feed" className="h-4 w-4" /> Social Post
                      </Link>
                      <Link
                        href="/companion/posts/new"
                        onClick={() => setNewPostOpen(false)}
                        className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted/70 transition-colors hover:bg-white/[0.04] hover:text-foreground"

                      >
                        <Icon name="calendar" className="h-4 w-4" /> Availability Post
                      </Link>
                    </div>
                  )}
                </div>
                <Link
                  href="/account/settings"
                  className="btn-ghost rounded-xl px-4 py-2 text-sm"

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
                    ? "border border-white/20 bg-transparent text-gold hover:bg-white/[0.04]"
                    : "btn-gold"
                }`}

              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            ) : null}

            {/* Options ••• — only for authenticated users */}
            {(isOwner || (viewerUserId && vd?.isFullyVisible)) && <div className="relative" ref={optionsRef}>
              <button
                onClick={() => setOptionsOpen((o) => !o)}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/10 bg-[rgba(255,255,255,0.03)] text-muted/70 transition-colors hover:border-white/20 hover:text-muted"
                aria-label="More options"
              >
                <span className="text-sm leading-none tracking-wider">•••</span>
              </button>

              {optionsOpen && (
                <div className="absolute right-0 top-11 z-30 min-w-[180px] overflow-hidden rounded-xl border border-white/10 bg-[rgba(12,12,24,0.97)] shadow-xl backdrop-blur-sm">
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
                  ) : null}
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
             
            >
              {companion.displayName}
            </h1>
            <VerifiedBadge tier={companion.verification_tier} size="lg" />
            {companion.host_tier && companion.host_tier !== "pearl" && (
              <TierBadge type="host" tier={companion.host_tier} />
            )}
          </div>
          <p
            className="mt-0.5 text-sm text-muted/50"

          >
            @{companion.username}
          </p>
        </div>

        {/* Stats row */}
        <div
          className="mt-4 flex gap-5 border-b border-[rgba(255,255,255,0.06)] pb-4"

        >
          <button
            onClick={() => setFollowersModalOpen(true)}
            className="flex flex-col items-start transition-opacity hover:opacity-70"
          >
            <StatItem value={followerCount} label="Followers" />
          </button>
          <button
            onClick={() => setFollowingModalOpen(true)}
            className="flex flex-col items-start transition-opacity hover:opacity-70"
          >
            <StatItem value={followingCount} label="Following" />
          </button>
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

        {/* CTA */}
        {!isOwner && viewerUserId && (
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            {vd?.isFullyVisible && companion.booking_rate_hourly && (
              <button
                onClick={() => setShowBookingModal(true)}
                className="btn-gold flex items-center gap-1.5 rounded-xl px-5 py-2.5 text-sm"

              >
                <Icon name="calendar" className="h-4 w-4" />
                Book
              </button>
            )}
            <MessageButton otherUserId={companion.user_id} label="Message" />
            {vd?.isFullyVisible && companion.subscription_price && !vd?.isSubscribed && (
              <SubscribeButton
                companionId={companion.id}
                price={companion.subscription_price}
                stripeConfigured={stripeConfigured}
              />
            )}
          </div>
        )}

        {/* Bio */}
        {companion.bio && (
          <p
            className="mt-4 text-sm leading-relaxed text-foreground/70"

          >
            {companion.bio}
          </p>
        )}

        {/* Location + structured availability: "Based in X · Y, Jun 7 – 9" */}
        {(companion.location || companion.available_from || nextAwayPost) && (
          <div
            className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted/60"

          >
            {companion.location && (
              <span className="flex items-center gap-1.5">
                <Icon name="map-pin" className="h-3.5 w-3.5 shrink-0 text-muted/40" />
                Based in {companion.location}
              </span>
            )}
            {nextAwayPost && (
              <span className="flex items-center gap-1.5">
                <Icon name="send" className="h-3.5 w-3.5 shrink-0 text-muted/40" />
                {nextAwayPost.location_city}{" "}
                {formatTravelDates(nextAwayPost.date_from, nextAwayPost.date_to)}
              </span>
            )}
            {!nextAwayPost && companion.available_from && (
              <span className="flex items-center gap-1.5">
                <Icon name="calendar" className="h-3.5 w-3.5 shrink-0 text-muted/40" />
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

          >
            {companion.is_available
              ? "Available for bookings"
              : "Not taking bookings"}
          </span>
        </div>

        {/* ── Owner dashboard section ── */}
        {isOwner && od && (
          <div className="mt-6">
            <p
              className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40"

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


        {/* ── Tabs ── */}
        <div className="sticky top-[65px] z-20 mt-6 -mx-4 bg-[rgba(8,8,16,0.95)] px-4 backdrop-blur-sm">
          <div className="flex border-b border-[rgba(255,255,255,0.06)]">
            {(["posts", "events", "media", "about"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 py-3 text-sm capitalize transition-colors ${
                  activeTab === tab
                    ? "border-b-2 border-gold font-medium text-gold"
                    : "text-muted/50 hover:text-muted/80"
                }`}

              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ── Tab content ── */}
        <div className="relative overflow-hidden pb-20 pt-4">
          {activeTab === "posts" && (
            <PostsTab
              feedPosts={feedPosts}
              isOwner={isOwner}
              onDelete={async (postId) => { await deletePost(postId); router.refresh(); }}
            />
          )}
          {activeTab === "events" && (
            <AvailabilityTab
              posts={availabilityPosts}
              isOwner={isOwner}
              onBook={(post) => setSelectedPost(post)}
            />
          )}
          {activeTab === "media" && (
            <>
              <MediaTab
                items={mediaItems}
                isFullyVisible={isOwner || (vd?.isFullyVisible ?? false)}
              />
              {videoItems.length > 0 && (
                <div className="mt-4">
                  <VideosTab
                    items={videoItems}
                    isSubscribed={vd?.isSubscribed ?? true}
                    isFullyVisible={isOwner || (vd?.isFullyVisible ?? false)}
                  />
                </div>
              )}
            </>
          )}
          {activeTab === "about" && <AboutTab companion={companion} />}

        </div>
      </div>

      {/* Follow list modals */}
      {followersModalOpen && (
        <FollowListModal
          title="Followers"
          companionUserId={companion.user_id}
          mode="followers"
          onClose={() => setFollowersModalOpen(false)}
        />
      )}
      {followingModalOpen && (
        <FollowListModal
          title="Following"
          companionUserId={companion.user_id}
          mode="following"
          onClose={() => setFollowingModalOpen(false)}
        />
      )}

      {/* Booking modal */}
      {(showBookingModal || selectedPost !== null) && (
        <BookingModal
          companionId={companion.id}
          companionName={companion.displayName}
          post={selectedPost ?? undefined}
          hourlyRate={companion.booking_rate_hourly}
          onClose={() => { setShowBookingModal(false); setSelectedPost(null); }}
          onSuccess={() => { setShowBookingModal(false); setSelectedPost(null); }}
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
      className="group relative flex flex-col gap-1.5 overflow-hidden rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4 transition-all hover:border-white/20 hover:bg-[rgba(255,255,255,0.04)]"
    >
      {badge !== undefined && badge > 0 && (
        <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-gold text-[10px] font-bold text-[rgba(8,8,16,1)]">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
      <Icon name={icon} className="h-4 w-4 text-muted/40 transition-colors group-hover:text-gold/70" />
      <p
        className="text-xl font-semibold text-foreground"
       
      >
        {value}
      </p>
      <div>
        <p className="text-xs font-medium text-foreground/70">
          {label}
        </p>
        <p className="text-[10px] text-muted/40">
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
    "flex w-full items-center gap-2.5 px-4 py-2.5 text-left text-sm text-muted/70 transition-colors hover:bg-white/[0.04] hover:text-foreground";
  if (href) {
    return (
      <Link href={href} className={cls}>
        {children}
      </Link>
    );
  }
  return (
    <button onClick={onClick} className={cls}>
      {children}
    </button>
  );
}

const TIER_BADGE: Record<string, { label: string; cls: string }> = {
  bronze: { label: "Bronze", cls: "bg-[rgba(180,120,60,0.15)] text-[#c87941]" },
  silver: { label: "Silver", cls: "bg-[rgba(180,180,200,0.12)] text-[#a0a0b8]" },
  elite:  { label: "Elite",  cls: "bg-white/[0.07] text-gold" },
};

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${Math.max(1, mins)}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  const mos = Math.floor(days / 30);
  if (mos < 12) return `${mos}mo ago`;
  return `${Math.floor(mos / 12)}y ago`;
}

function FollowListModal({
  title,
  companionUserId,
  mode,
  onClose,
}: {
  title: string;
  companionUserId: string;
  mode: "followers" | "following";
  onClose: () => void;
}) {
  const [items, setItems] = useState<FollowListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fn = mode === "followers" ? getFollowerList : getFollowingList;
    fn(companionUserId).then((data) => {
      setItems(data);
      setLoading(false);
    });
  }, [companionUserId, mode]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-[rgba(8,8,16,0.75)] backdrop-blur-sm"
        onClick={onClose}
      />
      {/* Card */}
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-white/10 bg-[rgba(16,12,32,0.98)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-base font-semibold text-foreground"
           
          >
            {title}
            {!loading && (
              <span className="ml-2 text-sm text-muted/40">{items.length}</span>
            )}
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-muted/40 transition-colors hover:text-muted/70"
          >
            <Icon name="x" className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-8">
            <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/20 border-t-gold" />
          </div>
        ) : items.length === 0 ? (
          <p
            className="py-8 text-center text-sm text-muted/30"

          >
            None yet
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const initial = item.name.charAt(0).toUpperCase();
              const tierBadge = item.tier ? TIER_BADGE[item.tier] : null;
              const row = (
                <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition-colors hover:border-white/10 hover:bg-white/[0.04]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/[0.07] text-xs font-medium text-gold">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span
                        className="truncate text-sm text-foreground/90"

                      >
                        {item.name}
                      </span>
                      {tierBadge && (
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-medium ${tierBadge.cls}`}

                        >
                          {tierBadge.label}
                        </span>
                      )}
                    </div>
                    <p
                      className="text-[10px] text-muted/30"

                    >
                      {item.username ? `@${item.username} · ` : ""}{relativeTime(item.followedAt)}
                    </p>
                  </div>
                  {item.username && (
                    <Icon name="chevron-right" className="h-3.5 w-3.5 shrink-0 text-muted/30" />
                  )}
                </div>
              );
              return (
                <li key={item.id}>
                  <Link
                    href={item.username ? `/profile/${item.username}` : `/profile/client/${item.id}`}
                    onClick={onClose}
                  >
                    {row}
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Availability tab ───────────────────────────────────────────

const CATEGORY_LABELS: Record<string, string> = {
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

function AboutTab({ companion }: { companion: CompanionData }) {
  const rows: Array<[string, string]> = [];
  if (companion.age) rows.push(["Age", String(companion.age)]);
  if (companion.location) rows.push(["Based in", companion.location]);
  if (companion.languages.length > 0) rows.push(["Languages", companion.languages.join(", ")]);

  return (
    <div className="space-y-6">
      {rows.length > 0 && (
        <div className="divide-y divide-white/[0.06] rounded-2xl border border-white/[0.08]">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between px-4 py-3">
              <span className="text-xs uppercase tracking-[0.08em] text-muted/40">
                {label}
              </span>
              <span className="text-sm text-foreground/80">
                {value}
              </span>
            </div>
          ))}
        </div>
      )}

      {companion.tags.length > 0 && (
        <div>
          <p className="mb-2 text-xs uppercase tracking-[0.08em] text-muted/40">
            Event types
          </p>
          <div className="flex flex-wrap gap-1.5">
            {companion.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-0.5 text-[11px] text-muted/70"

              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      )}

      {(companion.verification_tier === "verified" || companion.verification_tier === "select") && (
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/[0.08] bg-white/[0.03] px-4 py-3">
          <VerifiedBadge tier={companion.verification_tier} size="md" />
          <p className="text-sm text-muted/70">
            Identity verified via Stripe Identity
            {companion.verification_tier === "select" ? " · handpicked Select host" : ""}
          </p>
        </div>
      )}
    </div>
  );
}

function AvailabilityTab({
  posts,
  isOwner,
  onBook,
}: {
  posts: AvailabilityPost[];
  isOwner: boolean;
  onBook: (post: AvailabilityPost) => void;
}) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Icon name="calendar" className="h-5 w-5 text-muted/40" />
        </div>
        <p className="text-sm text-muted/40">
          {isOwner ? "No upcoming availability posts" : "No upcoming availability"}
        </p>
        {isOwner && (
          <Link
            href="/companion/posts/new"
            className="btn-gold rounded-xl px-5 py-2 text-sm"

          >
            Add Availability
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {posts.map((post) => (
        <div
          key={post.id}
          className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <p
                className="text-sm font-medium text-foreground/90"
               
              >
                {post.title}
              </p>
              <p className="mt-0.5 text-xs text-muted/40">
                {CATEGORY_LABELS[post.category] ?? post.category}
              </p>
              <div
                className="mt-1.5 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted/50"

              >
                <span>
                  {new Date(post.date_from).toLocaleDateString("en-GB", {
                    weekday: "short",
                    day: "numeric",
                    month: "short",
                  })}
                </span>
                {post.location_city && <span>{post.location_city}</span>}
                <span className="text-gold/70">${post.price.toLocaleString()}</span>
              </div>
            </div>
            {!isOwner && (
              <button
                onClick={() => onBook(post)}
                className="shrink-0 btn-gold rounded-xl px-4 py-2 text-sm"

              >
                Book
              </button>
            )}
          </div>
          {post.description && (
            <p
              className="mt-2 text-xs leading-relaxed text-muted/50 whitespace-pre-wrap"

            >
              {post.description}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}

// ── Posts tab ──────────────────────────────────────────────────

function PostsTab({
  feedPosts,
  isOwner,
  onDelete,
}: {
  feedPosts: FeedPostItem[];
  isOwner: boolean;
  onDelete: (id: string) => Promise<void>;
}) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (feedPosts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Icon name="photo" className="h-5 w-5 text-muted/40" />
        </div>
        <p className="text-sm text-muted/40">
          {isOwner ? "You haven't posted to the feed yet" : "No posts yet"}
        </p>
        {isOwner && (
          <Link href="/feed" className="btn-gold rounded-xl px-5 py-2 text-sm">
            Go to feed
          </Link>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 pb-6">
      {feedPosts.map((post) => {
        const diff = Date.now() - new Date(post.created_at).getTime();
        const mins = Math.floor(diff / 60000);
        const timeAgo =
          mins < 60 ? `${Math.max(1, mins)}m ago`
          : mins < 1440 ? `${Math.floor(mins / 60)}h ago`
          : mins < 10080 ? `${Math.floor(mins / 1440)}d ago`
          : new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

        return (
          <div
            key={post.id}
            className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4"
          >
            <p className="text-xs text-muted/30">
              {timeAgo}
            </p>
            <p
              className="mt-1.5 text-sm leading-relaxed text-foreground/75 whitespace-pre-wrap break-words"

            >
              {post.content}
            </p>
            {post.image_url && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={post.image_url}
                alt=""
                className="mt-3 w-full rounded-xl object-cover"
                style={{ maxHeight: "320px" }}
              />
            )}
            {post.tags && post.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {post.tags.slice(0, 5).map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted/40"

                  >
                    #{tag}
                  </span>
                ))}
              </div>
            )}
            {isOwner && (
              <div className="mt-2 flex items-center justify-between">
                <span className="text-[10px] text-muted/30">
                  {post.audience === "public"
                    ? "Public"
                    : post.audience === "followers"
                    ? "Followers only"
                    : "Only me"}
                </span>
                <button
                  onClick={async () => {
                    setDeletingId(post.id);
                    await onDelete(post.id);
                    setDeletingId(null);
                  }}
                  disabled={deletingId === post.id}
                  className="p-1 text-muted/30 transition-colors hover:text-red-400/70 disabled:opacity-40"
                  aria-label="Delete post"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Media tab ──────────────────────────────────────────────────

function MediaTab({
  items,
  isFullyVisible,
}: {
  items: FeedImageItem[];
  isFullyVisible: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Icon name="photo" className="h-5 w-5 text-muted/40" />
        </div>
        <p className="text-sm text-muted/40">
          No photos yet
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-1">
      {items.map((item, i) => (
        <div key={i} className="relative aspect-square overflow-hidden rounded-lg">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={item.url}
            alt=""
            className="h-full w-full object-cover"
          />
        </div>
      ))}
    </div>
  );
}

// ── Videos tab ─────────────────────────────────────────────────

type VideoItem = { url: string; type: string; post: ContentPostPreview };

function VideosTab({
  items,
  isSubscribed,
  isFullyVisible,
}: {
  items: VideoItem[];
  isSubscribed: boolean;
  isFullyVisible: boolean;
}) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
          <Icon name="video" className="h-5 w-5 text-muted/40" />
        </div>
        <p
          className="text-sm text-muted/40"

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
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/20 bg-[rgba(8,8,16,0.7)]">
                  <Icon name="lock" className="h-4 w-4 text-gold" />
                </div>
                {item.post.is_ppv && item.post.ppv_price && (
                  <span
                    className="rounded-full border border-white/20 bg-[rgba(8,8,16,0.7)] px-3 py-1 text-xs text-gold"

                  >
                    Unlock for ${item.post.ppv_price}
                  </span>
                )}
              </div>
            )}
            {item.post.title && !locked && (
              <p
                className="mt-1.5 px-1 text-xs text-muted/50"

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

