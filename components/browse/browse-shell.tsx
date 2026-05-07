"use client";

import { useState, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { FiltersPanel } from "./filters-panel";
import type { CompanionCard } from "@/lib/database.types";

type Props = {
  children: React.ReactNode;
  activeFilters: number;
};

export function BrowseShell({ children, activeFilters }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const updateSearch = useCallback(
    (q: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (q) params.set("q", q);
      else params.delete("q");
      params.delete("page");
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 md:px-6 md:py-10">
      {/* Mobile: search + filter bar */}
      <div className="mb-6 flex items-center gap-3 md:hidden">
        <SearchInput defaultValue={searchParams.get("q") ?? ""} onSearch={updateSearch} />
        <button
          onClick={() => setDrawerOpen(true)}
          className="relative flex shrink-0 items-center gap-2 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(255,255,255,0.03)] px-4 py-2.5 text-sm text-muted transition-colors hover:border-[rgba(212,175,55,0.35)] hover:text-foreground"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h5.25" />
          </svg>
          Filters
          {activeFilters > 0 && (
            <span className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[9px] font-semibold text-black">
              {activeFilters}
            </span>
          )}
        </button>
      </div>

      <div className="flex gap-8">
        {/* Desktop sidebar */}
        <aside className="hidden w-60 shrink-0 md:block">
          <div className="sticky top-[80px]">
            <FiltersPanel />
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Desktop search */}
          <div className="mb-6 hidden md:block">
            <SearchInput defaultValue={searchParams.get("q") ?? ""} onSearch={updateSearch} />
          </div>
          {children}
        </main>
      </div>

      {/* Mobile filter drawer */}
      {drawerOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="fixed inset-x-0 bottom-0 z-50 max-h-[85vh] overflow-y-auto rounded-t-2xl border-t border-[rgba(212,175,55,0.15)] bg-[rgba(8,8,16,0.98)] p-6 shadow-[0_-8px_48px_rgba(0,0,0,0.6)]">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-[rgba(255,255,255,0.15)]" />
            <FiltersPanel onClose={() => setDrawerOpen(false)} />
          </div>
        </>
      )}
    </div>
  );
}

function SearchInput({
  defaultValue,
  onSearch,
}: {
  defaultValue: string;
  onSearch: (q: string) => void;
}) {
  return (
    <div className="relative">
      <svg
        className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/40"
        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
      </svg>
      <input
        type="search"
        defaultValue={defaultValue}
        placeholder="Search by name or city…"
        onKeyDown={(e) => {
          if (e.key === "Enter") onSearch((e.target as HTMLInputElement).value.trim());
        }}
        onBlur={(e) => onSearch(e.target.value.trim())}
        className="w-full rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] py-2.5 pl-10 pr-4 text-sm text-foreground placeholder-muted/40 outline-none transition-colors focus:border-[rgba(212,175,55,0.3)] focus:bg-[rgba(255,255,255,0.05)]"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      />
    </div>
  );
}
