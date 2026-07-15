import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import { Icon } from "@/components/icons";

const COPY = {
  unlock: {
    title: "Profile Unlocked",
    body: "You now have full access to this host's profile.",
    cta: "View Profile",
  },
  ppv: {
    title: "Content Unlocked",
    body: "Enjoy your exclusive content.",
    cta: "Browse Content",
  },
  subscription: {
    title: "Subscription Active",
    body: "You're now subscribed. Enjoy exclusive content from this host.",
    cta: "Browse Content",
  },
  booking: {
    title: "Deposit Paid",
    body: "Your booking request has been sent. You'll be notified once the host responds.",
    cta: "My Bookings",
  },
} as const;

type PaymentType = keyof typeof COPY;

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{
    type?: string;
    session_id?: string;
    companion_id?: string;
    post_id?: string;
    booking_id?: string;
  }>;
}) {
  const params = await searchParams;
  const { type, session_id, companion_id, post_id, booking_id } = params;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Verify the Stripe session (belt-and-suspenders on top of the webhook)
  const stripe = getStripe();
  if (stripe && session_id) {
    const session = await stripe.checkout.sessions.retrieve(session_id);
    if (session.payment_status === "paid" || session.status === "complete") {
      // Webhook should have already processed this — no need to duplicate
    }
  }

  const paymentType = (type as PaymentType) ?? "unlock";
  const copy = COPY[paymentType] ?? COPY.unlock;

  let ctaHref =
    paymentType === "booking"
      ? "/bookings"
      : paymentType !== "unlock"
        ? "/content"
        : companion_id
          ? `/companion/${companion_id}`
          : "/browse";

  if (paymentType === "unlock" && companion_id) {
    const { data: cp } = await supabase
      .from("host_profiles")
      .select("username")
      .eq("id", companion_id)
      .maybeSingle();
    if (cp?.username) ctaHref = `/profile/${cp.username}`;
  }

  return (
    <div className="page-bg flex min-h-screen items-center justify-center px-4">
      <div className="glass-card w-full max-w-sm rounded-2xl p-8 text-center">
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-full border border-white/20 bg-white/[0.04]">
          <Icon name="check" className="h-7 w-7 text-gold" />
        </div>

        <h1
          className="text-2xl font-light text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          {copy.title}
        </h1>
        <p
          className="mt-2 text-sm text-muted/60"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {copy.body}
        </p>

        <div className="mt-6 flex flex-col gap-3">
          <Link
            href={ctaHref}
            className="btn-gold w-full rounded-xl px-5 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {copy.cta}
          </Link>
          <Link
            href="/browse"
            className="btn-ghost w-full rounded-xl px-5 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Browse hosts
          </Link>
        </div>
      </div>
    </div>
  );
}
