"use client";

export default function OfflinePage() {
  return (
    <div className="page-bg flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
        <svg
          className="h-8 w-8 text-gold"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 3l18 18M8.111 8.111A3 3 0 0012 15a3 3 0 003-3M3.513 3.513A9.006 9.006 0 0112 3c4.97 0 9 4.03 9 9a8.995 8.995 0 01-1.513 4.987m-1.882 1.882A9 9 0 013 12"
          />
        </svg>
      </div>
      <div>
        <h1
          className="text-xl font-bold tracking-tight text-foreground"
         
        >
          You&apos;re offline
        </h1>
        <p
          className="mt-2 text-sm text-muted/60"

        >
          Check your connection and try again.
        </p>
      </div>
      <button
        onClick={() => window.location.reload()}
        className="btn-gold rounded-xl px-6 py-2.5 text-sm"

      >
        Retry
      </button>
    </div>
  );
}
