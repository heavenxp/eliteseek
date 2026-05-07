"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { purchaseContent, subscribeToCompanion } from "@/app/actions/content";
import { createPpvCheckout, createSubscriptionCheckout } from "@/app/actions/stripe";
import type { FeedPost } from "@/app/(main)/content/page";

type Props = {
  posts: FeedPost[];
  currentUserId: string;
  stripeConfigured?: boolean;
};

type Filter = "all" | "free" | "subscribed";

export function ContentFeedClient({ posts, currentUserId, stripeConfigured = false }: Props) {
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = posts.filter((p) => {
    if (filter === "free") return !p.is_ppv && !p.is_subscribers_only;
    if (filter === "subscribed") return p.isSubscribed;
    return true;
  });

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1
            className="text-3xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Content
          </h1>
          <Link
            href="/browse"
            className="text-sm text-gold/60 hover:text-gold"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Browse Hosts
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] p-1">
          {(["all", "free", "subscribed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`flex-1 rounded-lg py-2 text-sm capitalize transition-colors ${
                filter === f
                  ? "bg-[rgba(212,175,55,0.12)] text-gold"
                  : "text-muted/50 hover:text-muted/80"
              }`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {f === "subscribed" ? "My Subs" : f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyFeed filter={filter} />
        ) : (
          <div className="space-y-5">
            {filtered.map((post) => (
              <ContentCard key={post.id} post={post} stripeConfigured={stripeConfigured} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentCard({ post, stripeConfigured }: { post: FeedPost; stripeConfigured: boolean }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [localUnlocked, setLocalUnlocked] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isUnlocked =
    localUnlocked ||
    post.isPurchased ||
    post.isSubscribed ||
    (!post.is_ppv && !post.is_subscribers_only);

  const firstMedia = post.media[0] ?? null;
  const hasMultiple = post.media.length > 1;
  const companionHref = post.companion?.username
    ? `/@${post.companion.username}`
    : null;

  function handlePurchase() {
    setError(null);
    startTransition(async () => {
      if (stripeConfigured) {
        const result = await createPpvCheckout(post.id);
        if (result?.error) setError(result.error);
        return; // server redirects on success
      }
      const result = await purchaseContent(post.id);
      if (result.error) { setError(result.error); return; }
      setLocalUnlocked(true);
      router.refresh();
    });
  }

  function handleSubscribe() {
    setError(null);
    startTransition(async () => {
      if (stripeConfigured) {
        const result = await createSubscriptionCheckout(post.companion_id);
        if (result?.error) setError(result.error);
        return; // server redirects on success
      }
      const result = await subscribeToCompanion(post.companion_id);
      if (result.error) { setError(result.error); return; }
      router.refresh();
    });
  }

  return (
    <article className="glass-card overflow-hidden rounded-2xl">
      {/* Companion header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] text-sm font-medium text-gold">
          {post.companion?.display_name?.charAt(0)?.toUpperCase() ?? "?"}
        </div>
        <div className="flex-1 min-w-0">
          {companionHref ? (
            <Link
              href={companionHref}
              className="text-sm font-medium text-foreground hover:text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {post.companion?.display_name ?? "Elite Host"}
            </Link>
          ) : (
            <p className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {post.companion?.display_name ?? "Elite Host"}
            </p>
          )}
          <p className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {formatDate(post.published_at)}
            {post.companion?.verification_tier === "select" && " · EliteSeek Select"}
            {post.companion?.verification_tier === "verified" && " · Verified"}
          </p>
        </div>
        {post.is_ppv && !isUnlocked && (
          <span
            className="shrink-0 rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-2.5 py-0.5 text-xs text-gold"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            PPV · ${post.ppv_price}
          </span>
        )}
        {post.is_subscribers_only && !isUnlocked && (
          <span
            className="shrink-0 rounded-full border border-[rgba(212,175,55,0.15)] px-2.5 py-0.5 text-xs text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Subs only
          </span>
        )}
      </div>

      {/* Media */}
      {firstMedia && (
        <div className="relative">
          <MediaDisplay item={firstMedia} blurred={!isUnlocked} />
          {hasMultiple && isUnlocked && (
            <div className="absolute bottom-2 right-2 flex items-center gap-1 rounded-full bg-black/50 px-2 py-0.5">
              <Icon name="photo" className="h-3 w-3 text-white/70" />
              <span className="text-[10px] text-white/70">{post.media.length}</span>
            </div>
          )}
          {!isUnlocked && (
            <LockOverlay
              post={post}
              isPending={isPending}
              onPurchase={handlePurchase}
              onSubscribe={handleSubscribe}
            />
          )}
        </div>
      )}

      {/* Text content */}
      {(post.title || post.body) && (
        <div className="px-4 py-3">
          {post.title && (
            <p
              className="text-base font-light text-foreground"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {post.title}
            </p>
          )}
          {post.body && isUnlocked && (
            <p
              className="mt-1 text-sm text-foreground/70"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {post.body}
            </p>
          )}
          {post.body && !isUnlocked && (
            <p className="mt-1 select-none blur-sm text-sm text-foreground/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {post.body}
            </p>
          )}
        </div>
      )}

      {error && (
        <p className="px-4 pb-3 text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </p>
      )}
    </article>
  );
}

function MediaDisplay({
  item,
  blurred,
}: {
  item: { url: string; type: string };
  blurred: boolean;
}) {
  const cls = `w-full ${blurred ? "blur-xl scale-105 brightness-50" : ""}`;

  if (item.type === "video") {
    return (
      <video
        src={item.url}
        controls={!blurred}
        muted
        playsInline
        className={`aspect-video object-cover transition-all ${cls}`}
      />
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={item.url}
      alt=""
      className={`max-h-[500px] w-full object-cover transition-all ${cls}`}
    />
  );
}

function LockOverlay({
  post,
  isPending,
  onPurchase,
  onSubscribe,
}: {
  post: FeedPost;
  isPending: boolean;
  onPurchase: () => void;
  onSubscribe: () => void;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/20">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border border-[rgba(212,175,55,0.4)] bg-[rgba(8,8,16,0.7)]">
        <Icon name="lock" className="h-5 w-5 text-gold" />
      </div>
      <div className="flex flex-col items-center gap-2">
        {post.is_ppv && (
          <button
            onClick={onPurchase}
            disabled={isPending}
            className="btn-gold rounded-xl px-5 py-2 text-sm disabled:opacity-50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {isPending ? "Unlocking…" : `Unlock for $${post.ppv_price}`}
          </button>
        )}
        {post.is_subscribers_only && post.companion?.subscription_price && (
          <button
            onClick={onSubscribe}
            disabled={isPending}
            className="btn-ghost rounded-xl px-5 py-2 text-sm disabled:opacity-50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {isPending ? "Subscribing…" : `Subscribe · $${post.companion.subscription_price}/mo`}
          </button>
        )}
      </div>
    </div>
  );
}

function EmptyFeed({ filter }: { filter: Filter }) {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.05)]">
        <Icon name="photo" className="h-6 w-6 text-gold/40" />
      </div>
      <p
        className="text-xl font-light text-foreground/60"
        style={{ fontFamily: "var(--font-cormorant)" }}
      >
        {filter === "subscribed"
          ? "No subscriptions yet"
          : "No content yet"}
      </p>
      <p
        className="text-sm text-muted/40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {filter === "subscribed"
          ? "Subscribe to Elite Hosts to see their exclusive content."
          : "Elite Hosts will publish content here."}
      </p>
      <Link
        href="/browse"
        className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Browse Elite Hosts
      </Link>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}
