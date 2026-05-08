import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ComposeBox, FeedClient, type FeedPost, type FeedTab } from "./feed-client";

export const metadata: Metadata = {
  title: "Feed — EliteSeek",
  description: "See what the EliteSeek community is sharing.",
};

// Scoring weights
const W_COUNTRY  = 30;
const W_TAG      = 20;
const W_ENGAGE   = 1;   // per like or comment in last 7 days

export default async function FeedPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab: FeedTab = tab === "following" ? "following" : "for_you";

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // ── Follows ───────────────────────────────────────────────────
  const { data: followsData } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);
  const followingIds = new Set((followsData ?? []).map((f) => f.following_id));

  if (activeTab === "following" && followingIds.size === 0) {
    return (
      <PageShell>
        <ComposeBox />
        <FeedClient posts={[]} currentUserId={user.id} activeTab={activeTab} />
      </PageShell>
    );
  }

  // ── Posts ─────────────────────────────────────────────────────
  // For You: fetch 100 to allow reranking; Following: fetch 50 chronologically
  let postsQuery = supabase
    .from("posts")
    .select("id, content, created_at, user_id, tags, image_url")
    .order("created_at", { ascending: false })
    .limit(activeTab === "for_you" ? 100 : 50);

  if (activeTab === "following") {
    postsQuery = postsQuery.in("user_id", Array.from(followingIds));
  }

  const { data: rawPosts, error: postsError } = await postsQuery;
  if (postsError) console.error("[feed] posts query:", postsError.message);

  const postList = rawPosts ?? [];
  const postIds  = postList.map((p) => p.id);

  // Include current user's ID so we can look up their country from the same profiles query
  const authorIds = new Set([...postList.map((p) => p.user_id), user.id]);

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

  // ── Parallel data fetch ───────────────────────────────────────
  const [
    profilesResult,
    likesResult,
    userLikesResult,
    commentsResult,
    // For You ranking signals
    recentLikesResult,
    recentCommentsResult,
    preferredTagsResult,
  ] = await Promise.all([
    // Author profiles (includes current user for country lookup)
    supabase
      .from("profiles")
      .select("id, full_name, avatar_url, country")
      .in("id", Array.from(authorIds)),

    // Total likes (for like_count display)
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),

    // Current user's likes (for is_liked)
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[] }),

    // Comments for display
    postIds.length > 0
      ? supabase
          .from("post_comments")
          .select("id, post_id, content, created_at, user_id")
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; post_id: string; content: string; created_at: string; user_id: string }[] }),

    // Recent likes in last 7 days (For You engagement score)
    activeTab === "for_you" && postIds.length > 0
      ? supabase.from("post_likes").select("post_id").in("post_id", postIds).gte("created_at", sevenDaysAgo)
      : Promise.resolve({ data: [] as { post_id: string }[] }),

    // Recent comments in last 7 days (For You engagement score)
    activeTab === "for_you" && postIds.length > 0
      ? supabase.from("post_comments").select("post_id").in("post_id", postIds).gte("created_at", sevenDaysAgo)
      : Promise.resolve({ data: [] as { post_id: string }[] }),

    // Tags from posts the user previously liked — feeds tag-preference signal
    activeTab === "for_you"
      ? supabase
          .from("post_likes")
          .select("posts(tags)")
          .eq("user_id", user.id)
          .limit(200)
      : Promise.resolve({ data: [] as unknown[] }),
  ]);

  // ── Build lookup maps ─────────────────────────────────────────
  type Profile = { id: string; full_name: string; avatar_url: string | null; country: string | null };
  const profileMap = new Map<string, Profile>(
    (profilesResult.data ?? []).map((p) => [p.id, p as Profile])
  );

  const likeCountMap = new Map<string, number>();
  for (const l of likesResult.data ?? []) {
    likeCountMap.set(l.post_id, (likeCountMap.get(l.post_id) ?? 0) + 1);
  }

  const likedByUser = new Set((userLikesResult.data ?? []).map((l) => l.post_id));

  const comments = commentsResult.data ?? [];
  const commentsByPost = new Map<string, typeof comments>();
  for (const c of comments) {
    const list = commentsByPost.get(c.post_id) ?? [];
    list.push(c);
    commentsByPost.set(c.post_id, list);
  }

  // ── Ranking signals (For You only) ────────────────────────────
  const currentUserCountry = profileMap.get(user.id)?.country ?? null;

  // Build preferred-tag frequency from historical likes
  const tagFreq = new Map<string, number>();
  if (activeTab === "for_you") {
    for (const row of (preferredTagsResult.data ?? []) as Array<{ posts: { tags: string[] } | null }>) {
      for (const tag of row.posts?.tags ?? []) {
        tagFreq.set(tag, (tagFreq.get(tag) ?? 0) + 1);
      }
    }
  }
  // Top 10 tags by engagement frequency
  const preferredTags = new Set(
    [...tagFreq.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10).map(([t]) => t)
  );

  // Recent engagement maps
  const recentLikeCount = new Map<string, number>();
  for (const l of recentLikesResult.data ?? []) {
    recentLikeCount.set(l.post_id, (recentLikeCount.get(l.post_id) ?? 0) + 1);
  }
  const recentCommentCount = new Map<string, number>();
  for (const c of recentCommentsResult.data ?? []) {
    recentCommentCount.set(c.post_id, (recentCommentCount.get(c.post_id) ?? 0) + 1);
  }

  // ── Map to FeedPost ───────────────────────────────────────────
  let posts: FeedPost[] = postList.map((p) => {
    const profile    = profileMap.get(p.user_id);
    const allComments = commentsByPost.get(p.id) ?? [];
    return {
      id:         p.id,
      content:    p.content,
      created_at: p.created_at,
      author_id:  p.user_id,
      tags:       (p.tags as string[]) ?? [],
      image_url:  (p as { image_url?: string | null }).image_url ?? null,
      author: {
        full_name: profile?.full_name ?? "Unknown",
        avatar_url: profile?.avatar_url ?? null,
      },
      like_count:    likeCountMap.get(p.id) ?? 0,
      is_liked:      likedByUser.has(p.id),
      is_following:  followingIds.has(p.user_id),
      comments: allComments.slice(-3).map((c) => {
        const cp = profileMap.get(c.user_id);
        return {
          id:         c.id,
          content:    c.content,
          created_at: c.created_at,
          author: {
            full_name:  cp?.full_name ?? "Unknown",
            avatar_url: cp?.avatar_url ?? null,
          },
        };
      }),
      comment_count: allComments.length,
    };
  });

  // ── Rank For You tab ──────────────────────────────────────────
  if (activeTab === "for_you") {
    posts = posts
      .map((p) => {
        const authorCountry = profileMap.get(p.author_id)?.country ?? null;
        let score = 0;

        // Signal 1: same country
        if (currentUserCountry && authorCountry === currentUserCountry) score += W_COUNTRY;

        // Signal 2: preferred tag match
        for (const tag of p.tags) {
          if (preferredTags.has(tag)) score += W_TAG;
        }

        // Signal 3: recent engagement (last 7 days)
        score += ((recentLikeCount.get(p.id) ?? 0) + (recentCommentCount.get(p.id) ?? 0)) * W_ENGAGE;

        return { ...p, _score: score };
      })
      .sort((a, b) =>
        // Primary: score desc; tiebreaker: recency desc
        b._score - a._score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )
      .slice(0, 50)
      .map(({ _score: _, ...p }) => p);  // strip internal score field
  }

  return (
    <PageShell>
      <ComposeBox />
      <FeedClient posts={posts} currentUserId={user.id} activeTab={activeTab} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header
        className="sticky top-0 z-20 border-b border-white/[0.06] md:top-[65px]"
        style={{ backgroundColor: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)" }}
      >
        <div className="mx-auto max-w-[600px] px-4 py-3.5">
          <h1
            className="text-[17px] font-semibold text-white/90"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Feed
          </h1>
        </div>
      </header>
      <main className="mx-auto max-w-[600px]">{children}</main>
    </>
  );
}
