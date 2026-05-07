import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MessagesShell } from "@/components/messages/messages-shell";
import { ConversationSidebar } from "@/components/messages/conversation-sidebar";

type ConversationItem = {
  id: string;
  client_id: string;
  companion_id: string;
  last_message_at: string | null;
  other_name: string;
  last_message: string | null;
  unread_count: number;
};

export default async function MessagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch conversations with participant profiles
  const { data: rawConvs } = await supabase
    .from("conversations")
    .select(`
      id, client_id, companion_id, last_message_at,
      client_profile:profiles!client_id (full_name),
      companion_profile:profiles!companion_id (full_name)
    `)
    .or(`client_id.eq.${user.id},companion_id.eq.${user.id}`)
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const convs = rawConvs ?? [];
  const convIds = convs.map((c) => c.id);

  // Fetch last message + unread count per conversation
  const [msgsResult, unreadResult] = await Promise.all([
    convIds.length > 0
      ? supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", convIds)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
    convIds.length > 0
      ? supabase
          .from("messages")
          .select("conversation_id")
          .in("conversation_id", convIds)
          .neq("sender_id", user.id)
          .eq("is_read", false)
      : Promise.resolve({ data: [] }),
  ]);

  // Last message per conversation
  const lastMsgMap = new Map<string, string>();
  for (const msg of msgsResult.data ?? []) {
    if (!lastMsgMap.has(msg.conversation_id)) {
      lastMsgMap.set(msg.conversation_id, msg.content);
    }
  }

  // Unread count per conversation
  const unreadMap = new Map<string, number>();
  for (const msg of unreadResult.data ?? []) {
    unreadMap.set(msg.conversation_id, (unreadMap.get(msg.conversation_id) ?? 0) + 1);
  }

  const conversations: ConversationItem[] = convs.map((c) => {
    const clientProfile = Array.isArray(c.client_profile) ? c.client_profile[0] : c.client_profile;
    const companionProfile = Array.isArray(c.companion_profile) ? c.companion_profile[0] : c.companion_profile;
    const isClient = c.client_id === user.id;
    const otherProfile = isClient ? companionProfile : clientProfile;

    return {
      id: c.id,
      client_id: c.client_id,
      companion_id: c.companion_id,
      last_message_at: c.last_message_at,
      other_name: (otherProfile as { full_name: string } | null)?.full_name ?? "Unknown",
      last_message: lastMsgMap.get(c.id) ?? null,
      unread_count: unreadMap.get(c.id) ?? 0,
    };
  });

  return (
    <MessagesShell
      sidebar={
        <ConversationSidebar
          userId={user.id}
          initialConversations={conversations}
        />
      }
    >
      {children}
    </MessagesShell>
  );
}
