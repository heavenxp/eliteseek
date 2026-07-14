import Link from "next/link";
import { Icon } from "@/components/icons";
import type { IdentityStatus } from "@/lib/database.types";

// Shown to a host on their own profile while it is not yet live.
export function VerifyIdentityBanner({ status }: { status: IdentityStatus }) {
  const copy =
    status === "pending"
      ? {
          title: "Verification in progress",
          body: "We're reviewing your ID. Your profile goes live the moment it clears — usually within minutes.",
          cta: "Check status",
        }
      : status === "failed"
        ? {
            title: "Verification needs another try",
            body: "Your last attempt couldn't be completed. Retry with a clear photo of your ID to take your profile live.",
            cta: "Retry verification",
          }
        : {
            title: "Your profile isn't live yet",
            body: "Only you can see this page. Verify your identity to go live — every EliteSeek host is ID-verified before clients can find them.",
            cta: "Verify your identity",
          };

  return (
    <div className="sticky top-0 z-30 border-b border-[rgba(212,175,55,0.25)] bg-[rgba(8,8,16,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between md:px-6">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.35)] bg-[rgba(212,175,55,0.1)]">
            <Icon name="shield" className="h-4 w-4 text-gold" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {copy.title}
            </p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {copy.body}
            </p>
          </div>
        </div>
        <Link
          href="/companion/verification"
          className="btn-gold shrink-0 self-start rounded-full px-4 py-2 text-xs sm:self-center"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {copy.cta}
        </Link>
      </div>
    </div>
  );
}
