"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useCallback } from "react";
import { Icon } from "@/components/icons";

const EXPERIENCE_TAGS = ["Dinners", "Events", "Travel", "Social", "Virtual Sessions", "Galas", "Art", "Fashion"];
const SORT_OPTIONS = [
  { value: "featured", label: "Featured" },
  { value: "rating", label: "Highest rated" },
  { value: "newest", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
];

export function FiltersPanel({ onClose }: { onClose?: () => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const currentTags = (searchParams.get("tags") ?? "").split(",").filter(Boolean);
  const currentTier = searchParams.get("tier") ?? "";
  const currentAvailable = searchParams.get("available") === "1";
  const currentSort = searchParams.get("sort") ?? "featured";
  const currentCity = searchParams.get("city") ?? "";

  const updateParam = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([k, v]) => {
        if (v) params.set(k, v);
        else params.delete(k);
      });
      params.delete("page"); // reset pagination on filter change
      startTransition(() => {
        router.push(`${pathname}?${params.toString()}`);
      });
      onClose?.();
    },
    [router, pathname, searchParams, onClose]
  );

  const toggleTag = (tag: string) => {
    const next = currentTags.includes(tag)
      ? currentTags.filter((t) => t !== tag)
      : [...currentTags, tag];
    updateParam({ tags: next.join(",") });
  };

  const hasFilters = currentTags.length > 0 || currentTier || currentAvailable || currentCity;

  const clearAll = () => {
    startTransition(() => {
      router.push(pathname);
    });
    onClose?.();
  };

  return (
    <div className={`space-y-6 ${isPending ? "opacity-60 pointer-events-none" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-light text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Filters
        </h2>
        <div className="flex items-center gap-3">
          {hasFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-gold/70 underline underline-offset-2 hover:text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Clear all
            </button>
          )}
          {onClose && (
            <button onClick={onClose} className="text-muted/50 hover:text-muted">
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Sort */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Sort by
        </p>
        <div className="space-y-1">
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam({ sort: opt.value === "featured" ? "" : opt.value })}
              className={[
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                currentSort === opt.value || (opt.value === "featured" && !currentSort)
                  ? "bg-white/[0.04] text-gold"
                  : "text-muted hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground",
              ].join(" ")}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {opt.label}
              {(currentSort === opt.value || (opt.value === "featured" && !currentSort)) && (
                <Icon name="check" className="h-3.5 w-3.5" />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="gold-divider" />

      {/* City */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          City
        </p>
        <div className="relative">
          <Icon name="map-pin" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted/40" />
          <input
            type="text"
            defaultValue={currentCity}
            placeholder="e.g. Melbourne"
            className="auth-input pl-9"
            style={{ fontFamily: "var(--font-dm-sans)" }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                updateParam({ city: (e.target as HTMLInputElement).value.trim() });
              }
            }}
            onBlur={(e) => {
              const v = e.target.value.trim();
              if (v !== currentCity) updateParam({ city: v });
            }}
            aria-label="Filter by city"
          />
        </div>
      </div>

      <div className="gold-divider" />

      {/* Availability */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Availability
        </p>
        <button
          onClick={() => updateParam({ available: currentAvailable ? "" : "1" })}
          className={[
            "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 transition-all",
            currentAvailable
              ? "border border-white/20 bg-white/[0.04]"
              : "border border-[rgba(255,255,255,0.05)] hover:border-white/10",
          ].join(" ")}
        >
          <div className={`h-2 w-2 rounded-full ${currentAvailable ? "bg-emerald-400" : "bg-muted/30"}`} />
          <span className={`text-sm ${currentAvailable ? "text-foreground" : "text-muted"}`} style={{ fontFamily: "var(--font-dm-sans)" }}>
            Available now
          </span>
          {currentAvailable && <Icon name="check" className="ml-auto h-3.5 w-3.5 text-gold" />}
        </button>
      </div>

      <div className="gold-divider" />

      {/* Verification tier */}
      <div>
        <p className="mb-2 text-xs uppercase tracking-[0.12em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Tier
        </p>
        <div className="space-y-1">
          {[
            { value: "", label: "All Elite Hosts" },
            { value: "verified", label: "Verified" },
            { value: "select", label: "EliteSeek Select" },
          ].map((opt) => (
            <button
              key={opt.value}
              onClick={() => updateParam({ tier: opt.value })}
              className={[
                "flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors",
                currentTier === opt.value
                  ? "bg-white/[0.04] text-gold"
                  : "text-muted hover:bg-[rgba(255,255,255,0.03)] hover:text-foreground",
              ].join(" ")}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {opt.label}
              {currentTier === opt.value && <Icon name="check" className="h-3.5 w-3.5" />}
            </button>
          ))}
        </div>
      </div>

      <div className="gold-divider" />

      {/* Experience types */}
      <div>
        <p className="mb-3 text-xs uppercase tracking-[0.12em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Experience types
        </p>
        <div className="flex flex-wrap gap-2">
          {EXPERIENCE_TAGS.map((tag) => {
            const active = currentTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={[
                  "rounded-full border px-3 py-1.5 text-xs transition-all",
                  active
                    ? "border-white/20 bg-white/[0.07] text-gold"
                    : "border-[rgba(255,255,255,0.07)] text-muted/70 hover:border-white/10 hover:text-muted",
                ].join(" ")}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
