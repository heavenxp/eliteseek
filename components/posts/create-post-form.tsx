"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/icons";
import { createAvailabilityPost } from "@/app/actions/posts";
import type { AvailabilityCategory } from "@/lib/database.types";

const CATEGORIES: { value: AvailabilityCategory; label: string; icon: string }[] = [
  { value: "dinner",            label: "Dinner",              icon: "🍽️" },
  { value: "lunch",             label: "Lunch",               icon: "☀️" },
  { value: "private_dining",    label: "Private Dining",      icon: "🕯️" },
  { value: "business_coaching", label: "Business Coaching",   icon: "💼" },
  { value: "social_coaching",   label: "Social Coaching",     icon: "✨" },
  { value: "travel_companion",  label: "Travel Experience",   icon: "✈️" },
  { value: "event_plus_one",    label: "Event Plus-One",      icon: "🎭" },
  { value: "yacht_luxury",      label: "Yacht / Luxury",      icon: "⚓" },
  { value: "gallery_art",       label: "Gallery & Art",       icon: "🖼️" },
  { value: "weekend_getaway",   label: "Weekend Getaway",     icon: "🌅" },
];

const VENUE_TYPES = [
  "Restaurant", "Private Club", "Hotel", "Yacht", "Gallery",
  "Conference venue", "Outdoor", "Home", "Other",
];

