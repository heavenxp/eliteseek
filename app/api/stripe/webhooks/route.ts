import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFees } from "@/lib/database.types";

// Stripe requires the raw request body for signature verification.
// This route must NOT use the default body parser.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const stripe = getStripe();
  if (!stripe) {
    return NextResponse.json({ error: "Stripe not configured" }, { status: 503 });
  }

  const body = await req.text();
  const sig = req.headers.get("stripe-signature");

  if (!sig || !process.env.STRIPE_WEBHOOK_SECRET) {
    return NextResponse.json(
      { error: "Missing signature or webhook secret" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch {
    return NextResponse.json(
      { error: "Webhook signature verification failed" },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        await handleCheckoutCompleted(supabase, stripe, session);
        break;
      }
      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        await handleInvoiceSucceeded(supabase, invoice);
        break;
      }
      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        await handleSubscriptionCancelled(supabase, sub);
        break;
      }
      case "identity.verification_session.verified": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await handleIdentityVerified(supabase, session);
        break;
      }
      case "identity.verification_session.requires_input": {
        const session = event.data.object as Stripe.Identity.VerificationSession;
        await handleIdentityRequiresInput(supabase, session);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Handler failed" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}

// ── Handlers ──────────────────────────────────────────────────

async function handleCheckoutCompleted(
  supabase: ReturnType<typeof createAdminClient>,
  stripe: Stripe,
  session: Stripe.Checkout.Session
) {
  const meta = session.metadata ?? {};
  const type = meta.type;

  if (!type) return;

  // Expand line_items for amount
  const amount = (session.amount_total ?? 0) / 100;

  switch (type) {
    case "unlock": {
      const { client_id, companion_id } = meta;
      if (!client_id || !companion_id) return;

      const { platformFee, netAmount } = calculateFees("profile_unlock", amount);

      await Promise.all([
        supabase.from("profile_unlocks").upsert(
          {
            client_id,
            companion_id,
            amount_paid: amount,
            stripe_payment_intent_id: session.payment_intent as string,
          },
          { onConflict: "client_id,companion_id" }
        ),
        supabase.from("transactions").insert({
          type: "profile_unlock",
          from_user_id: client_id,
          gross_amount: amount,
          platform_fee: platformFee,
          net_amount: netAmount,
          stripe_payment_intent_id: session.payment_intent as string,
          status: "completed",
          reference_id: companion_id,
          reference_type: "companion_profile",
        }),
      ]);
      break;
    }

    case "ppv": {
      const { client_id, post_id } = meta;
      if (!client_id || !post_id) return;

      const { platformFee, netAmount } = calculateFees("ppv", amount);

      await Promise.all([
        supabase.from("content_purchases").upsert(
          {
            client_id,
            post_id,
            amount_paid: amount,
            stripe_payment_intent_id: session.payment_intent as string,
          },
          { onConflict: "client_id,post_id" }
        ),
        supabase.from("transactions").insert({
          type: "ppv",
          from_user_id: client_id,
          gross_amount: amount,
          platform_fee: platformFee,
          net_amount: netAmount,
          stripe_payment_intent_id: session.payment_intent as string,
          status: "completed",
          reference_id: post_id,
          reference_type: "content_post",
        }),
      ]);
      break;
    }

    case "booking_escrow": {
      const { client_id, booking_id } = meta;
      if (!client_id || !booking_id) return;

      // Full amount now held by Stripe in the platform balance; the transfer
      // to the host happens after check-out + 48h (see /api/cron/escrow).
      await supabase
        .from("bookings")
        .update({
          escrow_status: "held",
          paid_at: new Date().toISOString(),
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", booking_id)
        .eq("escrow_status", "unpaid");

      const { data: bookingRow } = await supabase
        .from("bookings")
        .select("companion_id, scheduled_at")
        .eq("id", booking_id)
        .single();
      if (bookingRow) {
        const { data: cp } = await supabase
          .from("companion_profiles")
          .select("user_id")
          .eq("id", bookingRow.companion_id)
          .single();
        if (cp) {
          const dateStr = new Date(bookingRow.scheduled_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
          });
          await supabase.from("notifications").insert({
            user_id: cp.user_id,
            type: "booking_update",
            title: "Booking paid — funds secured",
            body: `The ${dateStr} booking is fully paid. Funds are held by Stripe and release 48h after completion.`,
            data: { booking_id },
          });
        }
      }
      break;
    }

    case "booking": {
      const { client_id, booking_id } = meta;
      if (!client_id || !booking_id) return;

      await supabase
        .from("bookings")
        .update({
          stripe_payment_intent_id: session.payment_intent as string,
        })
        .eq("id", booking_id);

      await supabase.from("transactions").insert({
        type: "booking",
        from_user_id: client_id,
        gross_amount: amount,
        platform_fee: amount, // deposit = platform fee
        net_amount: 0,
        stripe_payment_intent_id: session.payment_intent as string,
        status: "completed",
        reference_id: booking_id,
        reference_type: "booking",
        metadata: { is_deposit: true },
      });

      // Notify the companion now that the deposit is confirmed
      const { data: bookingRow } = await supabase
        .from("bookings")
        .select("companion_id, scheduled_at")
        .eq("id", booking_id)
        .single();

      if (bookingRow) {
        const { data: cp } = await supabase
          .from("companion_profiles")
          .select("user_id")
          .eq("id", bookingRow.companion_id)
          .single();

        if (cp) {
          const dateStr = new Date(bookingRow.scheduled_at).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "long",
          });
          await supabase.from("notifications").insert({
            user_id: cp.user_id,
            type: "booking_request",
            title: "New booking request",
            body: `You have a new booking request for ${dateStr}.`,
            data: { booking_id },
          });
        }
      }
      break;
    }

    case "subscription": {
      // Subscription mode — the actual subscription record is handled via
      // invoice.payment_succeeded for renewals. For the initial payment,
      // treat it like a first invoice.
      const { client_id, companion_id } = meta;
      if (!client_id || !companion_id) return;

      const { platformFee, netAmount } = calculateFees("subscription", amount);

      const now = new Date();
      const periodEnd = new Date(now);
      periodEnd.setDate(periodEnd.getDate() + 30);

      await Promise.all([
        supabase.from("subscriptions").upsert(
          {
            client_id,
            companion_id,
            status: "active",
            price_per_month: amount,
            current_period_start: now.toISOString(),
            current_period_end: periodEnd.toISOString(),
            stripe_subscription_id: session.subscription as string,
          },
          { onConflict: "client_id,companion_id" }
        ),
        supabase.from("transactions").insert({
          type: "subscription",
          from_user_id: client_id,
          gross_amount: amount,
          platform_fee: platformFee,
          net_amount: netAmount,
          status: "completed",
          reference_id: companion_id,
          reference_type: "companion_profile",
          metadata: { stripe_subscription_id: session.subscription },
        }),
      ]);
      break;
    }
  }
}

async function handleInvoiceSucceeded(
  supabase: ReturnType<typeof createAdminClient>,
  invoice: Stripe.Invoice
) {
  // The subscription field exists at runtime; the TS type varies by API version
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const subId = (invoice as any).subscription as string | null;
  if (!subId) return;

  // Renew subscription period
  const periodEnd = new Date();
  periodEnd.setDate(periodEnd.getDate() + 30);

  await supabase
    .from("subscriptions")
    .update({
      status: "active",
      current_period_start: new Date().toISOString(),
      current_period_end: periodEnd.toISOString(),
    })
    .eq("stripe_subscription_id", subId);
}

async function handleSubscriptionCancelled(
  supabase: ReturnType<typeof createAdminClient>,
  sub: Stripe.Subscription
) {
  await supabase
    .from("subscriptions")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("stripe_subscription_id", sub.id);
}

// ── Identity (host KYC) ───────────────────────────────────────

async function handleIdentityVerified(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Identity.VerificationSession
) {
  const companionId = session.metadata?.companion_id;

  // Client sessions carry user_id but no companion_id — for those, only
  // profiles.kyc_status (the client-side truth for booking) is updated.
  if (!companionId) {
    const userId = session.metadata?.user_id;
    const clientMatch = userId
      ? { column: "id", value: userId }
      : { column: "kyc_session_id", value: session.id };
    await supabase
      .from("profiles")
      .update({ kyc_status: "verified" })
      .eq(clientMatch.column, clientMatch.value);
    return;
  }

  // Prefer metadata; fall back to session-id lookup for sessions created
  // outside the app (e.g. dashboard-initiated re-verification).
  const match = companionId
    ? { column: "id", value: companionId }
    : { column: "stripe_identity_session_id", value: session.id };

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id, user_id, verification_tier")
    .eq(match.column, match.value)
    .single();
  if (!companion) return;

  // Single statement — identity_status and the visibility-gating
  // verification_tier can never diverge from this write.
  await supabase
    .from("companion_profiles")
    .update({
      identity_status: "verified",
      identity_verified_at: new Date().toISOString(),
      // Promote the public badge unless the host is already Select
      ...(companion.verification_tier === "unverified"
        ? { verification_tier: "verified" }
        : {}),
    })
    .eq("id", companion.id);

  // Mirror into the admin-facing profiles.kyc_status (display only, never
  // gates visibility — verification_tier is the source of truth for that).
  await supabase
    .from("profiles")
    .update({ kyc_status: "verified" })
    .eq("id", companion.user_id);
}

async function handleIdentityRequiresInput(
  supabase: ReturnType<typeof createAdminClient>,
  session: Stripe.Identity.VerificationSession
) {
  const companionId = session.metadata?.companion_id;

  // Client sessions: mark profiles.kyc_status failed (retryable) only
  if (!companionId) {
    const userId = session.metadata?.user_id;
    const clientMatch = userId
      ? { column: "id", value: userId }
      : { column: "kyc_session_id", value: session.id };
    await supabase
      .from("profiles")
      .update({ kyc_status: "failed" })
      .eq(clientMatch.column, clientMatch.value)
      .neq("kyc_status", "verified");
    return;
  }

  const match = { column: "id", value: companionId };

  // requires_input = the last check failed (blurry document, mismatch, …).
  // The host can retry from the verification page, which resumes the session.
  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id, user_id, identity_status")
    .eq(match.column, match.value)
    .single();
  if (!companion || companion.identity_status === "verified") return;

  await supabase
    .from("companion_profiles")
    .update({ identity_status: "failed" })
    .eq("id", companion.id);

  await supabase
    .from("profiles")
    .update({ kyc_status: "failed" })
    .eq("id", companion.user_id);
}
