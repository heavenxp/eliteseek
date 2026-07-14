"use client";

import { useState, useTransition } from "react";
import { saveClientPreferences, saveClientMembership } from "@/app/actions/onboarding";
import { GlassCard } from "@/components/ui/glass-card";
import { Icon } from "@/components/icons";
import type { MembershipTier } from "@/lib/database.types";

const INTEREST_OPTIONS = [
  { value: "Dining", label: "Dining", icon: "calendar" },
  { value: "Events", label: "Events", icon: "star" },
  { value: "Travel", label: "Travel", icon: "map-pin" },
  { value: "Social", label: "Social", icon: "eye" },
  { value: "Virtual", label: "Virtual", icon: "lock" },
];

const MEMBERSHIP_OPTIONS: {
  tier: MembershipTier;
  price: string;
  period: string;
  tagline: string;
  features: string[];
  highlighted: boolean;
}[] = [
  {
    tier: "bronze",
    price: "Free",
    period: "",
    tagline: "Begin your journey",
    features: [
      "Browse public Elite Host profiles",
      "View public content feeds",
      "Basic search & filters",
    ],
    highlighted: false,
  },
  {
    tier: "silver",
    price: "$49",
    period: "/month",
    tagline: "Priority access",
    features: [
      "Everything in Bronze",
      "Priority booking requests",
      "Request locked profile access",
      "Early content notifications",
      "Dedicated support",
    ],
    highlighted: false,
  },
  {
    tier: "elite",
    price: "$199",
    period: "/month",
    tagline: "The inner circle",
    features: [
      "Everything in Silver",
      "Access Elite Only profiles",
      "Personal concierge service",
      "First access to new Elite Hosts",
      "Private events & introductions",
      "Exclusive Elite Lounge",
    ],
    highlighted: true,
  },
];

function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/08 px-4 py-3">
      <Icon name="shield" className="h-4 w-4 shrink-0 text-red-400" />
      <p className="text-sm text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {message}
      </p>
    </div>
  );
}

