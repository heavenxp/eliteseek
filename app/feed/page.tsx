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

  // Fetch posts — for "following" tab filter by followed authors
  let postsQuery = supabase
    .from("posts")
    .select(`id, content, created_at, user_id, profiles!user_id (full_name, avatar_url)`)
    .order("created_at", { ascending: false })
    .limit(50);

  if (activeTab === "following") {
    if (followingIds.size === 0) {
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
          <main className="mx-auto max-w-[600px]">
            <ComposeBox />
            <FeedClient posts={[]} currentUserId={user.id} activeTab={activeTab} />
          </main>
        </div>
      );
    }
    postsQuery = postsQuery.in("user_id", Array.from(followingIds));
  }

  const { data: rawPosts } = await postsQuery;

  const postIds = (rawPosts ?? []).map((p) => p.id);

  // Parallel: like counts, user's likes, comments
  const [likesResult, userLikesResult, commentsResult] = await Promise.all([
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase.from("post_likes").select("post_id").eq("user_id", user.id).in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    postIds.length > 0
      ? supabase
          .from("post_comments")
          .select(`id, post_id, content, created_at, profiles!user_id (full_name, avatar_url)`)
          .in("post_id", postIds)
          .order("created_at", { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);

  const likeCountMap = new Map<string, number>();
  for (const like of likesResult.data ?? []) {
    likeCountMap.set(like.post_id, (likeCountMap.get(like.post_id) ?? 0) + 1);
  }

  const likedByUser = new Set((userLikesResult.data ?? []).map((l) => l.post_id));

  const commentsByPost = new Map<string, typeof commentsResult.data>();
  for (const comment of commentsResult.data ?? []) {
    const list = commentsByPost.get(comment.post_id) ?? [];
    list.push(comment);
    commentsByPost.set(comment.post_id, list);
  }

  const posts: FeedPost[] = (rawPosts ?? []).map((p) => {
    const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
    const allComments = commentsByPost.get(p.id) ?? [];
    const displayComments = allComments.slice(-3);

    return {
      id: p.id,
      content: p.content,
      created_at: p.created_at,
      author_id: p.user_id,
      author: {
        full_name: (author as { full_name: string } | null)?.full_name ?? "Unknown",
        avatar_url: (author as { avatar_url: string | null } | null)?.avatar_url ?? null,
      },
      like_count: likeCountMap.get(p.id) ?? 0,
      is_liked: likedByUser.has(p.id),
      is_following: followingIds.has(p.user_id),
      comments: displayComments.map((c) => {
        const ca = Array.isArray(c.profiles) ? c.profiles[0] : c.profiles;
        return {
          id: c.id,
          content: c.content,
          created_at: c.created_at,
          author: {
            full_name: (ca as { full_name: string } | null)?.full_name ?? "Unknown",
            avatar_url: (ca as { avatar_url: string | null } | null)?.avatar_url ?? null,
          },
        };
      }),
      comment_count: allComments.length,
    };
  });

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

      <main className="mx-auto max-w-[600px]">
        <ComposeBox />
        <FeedClient posts={posts} currentUserId={user.id} activeTab={activeTab} />
      </main>
    </div>
  );
}
