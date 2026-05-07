"use client";

import { useTransition } from "react";
import { Icon } from "@/components/icons";
import { deleteAvailabilityPost } from "@/app/actions/posts";

export function DeletePostButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();

  return (
    <button
      onClick={() => {
        if (!confirm("Delete this post?")) return;
        startTransition(async () => {
          await deleteAvailabilityPost(postId);
          window.location.reload();
        });
      }}
      disabled={isPending}
      className="shrink-0 rounded-lg p-2 text-muted/40 transition-colors hover:bg-[rgba(255,255,255,0.05)] hover:text-red-400 disabled:opacity-40"
      aria-label="Delete post"
    >
      <Icon name="x" className="h-4 w-4" />
    </button>
  );
}
