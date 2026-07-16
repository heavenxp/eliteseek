"use client";

import { useState } from "react";
import { Icon } from "@/components/icons";

// Copies the public share URL — the growth loop's entry point.
export function ShareLinkButton({ eventId }: { eventId: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    const url = `${window.location.origin}/e/${eventId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable — show the URL for manual copy
      window.prompt("Copy this link:", url);
    }
  }

  return (
    <button
      onClick={copy}
      className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-foreground/80 transition-colors hover:border-white/20"
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      <Icon name={copied ? "check" : "send"} className={`h-3.5 w-3.5 ${copied ? "text-emerald-400" : "text-gold"}`} />
      {copied ? "Link copied" : "Share"}
    </button>
  );
}
