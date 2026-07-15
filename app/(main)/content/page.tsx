import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ContentFeedClient } from "@/components/content/content-feed-client";
import { stripeConfigured } from "@/lib/stripe";
import { signPaths, applySignedUrls, stripMediaItems } from "@/lib/content-media";
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

  // Creators land in their studio; the browse feed is the client view
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role === "companion") redirect("/companion/content");

  const { data: rawPosts } = await supabase
    .from("content_posts")
    .select(
      `id, companion_id, title, body, media_urls,
       is_ppv, ppv_price, is_subscribers_only, published_at,
       companion:host_profiles!companion_id (
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

  // Paywall enforcement (Phase 3): media lives in a private bucket. Unlocked
  // posts get short-lived signed URLs (one batched call); locked posts ship
  // no URLs at all — the client renders placeholders, not blurred originals.
  const entitled = (rawPosts ?? []).map((p) => {
    const isPurchased = purchasedPostIds.has(p.id);
    const isSubscribed = subscribedCompanionIds.has(p.companion_id);
    const unlocked =
      isPurchased || isSubscribed || (!p.is_ppv && !p.is_subscribers_only);
    return { p, isPurchased, isSubscribed, unlocked };
  });

  const urlByPath = await signPaths(
    entitled.flatMap(({ p, unlocked }) =>
      unlocked
        ? ((p.media_urls ?? []) as unknown as MediaItem[]).map((m) => m.storage_path)
        : []
    )
  );

  const posts: FeedPost[] = entitled.map(({ p, isPurchased, isSubscribed, unlocked }) => {
    const companion = Array.isArray(p.companion)
      ? (p.companion[0] ?? null)
      : p.companion;
    const rawMedia = (p.media_urls ?? []) as unknown as MediaItem[];
    return {
      id: p.id,
      companion_id: p.companion_id,
      title: p.title,
      body: unlocked ? p.body : null,
      media: unlocked ? applySignedUrls(rawMedia, urlByPath) : stripMediaItems(rawMedia),
      is_ppv: p.is_ppv,
      ppv_price: p.ppv_price,
      is_subscribers_only: p.is_subscribers_only,
      published_at: p.published_at!,
      companion: companion as FeedPost["companion"],
      isPurchased,
      isSubscribed,
    };
  });

  return <ContentFeedClient posts={posts} currentUserId={user.id} stripeConfigured={stripeConfigured()} />;
}
