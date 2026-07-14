"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";

type ConversationItem = {
  id: string;
  client_id: string;
  companion_id: string;
  last_message_at: string | null;
  other_name: string;
  last_message: string | null;
  unread_count: number;
};

type EventItem = {
  id: string;
  title: string;
  cover_image_url: string | null;
  date: string;
};

type Props = {
  userId: string;
  initialConversations: ConversationItem[];
  events?: EventItem[];
};

export function ConversationSidebar({ userId, initialConversations, events = [] }: Props) {
  const pathname = usePathname();
  const [conversations, setConversations] = useState<ConversationItem[]>(initialConversations);

  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel("messages-sidebar")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const msg = payload.new as {
            conversation_id: string;
            sender_id: string;
            content: string;
            created_at: string;
            is_read: boolean;
          };

          setConversations((prev) => {
            const idx = prev.findIndex((c) => c.id === msg.conversation_id);
            if (idx === -1) return prev;

            const updated = [...prev];
            const conv = { ...updated[idx] };
            conv.last_message = msg.content;
            conv.last_message_at = msg.created_at;
            if (msg.sender_id !== userId) {
              conv.unread_count += 1;
            }
            updated.splice(idx, 1);
            return [conv, ...updated];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Reset unread count when opening a conversation
  useEffect(() => {
    const match = pathname.match(/^\/messages\/(.+)$/);
    if (!match) return;
    const convId = match[1];
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, unread_count: 0 } : c))
    );
  }, [pathname]);

  return (
    <>
      {/* Header */}
      <div className="border-b border-[rgba(212,175,55,0.1)] px-4 py-4">
        <h2
          className="text-xl font-light text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Messages
        </h2>
        {conversations.length > 0 && (
          <p className="mt-0.5 text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {conversations.reduce((n, c) => n + c.unread_count, 0)} unread
          </p>
        )}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 && events.length === 0 ? (
          <div className="flex flex-col items-center gap-3 px-4 py-16 text-center">
            <Icon name="message" className="h-8 w-8 text-gold/20" />
            <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              No conversations yet
            </p>
            <Link
              href="/browse"
              className="text-xs text-gold/60 underline underline-offset-2 hover:text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Browse Elite Hosts →
            </Link>
          </div>
        ) : (
          <>
            {conversations.length > 0 && (
              <ul>
                {conversations.map((conv) => {
                  const isActive = pathname === `/messages/${conv.id}`;
                  const timeLabel = conv.last_message_at
                    ? formatTime(conv.last_message_at)
                    : "";

                  return (
                    <li key={conv.id}>
                      <Link
                        href={`/messages/${conv.id}`}
                        className={[
                          "flex items-start gap-3 border-b border-[rgba(255,255,255,0.04)] px-4 py-3.5 transition-colors",
                          isActive
                            ? "bg-[rgba(212,175,55,0.07)]"
                            : "hover:bg-[rgba(255,255,255,0.02)]",
                        ].join(" ")}
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-sm font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
                          {conv.other_name.charAt(0).toUpperCase()}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-baseline justify-between gap-2">
                            <p
                              className={`truncate text-sm ${conv.unread_count > 0 ? "font-medium text-foreground" : "text-foreground/70"}`}
                              style={{ fontFamily: "var(--font-dm-sans)" }}
                            >
                              {conv.other_name}
                            </p>
                            <span className="shrink-0 text-[10px] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                              {timeLabel}
                            </span>
                          </div>
                          <div className="mt-0.5 flex items-center justify-between gap-2">
                            <p className="truncate text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                              {conv.last_message ?? "No messages yet"}
                            </p>
                            {conv.unread_count > 0 && (
                              <span className="flex h-4 min-w-4 shrink-0 items-center justify-center rounded-full bg-gold px-1 text-[9px] font-medium text-black">
                                {conv.unread_count > 9 ? "9+" : conv.unread_count}
                              </span>
                            )}
                          </div>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {events.length > 0 && (
              <div>
                <p className="px-4 pb-2 pt-4 text-[10px] uppercase tracking-[0.1em] text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Events
                </p>
                <ul>
                  {events.map((ev) => {
                    const isActive = pathname === `/events/${ev.id}`;
                    const eventDate = new Date(ev.date);
                    const dateLabel = eventDate.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

                    return (
                      <li key={ev.id}>
                        <Link
                          href={`/events/${ev.id}`}
                          className={[
                            "flex items-center gap-3 border-b border-[rgba(255,255,255,0.04)] px-4 py-3 transition-colors",
                            isActive
                              ? "bg-[rgba(212,175,55,0.07)]"
                              : "hover:bg-[rgba(255,255,255,0.02)]",
                          ].join(" ")}
                        >
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.06)]">
                            {ev.cover_image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={ev.cover_image_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-base font-light text-[#d4af37]/40" style={{ fontFamily: "var(--font-cormorant)" }}>
                                {ev.title.charAt(0)}
                              </span>
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm text-foreground/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                              {ev.title}
                            </p>
                            <p className="mt-0.5 text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                              {dateLabel} · Group chat
                            </p>
                          </div>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
          </>
        )}
      </div>
    </>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return d.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
  }
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 7) return d.toLocaleDateString("en-GB", { weekday: "short" });
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