function ProgressDots({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {["Interests", "Membership"].map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs transition-all",
                  active
                    ? "border-[rgba(212,175,55,0.6)] bg-[rgba(212,175,55,0.15)] text-gold"
                    : done
                    ? "border-[rgba(212,175,55,0.4)] bg-[#d4af37] text-[#080810]"
                    : "border-[rgba(255,255,255,0.1)] text-muted/40",
                ].join(" ")}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {done ? <Icon name="check" className="h-3.5 w-3.5" /> : idx}
              </div>
              <span
                className={`text-[10px] ${active ? "text-gold" : done ? "text-muted" : "text-muted/30"}`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {label}
              </span>
            </div>
            {i < 1 && (
              <div
                className={[
                  "mb-4 h-px w-8 transition-colors",
                  done ? "bg-[rgba(212,175,55,0.4)]" : "bg-[rgba(255,255,255,0.08)]",
                ].join(" ")}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ClientOnboarding({
  fullName,
  currentTier,
  existingInterests,
  existingCity,
}: {
  fullName: string;
  currentTier: MembershipTier;
  existingInterests: string[];
  existingCity: string;
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [interests, setInterests] = useState<string[]>(existingInterests);
  const [city, setCity] = useState(existingCity);
  const [selectedTier, setSelectedTier] = useState<MembershipTier>(currentTier);

  const toggleInterest = (v: string) =>
    setInterests((prev) =>
      prev.includes(v) ? prev.filter((i) => i !== v) : [...prev, v]
    );

  const handleStep1Next = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("interests", interests.join(","));
      fd.set("city", city);
      const result = await saveClientPreferences(null, fd);
      if (result?.error) setError(result.error);
      else setStep(2);
    });
  };

  const handleFinish = () => {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("membership_tier", selectedTier);
      const result = await saveClientMembership(null, fd);
      if (result?.error) setError(result.error);
      // redirect on success handled server-side
    });
  };

  // ── Step 1: Welcome + Interests ──────────────────────────
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="rounded-xl border border-[rgba(212,175,55,0.12)] bg-[rgba(212,175,55,0.04)] p-4">
        <p
          className="text-sm text-muted/80"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Welcome, <span className="font-medium text-foreground">{fullName.split(" ")[0]}</span>. Let's personalise your EliteSeek experience.
        </p>
      </div>

      <div>
        <p className="mb-3 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
          What kinds of experiences interest you?
        </p>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {INTEREST_OPTIONS.map((opt) => {
            const active = interests.includes(opt.value);
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => toggleInterest(opt.value)}
                className={[
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 transition-all",
                  active
                    ? "border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.08)]"
                    : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(212,175,55,0.2)]",
                ].join(" ")}
              >
                <div
                  className={[
                    "flex h-9 w-9 items-center justify-center rounded-full border",
                    active
                      ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)]"
                      : "border-[rgba(255,255,255,0.08)]",
                  ].join(" ")}
                >
                  <Icon
                    name={opt.icon}
                    className={`h-4 w-4 ${active ? "text-gold" : "text-muted/50"}`}
                  />
                </div>
                <span
                  className={`text-xs font-medium ${active ? "text-foreground" : "text-muted"}`}
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {opt.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <p className="mb-1.5 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Your city <span className="text-muted/40">(optional)</span>
        </p>
        <input
          type="text"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Sydney, London, Dubai…"
          className="auth-input"
        />
      </div>
    </div>
  );

  // ── Step 2: Membership ───────────────────────────────────
  const renderStep2 = () => (
    <div className="space-y-3">
      {MEMBERSHIP_OPTIONS.map((opt) => {
        const active = selectedTier === opt.tier;
        return (
          <button
            key={opt.tier}
            type="button"
            onClick={() => setSelectedTier(opt.tier)}
            className={[
              "relative w-full rounded-xl border p-4 text-left transition-all duration-200",
              active
                ? "border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.07)] shadow-[0_0_20px_rgba(212,175,55,0.08)]"
                : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(212,175,55,0.2)]",
            ].join(" ")}
          >
            {opt.highlighted && (
              <span
                className="absolute -top-2.5 left-1/2 -translate-x-1/2 rounded-full bg-[#d4af37] px-3 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#080810]"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Most Popular
              </span>
            )}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-baseline gap-1.5">
                  <span
                    className={`text-xl font-light ${active ? "text-gold" : "text-foreground"}`}
                    style={{ fontFamily: "var(--font-cormorant)" }}
                  >
                    {opt.tier.charAt(0).toUpperCase() + opt.tier.slice(1)}
                  </span>
                  <span className="text-xs text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    — {opt.tagline}
                  </span>
                </div>
                <ul className="mt-2 space-y-1">
                  {opt.features.slice(0, 3).map((f) => (
                    <li
                      key={f}
                      className="flex items-center gap-2 text-xs text-muted/70"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      <Icon name="check" className="h-3 w-3 shrink-0 text-gold/70" />
                      {f}
                    </li>
                  ))}
                  {opt.features.length > 3 && (
                    <li className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      +{opt.features.length - 3} more
                    </li>
                  )}
                </ul>
              </div>
              <div className="text-right">
                <span
                  className={`text-2xl font-light ${active ? "text-gold" : "text-foreground"}`}
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {opt.price}
                </span>
                {opt.period && (
                  <p className="text-[10px] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    {opt.period}
                  </p>
                )}
                {active && (
                  <div className="mt-1 flex justify-end">
                    <Icon name="check" className="h-4 w-4 text-gold" />
                  </div>
                )}
              </div>
            </div>
          </button>
        );
      })}

      {selectedTier !== "bronze" && (
        <p className="text-center text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Billing setup is handled on the next screen.
          You won&apos;t be charged until you confirm.
        </p>
      )}
    </div>
  );

  return (
    <div className="w-full max-w-lg">
      <GlassCard gold className="p-8 md:p-10">
        <ProgressDots step={step} />

        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.15em] text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Step {step} of 2
          </p>
          <h1
            className="mt-1 text-3xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {step === 1 ? "Your interests" : "Choose your membership"}
          </h1>
          <p className="mt-1.5 text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {step === 1
              ? "Tell us what you're looking for so we can surface the right Elite Hosts."
              : "Upgrade anytime. Start free and explore."}
          </p>
        </div>

        {step === 1 ? renderStep1() : renderStep2()}

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <div className="mt-8 flex gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => { setError(null); setStep(1); }}
              disabled={isPending}
              className="btn-ghost flex-1 rounded-xl py-3 text-sm disabled:opacity-40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Back
            </button>
          )}
          <button
            type="button"
            onClick={step === 1 ? handleStep1Next : handleFinish}
            disabled={isPending}
            className="btn-gold flex-[2] rounded-xl py-3 text-sm disabled:opacity-60"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {isPending
              ? "Saving…"
              : step === 1
              ? "Continue"
              : selectedTier === "bronze"
              ? "Start Browsing"
              : `Join ${selectedTier.charAt(0).toUpperCase() + selectedTier.slice(1)}`}
          </button>
        </div>
      </GlassCard>

      <p className="mt-4 text-center text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        You can change your membership anytime from account settings.
      </p>
    </div>
  );
}
