"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe, getOrigin } from "@/lib/stripe";
import { calculateFees } from "@/lib/database.types";

export type StripeResult = { error: string } | null;

// ── Profile unlock ────────────────────────────────────────────

export async function createUnlockCheckout(
  companionId: string
): Promise<StripeResult> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payment not configured — add STRIPE_SECRET_KEY." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("display_name, profile_unlock_fee, username")
    .eq("id", companionId)
    .single();

  if (!companion?.profile_unlock_fee) {
    return { error: "Profile not available for unlock." };
  }

  const cancelUrl = companion.username
    ? `${getOrigin()}/@${companion.username}`
    : `${getOrigin()}/companion/${companionId}`;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Unlock ${companion.display_name ?? "Elite Host"}'s Profile`,
          },
          unit_amount: Math.round(companion.profile_unlock_fee * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${getOrigin()}/payment/success?type=unlock&companion_id=${companionId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    metadata: {
      type: "unlock",
      client_id: user.id,
      companion_id: companionId,
    },
  });

  redirect(session.url!);
}

// ── PPV content purchase ──────────────────────────────────────

export async function createPpvCheckout(postId: string): Promise<StripeResult> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payment not configured — add STRIPE_SECRET_KEY." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: post } = await supabase
    .from("content_posts")
    .select(
      "id, ppv_price, title, companion:companion_profiles!companion_id (display_name)"
    )
    .eq("id", postId)
    .single();

  if (!post?.ppv_price) return { error: "Post not available for purchase." };

  const companion = Array.isArray(post.companion)
    ? post.companion[0]
    : post.companion;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name:
              post.title ??
              `Exclusive content from ${companion?.display_name ?? "Elite Host"}`,
          },
          unit_amount: Math.round(post.ppv_price * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${getOrigin()}/payment/success?type=ppv&post_id=${postId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getOrigin()}/content`,
    metadata: {
      type: "ppv",
      client_id: user.id,
      post_id: postId,
    },
  });

  redirect(session.url!);
}

// ── Subscription ──────────────────────────────────────────────

export async function createSubscriptionCheckout(
  companionId: string
): Promise<StripeResult> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payment not configured — add STRIPE_SECRET_KEY." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("display_name, subscription_price, username")
    .eq("id", companionId)
    .single();

  if (!companion?.subscription_price) {
    return { error: "This host is not accepting subscriptions." };
  }

  // Create a recurring price on the fly
  const price = await stripe.prices.create({
    currency: "usd",
    unit_amount: Math.round(companion.subscription_price * 100),
    recurring: { interval: "month" },
    product_data: {
      name: `Monthly subscription to ${companion.display_name ?? "Elite Host"}`,
    },
  });

  const cancelUrl = companion.username
    ? `${getOrigin()}/@${companion.username}`
    : `${getOrigin()}/companion/${companionId}`;

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: price.id, quantity: 1 }],
    success_url: `${getOrigin()}/payment/success?type=subscription&companion_id=${companionId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: cancelUrl,
    subscription_data: {
      metadata: {
        type: "subscription",
        client_id: user.id,
        companion_id: companionId,
      },
    },
    metadata: {
      type: "subscription",
      client_id: user.id,
      companion_id: companionId,
    },
  });

  redirect(session.url!);
}

// ── Booking deposit ───────────────────────────────────────────

export async function createBookingDepositCheckout(
  bookingId: string
): Promise<StripeResult> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payment not configured — add STRIPE_SECRET_KEY." };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated." };

  const { data: booking } = await supabase
    .from("bookings")
    .select(
      "id, total_amount, booking_type, companion:companion_profiles!companion_id (display_name)"
    )
    .eq("id", bookingId)
    .eq("client_id", user.id)
    .single();

  if (!booking) return { error: "Booking not found." };

  const companion = Array.isArray(booking.companion)
    ? booking.companion[0]
    : booking.companion;

  // Charge 15% deposit now
  const { platformFee: depositAmount } = calculateFees(
    "booking",
    booking.total_amount
  );

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Booking deposit — ${companion?.display_name ?? "Elite Host"}`,
            description: `15% deposit for ${booking.booking_type} booking. Balance collected on confirmation.`,
          },
          unit_amount: Math.round(depositAmount * 100),
        },
        quantity: 1,
      },
    ],
    success_url: `${getOrigin()}/payment/success?type=booking&booking_id=${bookingId}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getOrigin()}/bookings`,
    metadata: {
      type: "booking",
      client_id: user.id,
      booking_id: bookingId,
    },
  });

  redirect(session.url!);
}
