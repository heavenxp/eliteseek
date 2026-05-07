"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type FeedActionResult = { error?: string } | null;

export async function createPost(_: FeedActionResult, formData: FormData): Promise<FeedActionResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const content = (formData.get("content") as string)?.trim();
  if (!content || content.length > 500) return { error: "Post must be 1–500 characters." };

  const { error } = await supabase.from("posts").insert({ user_id: user.id, content });
  if (error) return { error: error.message };

  revalidatePath("/feed");
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
