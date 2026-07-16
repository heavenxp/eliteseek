"use client";

import Link from "next/link";
import { useState } from "react";
import { joinEvent } from "@/app/actions/events";
import type { EventRow } from "@/app/actions/events";

type Props = {
  events: EventRow[];
  joinedEventIds: string[];
  currentUserId: string;
};

export function EventsList({ events, joinedEventIds, currentUserId }: Props) {
  const [search, setSearch] = useState("");
  const [joinedIds, setJoinedIds] = useState<Set<string>>(new Set(joinedEventIds));
  const [joining, setJoining] = useState<string | null>(null);

  const filtered = events.filter((e) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return e.title.toLowerCase().includes(q) || (e.location ?? "").toLowerCase().includes(q);
  });

  async function handleJoin(eventId: string) {
    if (joining) return;
    setJoining(eventId);
    const result = await joinEvent(eventId);
    if (!result.error) setJoinedIds((prev) => new Set([...prev, eventId]));
    setJoining(null);
  }

  return (
    <>
      {/* Search */}
      <div className="relative mb-6">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-white/25 pointer-events-none"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
        </svg>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title or location…"
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.03] py-2.5 pl-9 pr-4 text-sm text-foreground placeholder:text-white/25 focus:border-white/20 focus:outline-none"

        />
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-24 text-center">
          <p
            className="text-base font-semibold text-foreground/50"
           
          >
            {search ? "No events match your search" : "No public events yet"}
          </p>
          <p className="text-sm text-muted/40">
            Be the first to create one.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((event) => {
            const isJoined = joinedIds.has(event.id);
            const isCreator = event.creator_id === currentUserId;
            const eventDate = new Date(`${event.date}T${event.time}`);

            return (
              <div
                key={event.id}
                className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] overflow-hidden hover:border-white/10 transition-all"
              >
                {/* Cover image */}
                <Link href={`/events/${event.id}`} className="block">
                  <div className="relative h-36 w-full overflow-hidden bg-white/[0.04]">
                    {event.cover_image_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={event.cover_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full items-center justify-center">
                        <span
                          className="text-3xl font-bold tracking-tight text-gold/20"
                         
                        >
                          {event.title.charAt(0)}
                        </span>
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
                  </div>
                </Link>

                {/* Details */}
                <div className="p-4">
                  <Link href={`/events/${event.id}`}>
                    <h3
                      className="text-base font-medium text-foreground hover:text-gold transition-colors truncate"

                    >
                      {event.title}
                    </h3>
                  </Link>

                  <div className="mt-2 flex flex-col gap-1">
                    <p className="flex items-center gap-1.5 text-xs text-muted/50">
                      <svg className="h-3 w-3 text-muted/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
                      </svg>
                      {eventDate.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                      {" · "}
                      {eventDate.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </p>
                    {event.location && (
                      <p className="flex items-center gap-1.5 text-xs text-muted/50">
                        <svg className="h-3 w-3 text-muted/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                        </svg>
                        {event.location}
                      </p>
                    )}
                    <p className="flex items-center gap-1.5 text-xs text-muted/40">
                      <svg className="h-3 w-3 text-muted/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                      </svg>
                      {event.member_count ?? 0} attendee{(event.member_count ?? 0) !== 1 ? "s" : ""}
                    </p>
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <Link
                      href={`/events/${event.id}`}
                      className="text-xs text-muted/40 hover:text-gold transition-colors"

                    >
                      View details →
                    </Link>
                    {!isCreator && (
                      isJoined ? (
                        <span className="rounded-full bg-[rgba(52,211,153,0.1)] px-3 py-1 text-xs text-emerald-400">
                          Joined ✓
                        </span>
                      ) : (
                        <button
                          onClick={() => handleJoin(event.id)}
                          disabled={joining === event.id}
                          className="rounded-full bg-white/[0.07] border border-white/20 px-3 py-1 text-xs text-gold hover:bg-white/[0.07] transition-colors disabled:opacity-40"

                        >
                          {joining === event.id ? "Joining…" : "Join"}
                        </button>
                      )
                    )}
                    {isCreator && (
                      <span className="rounded-full bg-white/[0.07] px-3 py-1 text-xs text-gold/60">
                        Your event
                      </span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
