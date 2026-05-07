"use client";

import Link from "next/link";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div
      className="page-bg min-h-screen flex items-center justify-center px-4"
      style={{ background: "#080810" }}
    >
      <div className="glass-card rounded-2xl p-10 max-w-md w-full text-center">
        <p
          className="text-sm uppercase tracking-widest mb-4"
          style={{ color: "#d4af37", fontFamily: "var(--font-dm-sans)" }}
        >
          Error
        </p>
        <h1
          className="text-3xl font-light mb-3"
          style={{ fontFamily: "var(--font-cormorant)", color: "#f5f0e8" }}
        >
          Unable to load admin panel
        </h1>
        <p
          className="text-sm mb-8"
          style={{
            fontFamily: "var(--font-dm-sans)",
            color: "rgba(245, 240, 232, 0.55)",
          }}
        >
          We could not load the admin panel. Please try again or return home.
          {error.digest && (
            <span className="block mt-2 font-mono text-xs opacity-50">
              {error.digest}
            </span>
          )}
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={reset}
            className="btn-gold px-6 py-2.5 rounded-xl text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Try again
          </button>
          <Link
            href="/browse"
            className="btn-ghost px-6 py-2.5 rounded-xl text-sm inline-flex items-center justify-center"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}