export function CreatePostForm() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<AvailabilityCategory | "">("");
  const [visibility, setVisibility] = useState<"public" | "locked">("public");
  const [isMultiDay, setIsMultiDay] = useState(false);

  const [state, formAction, isPending] = useActionState(createAvailabilityPost, null);

  const canNext1 = !!category;
  const progress = ((step - 1) / 2) * 100;

  return (
    <div className="mx-auto max-w-xl">
      {/* Progress */}
      <div className="mb-8">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs text-muted/50 uppercase tracking-[0.1em]" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Step {step} of 3
          </p>
          <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {step === 1 ? "The Experience" : step === 2 ? "The Details" : "Publish"}
          </p>
        </div>
        <div className="h-px bg-[rgba(255,255,255,0.06)]">
          <div
            className="h-px bg-gold/50 transition-all duration-500"
            style={{ width: `${progress + 33}%` }}
          />
        </div>
      </div>

      <form action={formAction}>
        {/* Hidden fields that carry state across steps */}
        <input type="hidden" name="category" value={category} />
        <input type="hidden" name="visibility" value={visibility} />

        {/* ── Step 1: The Experience ── */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-1 text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
                What are you offering?
              </h2>
              <p className="text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Choose the type of experience you want to post.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  type="button"
                  onClick={() => setCategory(cat.value)}
                  className={[
                    "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center transition-all",
                    category === cat.value
                      ? "border-white/20 bg-white/[0.04] text-foreground"
                      : "border-[rgba(255,255,255,0.07)] text-muted/70 hover:border-white/10 hover:text-muted",
                  ].join(" ")}
                >
                  <span className="text-2xl">{cat.icon}</span>
                  <span className="text-xs leading-tight" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    {cat.label}
                  </span>
                </button>
              ))}
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Title <span className="text-muted/40">*</span>
              </label>
              <input
                name="title"
                type="text"
                required
                placeholder="e.g. Dinner at Nobu, Melbourne"
                className="auth-input w-full"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              />
            </div>

            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Description
              </label>
              <textarea
                name="description"
                rows={4}
                placeholder="Describe the experience — the venue, the atmosphere, what makes it special…"
                className="auth-input w-full resize-none"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              />
            </div>

            <button
              type="button"
              onClick={() => canNext1 && setStep(2)}
              disabled={!canNext1}
              className="btn-gold w-full rounded-xl py-3 text-sm disabled:opacity-40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Continue
            </button>
          </div>
        )}

        {/* ── Step 2: The Details ── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-1 text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
                When & where?
              </h2>
              <p className="text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Set the date, location, and pricing details.
              </p>
            </div>

            {/* Multi-day toggle */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Multi-day experience
              </span>
              <button
                type="button"
                onClick={() => setIsMultiDay(!isMultiDay)}
                className={[
                  "relative h-5 w-9 rounded-full border transition-colors",
                  isMultiDay
                    ? "border-white/20 bg-white/[0.07]"
                    : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.03)]",
                ].join(" ")}
              >
                <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-gold/70 transition-all ${isMultiDay ? "left-4" : "left-0.5"}`} />
              </button>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  {isMultiDay ? "Start date & time" : "Date & time"} <span className="text-muted/40">*</span>
                </label>
                <input
                  name="date_from"
                  type="datetime-local"
                  required
                  min={new Date().toISOString().slice(0, 16)}
                  className="auth-input w-full"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                />
              </div>
              {isMultiDay && (
                <div>
                  <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    End date & time
                  </label>
                  <input
                    name="date_to"
                    type="datetime-local"
                    min={new Date().toISOString().slice(0, 16)}
                    className="auth-input w-full"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  />
                </div>
              )}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  City <span className="text-muted/40">*</span>
                </label>
                <input
                  name="location_city"
                  type="text"
                  required
                  placeholder="e.g. London"
                  className="auth-input w-full"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Venue type
                </label>
                <select
                  name="venue_type"
                  className="auth-input w-full"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  <option value="">Select…</option>
                  {VENUE_TYPES.map((v) => (
                    <option key={v} value={v.toLowerCase()}>{v}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Price (per person, USD) <span className="text-muted/40">*</span>
                </label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
                  <input
                    name="price"
                    type="number"
                    required
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    className="auth-input w-full pl-7"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  />
                </div>
              </div>
              <div>
                <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Max guests
                </label>
                <input
                  name="max_guests"
                  type="number"
                  min="1"
                  max="20"
                  defaultValue="1"
                  className="auth-input w-full"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                <Icon name="chevron-left" className="h-4 w-4" />
                Back
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                className="btn-gold flex-1 rounded-xl py-3 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Continue
              </button>
            </div>
          </div>
        )}

        {/* ── Step 3: Publish ── */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h2 className="mb-1 text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
                Photos & visibility
              </h2>
              <p className="text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Add photos and choose who can see this post.
              </p>
            </div>

            {/* Photo placeholder */}
            <div>
              <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Photos
              </label>
              <div className="flex h-32 items-center justify-center rounded-xl border border-dashed border-white/10 bg-[rgba(255,255,255,0.02)] text-muted/40 transition-colors hover:border-white/20 hover:text-muted/60 cursor-pointer">
                <div className="flex flex-col items-center gap-2 text-center">
                  <Icon name="camera" className="h-7 w-7" />
                  <span className="text-xs" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    Photo uploads coming soon
                  </span>
                </div>
              </div>
            </div>

            {/* Visibility */}
            <div>
              <label className="mb-2 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Who can see this post?
              </label>
              <div className="space-y-2">
                {([
                  { value: "public", label: "Public", desc: "Visible to all EliteSeek members" },
                  { value: "locked", label: "Subscribers only", desc: "Only your active subscribers can see this" },
                ] as const).map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setVisibility(opt.value)}
                    className={[
                      "flex w-full items-start gap-3 rounded-xl border p-4 text-left transition-all",
                      visibility === opt.value
                        ? "border-white/20 bg-white/[0.04]"
                        : "border-[rgba(255,255,255,0.07)] hover:border-white/10",
                    ].join(" ")}
                  >
                    <div className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${visibility === opt.value ? "border-gold bg-gold" : "border-[rgba(255,255,255,0.2)]"}`}>
                      {visibility === opt.value && <span className="h-1.5 w-1.5 rounded-full bg-black" />}
                    </div>
                    <div>
                      <p className="text-sm text-foreground/80" style={{ fontFamily: "var(--font-dm-sans)" }}>{opt.label}</p>
                      <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>{opt.desc}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {state?.error && (
              <p className="text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {state.error}
              </p>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="btn-ghost flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                <Icon name="chevron-left" className="h-4 w-4" />
                Back
              </button>
              <button
                type="submit"
                disabled={isPending}
                className="btn-gold flex-1 rounded-xl py-3 text-sm disabled:opacity-60"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {isPending ? "Publishing…" : "Publish Post"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
