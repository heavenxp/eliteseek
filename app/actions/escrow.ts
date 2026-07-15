"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, getOrigin } from "@/lib/stripe";
import { refundFraction, isCancellationPolicy, DISPUTE_WINDOW_HOURS } from "@/lib/cancellation";
import { notify } from "@/app/actions/notifications";

// ── Phase 4: Stripe-native escrow (separate charges & transfers) ──
// Funds are captured into the platform's Stripe balance at payment and
// transferred to the host only after check-out + the 48h dispute window.
// escrow_status mirrors Stripe state; PaymentIntents/Transfers/Refunds are
// the source of truth.

type EscrowResult = { error?: string; success?: boolean };

// ── Client pays the full amount into escrow (after host accepts) ──
export async function createBookingEscrowCheckout(
  bookingId: string
): Promise<EscrowResult> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payment not configured." };

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, escrow_status, total_amount, booking_type, scheduled_at, companion:companion_profiles!companion_id (display_name)"
    )
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .single();

  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "confirmed") {
    return { error: "The host needs to accept this booking before payment." };
  }
  if (booking.escrow_status !== "unpaid") {
    return { error: "This booking is already paid." };
  }

  const companion = Array.isArray(booking.companion)
    ? booking.companion[0]
    : booking.companion;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Booking — ${companion?.display_name ?? "Elite Host"}`,
            description:
              "Held securely by Stripe until 48 hours after your booking completes.",
          },
          unit_amount: Math.round(booking.total_amount * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: {
      // Groups this charge with the eventual transfer to the host
      transfer_group: bookingId,
    },
    success_url: `${getOrigin()}/payment/success?type=booking&booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getOrigin()}/bookings`,
    metadata: {
      type: "booking_escrow",
      client_id: user.id,
      booking_id: bookingId,
    },
  });

  redirect(session.url!);
}

// ── Host safety flow: check-in / check-out ─────────────────────
async function requireBookingHost(bookingId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { supabase, user: null, booking: null };

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, client_id, status, escrow_status, scheduled_at, duration_hours, checkin_at, checkout_at, total_amount, refunded_amount, companion:companion_profiles!companion_id (id, user_id)"
    )
    .eq("id", bookingId)
    .single();

  const companion = booking
    ? (Array.isArray(booking.companion) ? booking.companion[0] : booking.companion)
    : null;
  if (!booking || companion?.user_id !== user.id) {
    return { supabase, user, booking: null };
  }
  return { supabase, user, booking };
}

export async function checkInBooking(bookingId: string): Promise<EscrowResult> {
  const { supabase, booking } = await requireBookingHost(bookingId);
  if (!booking) return { error: "Booking not found." };
  if (booking.escrow_status !== "held") {
    return { error: "Check-in is available once the booking is paid." };
  }
  if (booking.checkin_at) return { success: true };

  const { error } = await supabase
    .from("bookings")
    .update({ checkin_at: new Date().toISOString() })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  await notify({
    userId: booking.client_id,
    type: "booking_update",
    title: "Your host has checked in",
    body: "Your booking is underway.",
    link: "/bookings",
  });
  revalidatePath("/companion/bookings");
  return { success: true };
}

export async function checkOutBooking(bookingId: string): Promise<EscrowResult> {
  const { supabase, booking } = await requireBookingHost(bookingId);
  if (!booking) return { error: "Booking not found." };
  if (booking.escrow_status !== "held") {
    return { error: "Check-out is available once the booking is paid." };
  }
  if (!booking.checkin_at) {
    return { error: "Check in first — check-out confirms safe completion." };
  }
  if (booking.checkout_at) return { success: true };

  const now = new Date();
  const releaseAt = new Date(now.getTime() + DISPUTE_WINDOW_HOURS * 3600_000);

  const { error } = await supabase
    .from("bookings")
    .update({
      checkout_at: now.toISOString(),
      completed_at: now.toISOString(),
      status: "completed",
      escrow_status: "release_scheduled",
      release_at: releaseAt.toISOString(),
    })
    .eq("id", bookingId)
    .eq("escrow_status", "held");
  if (error) return { error: error.message };

  await notify({
    userId: booking.client_id,
    type: "booking_update",
    title: "Booking completed",
    body: `Payment releases to your host in ${DISPUTE_WINDOW_HOURS} hours. If something went wrong, open a dispute from your bookings before then.`,
    link: "/bookings",
  });
  revalidatePath("/companion/bookings");
  return { success: true };
}

// ── Client dispute within the 48h window ───────────────────────
export async function disputeBooking(
  bookingId: string,
  reason: string
): Promise<EscrowResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };
  if (!reason?.trim()) return { error: "Please describe what went wrong." };

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, escrow_status, release_at")
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .single();
  if (!booking) return { error: "Booking not found." };

  const inWindow =
    booking.escrow_status === "held" ||
    (booking.escrow_status === "release_scheduled" &&
      (!booking.release_at || new Date(booking.release_at) > new Date()));
  if (!inWindow) {
    return { error: "The dispute window for this booking has closed." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      escrow_status: "disputed",
      status: "disputed",
      disputed_at: new Date().toISOString(),
      dispute_reason: reason.trim().slice(0, 2000),
    })
    .eq("id", bookingId)
    .in("escrow_status", ["held", "release_scheduled"]);
  if (error) return { error: error.message };

  // Surface for admins: funds stay held in Stripe until resolution
  const admin = createAdminClient();
  const { data: admins } = await admin.from("profiles").select("id").eq("is_admin", true);
  await Promise.all(
    (admins ?? []).map((a) =>
      notify({
        userId: a.id,
        type: "booking_update",
        title: "Booking dispute opened",
        body: reason.trim().slice(0, 120),
        link: "/admin",
      })
    )
  );
  revalidatePath("/bookings");
  return { success: true };
}

// ── Cancellations ──────────────────────────────────────────────
// Client cancels: refund per the policy snapshot. Host cancels: full refund,
// no penalty, no reason required.
export async function cancelBookingAsClient(bookingId: string): Promise<EscrowResult> {
  const stripe = getStripe();
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, status, escrow_status, scheduled_at, total_amount, cancellation_policy, stripe_payment_intent_id, companion:companion_profiles!companion_id (user_id)"
    )
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .single();
  if (!booking) return { error: "Booking not found." };
  if (!["pending", "confirmed"].includes(booking.status)) {
    return { error: "This booking can no longer be cancelled." };
  }

  const policy = isCancellationPolicy(booking.cancellation_policy)
    ? booking.cancellation_policy
    : "moderate";
  const hoursUntil = (new Date(booking.scheduled_at).getTime() - Date.now()) / 3600_000;
  const fraction = refundFraction(policy, hoursUntil);
  const refundAmount = +(booking.total_amount * fraction).toFixed(2);

  if (booking.escrow_status === "held" && booking.stripe_payment_intent_id && stripe) {
    if (refundAmount > 0) {
      await stripe.refunds.create({
        payment_intent: booking.stripe_payment_intent_id,
        amount: Math.round(refundAmount * 100),
      });
    }
    const remainder = +(booking.total_amount - refundAmount).toFixed(2);
    await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: `Client cancelled (${policy}: ${Math.round(fraction * 100)}% refund)`,
        refunded_amount: refundAmount,
        // Non-refunded remainder is owed to the host — schedule its release
        ...(remainder > 0
          ? {
              escrow_status: "release_scheduled",
              release_at: new Date(Date.now() + DISPUTE_WINDOW_HOURS * 3600_000).toISOString(),
            }
          : { escrow_status: "refunded" }),
      })
      .eq("id", bookingId);
  } else {
    await supabase
      .from("bookings")
      .update({
        status: "cancelled",
        cancelled_at: new Date().toISOString(),
        cancellation_reason: "Client cancelled before payment",
      })
      .eq("id", bookingId);
  }

  const companion = Array.isArray(booking.companion) ? booking.companion[0] : booking.companion;
  if (companion?.user_id) {
    await notify({
      userId: companion.user_id,
      type: "booking_update",
      title: "Booking cancelled by client",
      body:
        booking.escrow_status === "held" && refundAmount < booking.total_amount
          ? "Per your cancellation policy, the non-refunded portion will still be paid out to you."
          : "The booking was cancelled.",
      link: "/companion/bookings",
    });
  }
  revalidatePath("/bookings");
  return { success: true };
}

export async function cancelBookingAsHost(bookingId: string): Promise<EscrowResult> {
  const stripe = getStripe();
  const { supabase, booking } = await requireBookingHost(bookingId);
  if (!booking) return { error: "Booking not found." };
  if (!["pending", "confirmed"].includes(booking.status)) {
    return { error: "This booking can no longer be cancelled." };
  }

  // Hosts can decline/cancel any booking: no penalty, no reason required,
  // client always gets a full refund.
  const { data: full } = await supabase
    .from("bookings")
    .select("stripe_payment_intent_id, total_amount")
    .eq("id", bookingId)
    .single();

  if (booking.escrow_status === "held" && full?.stripe_payment_intent_id && stripe) {
    await stripe.refunds.create({ payment_intent: full.stripe_payment_intent_id });
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      ...(booking.escrow_status === "held"
        ? { escrow_status: "refunded", refunded_amount: full?.total_amount ?? 0 }
        : {}),
    })
    .eq("id", bookingId);
  if (error) return { error: error.message };

  await notify({
    userId: booking.client_id,
    type: "booking_update",
    title: "Booking cancelled by host",
    body:
      booking.escrow_status === "held"
        ? "You've been refunded in full."
        : "The booking was cancelled.",
    link: "/bookings",
  });
  revalidatePath("/companion/bookings");
  return { success: true };
}

// ── Host rates the client after completion ─────────────────────
export async function rateClient(
  bookingId: string,
  rating: number,
  comment: string | null
): Promise<EscrowResult> {
  const { supabase, booking } = await requireBookingHost(bookingId);
  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "completed") {
    return { error: "You can rate a client once the booking is completed." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { error: "Rating must be 1–5." };
  }

  const companion = Array.isArray(booking.companion) ? booking.companion[0] : booking.companion;
  const { error } = await supabase.from("client_reviews").insert({
    booking_id: bookingId,
    companion_id: companion!.id,
    client_id: booking.client_id,
    rating,
    comment: comment?.trim().slice(0, 1000) || null,
  });
  if (error) {
    if (error.code === "23505") return { error: "You've already rated this client." };
    return { error: error.message };
  }
  revalidatePath("/companion/bookings");
  return { success: true };
}

// ── Client rating summary, shown to hosts BEFORE accepting ─────
export async function getClientRating(
  clientId: string
): Promise<{ average: number | null; count: number }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("client_reviews")
    .select("rating")
    .eq("client_id", clientId);

  const ratings = (data ?? []).map((r) => r.rating);
  if (ratings.length === 0) return { average: null, count: 0 };
  return {
    average: +(ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1),
    count: ratings.length,
  };
}
