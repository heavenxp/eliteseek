"use client";

import { useState, useTransition } from "react";
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
  const [debugError, setDebugError] = useState<string | null>(null);

  function handleClick(e: React.MouseEvent) {
    // Stop the parent dropdown's onClick from firing and unmounting this component
    // before the async action completes — without this the error state is lost.
    e.stopPropagation();
    console.log("[MessageButton] clicked, otherUserId:", otherUserId);
    setDebugError(null);
    start(async () => {
      try {
        console.log("[MessageButton] calling getOrCreateConversation...");
        const result = await getOrCreateConversation(otherUserId);
        console.log("[MessageButton] result:", result);
        if (result.id) {
          console.log("[MessageButton] navigating to /messages/" + result.id);
          router.push(`/messages/${result.id}`);
        } else {
          console.error("[MessageButton] failed:", result.error);
          setDebugError(result.error ?? "Unknown error");
        }
      } catch (err) {
        console.error("[MessageButton] threw:", err);
        setDebugError(String(err));
      }
    });
  }

  return (
    <div>
      <button
        onClick={handleClick}
        disabled={isPending}
        className="btn-ghost flex w-full items-center gap-2 rounded-xl px-5 py-2.5 text-sm disabled:opacity-60"

      >
        {isPending ? (
          <span className="h-4 w-4 animate-spin rounded-full border border-muted/30 border-t-muted" />
        ) : (
          <Icon name="message" className="h-4 w-4" />
        )}
        {label}
      </button>
      {debugError && (
        <p className="mt-1 px-3 pb-1 text-xs text-red-400 break-words">
          ⚠ {debugError}
        </p>
      )}
    </div>
  );
}
