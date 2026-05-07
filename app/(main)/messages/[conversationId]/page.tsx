import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ChatView } from "@/components/messages/chat-view";
import { markConversationRead } from "@/app/actions/messages";
import type { Message } from "@/lib/database.types";

export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch conversation + participant profiles
  const { data: conv } = await supabase
    .from("conversations")
    .select(`
      id, client_id, companion_id,
      client_profile:profiles!client_id (id, full_name),
      companion_profile:profiles!companion_id (id, full_name),
      client_companion:companion_profiles!companion_id (username)
    `)
    .eq("id", conversationId)
    .or(`client_id.eq.${user.id},companion_id.eq.${user.id}`)
    .single();

  if (!conv) notFound();

  const clientProfile = Array.isArray(conv.client_profile) ? conv.client_profile[0] : conv.client_profile;
  const companionProfile = Array.isArray(conv.companion_profile) ? conv.companion_profile[0] : conv.companion_profile;
  const companionMeta = Array.isArray(conv.client_companion) ? conv.client_companion[0] : conv.client_companion;

  const isClient = conv.client_id === user.id;
  const otherProfile = isClient ? companionProfile : clientProfile;
  const otherName = (otherProfile as { full_name: string } | null)?.full_name ?? "Unknown";

  const username = (companionMeta as { username: string | null } | null)?.username;
  const otherProfileHref = isClient
    ? (username ? `/@${username}` : `/companion/${conv.companion_id}`)
    : `/browse`;

  // Fetch messages
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

  // Mark incoming messages as read
  await markConversationRead(conversationId);

  return (
    <ChatView
      conversationId={conversationId}
      currentUserId={user.id}
      otherName={otherName}
      otherProfileHref={otherProfileHref}
      initialMessages={(msgs ?? []) as Message[]}
    />
  );
}
