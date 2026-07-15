"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/app/actions/notifications";
import { scanContent, recordModeration } from "@/lib/moderation";

export type FeedActionResult = { error?: string } | null;

export async function createPost(_: FeedActionResult, formData: FormData): Promise<FeedActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length > 500) return { error: "Post must be 1–500 characters." };

  const tagsRaw = (formData.get("tags") as string | null) ?? "";
  const tags = tagsRaw.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean).slice(0, 5);

  let image_url: string | null = null;
  const imageFile = formData.get("image") as File | null;
  if (imageFile && imageFile.size > 0) {
    if (imageFile.size > 10 * 1024 * 1024) return { error: "Image must be under 10 MB." };
    const ext = imageFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("post-images")
      .upload(path, imageFile, { contentType: imageFile.type, upsert: false });
    if (uploadError) {
      console.error("[createPost] image upload error:", uploadError.message);
      return { error: "Image upload failed." };
    }
    const { data: { publicUrl } } = supabase.storage.from("post-images").getPublicUrl(path);
    image_url = publicUrl;
  }

  const rawAudience = (formData.get("audience") as string) ?? "public";
  const audience = (["public", "followers", "private"] as const).includes(rawAudience as never)
    ? (rawAudience as "public" | "followers" | "private")
    : "public";

  // Gift-locked posts are part of the gifting system, which is cut from scope
  // (lib/flags.ts) — new posts can no longer set a locked_price.
  const locked_price = null;

  const rawMinTier = formData.get("content_min_tier") as string | null;
  const content_min_tier =
    rawMinTier && ["silver", "gold", "platinum"].includes(rawMinTier) ? rawMinTier : null;

  // Hive scan before publish (posts have no moderation column: rejected →
  // refuse synchronously, flagged → publish but log for the manual queue)
  const verdict = await scanContent(image_url ? [image_url] : [], content);
  if (verdict.status === "rejected") {
    await recordModeration({ subjectUserId: user.id, contentType: "feed_post", verdict });
    return { error: "This post can't be published — it doesn't meet EliteSeek's content guidelines." };
  }

  const { data: inserted, error } = await supabase
    .from("posts")
    .insert({ user_id: user.id, content, tags, image_url, audience, locked_price, content_min_tier })
    .select("id")
    .single();
  if (error) {
    console.error("[createPost] insert error:", error.message);
    return { error: error.message };
  }

  if (verdict.status === "flagged") {
    await recordModeration({
      subjectUserId: user.id,
      contentId: inserted?.id,
      contentType: "feed_post",
      verdict,
    });
  }

  return null;
}

export async function toggleLike(postId: string): Promise<FeedActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: existing } = await supabase
    .from("post_likes")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) {
    await supabase.from("post_likes").delete().eq("post_id", postId).eq("user_id", user.id);
  } else {
    await supabase.from("post_likes").insert({ post_id: postId, user_id: user.id });
    const [postRes, profileRes] = await Promise.all([
      supabase.from("posts").select("user_id").eq("id", postId).single(),
      supabase.from("profiles").select("full_name").eq("id", user.id).single(),
    ]);
    if (postRes.data && postRes.data.user_id !== user.id) {
      await notify({
        userId: postRes.data.user_id,
        type: "post_liked",
        title: `${profileRes.data?.full_name ?? "Someone"} liked your post`,
        link: "/feed",
      });
    }
  }

  revalidatePath("/feed");
  return null;
}

export async function toggleFollow(followingId: string): Promise<FeedActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };
  if (user.id === followingId) return { error: "Cannot follow yourself" };

  const { data: existing } = await supabase
    .from("follows")
    .select("follower_id")
    .eq("follower_id", user.id)
    .eq("following_id", followingId)
    .maybeSingle();

  if (existing) {
    await supabase.from("follows").delete()
      .eq("follower_id", user.id)
      .eq("following_id", followingId);
  } else {
    await supabase.from("follows").insert({ follower_id: user.id, following_id: followingId });
    const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
    await notify({
      userId: followingId,
      type: "new_follower",
      title: `${profile?.full_name ?? "Someone"} started following you`,
      link: "/feed",
    });
  }

  revalidatePath("/feed");
  return null;
}

export async function deletePost(postId: string): Promise<FeedActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { error } = await supabase
    .from("posts")
    .delete()
    .eq("id", postId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/feed");
  return null;
}

export async function createComment(postId: string, content: string): Promise<FeedActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const trimmed = content.trim();
  if (!trimmed || trimmed.length > 300) return { error: "Comment must be 1–300 characters." };

  const { error } = await supabase
    .from("post_comments")
    .insert({ post_id: postId, user_id: user.id, content: trimmed });

  if (error) return { error: error.message };

  const [postRes, profileRes] = await Promise.all([
    supabase.from("posts").select("user_id").eq("id", postId).single(),
    supabase.from("profiles").select("full_name").eq("id", user.id).single(),
  ]);
  if (postRes.data && postRes.data.user_id !== user.id) {
    await notify({
      userId: postRes.data.user_id,
      type: "post_commented",
      title: `${profileRes.data?.full_name ?? "Someone"} commented on your post`,
      body: trimmed.length > 80 ? trimmed.slice(0, 80) + "…" : trimmed,
      link: "/feed",
    });
  }

  revalidatePath("/feed");
  return null;
}
