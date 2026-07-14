"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { notify } from "@/app/actions/notifications";

export type MessageState = { error?: string; success?: boolean } | null;

export type ConversationResult =
  | { id: string; error: null }
  | { id: null; error: string };

export async function getOrCreateConversation(otherUserId: string): Promise<ConversationResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile) {
    return { id: null, error: `Profile not found: ${profileError?.message ?? "unknown"}` };
  }

  const isClient = myProfile.role === "client";
  const clientId = isClient ? user.id : otherUserId;
  const companionId = isClient ? otherUserId : user.id;

  // Try existing conversation first
  const { data: existing, error: selectError } = await supabase
    .from("conversations")
    .select("id")
    .eq("client_id", clientId)
    .eq("companion_id", companionId)
    .maybeSingle();

  if (existing) return { id: existing.id, error: null };
  if (selectError) {
    return { id: null, error: `SELECT failed: ${selectError.message}` };
  }

  const { data, error: insertError } = await supabase
    .from("conversations")
    .insert({ client_id: clientId, companion_id: companionId })
    .select("id")
    .single();

  if (insertError || !data) {
    return { id: null, error: `INSERT failed: ${insertError?.message ?? "no data returned"}` };
  }
  return { id: data.id, error: null };
}

export async function sendMessage(
  _: MessageState,
  formData: FormData
): Promise<MessageState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversationId = formData.get("conversation_id") as string;
  const content = (formData.get("content") as string)?.trim() || null;
  const mediaUrl = (formData.get("media_url") as string | null) || null;

  if (!conversationId) return { error: "Missing conversation." };
  if (!content && !mediaUrl) return { error: "Message cannot be empty." };
  if (content && content.length > 2000) return { error: "Message too long (max 2000 characters)." };

  // Verify participant and get both IDs for notification
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, client_id, companion_id")
    .eq("id", conversationId)
    .or(`client_id.eq.${user.id},companion_id.eq.${user.id}`)
    .single();

  if (!conv) return { error: "Conversation not found." };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content: content ?? "", media_url: mediaUrl });

  if (error) return { error: error.message };

  const recipientId = conv.client_id === user.id ? conv.companion_id : conv.client_id;
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", user.id).single();
  const preview = content ? (content.length > 80 ? content.slice(0, 80) + "…" : content) : "📎 Media";
  await notify({
    userId: recipientId,
    type: "new_message",
    title: `New message from ${profile?.full_name ?? "Someone"}`,
    body: preview,
    link: `/messages/${conversationId}`,
  });

  return { success: true };
}

export async function markConversationRead(conversationId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("messages")
    .update({ is_read: true })
    .eq("conversation_id", conversationId)
    .neq("sender_id", user.id)
    .eq("is_read", false);
}
