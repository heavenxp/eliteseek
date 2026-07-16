"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { cancelEventTicket } from "@/app/actions/events";

// Ticket-holder cancel — the refund timer above tells them the terms.
export function CancelTicketButton({ eventId, refundPctNow }: { eventId: string; refundPctNow: number }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cancel() {
    setError(null);
    startTransition(async () => {
      const result = await cancelEventTicket(eventId);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="mt-2">
      {!confirming ? (
        <button
          onClick={() => setConfirming(true)}
          className="text-xs text-muted/50 underline underline-offset-2 transition-colors hover:text-muted"

        >
          Cancel my ticket
        </button>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted/60">
            {refundPctNow > 0
              ? `You'll be refunded ${refundPctNow}% right now.`
              : "Refunds are locked — you won't be refunded."}
          </span>
          <button
            onClick={cancel}
            disabled={pending}
            className="rounded-xl border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.1)] px-3 py-1.5 text-xs text-red-400 disabled:opacity-40"

          >
            Confirm cancel
          </button>
          <button
            onClick={() => setConfirming(false)}
            disabled={pending}
            className="rounded-xl border border-white/[0.07] px-3 py-1.5 text-xs text-muted/50 disabled:opacity-40"

          >
            Keep ticket
          </button>
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
