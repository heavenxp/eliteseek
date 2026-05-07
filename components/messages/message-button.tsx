"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { getOrCreateConversation } from "@/app/actions/messages";
import { Icon } from "@/components/icons";

export function MessageButton({
  otherUserId,
  label = "Send Message",
}: {
  otherUserId: string;
  label?: string;
}) {
  const router = useRouter();
  const [isPending, start] = useTransition();

  function handleClick() {
    start(async () => {
      const convId = await getOrCreateConversation(otherUserId);
      if (convId) router.push(`/messages/${convId}`);
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="btn-ghost flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {isPending ? (
        <span className="h-4 w-4 animate-spin rounded-full border border-muted/30 border-t-muted" />
      ) : (
        <Icon name="message" className="h-4 w-4" />
      )}
      {label}
    </button>
  );
}
