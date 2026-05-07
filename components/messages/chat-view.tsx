"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";
import { Icon } from "@/components/icons";
import type { Message } from "@/lib/database.types";

type Props = {
  conversationId: string;
  currentUserId: string;
  otherName: string;
  otherProfileHref: string;
  initialMessages: Message[];
};

export function ChatView({
  conversationId,
  currentUserId,
  otherName,
  otherProfileHref,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [state, formAction, isPending] = useActionState(sendMessage, null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Scroll to bottom when messages change
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Reset form on success
  useEffect(() => {
    if (state?.success) formRef.current?.reset();
  }, [state?.success]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const msg = payload.new as Message;
          setMessages((prev) => {
            // Deduplicate by id
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  const grouped = groupByDate(messages);

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-[rgba(212,175,55,0.1)] px-4 py-3.5">
        <Link
          href="/messages"
          className="flex items-center text-muted/50 hover:text-muted md:hidden"
        >
          <Icon name="chevron-left" className="h-5 w-5" />
        </Link>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-sm font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {otherName.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <Link
            href={otherProfileHref}
            className="truncate text-sm text-foreground/80 hover:text-gold transition-colors"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {otherName}
          </Link>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Icon name="message" className="h-10 w-10 text-gold/20" />
            <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Start the conversation with {otherName}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ date, msgs }) => (
              <div key={date}>
                {/* Date separator */}
                <div className="mb-4 flex items-center gap-3">
                  <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" />
                  <span className="text-[10px] text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    {date}
                  </span>
                  <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" />
                </div>

                <div className="space-y-2">
                  {msgs.map((msg) => {
                    const isOwn = msg.sender_id === currentUserId;
                    return (
                      <div
                        key={msg.id}
                        className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                      >
                        <div
                          className={[
                            "max-w-[75%] rounded-2xl px-4 py-2.5",
                            isOwn
                              ? "rounded-br-sm bg-[rgba(212,175,55,0.15)] text-foreground"
                              : "rounded-bl-sm bg-[rgba(255,255,255,0.05)] text-foreground/80",
                          ].join(" ")}
                        >
                          <p
                            className="text-sm leading-relaxed"
                            style={{ fontFamily: "var(--font-dm-sans)" }}
                          >
                            {msg.content}
                          </p>
                          <p
                            className={`mt-1 text-[10px] ${isOwn ? "text-gold/40 text-right" : "text-muted/30"}`}
                            style={{ fontFamily: "var(--font-dm-sans)" }}
                          >
                            {new Date(msg.created_at).toLocaleTimeString("en-GB", {
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-[rgba(212,175,55,0.1)] p-3">
        <form ref={formRef} action={formAction} className="flex items-end gap-2">
          <input type="hidden" name="conversation_id" value={conversationId} />
          <textarea
            name="content"
            rows={1}
            placeholder={`Message ${otherName}…`}
            className="auth-input flex-1 resize-none py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
          />
          <button
            type="submit"
            disabled={isPending}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(212,175,55,0.15)] text-gold transition-all hover:bg-[rgba(212,175,55,0.25)] disabled:opacity-40"
          >
            {isPending ? (
              <span className="h-4 w-4 animate-spin rounded-full border border-gold/30 border-t-gold" />
            ) : (
              <Icon name="send" className="h-4 w-4" />
            )}
          </button>
        </form>
        {state?.error && (
          <p className="mt-1.5 text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {state.error}
          </p>
        )}
      </div>
    </div>
  );
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; msgs: Message[] }[] = [];
  let current: { date: string; msgs: Message[] } | null = null;

  for (const msg of messages) {
    const d = new Date(msg.created_at);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    if (!current || current.date !== label) {
      current = { date: label, msgs: [] };
      groups.push(current);
    }
    current.msgs.push(msg);
  }

  return groups;
}
