"use client";

import { useTransition, useState, useCallback } from "react";
import Link from "next/link";
import { searchUsers, type SearchResult } from "@/app/actions/search";

const COUNTRIES = [
  "United Kingdom", "United States", "Canada", "Australia", "France",
  "Germany", "Italy", "Spain", "Netherlands", "Switzerland", "Sweden",
  "Norway", "Denmark", "United Arab Emirates", "Saudi Arabia", "Qatar",
  "Singapore", "Japan", "South Korea", "Hong Kong", "Brazil", "Mexico",
  "Argentina", "South Africa", "Nigeria", "India", "Thailand", "Turkey",
  "Portugal", "Greece",
];

type RoleFilter = "everyone" | "companion" | "client";

function ResultCard({ result }: { result: SearchResult }) {
  const href =
    result.role === "companion"
      ? result.username
        ? `/profile/${result.username}`
        : `/companion/${result.id}`
      : `/profile/client/${result.id}`;

  const initial = result.full_name.charAt(0).toUpperCase();
  const displayName = result.role === "companion" && result.display_name
    ? result.display_name
    : result.full_name;

  return (
    <Link
      href={href}
      className="flex items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.05)] bg-[rgba(255,255,255,0.02)] px-4 py-3 transition-colors hover:border-white/10 hover:bg-white/[0.04]"
    >
      <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full border border-white/20 bg-white/[0.04] text-sm font-medium text-gold">
        {result.avatar_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={result.avatar_url} alt="" className="h-full w-full object-cover" />
        ) : (
          <span>{initial}</span>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <p
            className="truncate text-sm text-foreground/90"

          >
            {displayName}
          </p>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-[9px] uppercase tracking-wide ${
              result.role === "companion"
                ? "bg-white/[0.07] text-gold/80"
                : "bg-[rgba(255,255,255,0.06)] text-muted/60"
            }`}

          >
            {result.role === "companion" ? "Host" : "Client"}
          </span>
        </div>
        {(result.location || result.country) && (
          <p
            className="mt-0.5 truncate text-xs text-muted/50"

          >
            {[result.location, result.country].filter(Boolean).join(", ")}
          </p>
        )}
      </div>

      <svg className="h-4 w-4 shrink-0 text-muted/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
      </svg>
    </Link>
  );
}

export function SearchClient() {
  const [isPending, startTransition] = useTransition();
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [q, setQ] = useState("");
  const [role, setRole] = useState<RoleFilter>("everyone");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");

  const runSearch = useCallback(
    (overrides?: Partial<{ q: string; role: RoleFilter; country: string; city: string }>) => {
      const params = {
        q: overrides?.q ?? q,
        role: overrides?.role ?? role,
        country: overrides?.country ?? country,
        city: overrides?.city ?? city,
      };
      startTransition(async () => {
        const data = await searchUsers(params);
        setResults(data);
      });
    },
    [q, role, country, city]
  );

  const TABS: { label: string; value: RoleFilter }[] = [
    { label: "Everyone", value: "everyone" },
    { label: "Hosts", value: "companion" },
    { label: "Clients", value: "client" },
  ];

  return (
    <div>
      {/* Sticky header */}
      <header
        className="sticky top-0 z-20 border-b border-white/[0.06]"
        style={{ backgroundColor: "rgba(10,10,10,0.92)", backdropFilter: "blur(16px)" }}
      >
        <div className="mx-auto max-w-[600px] px-4 py-3.5">
          <h1
            className="mb-3 text-[17px] font-semibold text-white/90"

          >
            Search
          </h1>

          {/* Search input */}
          <div className="relative">
            <svg
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/40"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <input
              type="search"
              value={q}
              placeholder="Search by name…"
              onChange={(e) => {
                setQ(e.target.value);
                runSearch({ q: e.target.value });
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") runSearch({ q: (e.target as HTMLInputElement).value });
              }}
              className="w-full rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted/40 outline-none transition-colors focus:border-white/20"

            />
          </div>

          {/* Role tabs */}
          <div className="mt-3 flex gap-1">
            {TABS.map((tab) => (
              <button
                key={tab.value}
                onClick={() => {
                  setRole(tab.value);
                  runSearch({ role: tab.value });
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs transition-colors ${
                  role === tab.value
                    ? "bg-white/[0.07] text-gold"
                    : "text-muted/60 hover:text-foreground"
                }`}

              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-[600px] px-4">
        {/* Secondary filters */}
        <div className="mt-4 flex gap-3">
          <select
            value={country}
            onChange={(e) => {
              setCountry(e.target.value);
              runSearch({ country: e.target.value });
            }}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-foreground/80 outline-none transition-colors focus:border-white/20"

          >
            <option value="">Any Country</option>
            {COUNTRIES.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          <input
            type="text"
            value={city}
            placeholder="City…"
            onChange={(e) => {
              setCity(e.target.value);
              runSearch({ city: e.target.value });
            }}
            className="flex-1 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.04)] px-3 py-2 text-sm text-foreground/80 placeholder-muted/40 outline-none transition-colors focus:border-white/20"

          />
        </div>

        {/* Results */}
        <div className="mt-4 pb-6">
          {isPending && (
            <div className="flex justify-center py-8">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold/30 border-t-gold" />
            </div>
          )}

          {!isPending && results === null && (
            <p
              className="py-12 text-center text-sm text-muted/40"

            >
              Search by name, country, or city
            </p>
          )}

          {!isPending && results !== null && results.length === 0 && (
            <p
              className="py-12 text-center text-sm text-muted/40"

            >
              No results found
            </p>
          )}

          {!isPending && results && results.length > 0 && (
            <div className="flex flex-col gap-2">
              {results.map((r) => (
                <ResultCard key={r.id} result={r} />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
