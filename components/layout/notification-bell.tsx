"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";
import type { Notification } from "@/lib/database.types";

export function NotificationBell() {
  const router = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  // Initial fetch + store userId for realtime
  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      setUserId(user.id);
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(30)
        .then(({ data }) => setNotifications((data as Notification[]) ?? []));
    });
  }, []);

  // Realtime subscription for new notifications
  useEffect(() => {
    if (!userId) return;
    const supabase = createClient();
    const channel = supabase
      .channel("notification-bell")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const n = payload.new as Notification;
          setNotifications((prev) => [n, ...prev].slice(0, 30));
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  async function markAllRead() {
    if (unread === 0) return;
    setMarking(true);
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase
        .from("notifications")
        .update({ is_read: true })
        .eq("user_id", user.id)
        .eq("is_read", false);
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
    setMarking(false);
  }

  async function handleNotificationClick(n: Notification) {
    setOpen(false);
    if (!n.is_read) {
      setNotifications((prev) => prev.map((x) => x.id === n.id ? { ...x, is_read: true } : x));
      const supabase = createClient();
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
    }
    const link = (n.data as { link?: string } | null)?.link;
    if (link) router.push(link);
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-full text-muted/60 transition-colors hover:text-foreground"
      >
        <Icon name="bell" className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-medium text-black">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-80 overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.18)] bg-[rgba(8,8,16,0.98)] shadow-[0_8px_48px_rgba(0,0,0,0.6)] backdrop-blur-xl">
          <div className="flex items-center justify-between border-b border-[rgba(212,175,55,0.08)] px-4 py-3">
            <p className="text-sm font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              Notifications
            </p>
            {unread > 0 && (
              <button
                onClick={markAllRead}
                disabled={marking}
                className="text-[10px] text-gold/60 hover:text-gold disabled:opacity-40"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Mark all read
              </button>
            )}
          </div>

          {notifications.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              No notifications yet
            </div>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {notifications.map((n) => {
                const link = (n.data as { link?: string } | null)?.link;
                return (
                  <li key={n.id}>
                    <button
                      onClick={() => handleNotificationClick(n)}
                      className={[
                        "w-full border-b border-[rgba(255,255,255,0.04)] px-4 py-3 last:border-0 text-left transition-colors",
                        !n.is_read
                          ? "bg-[rgba(212,175,55,0.04)] hover:bg-[rgba(212,175,55,0.07)]"
                          : "hover:bg-[rgba(255,255,255,0.02)]",
                        link ? "cursor-pointer" : "cursor-default",
                      ].join(" ")}
                    >
                      <div className="flex items-start gap-2.5">
                        <div className={`mt-1 h-1.5 w-1.5 shrink-0 rounded-full ${!n.is_read ? "bg-gold" : "bg-transparent"}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-foreground/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                            {n.title}
                          </p>
                          {n.body && (
                            <p className="mt-0.5 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                              {n.body}
                            </p>
                          )}
                          <p className="mt-1 text-[10px] text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                            {formatTime(n.created_at)}
                          </p>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}
