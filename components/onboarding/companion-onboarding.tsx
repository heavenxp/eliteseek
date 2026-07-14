"use client";

import { useState, useTransition } from "react";
import {
  saveCompanionAbout,
  saveCompanionOfferings,
  saveCompanionPricing,
  saveCompanionVisibility,
  type OnboardingState,
} from "@/app/actions/onboarding";
import { GlassCard } from "@/components/ui/glass-card";
import { Icon } from "@/components/icons";

// ── Types ────────────────────────────────────────────────────
type TipItem = { name: string; amount: string };
type Visibility = "public" | "locked" | "elite_only";

type InitialData = {
  display_name?: string | null;
  age?: number | null;
  location?: string | null;
  tagline?: string | null;
  bio?: string | null;
  tags?: string[] | null;
  languages?: string[] | null;
  subscription_price?: number | null;
  booking_rate_hourly?: number | null;
  profile_unlock_fee?: number | null;
  tip_menu?: unknown;
  visibility?: Visibility | null;
  is_available?: boolean | null;
};

// ── Constants ────────────────────────────────────────────────
const BOOKING_TYPES = ["Dinners", "Events", "Travel", "Social", "Virtual Sessions"];
const LANGUAGE_OPTIONS = [
  "English", "French", "Spanish", "Italian", "Portuguese",
  "Mandarin", "Japanese", "Korean", "Arabic", "Russian", "German", "Hindi",
];
const TOTAL_STEPS = 4;
const STEP_LABELS = ["About", "Offerings", "Pricing", "Launch"];

// ── Shared UI primitives ─────────────────────────────────────
function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="mb-1.5 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
      {children}
    </p>
  );
}

function FieldInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} className={`auth-input ${props.className ?? ""}`} />;
}

function FieldTextarea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className="auth-input min-h-[100px] resize-none"
      style={{ fontFamily: "var(--font-dm-sans)" }}
    />
  );
}

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3"
    >
      <div
        className={[
          "relative h-6 w-11 rounded-full transition-colors duration-200",
          checked ? "bg-[#d4af37]" : "bg-[rgba(255,255,255,0.1)]",
        ].join(" ")}
      >
        <div
          className={[
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200",
            checked ? "translate-x-5" : "translate-x-0.5",
          ].join(" ")}
        />
      </div>
      <span className="text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {label}
      </span>
    </button>
  );
}

function ChipSelect({
  options,
  selected,
  onToggle,
}: {
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={[
              "rounded-full border px-3.5 py-1.5 text-xs transition-all duration-150",
              active
                ? "border-[rgba(212,175,55,0.5)] bg-[rgba(212,175,55,0.12)] text-gold"
                : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] text-muted hover:border-[rgba(212,175,55,0.25)]",
            ].join(" ")}
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {opt}
          </button>
        );
      })}
    </div>
  );
}

function TagInput({
  tags,
  onChange,
  placeholder,
  max = 8,
}: {
  tags: string[];
  onChange: (t: string[]) => void;
  placeholder?: string;
  max?: number;
}) {
  const [input, setInput] = useState("");

  const add = (val: string) => {
    const clean = val.trim().replace(/,/g, "");
    if (clean && !tags.includes(clean) && tags.length < max) {
      onChange([...tags, clean]);
    }
    setInput("");
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">
        {tags.map((t) => (
          <span
            key={t}
            className="flex items-center gap-1.5 rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-1 text-xs text-gold"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {t}
            <button type="button" onClick={() => onChange(tags.filter((x) => x !== t))}>
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </span>
        ))}
      </div>
      {tags.length < max && (
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add(input);
            }
          }}
          onBlur={() => input && add(input)}
          placeholder={placeholder ?? "Type and press Enter"}
          className="auth-input"
        />
      )}
    </div>
  );
}

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

