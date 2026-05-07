"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { respondToBooking } from "@/app/actions/bookings";
import { Icon } from "@/components/icons";

export function BookingActions({ bookingId }: { bookingId: string }) {
  const router = useRouter();
  const [isPendingAccept, startAccept] = useTransition();
  const [isPendingDecline, startDecline] = useTransition();

  function handleAccept() {
    startAccept(async () => {
      await respondToBooking(bookingId, "confirmed");
      router.refresh();
    });
  }

  function handleDecline() {
    startDecline(async () => {
      await respondToBooking(bookingId, "cancelled");
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleAccept}
        disabled={isPendingAccept || isPendingDecline}
        className="flex items-center gap-1.5 rounded-xl border border-[rgba(52,211,153,0.3)] bg-[rgba(52,211,153,0.08)] px-3 py-1.5 text-xs text-emerald-400 transition-all hover:border-[rgba(52,211,153,0.5)] hover:bg-[rgba(52,211,153,0.12)] disabled:opacity-40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {isPendingAccept ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-emerald-400/30 border-t-emerald-400" />
        ) : (
          <Icon name="check" className="h-3 w-3" />
        )}
        Accept
      </button>
      <button
        onClick={handleDecline}
        disabled={isPendingAccept || isPendingDecline}
        className="flex items-center gap-1.5 rounded-xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.06)] px-3 py-1.5 text-xs text-red-400/80 transition-all hover:border-[rgba(248,113,113,0.4)] disabled:opacity-40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {isPendingDecline ? (
          <span className="h-3 w-3 animate-spin rounded-full border border-red-400/30 border-t-red-400" />
        ) : (
          <Icon name="x" className="h-3 w-3" />
        )}
        Decline
      </button>
    </div>
  );
}
