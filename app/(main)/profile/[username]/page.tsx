import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripeConfigured } from "@/lib/stripe";
import { ProfileBody } from "./profile-client";
import type { AvailabilityPost } from "@/lib/database.types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;

  const { data } = await createAdminClient()
    .from("companion_profiles")
    .select("display_name, tagline, bio, cover_image_url, verification_tier")
    .eq("username", username)
    .single();

  // Unverified profiles are not live — don't leak their details in metadata
  if (!data || data.verification_tier === "unverified") {
    return { title: "Elite Host — EliteSeek" };
  }

  const name = data.display_name ?? username;
  const description =
    data.tagline ??
    data.bio?.slice(0, 155) ??
    `Book ${name} for exclusive social experiences on EliteSeek.`;

  return {
    title: `${name} — Elite Host on EliteSeek`,
    description,
    openGraph: {
      title: `${name} — Elite Host on EliteSeek`,
      description,
      type: "profile",
      url: `https://eliteseek.com/profile/${username}`,
      ...(data.cover_image_url
        ? { images: [{ url: data.cover_image_url, width: 1200, height: 630, alt: name }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: `${name} — Elite Host on EliteSeek`,
      description,
      ...(data.cover_image_url ? { images: [data.cover_image_url] } : {}),
    },
  };
}

export default async function ProfilePage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: companion } = await createAdminClient()
    .from("companion_profiles")
    .select(
      `id, user_id, display_name, bio, tagline, location, age,
       tags, languages, verification_tier, host_tier, is_available,
       average_rating, total_reviews, booking_rate_hourly,
       subscription_price, profile_unlock_fee, cover_image_url,
       username, available_from, available_until, visibility,
       identity_status`
    )
    .eq("username", username)
    .single();

  if (!companion) notFound();

  const displayName = companion.display_name ?? username;
  const isOwner = user?.id === companion.user_id;

  // Phase 2: unverified host profiles are not live — only the owner can
  // see their own (so they can complete verification).
  if (companion.verification_tier === "unverified" && !isOwner) notFound();
  const lockStatus = companion.visibility as "public" | "locked" | "elite_only";

  // Always fetch: counts + feed posts + content posts
  const [
    followerResult,
    followingResult,
    feedPostsResult,
    availabilityPostsResult,
    contentPostsResult,
  ] = await Promise.all([
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("following_id", companion.user_id),
    supabase.from("follows").select("*", { count: "exact", head: true }).eq("follower_id", companion.user_id),
    supabase.from("posts").select("id, content, created_at, image_url, tags, audience", { count: "exact" }).eq("user_id", companion.user_id).order("created_at", { ascending: false }).limit(50),
    supabase.from("availability_posts").select("*").eq("companion_id", companion.id).gte("date_from", new Date().toISOString()).order("date_from", { ascending: true }).limit(20),
    supabase.from("content_posts").select("id, title, media_urls, is_ppv, ppv_price, is_subscribers_only, published_at").eq("companion_id", companion.id).eq("moderation_status", "approved").order("published_at", { ascending: false }).limit(50),
  ]);

  const followerCount = followerResult.count ?? 0;
  const followingCount = followingResult.count ?? 0;
  const postCount = feedPostsResult.count ?? 0;
  const feedPosts = (feedPostsResult.data ?? []) as Array<{
    id: string; content: string; created_at: string;
    image_url: string | null; tags: string[] | null;
    audience: "public" | "followers" | "private";
  }>;
  const availabilityPosts = (availabilityPostsResult.data ?? []) as AvailabilityPost[];
  const contentPosts = (contentPostsResult.data ?? []) as Array<{
    id: string;
    title: string | null;
    media_urls: Array<{ url: string; type: string }>;
    is_ppv: boolean;
    ppv_price: number | null;
    is_subscribers_only: boolean;
    published_at: string | null;
  }>;

  if (isOwner) {
    // ── Owner: fetch dashboard stats ──────────────────────────────
    const [bookingsResult, accessResult, messagesResult, earningsResult] =
      await Promise.all([
        supabase
          .from("bookings")
          .select("status")
          .eq("companion_id", companion.id),
        supabase
          .from("access_requests")
          .select("id", { count: "exact", head: true })
          .eq("companion_id", companion.id)
          .eq("status", "pending"),
        supabase
          .from("conversations")
          .select("id")
          .eq("companion_id", companion.id),
        supabase
          .from("transactions")
          .select("net_amount")
          .eq("to_user_id", companion.user_id)
          .eq("status", "completed"),
      ]);

    const allBookings = bookingsResult.data ?? [];
    const pendingBookings = allBookings.filter((b) => b.status === "pending").length;
    const confirmedBookings = allBookings.filter((b) => b.status === "confirmed").length;
    const pendingAccessRequests = accessResult.count ?? 0;
    const totalNetEarnings = (earningsResult.data ?? []).reduce(
      (sum, t) => sum + (t.net_amount ?? 0),
      0
    );

    // Unread messages count: messages where sender is not the companion, unread
    const convIds = (messagesResult.data ?? []).map((c) => c.id);
    let unreadMessages = 0;
    if (convIds.length > 0) {
      const { count } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", convIds)
        .eq("is_read", false)
        .neq("sender_id", companion.user_id);
      unreadMessages = count ?? 0;
    }

    return (
      <ProfileBody
        companion={{
          id: companion.id,
          user_id: companion.user_id,
          displayName,
          username: companion.username ?? username,
          bio: companion.bio,
          tagline: companion.tagline,
          location: companion.location,
          age: companion.age,
          tags: companion.tags ?? [],
          languages: companion.languages ?? [],
          verification_tier: companion.verification_tier,
          host_tier: companion.host_tier ?? "pearl",
          is_available: companion.is_available,
          average_rating: companion.average_rating,
          total_reviews: companion.total_reviews,
          booking_rate_hourly: companion.booking_rate_hourly,
          subscription_price: companion.subscription_price,
          profile_unlock_fee: companion.profile_unlock_fee,
          cover_image_url: companion.cover_image_url,
          available_from: companion.available_from,
          available_until: companion.available_until,
        }}
        viewerUserId={user!.id}
        isOwner
        followerCount={followerCount}
        followingCount={followingCount}
        postCount={postCount}
        feedPosts={feedPosts}
        availabilityPosts={availabilityPosts}
        contentPosts={contentPosts}
        stripeConfigured={stripeConfigured()}
        ownerData={{
          pendingBookings,
          confirmedBookings,
          pendingAccessRequests,
          unreadMessages,
          totalNetEarnings,
        }}
      />
    );
  }

  // ── Visitor: fetch social data ────────────────────────────────
  const [
    isFollowingResult,
    clientResult,
    accessResult,
    subResult,
    unlockResult,
  ] = await Promise.all([
    user
      ? supabase.from("follows").select("follower_id").eq("follower_id", user.id).eq("following_id", companion.user_id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("client_profiles").select("membership_tier").eq("user_id", user.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("access_requests").select("status").eq("client_id", user.id).eq("companion_id", companion.id).maybeSingle()
      : Promise.resolve({ data: null }),
    user
      ? supabase.from("subscriptions").select("id").eq("client_id", user.id).eq("companion_id", companion.id).eq("status", "active").maybeSingle()
      : Promise.resolve({ data: null }),
    user && lockStatus !== "public"
      ? supabase.from("profile_unlocks").select("id").eq("client_id", user.id).eq("companion_id", companion.id).maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  const isFollowing = !!isFollowingResult.data;
  const clientTier = clientResult.data?.membership_tier ?? "bronze";
  const accessRequestStatus = accessResult.data?.status ?? null;
  const isSubscribed = !!subResult.data;
  const hasUnlocked = !!unlockResult.data;

  const isFullyVisible =
    lockStatus === "public" ||
    hasUnlocked ||
    accessRequestStatus === "approved" ||
    (lockStatus === "elite_only" && clientTier === "elite");

  return (
    <ProfileBody
      companion={{
        id: companion.id,
        user_id: companion.user_id,
        displayName,
        username: companion.username ?? username,
        bio: companion.bio,
        tagline: companion.tagline,
        location: companion.location,
        age: companion.age,
        tags: companion.tags ?? [],
        languages: companion.languages ?? [],
        verification_tier: companion.verification_tier,
        host_tier: companion.host_tier ?? "pearl",
        is_available: companion.is_available,
        average_rating: companion.average_rating,
        total_reviews: companion.total_reviews,
        booking_rate_hourly: companion.booking_rate_hourly,
        subscription_price: companion.subscription_price,
        profile_unlock_fee: companion.profile_unlock_fee,
        cover_image_url: companion.cover_image_url,
        available_from: companion.available_from,
        available_until: companion.available_until,
      }}
      viewerUserId={user?.id ?? null}
      isOwner={false}
      followerCount={followerCount}
      followingCount={followingCount}
      postCount={postCount}
      feedPosts={feedPosts}
      availabilityPosts={availabilityPosts}
      contentPosts={contentPosts}
      stripeConfigured={stripeConfigured()}
      visitorData={{
        isFollowing,
        clientTier,
        isSubscribed,
        accessRequestStatus,
        hasUnlocked,
        lockStatus,
        isFullyVisible,
      }}
    />
  );
}
