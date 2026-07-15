"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scanContent, recordModeration } from "@/lib/moderation";

// ── Types ─────────────────────────────────────────────────────

export type MediaItem = {
  url: string;
  type: "photo" | "video";
  storage_path: string;
};

export type ContentPostInput = {
  title: string | null;
  body: string | null;
  isPpv: boolean;
  ppvPrice: number | null;
  isSubscribersOnly: boolean;
  mediaItems: MediaItem[];
};

export type ContentActionResult = { error: string | null };

// ── Helpers ───────────────────────────────────────────────────

async function requireCompanion() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");
  return { supabase, user, companionId: companion.id };
}

// ── Create content post ───────────────────────────────────────

export async function createContentPost(
  input: ContentPostInput
): Promise<ContentActionResult> {
  const { supabase, user, companionId } = await requireCompanion();

  if (!input.title && !input.body && input.mediaItems.length === 0) {
    return { error: "Add some media or text to publish." };
  }
  if (input.isPpv && (!input.ppvPrice || input.ppvPrice < 3)) {
    return { error: "PPV price must be at least $3." };
  }

  // Hive scan before publish: rejected → refuse; flagged → hold for manual
  // review (stays unpublished); unscanned (no HIVE_API_KEY yet) → approve.
  const verdict = await scanContent(
    input.mediaItems.map((m) => m.url),
    [input.title, input.body].filter(Boolean).join("\n")
  );
  if (verdict.status === "rejected") {
    await recordModeration({
      subjectUserId: user.id,
      contentType: "content_post",
      verdict,
    });
    return { error: "This post can't be published — it doesn't meet EliteSeek's content guidelines." };
  }

  const moderationStatus = verdict.status === "flagged" ? "flagged" : "approved";

  const { data: inserted, error } = await supabase
    .from("content_posts")
    .insert({
      companion_id: companionId,
      title: input.title || null,
      body: input.body || null,
      media_urls: input.mediaItems,
      is_ppv: input.isPpv,
      ppv_price: input.isPpv ? input.ppvPrice : null,
      is_subscribers_only: input.isSubscribersOnly,
      moderation_status: moderationStatus,
      moderation_score: verdict.score,
      published_at: moderationStatus === "approved" ? new Date().toISOString() : null,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  await recordModeration({
    subjectUserId: user.id,
    contentId: inserted?.id,
    contentType: "content_post",
    verdict,
  });

  if (moderationStatus === "flagged") {
    return {
      error:
        "Your post is in review — our moderation flagged it for a quick manual check. It will publish automatically once approved.",
    };
  }

  redirect("/companion/content");
}

// ── Delete content post ───────────────────────────────────────

export async function deleteContentPost(
  postId: string
): Promise<ContentActionResult> {
  const { supabase, companionId } = await requireCompanion();

  const { error } = await supabase
    .from("content_posts")
    .delete()
    .eq("id", postId)
    .eq("companion_id", companionId);

  if (error) return { error: error.message };
  return { error: null };
}

// ── Purchase PPV content ──────────────────────────────────────

export async function purchaseContent(
  postId: string
): Promise<ContentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: post } = await supabase
    .from("content_posts")
    .select("id, ppv_price, is_ppv")
    .eq("id", postId)
    .single();

  if (!post || !post.is_ppv || !post.ppv_price) {
    return { error: "Post not available for purchase." };
  }

  const { error } = await supabase.from("content_purchases").insert({
    client_id: user.id,
    post_id: postId,
    amount_paid: post.ppv_price,
  });

  // Ignore unique-violation (already purchased)
  if (error && !error.code?.includes("23505")) return { error: error.message };
  return { error: null };
}

// ── Subscribe to companion ────────────────────────────────────

export async function subscribeToCompanion(
  companionId: string
): Promise<ContentActionResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("subscription_price")
    .eq("id", companionId)
    .single();

  if (!companion?.subscription_price) {
    return { error: "This host is not accepting subscriptions." };
  }

  const now = new Date();
  const periodEnd = new Date(now);
  periodEnd.setDate(periodEnd.getDate() + 30);

  const { error } = await supabase.from("subscriptions").upsert(
    {
      client_id: user.id,
      companion_id: companionId,
      status: "active",
      price_per_month: companion.subscription_price,
      current_period_start: now.toISOString(),
      current_period_end: periodEnd.toISOString(),
    },
    { onConflict: "client_id,companion_id" }
  );

  if (error) return { error: error.message };
  return { error: null };
}
