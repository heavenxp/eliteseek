"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signUp, signInWithGoogle, type AuthState } from "@/app/actions/auth";
import { GlassCard } from "@/components/ui/glass-card";
import { Icon } from "@/components/icons";

type Role = "client" | "companion";

export function SignupForm() {
  const [role, setRole] = useState<Role>("client");
  const [state, formAction, isPending] = useActionState<AuthState, FormData>(signUp, null);

  return (
    <div className="w-full max-w-md">
      <GlassCard gold className="p-8 md:p-10">
        {/* Header */}
        <div className="mb-8 text-center">
          <h1
            className="text-4xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Join EliteSeek
          </h1>
          <p className="mt-2 text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Create your account to get started
          </p>
        </div>

        {/* Confirmed state */}
        {state?.message ? (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
              <Icon name="check" className="h-8 w-8 text-gold" />
            </div>
            <p
              className="text-xl font-light text-foreground"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Almost there
            </p>
            <p className="text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {state.message}
            </p>
            <Link
              href="/login"
              className="btn-ghost mt-2 block rounded-xl py-3 text-center text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Back to Sign In
            </Link>
          </div>
        ) : (
          <>
            {/* Role selector */}
            <div className="mb-6">
              <p
                className="mb-3 text-xs text-muted/70"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                I want to join as a…
              </p>
              <div className="grid grid-cols-2 gap-3">
                <RoleCard
                  value="client"
                  selected={role === "client"}
                  onSelect={() => setRole("client")}
                  icon="diamond"
                  title="Client"
                  description="Discover & book Elite Hosts"
                />
                <RoleCard
                  value="companion"
                  selected={role === "companion"}
                  onSelect={() => setRole("companion")}
                  icon="star"
                  title="Elite Host"
                  description="Share experiences & earn"
                />
              </div>
            </div>

            {/* Google OAuth */}
            <form action={signInWithGoogle}>
              <button
                type="submit"
                className="btn-ghost flex w-full items-center justify-center gap-3 rounded-xl py-3 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                <GoogleIcon />
                Continue with Google
              </button>
            </form>

            {/* Divider */}
            <div className="my-5 flex items-center gap-4">
              <div className="gold-divider flex-1" />
              <span className="text-xs text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                or
              </span>
              <div className="gold-divider flex-1" />
            </div>

            {/* Form */}
            <form action={formAction} className="space-y-4">
              <input type="hidden" name="role" value={role} />

              <div>
                <label
                  htmlFor="full_name"
                  className="mb-1.5 block text-xs text-muted/80"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Full name
                </label>
                <input
                  id="full_name"
                  name="full_name"
                  type="text"
                  autoComplete="name"
                  required
                  placeholder="Your full name"
                  className="auth-input"
                />
              </div>

              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs text-muted/80"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="you@example.com"
                  className="auth-input"
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs text-muted/80"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  minLength={8}
                  placeholder="Min. 8 characters"
                  className="auth-input"
                />
              </div>

              {state?.error && (
                <div className="flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3">
                  <Icon name="shield" className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <p className="text-sm text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    {state.error}
                  </p>
                </div>
              )}

              <button
                type="submit"
                disabled={isPending}
                className="btn-gold mt-2 w-full rounded-xl py-3 text-sm disabled:opacity-60"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {isPending ? "Creating account…" : `Join as ${role === "client" ? "Client" : "Elite Host"}`}
              </button>
            </form>

            {/* Footer */}
            <p
              className="mt-6 text-center text-sm text-muted"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Already have an account?{" "}
              <Link href="/login" className="text-gold transition hover:text-gold-light">
                Sign in
              </Link>
            </p>
          </>
        )}
      </GlassCard>

      <p
        className="mt-6 text-center text-xs text-muted/40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        By creating an account you agree to our{" "}
        <Link href="#" className="underline underline-offset-2 hover:text-muted/70">
          Terms
        </Link>
        . You must be 18+ to use EliteSeek.
      </p>
    </div>
  );
}

function RoleCard({
  value,
  selected,
  onSelect,
  icon,
  title,
  description,
}: {
  value: Role;
  selected: boolean;
  onSelect: () => void;
  icon: string;
  title: string;
  description: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={[
        "relative flex flex-col items-center gap-2 rounded-xl border px-4 py-4 text-center transition-all duration-200",
        selected
          ? "border-white/20 bg-white/[0.04] shadow-[0_0_20px_rgba(212,175,55,0.1)]"
          : "border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.02)] hover:border-white/20 hover:bg-white/[0.04]",
      ].join(" ")}
    >
      {selected && (
        <span className="absolute right-2 top-2 flex h-4 w-4 items-center justify-center rounded-full bg-[#d4af37]">
          <Icon name="check" className="h-2.5 w-2.5 text-[#080810]" />
        </span>
      )}
      <div
        className={[
          "flex h-9 w-9 items-center justify-center rounded-full border transition-colors",
          selected
            ? "border-white/20 bg-white/[0.07]"
            : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)]",
        ].join(" ")}
      >
        <Icon
          name={icon}
          className={`h-4 w-4 ${selected ? "text-gold" : "text-muted"}`}
        />
      </div>
      <div>
        <p
          className={`text-sm font-medium ${selected ? "text-foreground" : "text-muted"}`}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {title}
        </p>
        <p
          className="mt-0.5 text-[11px] text-muted/60 leading-tight"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {description}
        </p>
      </div>
    </button>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335" />
    </svg>
  );
}
