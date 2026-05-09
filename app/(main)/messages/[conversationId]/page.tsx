import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Fetch conversation — RLS ensures only participants can read it
  const { data: conv } = await supabase
    .from("conversations")
    .select("id, client_id, companion_id")
    .eq("id", conversationId)
    .maybeSingle();

  if (!conv) notFound();

  // Verify the current user is a participant (belt-and-suspenders on top of RLS)
  const isParticipant = conv.client_id === user.id || conv.companion_id === user.id;
  if (!isParticipant) notFound();

  // Fetch participant profiles separately (admin bypasses RLS for cross-user reads)
  const profileIds = Array.from(new Set([conv.client_id, conv.companion_id]));
  const { data: profiles } = await createAdminClient()
    .from("profiles")
    .select("id, full_name")
    .in("id", profileIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const isClient = conv.client_id === user.id;
  const otherUserId = isClient ? conv.companion_id : conv.client_id;
  const otherName = profileMap.get(otherUserId) ?? "Unknown";

  // Fetch companion username for the back-link
  const { data: companionMeta } = await supabase
    .from("companion_profiles")
    .select("username")
    .eq("user_id", conv.companion_id)
    .maybeSingle();

  const username = companionMeta?.username ?? null;
  const otherProfileHref = isClient
    ? (username ? `/profile/${username}` : `/browse`)
    : `/browse`;

  // Fetch messages
  const { data: msgs } = await supabase
    .from("messages")
    .select("*")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true })
    .limit(100);

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
