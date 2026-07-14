"use client";

import { useActionState, useState, useRef, useTransition } from "react";
import Link from "next/link";
import Image from "next/image";
import { createBrowserClient } from "@supabase/ssr";
import { Icon } from "@/components/icons";
import { updateCompanionSettings, updateClientSettings } from "@/app/actions/settings";
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
  cover_image_url: string | null;
  stripe_account_id: string | null;
} | null;

type Props = {
  role: "companion" | "client";
  companion: CompanionData;
  clientFullName?: string;
  clientPhone?: string | null;
  avatarUrl?: string | null;
  searchable?: boolean;
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

// ── Photo upload component ────────────────────────────────────

function createSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

type PhotoUploadProps = {
  label: string;
  currentUrl: string | null | undefined;
  uploadPath: string;
  onUploaded: (url: string) => void;
  aspect?: "square" | "wide";
};

function PhotoUpload({ label, currentUrl, uploadPath, onUploaded, aspect = "square" }: PhotoUploadProps) {
  const [uploading, setUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(currentUrl ?? null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadError(null);
    setUploading(true);

    try {
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const path = uploadPath.replace("{ext}", ext);

      const supabase = createSupabase();
      const { error } = await supabase.storage
        .from("profile-photos")
        .upload(path, file, { upsert: true, contentType: file.type });

      if (error) {
        setUploadError(error.message);
        return;
      }

      const { data: urlData } = supabase.storage
        .from("profile-photos")
        .getPublicUrl(path);

      const publicUrl = urlData.publicUrl;
      setPreviewUrl(publicUrl);
      onUploaded(publicUrl);
    } catch {
      setUploadError("Upload failed. Please try again.");
    } finally {
      setUploading(false);
      // Reset so the same file can be re-selected
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  const isWide = aspect === "wide";

  return (
    <div>
      <p className="mb-2 text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {label}
      </p>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={uploading}
        className={[
          "relative flex items-center justify-center overflow-hidden rounded-xl border border-dashed border-[rgba(212,175,55,0.25)] bg-[rgba(255,255,255,0.02)] transition-colors hover:border-[rgba(212,175,55,0.45)] hover:bg-[rgba(212,175,55,0.03)] disabled:cursor-not-allowed",
          isWide ? "h-32 w-full" : "h-28 w-28",
        ].join(" ")}
      >
        {previewUrl ? (
          <Image
            src={previewUrl}
            alt={label}
            fill
            className="object-cover"
            unoptimized
          />
        ) : null}

        {/* Overlay */}
        <div
          className={[
            "absolute inset-0 flex flex-col items-center justify-center gap-1 transition-opacity",
            previewUrl && !uploading ? "opacity-0 hover:opacity-100" : "opacity-100",
            previewUrl ? "bg-[rgba(0,0,0,0.45)]" : "",
          ].join(" ")}
        >
          {uploading ? (
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-gold border-t-transparent" />
          ) : (
            <>
              <Icon name="camera" className="h-5 w-5 text-gold/70" />
              <span className="text-[10px] text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {previewUrl ? "Change" : "Upload"}
              </span>
            </>
          )}
        </div>
      </button>
      {uploadError && (
        <p className="mt-1 text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>{uploadError}</p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={handleFileChange}
        aria-label={`Upload ${label}`}
      />
    </div>
  );
}

// ── Client settings form ──────────────────────────────────────

function ClientSettingsForm({ clientFullName, clientPhone, searchable }: { clientFullName?: string; clientPhone?: string | null; searchable?: boolean }) {
  const [state, formAction, isPending] = useActionState(updateClientSettings, null);

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

      {/* ── Account info ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Account Details
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Your name and contact information.
        </p>
        <div className="space-y-4">
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Display name
            </label>
            <input
              name="full_name"
              type="text"
              required
              defaultValue={clientFullName ?? ""}
              placeholder="Your full name"
              className="auth-input w-full"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            />
          </div>
          <div>
            <label className="mb-1.5 block text-xs uppercase tracking-[0.1em] text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Phone number <span className="normal-case text-muted/30">(optional)</span>
            </label>
            <input
              name="phone"
              type="tel"
              defaultValue={clientPhone ?? ""}
              placeholder="+1 555 000 0000"
              className="auth-input w-full"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            />
          </div>
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Notification preferences ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Notification Preferences
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Choose which emails you receive from EliteSeek.
        </p>
        <div className="space-y-3">
          {[
            { name: "notify_new_bookings", label: "Email me about new bookings" },
            { name: "notify_booking_confirmed", label: "Email me when bookings are confirmed" },
            { name: "notify_host_content", label: "Email me about new content from hosts I follow" },
          ].map(({ name, label }) => (
            <label
              key={name}
              className="flex cursor-pointer items-center gap-3 rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-4 py-3 transition-colors hover:border-[rgba(212,175,55,0.18)]"
            >
              <input
                type="checkbox"
                name={name}
                value="1"
                defaultChecked
                className="h-4 w-4 accent-[#d4af37]"
              />
              <span className="text-sm text-foreground/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {label}
              </span>
            </label>
          ))}
        </div>
      </section>

      <div className="gold-divider" />

      {/* ── Membership ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Membership
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Upgrade your membership to access exclusive companions and features.
        </p>
        <Link
          href="/membership"
          className="btn-gold inline-block rounded-xl px-6 py-2.5 text-sm"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Manage Membership
        </Link>
      </section>

      <div className="gold-divider" />

      {/* ── Search visibility ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Discoverability
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Control whether others can find you via search.
        </p>
        <label className="flex cursor-pointer items-center justify-between rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
          <div>
            <p className="text-sm text-foreground/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Allow others to find me in search
            </p>
            <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              When off, your profile will not appear in any search results
            </p>
          </div>
          <div className="relative ml-4">
            <input
              type="checkbox"
              name="searchable"
              value="1"
              defaultChecked={searchable ?? true}
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

// ── Companion settings form ───────────────────────────────────

function CompanionSettingsForm({
  companion,
  avatarUrl,
}: {
  companion: NonNullable<CompanionData>;
  avatarUrl?: string | null;
}) {
  const [state, formAction, isPending] = useActionState(updateCompanionSettings, null);
  const [visibility, setVisibility] = useState<VisibilityLevel>(companion.visibility ?? "public");

  // Photo upload state — tracked client-side; URLs are saved via direct Supabase client
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState<string | null>(avatarUrl ?? null);
  const [currentCoverUrl, setCurrentCoverUrl] = useState<string | null>(companion.cover_image_url ?? null);

  // We need to persist uploaded URLs back to DB via a transition after upload
  const [, startTransition] = useTransition();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  function handleAvatarUploaded(url: string) {
    setCurrentAvatarUrl(url);
    startTransition(async () => {
      // Update profile avatar_url
      await supabase.auth.getUser().then(async ({ data: { user } }) => {
        if (user) {
          await supabase.from("profiles").update({ avatar_url: url }).eq("id", user.id);
        }
      });
    });
  }

  function handleCoverUploaded(url: string) {
    setCurrentCoverUrl(url);
    startTransition(async () => {
      await supabase.from("companion_profiles").update({ cover_image_url: url }).eq("id", companion.id);
    });
  }

  // Stripe connect section
  const stripeConnected = !!companion.stripe_account_id;

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

      {/* ── Profile Photos ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Profile Photos
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Upload your avatar and cover banner. Changes are saved immediately on upload.
        </p>
        <div className="flex flex-wrap gap-6">
          <PhotoUpload
            label="Profile photo"
            currentUrl={currentAvatarUrl}
            uploadPath={`${companion.id}/avatar.{ext}`}
            onUploaded={handleAvatarUploaded}
            aspect="square"
          />
          <div className="flex-1 min-w-[180px]">
            <PhotoUpload
              label="Cover image"
              currentUrl={currentCoverUrl}
              uploadPath={`${companion.id}/cover.{ext}`}
              onUploaded={handleCoverUploaded}
              aspect="wide"
            />
          </div>
        </div>
      </section>

      <div className="gold-divider" />

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

      <div className="gold-divider" />

      {/* ── Payouts (Stripe Connect) ── */}
      <section>
        <h2 className="mb-1 text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
          Payouts
        </h2>
        <p className="mb-4 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Connect a Stripe account to receive payouts from bookings and subscriptions.
        </p>

        {stripeConnected ? (
          <div className="flex items-center gap-3 rounded-xl border border-[rgba(52,211,153,0.25)] bg-[rgba(52,211,153,0.06)] px-4 py-4">
            <Icon name="check" className="h-5 w-5 shrink-0 text-emerald-400" />
            <div>
              <p className="text-sm font-medium text-emerald-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Stripe account connected
              </p>
              <p className="mt-0.5 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Payouts will be sent to your connected Stripe account after each completed booking.
              </p>
            </div>
          </div>
        ) : (
          <div className="rounded-xl border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-4 py-4">
            <p className="mb-3 text-sm text-foreground/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
              You need a Stripe account to receive payments. The setup takes about 5 minutes and is handled securely by Stripe.
            </p>
            <a
              href="/api/stripe/connect/onboard"
              className="btn-gold inline-block rounded-xl px-6 py-2.5 text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Connect Stripe Account
            </a>
          </div>
        )}
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

// ── Main export ───────────────────────────────────────────────

export function SettingsForm({ role, companion, clientFullName, clientPhone, avatarUrl }: Props) {
  if (role === "client") {
    return <ClientSettingsForm clientFullName={clientFullName} clientPhone={clientPhone} />;
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

  return <CompanionSettingsForm companion={companion} avatarUrl={avatarUrl} />;
}
