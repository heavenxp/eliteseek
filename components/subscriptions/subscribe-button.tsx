"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { subscribeToCompanion } from "@/app/actions/content";

type Props = {
  companionId: string;
  price: number;
};

export function SubscribeButton({ companionId, price }: Props) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleClick() {
    startTransition(async () => {
      const result = await subscribeToCompanion(companionId);
      if (!result.error) router.refresh();
    });
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="btn-ghost flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {isPending ? "Subscribing…" : `Subscribe · $${price}/mo`}
    </button>
  );
}
