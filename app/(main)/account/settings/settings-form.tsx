"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Icon } from "@/components/icons";
import { updateCompanionSettings } from "@/app/actions/settings";
import type { VisibilityLevel } from "@/lib/database.types";

type CompanionData = {
  id: string;
  visibility: VisibilityLevel;
  profile_unlock_fee: number | null;
  subscription_price: number | null;
  booking_rate_hourly: number | null;
  bio: string | null;
  tagline: string | null;
  location: string | null;
  is_available: boolean;
} | null;

type Props = {
  role: "companion" | "client";
  companion: CompanionData;
};

const VISIBILITY_OPTIONS: { value: VisibilityLevel; label: string; desc: string; icon: string }[] = [
  {
    value: "public",
    label: "Public",
    desc: "All EliteSeek members can view your full profile",
    icon: "eye",
  },
  {
    value: "locked",
    label: "Locked",
    desc: "Members must pay or request access to see your profile",
    icon: "lock",
  },
  {
    value: "elite_only",
    label: "Elite Only",
    desc: "Only Elite-tier members (or approved requests) can view your profile",
    icon: "diamond",
  },
];

export function SettingsForm({ role, companion }: Props) {
  const [state, formAction, isPending] = useActionState(updateCompanionSettings, null);
  const [visibility, setVisibility] = useState<VisibilityLevel>(companion?.visibility ?? "public");

  if (role === "client") {
    return (
      <div className="rounded-2xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
        <p className="text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Client account settings coming soon.
        </p>
        <Link
          href="/membership"
          className="btn-gold mt-4 inline-block rounded-xl px-6 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Manage Membership
        </Link>
      </div>
    );
  }

  if (!companion) {
    return (
      <div className="rounded-2xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] p-6 text-center">
        <p className="text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Complete your profile setup first.
        </p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-8">
      {/* Success / error banner */}
      {state?.success && (
        <div className="flex items-center gap-3 rounded-xl border border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.06)] px-4 py-3">
          <Icon name="check" className="h-4 w-4 text-emerald-400" />
          <p className="text-sm text-emerald-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Settings saved successfully.
          </p>
        </div>
      )}
      {state?.error && (
        <div className="rounded-xl border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.06)] px-4 py-3">
          <p className="text-sm text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>{state.error}</p>
        </div>
      )}

      {/* ── Profile lock ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Profile Visibility
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Control who can see your full profile, photos, and contact details.
        </p>

        <div className="space-y-2">
          {VISIBILITY_OPTIONS.map((opt) => (
            <label
              key={opt.value}
              className={[
                "flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-all",
                visibility === opt.value
                  ? "border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.06)]"
                  : "border-[rgba(255,255,255,0.07)] hover:border-[rgba(212,175,55,0.18)]",
              ].join(" ")}
            >
              <input
                type="radio"
                name="visibility"
                value={opt.value}
                checked={visibility === opt.value}
                onChange={() => setVisibility(opt.value)}
                className="sr-only"
              />
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border ${visibility === opt.value ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)]" : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.02)]"}`}>
                <Icon name={opt.icon} className={`h-4 w-4 ${visibility === opt.value ? "text-gold" : "text-muted/40"}`} />
              </div>
              <div className="flex-1">
                <p className="text-sm text-foreground/90" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  {opt.label}
                </p>
                <p className="mt-0.5 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  {opt.desc}
                </p>
              </div>
            </label>
          ))}
        </div>
      </section>

      {/* ── Unlock fee ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Profile Unlock Fee
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Charge a one-time fee for clients to unlock your locked profile. Leave blank for free request-only access.
        </p>
        <div className="relative max-w-xs">
          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
          <input
            name="profile_unlock_fee"
            type="number"
            min="0"
            step="1"
            defaultValue={companion.profile_unlock_fee ?? ""}
            placeholder="e.g. 25"
            className="auth-input w-full pl-7"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          />
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Pricing ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Rates
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Set your booking and subscription prices. Leave blank to disable.
        </p>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Hourly booking rate
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
              <input
                name="booking_rate_hourly"
                type="number"
                min="0"
                step="1"
                defaultValue={companion.booking_rate_hourly ?? ""}
                placeholder="e.g. 500"
                className="auth-input w-full pl-7"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              />
            </div>
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Monthly subscription
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
              <input
                name="subscription_price"
                type="number"
                min="0"
                step="1"
                defaultValue={companion.subscription_price ?? ""}
                placeholder="e.g. 49"
                className="auth-input w-full pl-7"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              />
            </div>
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Profile info ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Profile Details
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          How you appear to clients on your profile page.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Tagline
            </label>
            <input
              name="tagline"
              type="text"
              defaultValue={companion.tagline ?? ""}
              placeholder="A short line that captures your essence…"
              className="auth-input w-full"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Bio
            </label>
            <textarea
              name="bio"
              rows={5}
              defaultValue={companion.bio ?? ""}
              placeholder="Tell potential clients about yourself, your background, and what makes your company exceptional…"
              className="auth-input w-full resize-none"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Location
            </label>
            <input
              name="location"
              type="text"
              defaultValue={companion.location ?? ""}
              placeholder="e.g. London, UK"
              className="auth-input w-full"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            />
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Availability toggle ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Availability Status
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Show clients whether you are currently taking bookings.
        </p>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
          <div>
            <p className="text-sm text-foreground/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Available for bookings
            </p>
            <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Clients will see a green Available indicator on your card and profile
            </p>
          </div>
          <div className="relative ml-4">
            <input
              type="checkbox"
              name="is_available"
              value="1"
              defaultChecked={companion.is_available}
              className="peer sr-only"
            />
            <div className="h-6 w-11 rounded-full border border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)] transition-colors peer-checked:border-[rgba(212,175,55,0.4)] peer-checked:bg-[rgba(212,175,55,0.2)]" />
            <div className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-muted/30 transition-all peer-checked:translate-x-5 peer-checked:bg-gold" />
          </div>
        </label>
      </section>

      <button
        type="submit"
        disabled={isPending}
        className="btn-gold w-full rounded-xl py-3 text-sm disabled:opacity-60"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {isPending ? "Saving…" : "Save Settings"}
      </button>
    </form>
  );
}