// ── Progress indicator ───────────────────────────────────────
function ProgressDots({ step }: { step: number }) {
  return (
    <div className="mb-8 flex items-center justify-center gap-2">
      {STEP_LABELS.map((label, i) => {
        const idx = i + 1;
        const done = idx < step;
        const active = idx === step;
        return (
          <div key={label} className="flex items-center gap-2">
            <div className="flex flex-col items-center gap-1">
              <div
                className={[
                  "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-medium transition-all",
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
            {i < TOTAL_STEPS - 1 && (
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

// ── Nav buttons ──────────────────────────────────────────────
function NavButtons({
  step,
  onBack,
  onNext,
  isPending,
  nextLabel,
}: {
  step: number;
  onBack: () => void;
  onNext: () => void;
  isPending: boolean;
  nextLabel?: string;
}) {
  return (
    <div className="mt-8 flex gap-3">
      {step > 1 && (
        <button
          type="button"
          onClick={onBack}
          disabled={isPending}
          className="btn-ghost flex-1 rounded-xl py-3 text-sm disabled:opacity-40"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Back
        </button>
      )}
      <button
        type="button"
        onClick={onNext}
        disabled={isPending}
        className="btn-gold flex-[2] rounded-xl py-3 text-sm disabled:opacity-60"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {isPending ? "Saving…" : (nextLabel ?? "Continue")}
      </button>
    </div>
  );
}

// ── Main component ───────────────────────────────────────────
export function CompanionOnboarding({
  fullName,
  initialData,
}: {
  fullName: string;
  initialData: InitialData;
}) {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Step 1 state
  const [displayName, setDisplayName] = useState(initialData.display_name ?? fullName);
  const [age, setAge] = useState(String(initialData.age ?? ""));
  const [location, setLocation] = useState(initialData.location ?? "");
  const [tagline, setTagline] = useState(initialData.tagline ?? "");
  const [bio, setBio] = useState(initialData.bio ?? "");

  // Step 2 state
  const [tags, setTags] = useState<string[]>(initialData.tags ?? []);
  const [languages, setLanguages] = useState<string[]>(initialData.languages ?? ["English"]);

  // Step 3 state
  const [subEnabled, setSubEnabled] = useState(!!initialData.subscription_price);
  const [subPrice, setSubPrice] = useState(String(initialData.subscription_price ?? "19.99"));
  const [bookingEnabled, setBookingEnabled] = useState(!!initialData.booking_rate_hourly);
  const [bookingRate, setBookingRate] = useState(String(initialData.booking_rate_hourly ?? "150"));
  const [unlockEnabled, setUnlockEnabled] = useState(!!initialData.profile_unlock_fee);
  const [unlockFee, setUnlockFee] = useState(String(initialData.profile_unlock_fee ?? "25"));
  const parsedTips = Array.isArray(initialData.tip_menu) ? (initialData.tip_menu as TipItem[]) : [];
  const [tipMenu, setTipMenu] = useState<TipItem[]>(parsedTips);

  // Step 4 state
  const [visibility, setVisibility] = useState<Visibility>(initialData.visibility ?? "public");
  const [isAvailable, setIsAvailable] = useState(initialData.is_available ?? true);

  const saveAndNext = (
    action: (_: OnboardingState, fd: FormData) => Promise<OnboardingState>,
    nextStep: number
  ) => {
    setError(null);
    startTransition(async () => {
      const fd = buildFormData();
      const result = await action(null, fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setStep(nextStep);
      }
    });
  };

  const buildFormData = (): FormData => {
    const fd = new FormData();
    // Step 1
    fd.set("display_name", displayName);
    fd.set("age", age);
    fd.set("location", location);
    fd.set("tagline", tagline);
    fd.set("bio", bio);
    // Step 2
    fd.set("tags", tags.join(","));
    fd.set("languages", languages.join(","));
    // Step 3
    fd.set("sub_enabled", String(subEnabled));
    fd.set("subscription_price", subPrice);
    fd.set("booking_enabled", String(bookingEnabled));
    fd.set("booking_rate_hourly", bookingRate);
    fd.set("unlock_enabled", String(unlockEnabled));
    fd.set("profile_unlock_fee", unlockFee);
    fd.set("tip_menu", JSON.stringify(tipMenu));
    // Step 4
    fd.set("visibility", visibility);
    fd.set("is_available", String(isAvailable));
    return fd;
  };

  // ── Step renderers ─────────────────────────────────────────

  const renderStep1 = () => (
    <div className="space-y-4">
      <div>
        <Label>Display name *</Label>
        <FieldInput
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="How you'll appear on EliteSeek"
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Age *</Label>
          <FieldInput
            type="number"
            value={age}
            onChange={(e) => setAge(e.target.value)}
            min={18}
            max={99}
            placeholder="25"
          />
        </div>
        <div>
          <Label>Location</Label>
          <FieldInput
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Monaco, Paris…"
          />
        </div>
      </div>
      <div>
        <Label>Tagline — one captivating line ({tagline.length}/80)</Label>
        <FieldInput
          value={tagline}
          onChange={(e) => setTagline(e.target.value.slice(0, 80))}
          placeholder="Art curator & the most captivating dinner Elite Host"
        />
      </div>
      <div>
        <Label>Bio ({bio.length}/500)</Label>
        <FieldTextarea
          value={bio}
          onChange={(e) => setBio(e.target.value.slice(0, 500))}
          placeholder="Tell clients about yourself — your personality, interests, and the kinds of experiences you host best."
        />
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div>
        <Label>Experience types you offer</Label>
        <ChipSelect
          options={BOOKING_TYPES}
          selected={tags.filter((t) => BOOKING_TYPES.includes(t))}
          onToggle={(v) =>
            setTags((prev) =>
              prev.includes(v) ? prev.filter((t) => t !== v) : [...prev, v]
            )
          }
        />
      </div>
      <div>
        <Label>Additional tags — interests & personality (up to 8)</Label>
        <TagInput
          tags={tags.filter((t) => !BOOKING_TYPES.includes(t))}
          onChange={(newTags) => {
            const bookingTags = tags.filter((t) => BOOKING_TYPES.includes(t));
            setTags([...bookingTags, ...newTags]);
          }}
          placeholder="Art, Fashion, Opera, Tennis…"
        />
      </div>
      <div>
        <Label>Languages spoken</Label>
        <ChipSelect
          options={LANGUAGE_OPTIONS}
          selected={languages}
          onToggle={(v) =>
            setLanguages((prev) =>
              prev.includes(v) ? prev.filter((l) => l !== v) : [...prev, v]
            )
          }
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      {/* Subscriptions */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
        <Toggle checked={subEnabled} onChange={setSubEnabled} label="Enable monthly subscriptions" />
        {subEnabled && (
          <div className="mt-3">
            <Label>Monthly price (min $9.99)</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
              <FieldInput
                type="number"
                value={subPrice}
                onChange={(e) => setSubPrice(e.target.value)}
                min={9.99}
                step={0.01}
                className="pl-7"
                placeholder="19.99"
              />
            </div>
          </div>
        )}
      </div>

      {/* Bookings */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
        <Toggle checked={bookingEnabled} onChange={setBookingEnabled} label="Accept experience bookings" />
        {bookingEnabled && (
          <div className="mt-3">
            <Label>Hourly rate</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
              <FieldInput
                type="number"
                value={bookingRate}
                onChange={(e) => setBookingRate(e.target.value)}
                min={1}
                step={5}
                className="pl-7"
                placeholder="150"
              />
            </div>
          </div>
        )}
      </div>

      {/* Profile unlock */}
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
        <Toggle checked={unlockEnabled} onChange={setUnlockEnabled} label="Charge a profile unlock fee" />
        {unlockEnabled && (
          <div className="mt-3">
            <Label>Unlock fee (min $10)</Label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
              <FieldInput
                type="number"
                value={unlockFee}
                onChange={(e) => setUnlockFee(e.target.value)}
                min={10}
                step={5}
                className="pl-7"
                placeholder="25"
              />
            </div>
          </div>
        )}
      </div>

      {/* Tip menu */}
      <div>
        <Label>Tip menu — optional custom amounts</Label>
        <div className="space-y-2">
          {tipMenu.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              <FieldInput
                value={item.name}
                onChange={(e) => {
                  const next = [...tipMenu];
                  next[i] = { ...item, name: e.target.value };
                  setTipMenu(next);
                }}
                placeholder="Name (e.g. Rose)"
                className="flex-[2]"
              />
              <div className="relative flex-1">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>$</span>
                <FieldInput
                  type="number"
                  value={item.amount}
                  onChange={(e) => {
                    const next = [...tipMenu];
                    next[i] = { ...item, amount: e.target.value };
                    setTipMenu(next);
                  }}
                  className="pl-7"
                  placeholder="20"
                />
              </div>
              <button
                type="button"
                onClick={() => setTipMenu(tipMenu.filter((_, j) => j !== i))}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-[rgba(255,255,255,0.06)] text-muted/40 transition hover:text-red-400"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
          {tipMenu.length < 8 && (
            <button
              type="button"
              onClick={() => setTipMenu([...tipMenu, { name: "", amount: "" }])}
              className="btn-ghost w-full rounded-xl py-2.5 text-xs"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              + Add tip item
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const VISIBILITY_OPTIONS: {
    value: Visibility;
    label: string;
    description: string;
    icon: string;
  }[] = [
    {
      value: "public",
      label: "Public",
      description: "Your full profile is visible to all users",
      icon: "eye",
    },
    {
      value: "locked",
      label: "Locked",
      description: "Clients must request access or pay your unlock fee",
      icon: "lock",
    },
    {
      value: "elite_only",
      label: "Elite Only",
      description: "Only Elite membership clients can see your profile",
      icon: "diamond",
    },
  ];

  const renderStep4 = () => (
    <div className="space-y-5">
      <div className="space-y-3">
        {VISIBILITY_OPTIONS.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => setVisibility(opt.value)}
            className={[
              "flex w-full items-start gap-4 rounded-xl border p-4 text-left transition-all",
              visibility === opt.value
                ? "border-[rgba(212,175,55,0.45)] bg-[rgba(212,175,55,0.07)]"
                : "border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] hover:border-[rgba(212,175,55,0.2)]",
            ].join(" ")}
          >
            <div
              className={[
                "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border",
                visibility === opt.value
                  ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)]"
                  : "border-[rgba(255,255,255,0.08)]",
              ].join(" ")}
            >
              <Icon
                name={opt.icon}
                className={`h-4 w-4 ${visibility === opt.value ? "text-gold" : "text-muted/50"}`}
              />
            </div>
            <div className="flex-1">
              <p
                className={`text-sm font-medium ${visibility === opt.value ? "text-foreground" : "text-muted"}`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {opt.label}
              </p>
              <p className="mt-0.5 text-xs text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {opt.description}
              </p>
            </div>
            {visibility === opt.value && (
              <Icon name="check" className="mt-0.5 h-4 w-4 shrink-0 text-gold" />
            )}
          </button>
        ))}
      </div>
      <div className="rounded-xl border border-[rgba(255,255,255,0.06)] bg-[rgba(255,255,255,0.02)] p-4">
        <Toggle checked={isAvailable} onChange={setIsAvailable} label="Available for bookings now" />
      </div>
    </div>
  );

  const stepConfig: Record<number, { title: string; subtitle: string; render: () => React.ReactNode }> = {
    1: {
      title: "Tell us about yourself",
      subtitle: "This is how clients will discover and remember you.",
      render: renderStep1,
    },
    2: {
      title: "What do you offer?",
      subtitle: "Help clients find you with the right experience types and interests.",
      render: renderStep2,
    },
    3: {
      title: "Set your pricing",
      subtitle: "You keep 80–85% of everything. Enable only what suits you.",
      render: renderStep3,
    },
    4: {
      title: "Visibility & launch",
      subtitle: "Choose who can see your profile and go live.",
      render: renderStep4,
    },
  };

  const current = stepConfig[step];

  const handleNext = () => {
    if (step === 1) saveAndNext(saveCompanionAbout, 2);
    else if (step === 2) saveAndNext(saveCompanionOfferings, 3);
    else if (step === 3) saveAndNext(saveCompanionPricing, 4);
    else if (step === 4) {
      // Final step — save visibility then redirect (action calls redirect internally)
      setError(null);
      startTransition(async () => {
        const fd = buildFormData();
        const result = await saveCompanionVisibility(null, fd);
        if (result?.error) setError(result.error);
        // redirect happens server-side on success
      });
    }
  };

  return (
    <div className="w-full max-w-lg">
      <GlassCard gold className="p-8 md:p-10">
        <ProgressDots step={step} />

        <div className="mb-6">
          <p className="text-xs uppercase tracking-[0.15em] text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Step {step} of {TOTAL_STEPS}
          </p>
          <h1
            className="mt-1 text-3xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {current.title}
          </h1>
          <p className="mt-1.5 text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {current.subtitle}
          </p>
        </div>

        {current.render()}

        {error && <div className="mt-4"><ErrorBanner message={error} /></div>}

        <NavButtons
          step={step}
          onBack={() => { setError(null); setStep(step - 1); }}
          onNext={handleNext}
          isPending={isPending}
          nextLabel={step === TOTAL_STEPS ? "Launch my profile" : undefined}
        />
      </GlassCard>

      <p className="mt-4 text-center text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
        You can update everything from your profile settings later.
      </p>
    </div>
  );
}
