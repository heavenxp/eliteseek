"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";
import type { Notification } from "@/lib/database.types";

export function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const [marking, setMarking] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const unread = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    const supabase = createClient();
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20)
        .then(({ data }) => setNotifications((data as Notification[]) ?? []));
    });
  }, []);

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
            <ul className="max-h-80 overflow-y-auto">
              {notifications.map((n) => (
                <li
                  key={n.id}
                  className={[
                    "border-b border-[rgba(255,255,255,0.04)] px-4 py-3 last:border-0",
                    !n.is_read ? "bg-[rgba(212,175,55,0.04)]" : "",
                  ].join(" ")}
                >
                  <div className="flex items-start gap-2.5">
                    <div className={`mt-0.5 h-1.5 w-1.5 shrink-0 rounded-full ${!n.is_read ? "bg-gold" : "bg-transparent"}`} />
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
                        {new Date(n.created_at).toLocaleDateString("en-GB", {
                          day: "numeric", month: "short", hour: "2-digit", minute: "2-digit",
                        })}
                      </p>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
