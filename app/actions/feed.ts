"use server";

import { revalidatePath, refresh } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

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

  const { error } = await supabase.from("posts").insert({ user_id: user.id, content, tags, image_url });
  if (error) {
    console.error("[createPost] insert error:", error.message);
    return { error: error.message };
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

  refresh();
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

  revalidatePath("/feed");
  return null;
}
