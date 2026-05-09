import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

  // Fetch conversations — RLS filters to only conversations the user participates in
  const { data: rawConvs } = await supabase
    .from("conversations")
    .select("id, client_id, companion_id, last_message_at")
    .order("last_message_at", { ascending: false, nullsFirst: false });

  const convs = rawConvs ?? [];
  const convIds = convs.map((c) => c.id);

  // Collect all unique participant IDs to batch-fetch names
  const participantIds = Array.from(
    new Set(convs.flatMap((c) => [c.client_id, c.companion_id]))
  );

  // Fetch last message + unread count + profile names in parallel
  const [msgsResult, unreadResult, profilesResult] = await Promise.all([
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
    participantIds.length > 0
      ? createAdminClient()
          .from("profiles")
          .select("id, full_name")
          .in("id", participantIds)
      : Promise.resolve({ data: [] }),
  ]);

  const profileMap = new Map(
    (profilesResult.data ?? []).map((p) => [p.id, p.full_name])
  );

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
    const isClient = c.client_id === user.id;
    const otherUserId = isClient ? c.companion_id : c.client_id;
    return {
      id: c.id,
      client_id: c.client_id,
      companion_id: c.companion_id,
      last_message_at: c.last_message_at,
      other_name: profileMap.get(otherUserId) ?? "Unknown",
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
