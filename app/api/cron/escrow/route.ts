import { NextRequest, NextResponse } from "next/server";
import { getStripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { calculateFees } from "@/lib/database.types";

export const runtime = "nodejs";

// Runs every 30 minutes (vercel.json):
//  1. Release: transfer the host's share for bookings whose 48h dispute
//     window has passed (Stripe transfer = the release; no custom ledger).
//  2. SOS: a paid booking where the host checked in but never checked out
//     within 2h of the scheduled end triggers the trusted-contact path.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stripe = getStripe();
  const admin = createAdminClient();
  const now = new Date();
  const results = { released: 0, releaseSkipped: 0, sosNotified: 0 };

  // ── 1. Escrow releases ──────────────────────────────────────
  const { data: due } = await admin
    .from("bookings")
    .select("id, companion_id, total_amount, refunded_amount, stripe_payment_intent_id")
    .eq("escrow_status", "release_scheduled")
    .lte("release_at", now.toISOString())
    .limit(50);

  for (const b of due ?? []) {
    const { data: cp } = await admin
      .from("host_profiles")
      .select("user_id, stripe_account_id, stripe_account_status")
      .eq("id", b.companion_id)
      .single();

    const payable = +(Number(b.total_amount) - Number(b.refunded_amount ?? 0)).toFixed(2);
    const { platformFee, netAmount } = calculateFees("booking", payable);

    if (!stripe || !cp?.stripe_account_id || cp.stripe_account_status !== "active") {
      // Host hasn't finished Connect onboarding — funds stay safely in the
      // platform Stripe balance; nudge once per cron pass.
      results.releaseSkipped++;
      if (cp?.user_id) {
        await admin.from("notifications").insert({
          user_id: cp.user_id,
          type: "booking_update",
          title: "Payout waiting — finish payment setup",
          body: "A booking payout is ready but needs your Stripe payout account. Set it up from Account → Settings.",
          data: { booking_id: b.id },
        });
      }
      continue;
    }

    try {
      const transfer = await stripe.transfers.create({
        amount: Math.round(netAmount * 100),
        currency: "usd",
        destination: cp.stripe_account_id,
        transfer_group: b.id,
        metadata: { booking_id: b.id },
      });

      await admin
        .from("bookings")
        .update({ escrow_status: "released", stripe_transfer_id: transfer.id })
        .eq("id", b.id)
        .eq("escrow_status", "release_scheduled");

      await admin.from("transactions").insert({
        type: "booking",
        from_user_id: null,
        to_user_id: cp.user_id,
        gross_amount: payable,
        platform_fee: platformFee,
        net_amount: netAmount,
        stripe_payment_intent_id: b.stripe_payment_intent_id,
        status: "completed",
        reference_id: b.id,
        reference_type: "booking",
        metadata: { transfer_id: transfer.id },
      });

      await admin.from("notifications").insert({
        user_id: cp.user_id,
        type: "booking_update",
        title: "Booking payout released",
        body: `$${netAmount.toFixed(2)} is on its way to your account.`,
        data: { booking_id: b.id },
      });
      results.released++;
    } catch (e) {
      console.error(`[cron/escrow] transfer failed for booking ${b.id}:`, e);
      results.releaseSkipped++;
    }
  }

  // ── 2. SOS: missed check-outs ───────────────────────────────
  // Checked in, not checked out, and 2h past the scheduled end.
  const { data: paidOpen } = await admin
    .from("bookings")
    .select("id, companion_id, scheduled_at, duration_hours, checkin_at, checkout_at, sos_notified_at, escrow_status")
    .in("escrow_status", ["held"])
    .not("checkin_at", "is", null)
    .is("checkout_at", null)
    .is("sos_notified_at", null)
    .limit(50);

  for (const b of paidOpen ?? []) {
    const end =
      new Date(b.scheduled_at).getTime() + Number(b.duration_hours) * 3600_000;
    if (now.getTime() < end + 2 * 3600_000) continue;

    const { data: cp } = await admin
      .from("host_profiles")
      .select("user_id, display_name, trusted_contact_name, trusted_contact_email, trusted_contact_phone")
      .eq("id", b.companion_id)
      .single();
    if (!cp) continue;

    // In-app nudge to the host either way
    await admin.from("notifications").insert({
      user_id: cp.user_id,
      type: "booking_update",
      title: "Are you safe? Please check out",
      body: "Your booking ended but you haven't checked out. Check out to confirm you're safe — your trusted contact has been notified.",
      data: { booking_id: b.id },
    });

    // Trusted-contact email (best effort; requires RESEND_API_KEY)
    if (cp.trusted_contact_email && process.env.RESEND_API_KEY) {
      try {
        const { Resend } = await import("resend");
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: process.env.EMAIL_FROM ?? "EliteSeek Safety <safety@eliteseek.com>",
          to: cp.trusted_contact_email,
          subject: `Safety check: ${cp.display_name ?? "your contact"} hasn't checked out of a booking`,
          text: [
            `Hi ${cp.trusted_contact_name ?? ""}`.trim() + ",",
            "",
            `${cp.display_name ?? "Your contact"} listed you as their trusted contact on EliteSeek.`,
            `Their booking was scheduled to end at ${new Date(end).toLocaleString("en-AU")} and they haven't confirmed safe completion (2+ hours overdue).`,
            "",
            "Please try to reach them. If you can't, consider contacting local authorities.",
            "",
            "— EliteSeek Safety",
          ].join("\n"),
        });
      } catch (e) {
        console.error(`[cron/escrow] SOS email failed for booking ${b.id}:`, e);
      }
    }

    await admin
      .from("bookings")
      .update({ sos_notified_at: now.toISOString() })
      .eq("id", b.id);
    results.sosNotified++;
  }

  return NextResponse.json(results);
}
