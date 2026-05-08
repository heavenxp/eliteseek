import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { ComposeBox, FeedClient, type FeedPost, type FeedTab } from "./feed-client";

export const metadata: Metadata = {
  title: "Feed — EliteSeek",
  description: "See what the EliteSeek community is sharing.",
};

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

  // Fetch who the current user follows
  const { data: followsData } = await supabase
    .from("follows")
    .select("following_id")
    .eq("follower_id", user.id);

  const followingIds = new Set((followsData ?? []).map((f) => f.following_id));

  // Short-circuit the following tab when the user follows nobody
  if (activeTab === "following" && followingIds.size === 0) {
    return (
      <PageShell>
        <ComposeBox />
        <FeedClient posts={[]} currentUserId={user.id} activeTab={activeTab} />
      </PageShell>
    );
  }

  // Fetch posts (no join — profiles has no FK to posts in public schema)
  let postsQuery = supabase
    .from("posts")
    .select("id, content, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(50);

  if (activeTab === "following") {
    postsQuery = postsQuery.in("user_id", Array.from(followingIds));
  }

  const { data: rawPosts, error: postsError } = await postsQuery;
  if (postsError) console.error("[feed] posts query error:", postsError.message);

  const postList = rawPosts ?? [];
  const postIds = postList.map((p) => p.id);

  // Parallel: likes, user's own likes, comments
  const [likesResult, userLikesResult, commentsResult] = await Promise.all([
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] as { post_id: string }[], error: null }),
    postIds.length > 0
      ? supabase
          .from("post_comments")
          .select("id, post_id, content, created_at, user_id")
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] as { id: string; post_id: string; content: string; created_at: string; user_id: string }[], error: null }),
  ]);

  const comments = commentsResult.data ?? [];

  // Collect all user IDs that need profile resolution
  const authorIds = new Set([
    ...postList.map((p) => p.user_id),
    ...comments.map((c) => c.user_id),
  ]);

  // Single profiles fetch — no join syntax needed
  const { data: profilesData } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", Array.from(authorIds));

  const profileMap = new Map(
    (profilesData ?? []).map((p) => [p.id, p] as [string, { id: string; full_name: string; avatar_url: string | null }])
  );

  // Build lookup maps
  const likeCountMap = new Map<string, number>();
  for (const like of likesResult.data ?? []) {
    likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) ?? 0) + 1);
  }

  const likedByUser = new Set((userLikesResult.data ?? []).map((l) => l.post_id));

  const commentsByPost = new Map<string, typeof comments>();
  for (const comment of comments) {
    const list = commentsByPost.get(comment.post_id) ?? [];
    list.push(comment);
    commentsByPost.set(comment.post_id, list);
  }

  const posts: FeedPost[] = postList.map((p) => {
    const profile = profileMap.get(p.user_id);
    const allComments = commentsByPost.get(p.id) ?? [];

    return {
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      author_id: p.user_id,
      author: {
        full_name: profile?.full_name ?? "Unknown",
        avatar_url: profile?.avatar_url ?? null,
      },
      like_count: likeCountMap.get(p.id) ?? 0,
      is_liked: likedByUser.has(p.id),
      is_following: followingIds.has(p.user_id),
      comments: allComments.slice(-3).map((c) => {
        const cp = profileMap.get(c.user_id);
        return {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          author: {
            full_name: cp?.full_name ?? "Unknown",
            avatar_url: cp?.avatar_url ?? null,
          },
        };
      }),
      comment_count: allComments.length,
    };
  });

  return (
    <PageShell>
      <ComposeBox />
      <FeedClient posts={posts} currentUserId={user.id} activeTab={activeTab} />
    </PageShell>
  );
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ backgroundColor: "#0a0a0a" }}>
      <header
        className="sticky top-0 z-20 border-b border-white/[0.06]"
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
    </div>
  );
}
