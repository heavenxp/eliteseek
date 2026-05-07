"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Icon } from "@/components/icons";
import { deleteContentPost } from "@/app/actions/content";

export function DeleteContentButton({ postId }: { postId: string }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (!confirm("Delete this post? This cannot be undone.")) return;
    startTransition(async () => {
      await deleteContentPost(postId);
      router.refresh();
    });
  }

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="shrink-0 rounded-lg p-2 text-muted/30 transition-colors hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
      aria-label="Delete post"
    >
      <Icon name="x" className="h-4 w-4" />
    </button>
  );
}
