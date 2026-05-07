import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentFeedClient } from "@/components/content/content-feed-client";
import type { MediaItem } from "@/app/actions/content";

export type FeedPost = {
  id: string;
  companion_id: string;
  title: string | null;
  body: string | null;
  media: MediaItem[];
  is_ppv: boolean;
  ppv_price: number | null;
  is_subscribers_only: boolean;
  published_at: string;
  companion: {
    id: string;
    display_name: string | null;
    username: string | null;
    verification_tier: string;
    cover_image_url: string | null;
    subscription_price: number | null;
  };
  isPurchased: boolean;
  isSubscribed: boolean;
};

export default async function ContentFeedPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: rawPosts } = await supabase
    .from("content_posts")
    .select(
      `id, companion_id, title, body, media_urls,
       is_ppv, ppv_price, is_subscribers_only, published_at,
       companion:companion_profiles!companion_id (
         id, display_name, username, verification_tier,
         cover_image_url, subscription_price
       )`
    )
    .eq("moderation_status", "approved")
    .not("published_at", "is", null)
    .order("published_at", { ascending: false })
    .limit(60);

  const postIds = (rawPosts ?? []).map((p) => p.id);
  const companionIds = [...new Set((rawPosts ?? []).map((p) => p.companion_id))];

  const [purchasesResult, subsResult] = await Promise.all([
    postIds.length > 0
      ? supabase
          .from("content_purchases")
          .select("post_id")
          .eq("client_id", user.id)
          .in("post_id", postIds)
      : Promise.resolve({ data: [] }),
    companionIds.length > 0
      ? supabase
          .from("subscriptions")
          .select("companion_id")
          .eq("client_id", user.id)
          .eq("status", "active")
          .gt("current_period_end", new Date().toISOString())
          .in("companion_id", companionIds)
      : Promise.resolve({ data: [] }),
  ]);

  const purchasedPostIds = new Set(
    (purchasesResult.data ?? []).map((p) => p.post_id)
  );
  const subscribedCompanionIds = new Set(
    (subsResult.data ?? []).map((s) => s.companion_id)
  );

  const posts: FeedPost[] = (rawPosts ?? []).map((p) => {
    const companion = Array.isArray(p.companion)
      ? (p.companion[0] ?? null)
      : p.companion;
    return {
      id: p.id,
      companion_id: p.companion_id,
      title: p.title,
      body: p.body,
      media: (p.media_urls ?? []) as unknown as MediaItem[],
      is_ppv: p.is_ppv,
      ppv_price: p.ppv_price,
      is_subscribers_only: p.is_subscribers_only,
      published_at: p.published_at!,
      companion: companion as FeedPost["companion"],
      isPurchased: purchasedPostIds.has(p.id),
      isSubscribed: subscribedCompanionIds.has(p.companion_id),
    };
  });

  return <ContentFeedClient posts={posts} currentUserId={user.id} />;
}
