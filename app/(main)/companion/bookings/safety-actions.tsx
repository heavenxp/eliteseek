"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  checkInBooking,
  checkOutBooking,
  cancelBookingAsHost,
  rateClient,
} from "@/app/actions/escrow";
import { Icon } from "@/components/icons";
import type { EscrowStatus } from "@/lib/database.types";

type Props = {
  bookingId: string;
  escrowStatus: EscrowStatus;
  checkinAt: string | null;
  checkoutAt: string | null;
};

// Host controls for a confirmed booking: check-in → check-out (starts the
// 48h release window), plus no-penalty cancel while it hasn't happened yet.
export function SafetyActions({ bookingId, escrowStatus, checkinAt, checkoutAt }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<{ error?: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  const paid = escrowStatus === "held";

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        {escrowStatus === "unpaid" && (
          <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-400">
            Awaiting client payment
          </span>
        )}
        {paid && !checkinAt && (
          <button
            onClick={() => run(() => checkInBooking(bookingId))}
            disabled={pending}
            className="btn-gold rounded-xl px-4 py-1.5 text-xs disabled:opacity-40"

          >
            Check in
          </button>
        )}
        {paid && checkinAt && !checkoutAt && (
          <button
            onClick={() => run(() => checkOutBooking(bookingId))}
            disabled={pending}
            className="btn-gold rounded-xl px-4 py-1.5 text-xs disabled:opacity-40"

          >
            Check out — I&apos;m safe
          </button>
        )}
        {paid && checkinAt && !checkoutAt && (
          <span className="flex items-center gap-1.5 text-[11px] text-emerald-400/80">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" />
            Checked in
          </span>
        )}

        {/* No-penalty cancel while the booking hasn't happened */}
        {!checkinAt && !confirmCancel && (
          <button
            onClick={() => setConfirmCancel(true)}
            disabled={pending}
            className="rounded-xl border border-[rgba(255,255,255,0.08)] px-3 py-1.5 text-xs text-muted/50 transition-colors hover:text-muted disabled:opacity-40"

          >
            Cancel booking
          </button>
        )}
        {confirmCancel && (
          <>
            <span className="text-[11px] text-muted/50">
              Cancel? The client is refunded in full — no penalty to you.
            </span>
            <button
              onClick={() => run(() => cancelBookingAsHost(bookingId))}
              disabled={pending}
              className="rounded-xl border border-[rgba(248,113,113,0.4)] bg-[rgba(248,113,113,0.1)] px-3 py-1.5 text-xs text-red-400 disabled:opacity-40"

            >
              Confirm cancel
            </button>
            <button
              onClick={() => setConfirmCancel(false)}
              disabled={pending}
              className="rounded-xl border border-[rgba(255,255,255,0.07)] px-3 py-1.5 text-xs text-muted/50 disabled:opacity-40"

            >
              Keep
            </button>
          </>
        )}
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}

// Post-completion: rate the client (1–5) so other hosts can vet them.
export function RateClientForm({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit() {
    if (rating < 1) { setError("Pick a star rating first."); return; }
    setError(null);
    startTransition(async () => {
      const result = await rateClient(bookingId, rating, comment || null);
      if (result.error) setError(result.error);
      else router.refresh();
    });
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-muted/50">
          Rate this client
        </span>
        <div className="flex" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => setRating(n)}
              onMouseEnter={() => setHover(n)}
              disabled={pending}
              aria-label={`${n} star${n > 1 ? "s" : ""}`}
              className="p-0.5"
            >
              <Icon
                name="star"
                className={`h-4 w-4 transition-colors ${(hover || rating) >= n ? "text-gold" : "text-muted/25"}`}
              />
            </button>
          ))}
        </div>
        <input
          type="text"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Optional note for other hosts"
          maxLength={200}
          className="auth-input !w-auto flex-1 !py-1 !text-xs"

        />
        <button
          onClick={submit}
          disabled={pending}
          className="btn-gold rounded-xl px-3 py-1.5 text-xs disabled:opacity-40"

        >
          Submit
        </button>
      </div>
      {error && (
        <p className="text-xs text-red-400">{error}</p>
      )}
    </div>
  );
}
