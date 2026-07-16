"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { joinWithCode } from "@/app/actions/events";

export default function JoinEventPage() {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim() || submitting) return;
    setSubmitting(true);
    setError(null);

    const result = await joinWithCode(code);

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/events/${result.eventId}`);
  }

  return (
    <div className="mx-auto max-w-md px-4 py-16 md:py-24">
      <div className="mb-8 text-center">
        <div className="mb-4 flex justify-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]">
            <svg className="h-6 w-6 text-muted/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 013 3m3 0a6 6 0 01-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1121.75 8.25z" />
            </svg>
          </div>
        </div>
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
         
        >
          Join with Code
        </h1>
        <p className="mt-2 text-sm text-muted/50">
          Enter your invite code to access a private event
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          placeholder="XXXXXXXX"
          maxLength={8}
          className="w-full rounded-xl border border-white/[0.1] bg-white/[0.03] px-4 py-3.5 text-center font-mono text-xl tracking-[0.35em] text-foreground placeholder:text-white/15 focus:border-white/20 focus:outline-none transition-colors"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
        />

        {error && (
          <p className="text-center text-sm text-red-400">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={code.trim().length < 6 || submitting}
          className="w-full rounded-xl bg-gold py-3 text-sm font-semibold text-black hover:bg-gold-light transition-colors disabled:opacity-40"

        >
          {submitting ? "Verifying…" : "Join Event"}
        </button>
      </form>

      <div className="mt-6 text-center">
        <Link
          href="/events"
          className="text-sm text-white/30 hover:text-white/60 transition-colors"

        >
          ← Browse public events
        </Link>
      </div>
    </div>
  );
}
