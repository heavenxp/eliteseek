"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { deleteEvent, leaveEvent } from "@/app/actions/events";

type Props = {
  eventId: string;
  isCreator: boolean;
};

export function EventActions({ eventId, isCreator }: Props) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    if (!confirm("Delete this event? This cannot be undone.")) return;
    setPending(true);
    const result = await deleteEvent(eventId);
    if (result.error) { setError(result.error); setPending(false); return; }
    router.push("/events");
  }

  async function handleLeave() {
    if (!confirm("Leave this event?")) return;
    setPending(true);
    const result = await leaveEvent(eventId);
    if (result.error) { setError(result.error); setPending(false); return; }
    router.push("/events");
  }

  return (
    <div className="mt-6 flex flex-col gap-2">
      {error && (
        <p className="text-xs text-red-400">
          {error}
        </p>
      )}
      {isCreator ? (
        <button
          onClick={handleDelete}
          disabled={pending}
          className="w-full rounded-xl border border-red-500/20 bg-red-500/[0.06] py-2.5 text-sm text-red-400/80 hover:bg-red-500/10 hover:text-red-400 transition-colors disabled:opacity-40"

        >
          {pending ? "Deleting…" : "Delete Event"}
        </button>
      ) : (
        <button
          onClick={handleLeave}
          disabled={pending}
          className="w-full rounded-xl border border-white/[0.08] bg-white/[0.02] py-2.5 text-sm text-white/40 hover:border-white/20 hover:text-white/60 transition-colors disabled:opacity-40"

        >
          {pending ? "Leaving…" : "Leave Event"}
        </button>
      )}
    </div>
  );
}
