"use client";

import { useState, useCallback } from "react";
import { PostCard } from "@/components/posts/post-card";
import { BookingModal } from "@/components/booking/booking-modal";
import { Icon } from "@/components/icons";
import type { AvailabilityPost } from "@/lib/database.types";

type Props = {
  post?: AvailabilityPost;
  companionId: string;
  companionName: string;
  hourlyRate?: number | null;
  isOwner: boolean;
};

export function ProfileActions({ post, companionId, companionName, hourlyRate, isOwner }: Props) {
  const [showModal, setShowModal] = useState(false);

  const handleSuccess = useCallback(() => {
    setShowModal(false);
  }, []);

  if (isOwner) {
    return post ? (
      <PostCard post={post} />
    ) : null;
  }

  return (
    <>
      {post ? (
        <PostCard post={post} onBook={() => setShowModal(true)} />
      ) : (
        <button
          onClick={() => setShowModal(true)}
          className="btn-gold flex items-center gap-2 rounded-xl px-6 py-3 text-sm"

        >
          <Icon name="calendar" className="h-4 w-4" />
          Request a Booking
        </button>
      )}

      {showModal && (
        <BookingModal
          companionId={companionId}
          companionName={companionName}
          post={post}
          hourlyRate={hourlyRate}
          onClose={() => setShowModal(false)}
          onSuccess={handleSuccess}
        />
      )}
    </>
  );
}
