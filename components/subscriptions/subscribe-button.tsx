"use client";

import { useState, useTransition } from "react";
import { createSubscriptionCheckout } from "@/app/actions/stripe";
import { subscribeToCompanion } from "@/app/actions/content";

type Props = {
  companionId: string;
  price: number;
  stripeConfigured?: boolean;
};

export function SubscribeButton({ companionId, price, stripeConfigured = false }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      if (stripeConfigured) {
        // Stripe Checkout — server will redirect; only returns on error
        const result = await createSubscriptionCheckout(companionId);
        if (result?.error) setError(result.error);
      } else {
        // Fallback: mock subscription when Stripe is not configured
        const result = await subscribeToCompanion(companionId);
        if (result.error) setError(result.error);
        else window.location.reload();
      }
    });
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className="btn-ghost flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm disabled:opacity-50"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {isPending
          ? stripeConfigured
            ? "Redirecting…"
            : "Subscribing…"
          : `Subscribe · $${price}/mo`}
      </button>
      {error && (
        <span className="text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </span>
      )}
    </div>
  );
}
