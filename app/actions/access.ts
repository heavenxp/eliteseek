"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireUser() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

export type AccessState = { error?: string; success?: boolean } | null;

export async function sendAccessRequest(
  _: AccessState,
  formData: FormData
): Promise<AccessState> {
  const { supabase, userId } = await requireUser();

  const companionId = formData.get("companion_id") as string;
  const message = (formData.get("message") as string)?.trim() || null;

  if (!companionId) return { error: "Invalid request." };

  const { error } = await supabase.from("access_requests").upsert(
    { client_id: userId, companion_id: companionId, message, status: "pending" },
    { onConflict: "client_id,companion_id" }
  );

  if (error) return { error: error.message };

  // Notify companion
  const { data: cp } = await supabase
    .from("companion_profiles")
    .select("user_id")
    .eq("id", companionId)
    .single();

  if (cp) {
    await supabase.from("notifications").insert({
      user_id: cp.user_id,
      type: "access_request",
      title: "New profile access request",
      body: "Someone has requested access to your profile.",
      data: { companion_id: companionId, client_id: userId },
    });
  }

  return { success: true };
}

export async function respondToAccessRequest(
  requestId: string,
  action: "approved" | "declined"
): Promise<AccessState> {
  const { supabase, userId } = await requireUser();

  const { data: req } = await supabase
    .from("access_requests")
    .select("id, client_id, companion_id, companion_profiles!inner(user_id)")
    .eq("id", requestId)
    .single();

  const cp = (Array.isArray(req?.companion_profiles) ? req.companion_profiles[0] : req?.companion_profiles) as { user_id: string } | null | undefined;
  if (!req || cp?.user_id !== userId) return { error: "Request not found." };

  const { error } = await supabase
    .from("access_requests")
    .update({ status: action, responded_at: new Date().toISOString() })
    .eq("id", requestId);

  if (error) return { error: error.message };

  await supabase.from("notifications").insert({
    user_id: req.client_id,
    type: action === "approved" ? "access_approved" : "access_declined",
    title: action === "approved" ? "Profile access granted" : "Access request declined",
    body: action === "approved"
      ? "Your request to view this profile has been approved."
      : "Your access request was not approved.",
    data: { companion_id: req.companion_id },
  });

  return { success: true };
}

export async function unlockProfile(
  _: AccessState,
  formData: FormData
): Promise<AccessState> {
  const { supabase, userId } = await requireUser();

  const companionId = formData.get("companion_id") as string;
  const amountPaid = parseFloat(formData.get("amount_paid") as string);

  if (!companionId) return { error: "Invalid request." };

  // In production this would go through Stripe first
  const { error } = await supabase.from("profile_unlocks").upsert(
    { client_id: userId, companion_id: companionId, amount_paid: amountPaid },
    { onConflict: "client_id,companion_id" }
  );

  if (error) return { error: error.message };
  return { success: true };
}
