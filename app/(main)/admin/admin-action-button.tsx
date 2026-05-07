"use client";

import { useTransition, useState } from "react";

type Variant = "gold" | "ghost" | "danger";

interface AdminActionButtonProps {
  action: () => Promise<{ error: string | null }>;
  label: string;
  variant?: Variant;
  className?: string;
}

const variantClasses: Record<Variant, string> = {
  gold: "btn-gold text-xs px-3 py-1.5",
  ghost: "btn-ghost text-xs px-3 py-1.5",
  danger:
    "rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-red-500/20",
};

export function AdminActionButton({
  action,
  label,
  variant = "ghost",
  className = "",
}: AdminActionButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      const result = await action();
      if (result.error) setError(result.error);
    });
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        onClick={handleClick}
        disabled={isPending}
        className={[variantClasses[variant], className, "disabled:opacity-50 disabled:cursor-not-allowed"].join(" ")}
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {isPending ? "..." : label}
      </button>
      {error && (
        <span className="text-[10px] text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </span>
      )}
    </span>
  );
}
