"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sendAccessApprovalEmail } from "@/lib/email";

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
    .from("host_profiles")
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
    .select("id, client_id, companion_id")
    .eq("id", requestId)
    .single();

  if (!req) return { error: "Request not found." };

  // Verify ownership without a join — avoids !inner RLS collapse
  const { data: cp } = await supabase
    .from("host_profiles")
    .select("user_id")
    .eq("id", req.companion_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!cp) return { error: "Request not found." };

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

  // Fire-and-forget: email client if their access was approved
  if (action === "approved") {
    void (async () => {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const [clientAuthRes, companionProfileRes] = await Promise.all([
          admin.auth.admin.getUserById(req.client_id),
          supabase
            .from("host_profiles")
            .select("username, user_id")
            .eq("id", req.companion_id)
            .single(),
        ]);
        const clientEmail = clientAuthRes.data?.user?.email;
        const clientName = clientAuthRes.data?.user?.user_metadata?.full_name as string | undefined
          ?? "Member";
        const companionUserId = companionProfileRes.data?.user_id;
        const companionUsername = companionProfileRes.data?.username ?? null;
        const companionNameRes = companionUserId
          ? await supabase.from("profiles").select("full_name").eq("id", companionUserId).single()
          : null;
        const companionName = companionNameRes?.data?.full_name ?? "Your host";
        if (clientEmail) {
          await sendAccessApprovalEmail({
            clientEmail,
            clientName,
            companionName,
            companionUsername,
          });
        }
      } catch (emailErr) {
        console.error("[email] sendAccessApprovalEmail failed:", emailErr);
      }
    })();
  }

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
