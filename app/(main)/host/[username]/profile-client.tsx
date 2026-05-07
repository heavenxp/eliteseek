"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { BookingModal } from "@/components/booking/booking-modal";
import { MessageButton } from "@/components/messages/message-button";
import { SubscribeButton } from "@/components/subscriptions/subscribe-button";
import type { AvailabilityPost } from "@/lib/database.types";

export type ProfileActionButtonsProps = {
  companionId: string;
  companionName: string;
  companionUserId: string;
  username: string;
  subscriptionPrice: number | null;
  bookingRate: number | null;
  profileUnlockFee: number | null;
  isOwner: boolean;
  isSubscribed: boolean;
  hasUnlocked: boolean;
  accessRequestStatus: string | null;
  lockStatus: "public" | "locked" | "elite_only";
  clientTier: string;
  post?: AvailabilityPost;
};

export function ProfileActionButtons({
  companionId,
  companionName,
  companionUserId,
  username,
  subscriptionPrice,
  bookingRate,
  profileUnlockFee,
  isOwner,
  isSubscribed,
  hasUnlocked,
  accessRequestStatus,
  lockStatus,
  clientTier,
  post,
}: ProfileActionButtonsProps) {
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = useCallback(() => {
    setShowModal(false);
  }, []);

  // Owner buttons
  if (isOwner) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/account/settings"
          className="btn-ghost flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <Icon name="camera" className="h-4 w-4" />
          Edit Profile
        </Link>
        <Link
          href="/companion/posts/new"
          className="btn-gold flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <Icon name="plus" className="h-4 w-4" />
          New Post
        </Link>
      </div>
    );
  }

  // Locked profile — not yet unlocked
  if (lockStatus === "locked" && !hasUnlocked) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <form action="/api/access/unlock" method="post">
          <input type="hidden" name="companion_id" value={companionId} />
          <input
            type="hidden"
            name="amount_paid"
            value={String(profileUnlockFee ?? 0)}
          />
          <button
            type="submit"
            className="btn-gold rounded-xl px-6 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Unlock Profile{profileUnlockFee ? ` · $${profileUnlockFee}` : ""}
          </button>
        </form>
        {accessRequestStatus === null && (
          <form action="/api/access/request" method="post">
            <input type="hidden" name="companion_id" value={companionId} />
            <button
              type="submit"
              className="btn-ghost rounded-xl px-5 py-2.5 text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Request Free Access
            </button>
          </form>
        )}
        {accessRequestStatus === "pending" && (
          <span
            className="text-xs text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Access request pending…
          </span>
        )}
      </div>
    );
  }

  // Elite-only profile — bronze tier blocked
  if (lockStatus === "elite_only" && clientTier === "bronze") {
    return (
      <div className="flex flex-wrap items-center gap-3">
        <Link
          href="/membership"
          className="btn-gold rounded-xl px-6 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Upgrade to Elite
        </Link>
      </div>
    );
  }

  // Elite-only profile — silver tier can request access
  if (lockStatus === "elite_only" && clientTier === "silver" && !hasUnlocked) {
    return (
      <div className="flex flex-wrap items-center gap-3">
        {accessRequestStatus === null && (
          <form action="/api/access/request" method="post">
            <input type="hidden" name="companion_id" value={companionId} />
            <button
              type="submit"
              className="btn-ghost rounded-xl px-5 py-2.5 text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Request Access
            </button>
          </form>
        )}
        {accessRequestStatus === "pending" && (
          <span
            className="text-xs text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Access request pending…
          </span>
        )}
        <Link
          href="/membership"
          className="btn-gold rounded-xl px-6 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Upgrade to Elite
        </Link>
      </div>
    );
  }

  // Public or unlocked — full action buttons
  return (
    <>
      <div className="flex flex-wrap items-center gap-3">
        {bookingRate && (
          <button
            onClick={() => setShowModal(true)}
            className="btn-gold flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <Icon name="calendar" className="h-4 w-4" />
            Request Booking
          </button>
        )}
        {subscriptionPrice && !isSubscribed && (
          <SubscribeButton companionId={companionId} price={subscriptionPrice} />
        )}
        <MessageButton otherUserId={companionUserId} />
        <Link
          href={`/gifts?companion=${companionId}`}
          className="text-sm text-gold/60 underline underline-offset-2 hover:text-gold"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Send Gift
        </Link>
      </div>

      {showModal && (
        <BookingModal
          companionId={companionId}
          companionName={companionName}
          post={post}
          hourlyRate={bookingRate}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
