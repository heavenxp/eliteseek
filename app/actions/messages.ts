"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type MessageState = { error?: string; success?: boolean } | null;

export async function getOrCreateConversation(otherUserId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: myProfile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (!myProfile) return null;

  const clientId = myProfile.role === "client" ? user.id : otherUserId;
  const companionId = myProfile.role === "companion" ? user.id : otherUserId;

  const { data, error } = await supabase
    .from("conversations")
    .upsert(
      { client_id: clientId, companion_id: companionId },
      { onConflict: "client_id,companion_id" }
    )
    .select("id")
    .single();

  if (error || !data) return null;
  return data.id;
}

export async function sendMessage(
  _: MessageState,
  formData: FormData
): Promise<MessageState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const conversationId = formData.get("conversation_id") as string;
  const content = (formData.get("content") as string)?.trim();

  if (!conversationId || !content) return { error: "Message cannot be empty." };
  if (content.length > 2000) return { error: "Message too long (max 2000 characters)." };

  // Verify participant
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .or(`client_id.eq.${user.id},companion_id.eq.${user.id}`)
    .single();

  if (!conv) return { error: "Conversation not found." };

  const { error } = await supabase
    .from("messages")
    .insert({ conversation_id: conversationId, sender_id: user.id, content });

  if (error) return { error: error.message };
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
