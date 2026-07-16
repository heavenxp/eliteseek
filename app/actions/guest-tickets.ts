"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getStripe, getOrigin } from "@/lib/stripe";

// ── Public share page: join-first flow (PIVOT §2 growth loop) ──
// Guests pay BEFORE creating an account. Stripe collects their email at
// checkout; the claim step (post-signup) verifies the session against
// Stripe directly — paid, right event, email matches, not yet claimed —
// so no pending-ticket state exists in our DB.

export async function createGuestTicketCheckout(eventId: string): Promise<{ error?: string }> {
  const stripe = getStripe();
  if (!stripe) return { error: "Payment isn't configured yet." };

  const admin = createAdminClient();
  const { data: ev } = await admin
    .from("events")
    .select("id, title, price, capacity, visibility, date, end_time")
    .eq("id", eventId)
    .single();
  if (!ev || ev.visibility !== "public" || Number(ev.price) <= 0) {
    return { error: "Event not found." };
  }
  if (new Date(`${ev.date}T${ev.end_time}`) < new Date()) {
    return { error: "This event has ended." };
  }
  if (ev.capacity !== null) {
    const { count } = await admin
      .from("event_members")
      .select("*", { count: "exact", head: true })
      .eq("event_id", eventId);
    if ((count ?? 0) >= ev.capacity) return { error: "This event is sold out." };
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Ticket — ${ev.title}`,
            description: "Held securely by Stripe until 48 hours after the event ends.",
          },
          unit_amount: Math.round(Number(ev.price) * 100),
        },
        quantity: 1,
      },
    ],
    payment_intent_data: { transfer_group: `event_${eventId}` },
    success_url: `${getOrigin()}/e/${eventId}/claim?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${getOrigin()}/e/${eventId}`,
    metadata: {
      type: "event_ticket_guest",
      event_id: eventId,
    },
  });

  redirect(session.url!);
}

export type ClaimResult =
  | { status: "claimed"; eventId: string }
  | { status: "needs_auth"; email: string | null }
  | { status: "email_mismatch"; sessionEmail: string | null }
  | { status: "error"; message: string };

export async function claimGuestTicket(sessionId: string): Promise<ClaimResult> {
  const stripe = getStripe();
  if (!stripe) return { status: "error", message: "Payment isn't configured." };
  if (!sessionId || !/^cs_[a-zA-Z0-9_]+$/.test(sessionId)) {
    return { status: "error", message: "Invalid session." };
  }

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId);
  } catch {
    return { status: "error", message: "We couldn't find that payment." };
  }

  if (session.metadata?.type !== "event_ticket_guest" || !session.metadata.event_id) {
    return { status: "error", message: "That payment isn't a guest ticket." };
  }
  if (session.payment_status !== "paid") {
    return { status: "error", message: "This payment hasn't completed." };
  }

  const eventId = session.metadata.event_id;
  const sessionEmail = session.customer_details?.email ?? null;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { status: "needs_auth", email: sessionEmail };

  // The Checkout email must match the account claiming it — a shared claim
  // link must not let someone else take the ticket.
  if (!sessionEmail || sessionEmail.toLowerCase() !== (user.email ?? "").toLowerCase()) {
    return { status: "email_mismatch", sessionEmail };
  }

  const admin = createAdminClient();
  const paymentIntentId = session.payment_intent as string;

  // Already claimed? (unique payment intent per ticket)
  const { data: existing } = await admin
    .from("event_tickets")
    .select("id, user_id")
    .eq("stripe_payment_intent_id", paymentIntentId)
    .maybeSingle();
  if (existing) {
    if (existing.user_id === user.id) return { status: "claimed", eventId };
    return { status: "error", message: "This ticket has already been claimed." };
  }

  const amount = (session.amount_total ?? 0) / 100;
  const { error: ticketError } = await admin.from("event_tickets").insert({
    event_id: eventId,
    user_id: user.id,
    amount,
    escrow_status: "held",
    stripe_payment_intent_id: paymentIntentId,
  });
  if (ticketError) return { status: "error", message: ticketError.message };

  await admin.from("event_members").upsert(
    { event_id: eventId, user_id: user.id, role: "attendee" },
    { onConflict: "event_id,user_id" }
  );

  const { data: ev } = await admin
    .from("events")
    .select("creator_id, title")
    .eq("id", eventId)
    .single();
  if (ev && ev.creator_id !== user.id) {
    await admin.from("notifications").insert({
      user_id: ev.creator_id,
      type: "event_join",
      title: "A guest bought a ticket via your share link",
      body: ev.title,
      data: { event_id: eventId },
    });
  }

  return { status: "claimed", eventId };
}
