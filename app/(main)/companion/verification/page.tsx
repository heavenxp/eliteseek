import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, stripeConfigured } from "@/lib/stripe";
import { Icon } from "@/components/icons";
import type { IdentityStatus } from "@/lib/database.types";

export const metadata = {
  title: "Verification Centre — EliteSeek",
  description: "Verify your identity to take your host profile live.",
};

const STEPS = [
  {
    icon: "camera" as const,
    title: "Photograph your ID",
    body: "A government-issued photo ID — passport, driver licence, or national ID card.",
  },
  {
    icon: "user" as const,
    title: "Take a quick selfie",
    body: "Stripe matches it to your document. It takes under a minute.",
  },
  {
    icon: "shield" as const,
    title: "Your profile goes live",
    body: "The Verified badge appears on your profile and clients can find you.",
  },
];

export default async function VerificationCentrePage({
  searchParams,
}: {
  searchParams: Promise<{ complete?: string }>;
}) {
  await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select(
      "id, display_name, username, verification_tier, identity_status, stripe_identity_session_id, identity_verified_at"
    )
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");

  let status = (companion.identity_status ?? "unverified") as IdentityStatus;
  let verifiedAt = companion.identity_verified_at;

  // Sync with Stripe when a session is in flight — covers webhook lag so a
  // host returning from the hosted flow sees the outcome immediately.
  const stripe = getStripe();
  if (stripe && status === "pending" && companion.stripe_identity_session_id) {
    try {
      const session = await stripe.identity.verificationSessions.retrieve(
        companion.stripe_identity_session_id
      );
      if (session.status === "verified") {
        status = "verified";
        verifiedAt = new Date().toISOString();
        const admin = createAdminClient();
        await admin
          .from("companion_profiles")
          .update({
            identity_status: "verified",
            identity_verified_at: verifiedAt,
            ...(companion.verification_tier === "unverified"
              ? { verification_tier: "verified" }
              : {}),
          })
          .eq("id", companion.id);
        await admin.from("profiles").update({ kyc_status: "verified" }).eq("id", user.id);
      } else if (session.status === "requires_input" && session.last_error) {
        status = "failed";
        const admin = createAdminClient();
        await admin
          .from("companion_profiles")
          .update({ identity_status: "failed" })
          .eq("id", companion.id);
        await admin.from("profiles").update({ kyc_status: "failed" }).eq("id", user.id);
      }
    } catch {
      // Leave local status untouched if Stripe is unreachable
    }
  }

  const isVerified = status === "verified" || companion.verification_tier !== "unverified";

  return (
    <div className="page-bg radial-glow min-h-screen">
      <div className="mx-auto max-w-2xl px-4 py-10 md:px-6 md:py-16">
        {/* Header */}
        <div className="mb-10 text-center">
          <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-white/[0.04]">
            <Icon name="shield" className="h-7 w-7 text-gold" />
          </div>
          <h1
            className="text-4xl font-light text-foreground md:text-5xl"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Verification Centre
          </h1>
          <p
            className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-muted"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Every EliteSeek host is ID-verified before going live. It&apos;s what makes
            this the platform where everyone&apos;s real — and everyone&apos;s safe.
          </p>
        </div>

        {/* Status card */}
        {isVerified ? (
          <div className="glass-gold gold-glow rounded-3xl p-8 text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-white/[0.07]">
              <Icon name="check" className="h-6 w-6 text-gold" />
            </div>
            <h2 className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              You&apos;re verified
            </h2>
            <p className="mt-2 text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {verifiedAt
                ? `Identity confirmed ${new Date(verifiedAt).toLocaleDateString("en-AU", { day: "numeric", month: "long", year: "numeric" })}. `
                : ""}
              Your profile is live and carries the Verified badge.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link
                href={`/profile/${companion.username ?? ""}`}
                className="btn-gold rounded-full px-6 py-2.5 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                View your profile
              </Link>
            </div>
          </div>
        ) : (
          <div className="glass-card rounded-3xl p-8">
            {/* State line */}
            {status === "pending" && (
              <div className="mb-6 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-60" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-gold" />
                </span>
                <p className="text-sm text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Verification in progress — this usually clears within minutes.
                  Refresh to check.
                </p>
              </div>
            )}
            {status === "failed" && (
              <div className="mb-6 flex items-start gap-3 rounded-2xl border border-[rgba(229,72,77,0.3)] bg-[rgba(229,72,77,0.06)] px-4 py-3">
                <Icon name="x" className="mt-0.5 h-4 w-4 shrink-0 text-[#e5484d]" />
                <p className="text-sm leading-relaxed text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Your last attempt couldn&apos;t be completed — usually a blurry photo
                  or document mismatch. You can retry right where you left off.
                </p>
              </div>
            )}

            {/* Steps */}
            <ol className="space-y-5">
              {STEPS.map((step, i) => (
                <li key={step.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-white/[0.04]">
                    <Icon name={step.icon} className="h-5 w-5 text-gold" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      <span className="mr-2 text-muted/40">{i + 1}</span>
                      {step.title}
                    </p>
                    <p className="mt-1 text-sm leading-relaxed text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      {step.body}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            <div className="gold-divider my-7" />

            {/* CTA */}
            {stripeConfigured() ? (
              <a
                href="/api/stripe/identity/start"
                className="btn-gold block w-full rounded-2xl py-3.5 text-center text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {status === "pending"
                  ? "Continue verification"
                  : status === "failed"
                    ? "Retry verification"
                    : "Verify your identity"}
              </a>
            ) : (
              <p className="text-center text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Verification isn&apos;t available right now. Please try again later.
              </p>
            )}

            <p className="mt-4 text-center text-xs leading-relaxed text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Verification is handled end-to-end by Stripe Identity.
              EliteSeek never sees or stores your documents.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
