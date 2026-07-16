"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createBookingEscrowCheckout,
  disputeBooking,
  cancelBookingAsClient,
} from "@/app/actions/escrow";
import { decayRefundFraction } from "@/lib/cancellation";
import type { EscrowStatus } from "@/lib/database.types";

type Props = {
  bookingId: string;
  status: string;
  escrowStatus: EscrowStatus;
  releaseAt: string | null;
  scheduledAt: string;
  cancellationPolicy?: string | null; // vestigial — curve replaced tiers
};

export function ClientBookingActions({
  bookingId,
  status,
  escrowStatus,
  releaseAt,
  scheduledAt,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState("");
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result?.error) setError(result.error);
      else router.refresh();
    });
  }

  const hoursUntil = (new Date(scheduledAt).getTime() - Date.now()) / 3600_000;
  const refundPct = Math.round(decayRefundFraction(hoursUntil) * 100);

  const needsPayment = status === "confirmed" && escrowStatus === "unpaid";
  const disputeWindowOpen =
    escrowStatus === "held" ||
    (escrowStatus === "release_scheduled" && (!releaseAt || new Date(releaseAt) > new Date()));
  const cancellable = ["pending", "confirmed"].includes(status) && hoursUntil > 0;

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {needsPayment && (
          <button
            onClick={() => run(() => createBookingEscrowCheckout(bookingId))}
            disabled={pending}
            className="btn-gold rounded-xl px-4 py-1.5 text-xs disabled:opacity-40"

          >
            Pay to secure booking
          </button>
        )}
        {escrowStatus === "held" && (
          <span className="rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-400">
            Paid — held by Stripe until 48h after completion
          </span>
        )}
        {escrowStatus === "release_scheduled" && releaseAt && (
          <span className="rounded-full border border-white/20 bg-white/[0.04] px-2.5 py-1 text-[11px] text-gold/80">
            Releases to host {new Date(releaseAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
          </span>
        )}
        {escrowStatus === "disputed" && (
          <span className="rounded-full border border-red-500/25 bg-red-500/10 px-2.5 py-1 text-[11px] text-red-400">
            Dispute under review
          </span>
        )}

        {disputeWindowOpen && status === "completed" && !disputeOpen && (
          <button
            onClick={() => setDisputeOpen(true)}
            disabled={pending}
            className="rounded-xl border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs text-muted/50 transition-colors hover:text-muted disabled:opacity-40"

          >
            Something went wrong?
          </button>
        )}

        {cancellable && !confirmCancel && (
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={pending}
            className="rounded-xl border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs text-muted/50 transition-colors hover:text-muted disabled:opacity-40"

          >
            Cancel
          </button>
        )}
      </div>

      {confirmCancel && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
          <p className="text-[11px] text-muted/60">
            {escrowStatus === "held"
              ? `You'd be refunded ${refundPct}% right now${refundPct === 0 ? " — refunds are locked inside 48h" : refundPct < 100 ? " — the refund slides down as the booking approaches" : ""}.`
              : "Cancel this request?"}
          </p>
          <button
            onClick={() => run(() => cancelBookingAsClient(bookingId))}
            disabled={pending}
            className="rounded-xl border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.1)] px-3 py-1.5 text-xs text-red-400 disabled:opacity-40"

          >
            Confirm
          </button>
          <button
            onClick={() => setConfirmCancel(false)}
            disabled={pending}
            className="rounded-xl border border-[rgba(255,255,255,0.07)] px-3 py-1.5 text-xs text-muted/50 disabled:opacity-40"

          >
            Keep booking
          </button>
        </div>
      )}

      {disputeOpen && (
        <div className="space-y-2 rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2">
          <textarea
            value={disputeReason}
            onChange={(e) => setDisputeReason(e.target.value)}
            placeholder="Tell us what went wrong — this pauses the payout while we review."
            rows={2}
            maxLength={2000}
            className="auth-input w-full !text-xs"

          />
          <div className="flex gap-2">
            <button
              onClick={() => run(() => disputeBooking(bookingId, disputeReason))}
              disabled={pending || !disputeReason.trim()}
              className="rounded-xl border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.1)] px-3 py-1.5 text-xs text-red-400 disabled:opacity-40"

            >
              Open dispute
            </button>
            <button
              onClick={() => setDisputeOpen(false)}
              disabled={pending}
              className="rounded-xl border border-[rgba(255,255,255,0.07)] px-3 py-1.5 text-xs text-muted/50 disabled:opacity-40"

            >
              Never mind
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
