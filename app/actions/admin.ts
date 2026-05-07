"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function requireAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthenticated");
  const adminEmails = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  if (!adminEmails.includes(user.email ?? "")) throw new Error("Unauthorized");
  return { supabase, user };
}

export async function suspendUser(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: true })
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function unsuspendUser(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ is_suspended: false })
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath("/admin/users");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function approveContent(
  postId: string
): Promise<{ error: string | null }> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("content_posts")
      .update({
        moderation_status: "approved",
        published_at: new Date().toISOString(),
      })
      .eq("id", postId);
    if (error) return { error: error.message };
    revalidatePath("/admin/moderation");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function rejectContent(
  postId: string
): Promise<{ error: string | null }> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("content_posts")
      .update({ moderation_status: "rejected" })
      .eq("id", postId);
    if (error) return { error: error.message };
    revalidatePath("/admin/moderation");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function approveKyc(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: "verified" })
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath("/admin/kyc");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

export async function rejectKyc(
  userId: string
): Promise<{ error: string | null }> {
  try {
    const { supabase } = await requireAdmin();
    const { error } = await supabase
      .from("profiles")
      .update({ kyc_status: "failed" })
      .eq("id", userId);
    if (error) return { error: error.message };
    revalidatePath("/admin/kyc");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
