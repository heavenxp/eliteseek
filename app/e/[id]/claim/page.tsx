import Link from "next/link";
import { redirect } from "next/navigation";
import { claimGuestTicket } from "@/app/actions/guest-tickets";
import { Icon } from "@/components/icons";

export const metadata = { title: "Claim your ticket — EliteSeek" };

// Success URL of the guest checkout: payment is done, account comes last.
// Revisitable — the claim verifies against Stripe every time.
export default async function ClaimPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { id } = await params;
  const { session_id } = await searchParams;
  if (!session_id) redirect(`/e/${id}`);

  const result = await claimGuestTicket(session_id);

  if (result.status === "claimed") {
    redirect(`/events/${result.eventId}?joined=1`);
  }

  const claimUrl = `/e/${id}/claim?session_id=${encodeURIComponent(session_id)}`;

  return (
    <div className="page-bg flex min-h-screen flex-col">
      <header className="px-6 pt-6">
        <Link href="/login" className="inline-flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.04]">
            <Icon name="diamond" className="h-3.5 w-3.5 text-gold" />
          </div>
          <span className="text-base tracking-[0.12em] text-foreground/80" style={{ fontFamily: "var(--font-cormorant)" }}>
            ELITESEEK
          </span>
        </Link>
      </header>

      <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center px-4 py-12 text-center">
        {result.status === "needs_auth" ? (
          <>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10">
              <Icon name="check" className="h-7 w-7 text-emerald-400" />
            </div>
            <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              Payment received
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Your ticket is reserved{result.email ? <> under <span className="text-foreground/85">{result.email}</span></> : null}.
              Create your account with that email to claim it — takes about a minute,
              and it&apos;s how everyone in the room stays verified.
            </p>
            <div className="mt-7 flex w-full flex-col gap-2.5">
              <Link
                href={`/signup?next=${encodeURIComponent(claimUrl)}`}
                className="btn-gold w-full rounded-2xl py-3.5 text-sm font-semibold"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Create account &amp; claim ticket
              </Link>
              <Link
                href={`/login?next=${encodeURIComponent(claimUrl)}`}
                className="btn-ghost w-full rounded-2xl py-3.5 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                I already have an account
              </Link>
            </div>
          </>
        ) : result.status === "email_mismatch" ? (
          <>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-amber-500/30 bg-amber-500/10">
              <Icon name="shield" className="h-7 w-7 text-amber-400" />
            </div>
            <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              Different email
            </h1>
            <p className="mt-3 text-sm leading-relaxed text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
              This ticket was paid for{result.sessionEmail ? <> under <span className="text-foreground/85">{result.sessionEmail}</span></> : " under a different email"},
              but you&apos;re signed in with a different address. Sign in with the
              purchase email to claim it.
            </p>
            <Link
              href={`/login?next=${encodeURIComponent(claimUrl)}`}
              className="btn-gold mt-7 w-full rounded-2xl py-3.5 text-sm font-semibold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Switch account
            </Link>
          </>
        ) : (
          <>
            <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10">
              <Icon name="x" className="h-7 w-7 text-red-400" />
            </div>
            <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              Something went wrong
            </h1>
            <p className="mt-3 text-sm text-muted" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {result.message}
            </p>
            <Link
              href={`/e/${id}`}
              className="btn-ghost mt-7 rounded-2xl px-6 py-3 text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Back to the event
            </Link>
          </>
        )}
      </main>

      <footer className="px-6 pb-8 text-center">
        <p className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          © 2026 EliteSeek Pty Ltd · All hosts are age-verified (18+) under the Australian Online Safety Act.
        </p>
      </footer>
    </div>
  );
}
