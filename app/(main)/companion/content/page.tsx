import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icons";
import { DeleteContentButton } from "./delete-content-button";
import { signPaths, applySignedUrls } from "@/lib/content-media";
import type { ContentPost } from "@/lib/database.types";
import type { MediaItem } from "@/app/actions/content";

export const metadata = { title: "Content Studio — EliteSeek" };

type Subscriber = {
  client_id: string;
  price_per_month: number;
  created_at: string;
  current_period_end: string;
  name: string;
  avatar_url: string | null;
};

export default async function ContentStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("host_profiles")
    .select("id, subscription_price")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");

  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);

  const [postsResult, subsResult, txRecipientResult, txRefResult] = await Promise.all([
    supabase
      .from("content_posts")
      .select("*")
      .eq("companion_id", companion.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("client_id, price_per_month, created_at, current_period_end")
      .eq("companion_id", companion.id)
      .eq("status", "active")
      .gt("current_period_end", new Date().toISOString())
      .order("created_at", { ascending: false }),
    // Same resilient recipient-or-reference pair the earnings page uses
    supabase
      .from("transactions")
      .select("id, net_amount, created_at")
      .eq("to_user_id", user.id)
      .eq("status", "completed")
      .limit(500),
    supabase
      .from("transactions")
      .select("id, net_amount, created_at")
      .eq("reference_id", companion.id)
      .eq("status", "completed")
      .limit(500),
  ]);

  const allPosts = (postsResult.data ?? []) as ContentPost[];

  // content-media is private (migration 026) — sign the owner's thumbnails
  const urlByPath = await signPaths(
    allPosts.flatMap((p) =>
      ((p.media_urls as unknown as MediaItem[]) ?? []).map((m) => m.storage_path)
    )
  );
  for (const p of allPosts) {
    p.media_urls = applySignedUrls(
      ((p.media_urls as unknown as MediaItem[]) ?? []),
      urlByPath
    ) as unknown as ContentPost["media_urls"];
  }

  // Merge + dedupe the two transaction queries
  const txMap = new Map<string, { net_amount: number; created_at: string }>();
  for (const t of [...(txRecipientResult.data ?? []), ...(txRefResult.data ?? [])]) {
    txMap.set(t.id, t);
  }
  const allTx = [...txMap.values()];
  const totalNet = allTx.reduce((s, t) => s + Number(t.net_amount), 0);
  const monthNet = allTx
    .filter((t) => new Date(t.created_at) >= monthStart)
    .reduce((s, t) => s + Number(t.net_amount), 0);

  // Subscriber names (cross-user read → admin client)
  const subRows = subsResult.data ?? [];
  const { data: subProfiles } = subRows.length
    ? await createAdminClient()
        .from("profiles")
        .select("id, full_name, avatar_url")
        .in("id", subRows.map((s) => s.client_id))
    : { data: [] };
  const profileMap = new Map((subProfiles ?? []).map((p) => [p.id, p]));
  const subscribers: Subscriber[] = subRows.map((s) => ({
    ...s,
    name: profileMap.get(s.client_id)?.full_name ?? "Member",
    avatar_url: profileMap.get(s.client_id)?.avatar_url ?? null,
  }));

  const monthlyRecurring = subRows.reduce((s, r) => s + Number(r.price_per_month), 0);

  const stats = {
    total: allPosts.length,
    inReview: allPosts.filter((p) => p.moderation_status === "flagged" || p.moderation_status === "pending").length,
  };

  const money = (n: number) =>
    n.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });

  return (
    <div className="page-bg radial-glow min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-light text-foreground md:text-4xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Content Studio
            </h1>
            <p className="mt-1 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Your content, subscribers, and earnings in one place.
            </p>
          </div>
          <Link
            href="/companion/content/new"
            className="btn-gold flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <Icon name="plus" className="h-4 w-4" />
            New Post
          </Link>
        </div>

        {/* Stat tiles */}
        <div className="mb-10 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatTile label="Posts" value={String(stats.total)} sub={stats.inReview > 0 ? `${stats.inReview} in review` : undefined} />
          <StatTile label="Subscribers" value={String(subscribers.length)} sub={companion.subscription_price ? `$${companion.subscription_price}/mo` : "subs off"} />
          <StatTile label="This month" value={money(monthNet)} sub="net earnings" />
          <StatTile label="All time" value={money(totalNet)} sub={monthlyRecurring > 0 ? `${money(monthlyRecurring)}/mo recurring` : "net earnings"} gold />
        </div>

        {/* Subscribers */}
        <section className="mb-10">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              Subscribers
            </h2>
            <Link
              href="/account/earnings"
              className="text-xs text-gold/70 transition-colors hover:text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Full earnings →
            </Link>
          </div>
          {subscribers.length === 0 ? (
            <div className="glass-card rounded-2xl p-6 text-center">
              <p className="text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                No active subscribers yet. Subscriber-only posts and a fair monthly
                price are the fastest way to change that.
              </p>
            </div>
          ) : (
            <div className="glass-card divide-y divide-[rgba(255,255,255,0.05)] rounded-2xl">
              {subscribers.map((s) => (
                <div key={s.client_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.04]">
                    {s.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={s.avatar_url} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="text-sm text-muted/40" style={{ fontFamily: "var(--font-cormorant)" }}>
                        {s.name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm text-foreground/90" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      {s.name}
                    </p>
                    <p className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      since {new Date(s.created_at).toLocaleDateString("en-GB", { month: "short", year: "numeric" })}
                      {" · renews "}
                      {new Date(s.current_period_end).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    </p>
                  </div>
                  <span className="shrink-0 text-sm text-gold/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    ${Number(s.price_per_month)}/mo
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Posts */}
        <section>
          <h2 className="mb-3 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
            Posts
          </h2>
          {allPosts.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="space-y-3">
              {allPosts.map((post) => (
                <ContentRow key={post.id} post={post} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatTile({ label, value, sub, gold }: { label: string; value: string; sub?: string; gold?: boolean }) {
  return (
    <div className={`${gold ? "glass-gold" : "glass-card"} rounded-2xl px-4 py-3.5`}>
      <p className="text-[11px] uppercase tracking-[0.12em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {label}
      </p>
      <p className="mt-1 text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
        {value}
      </p>
      {sub && (
        <p className="mt-0.5 text-[11px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {sub}
        </p>
      )}
    </div>
  );
}

function ContentRow({ post }: { post: ContentPost }) {
  const media = (post.media_urls as unknown as MediaItem[])?.[0] ?? null;
  const mediaCount = (post.media_urls as unknown as MediaItem[])?.length ?? 0;
  const date = new Date(post.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const inReview = post.moderation_status === "flagged" || post.moderation_status === "pending";

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
      {/* Thumbnail */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[rgba(255,255,255,0.04)]">
        {media ? (
          media.type === "video" ? (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="video" className="h-5 w-5 text-muted/40" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="photo" className="h-5 w-5 text-muted/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className="truncate text-sm text-foreground/90"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {post.title || post.body?.slice(0, 50) || "Untitled post"}
          </p>
          {inReview && (
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-400">
              In review
            </span>
          )}
          {post.moderation_status === "rejected" && (
            <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400">
              Rejected
            </span>
          )}
          {post.is_ppv && (
            <span className="rounded-full bg-white/[0.07] px-2 py-0.5 text-[10px] text-gold/70">
              PPV ${post.ppv_price}
            </span>
          )}
          {post.is_subscribers_only && (
            <span className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted/40">
              Subs only
            </span>
          )}
        </div>
        <p
          className="mt-0.5 text-xs text-muted/40"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {date} · {mediaCount} {mediaCount === 1 ? "file" : "files"}
        </p>
      </div>

      <DeleteContentButton postId={post.id} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
        <Icon name="photo" className="h-6 w-6 text-muted/40" />
      </div>
      <p
        className="text-xl font-light text-foreground/60"
        style={{ fontFamily: "var(--font-cormorant)" }}
      >
        No content yet
      </p>
      <p
        className="text-sm text-muted/40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Upload photos and videos for your subscribers.
      </p>
      <Link
        href="/companion/content/new"
        className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Create your first post
      </Link>
    </div>
  );
}
