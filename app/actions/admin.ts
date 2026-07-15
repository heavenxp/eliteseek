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

// Manual KYC override (e.g. Stripe Identity fails for a legitimate user).
// For hosts this is a real verification decision: it promotes
// verification_tier — the single source of truth for visibility — so admin
// approval and actual visibility can never silently disagree.
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

    const { data: companion } = await supabase
      .from("host_profiles")
      .select("id, verification_tier")
      .eq("user_id", userId)
      .maybeSingle();
    if (companion) {
      await supabase
        .from("host_profiles")
        .update({
          identity_status: "verified",
          identity_verified_at: new Date().toISOString(),
          ...(companion.verification_tier === "unverified"
            ? { verification_tier: "verified" }
            : {}),
        })
        .eq("id", companion.id);
    }

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

    // Keep host lifecycle state consistent; never demote an already
    // verified/select tier from here (that's a suspension, not a KYC call)
    await supabase
      .from("host_profiles")
      .update({ identity_status: "failed" })
      .eq("user_id", userId)
      .neq("identity_status", "verified");

    revalidatePath("/admin/kyc");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}

// ── Moderation-log flag review (messages, feed posts, stories, photos) ──

export async function resolveFlag(
  logId: string,
  resolution: "dismissed" | "removed"
): Promise<{ error: string | null }> {
  try {
    const { user } = await requireAdmin();
    // moderation_log is admin-only via RLS — service role required
    const { createAdminClient } = await import("@/lib/supabase/admin");
    const admin = createAdminClient();

    const { data: log } = await admin
      .from("moderation_log")
      .select("id, content_id, content_type")
      .eq("id", logId)
      .single();
    if (!log) return { error: "Flag not found" };

    if (resolution === "removed" && log.content_id) {
      const table =
        log.content_type === "feed_post"
          ? "posts"
          : log.content_type === "story"
            ? "stories"
            : log.content_type === "message"
              ? "messages"
              : null;
      if (table) {
        const { error } = await admin.from(table).delete().eq("id", log.content_id);
        if (error) return { error: error.message };
      }
    }

    const { error } = await admin
      .from("moderation_log")
      .update({ action: resolution, reviewed_by: user.id })
      .eq("id", logId);
    if (error) return { error: error.message };

    revalidatePath("/admin/moderation");
    revalidatePath("/admin");
    return { error: null };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Unknown error" };
  }
}
