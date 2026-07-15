"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getStripe } from "@/lib/stripe";
import {
  sendBookingRequestEmail,
  sendBookingResponseEmail,
} from "@/lib/email";
import { notify } from "@/app/actions/notifications";

async function requireClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

async function requireCompanionOwner(
  supabase: Awaited<ReturnType<typeof createClient>>,
  bookingId: string,
  userId: string
) {
  const { data } = await supabase
    .from("bookings")
    .select("id, companion_id, status")
    .eq("id", bookingId)
    .single();

  if (!data) return null;

  // Verify ownership without a join — avoids !inner RLS collapse
  const { data: cp } = await supabase
    .from("companion_profiles")
    .select("user_id")
    .eq("id", data.companion_id)
    .eq("user_id", userId)
    .maybeSingle();

  if (!cp) return null;
  return data;
}

export type BookingState = { error?: string; success?: boolean; bookingId?: string } | null;

export async function createBookingRequest(
  _: BookingState,
  formData: FormData
): Promise<BookingState> {
  const { supabase, userId } = await requireClient();

  // Companions cannot send booking requests
  const { data: viewerProfile } = await supabase
    .from("profiles")
    .select("role, kyc_status")
    .eq("id", userId)
    .single();
  if (viewerProfile?.role === "companion") {
    return { error: "Elite Hosts cannot send booking requests." };
  }

  // Phase 2: clients must be ID-verified to book (browsing and content
  // subscriptions stay open to everyone).
  if (viewerProfile?.kyc_status !== "verified") {
    return {
      error:
        "ID verification is required to book. Verify once at Account → Verification — it takes about a minute.",
    };
  }

  const companionId = formData.get("companion_id") as string;
  const scheduledAt = formData.get("scheduled_at") as string;
  const durationHours = parseFloat(formData.get("duration_hours") as string);
  const bookingType = formData.get("booking_type") as string;
  const location = (formData.get("location") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const totalAmount = parseFloat(formData.get("total_amount") as string);
  const availabilityPostId = (formData.get("availability_post_id") as string) || null;

  if (!companionId || !scheduledAt || !bookingType) {
    return { error: "Missing required booking details." };
  }
  if (isNaN(durationHours) || durationHours < 1) {
    return { error: "Duration must be at least 1 hour." };
  }
  if (isNaN(totalAmount) || totalAmount < 0) {
    return { error: "Invalid amount." };
  }

  const platformFee = +(totalAmount * 0.15).toFixed(2);
  const companionEarnings = +(totalAmount - platformFee).toFixed(2);

  const { data: hostRow } = await supabase
    .from("companion_profiles")
    .select("cancellation_policy")
    .eq("id", companionId)
    .single();
  const hostPolicy = hostRow?.cancellation_policy ?? "moderate";

  const { data: booking, error } = await supabase
    .from("bookings")
    .insert({
      client_id: userId,
      companion_id: companionId,
      booking_type: bookingType,
      scheduled_at: scheduledAt,
      duration_hours: durationHours,
      location,
      notes,
      total_amount: totalAmount,
      platform_fee: platformFee,
      companion_earnings: companionEarnings,
      status: "pending",
      // Snapshot the host's cancellation policy so later changes can't
      // retroactively alter refund terms for this booking
      cancellation_policy: hostPolicy,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Store the availability post link (separate update — column not yet in generated types)
  if (availabilityPostId) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase.from("bookings") as any)
      .update({ availability_post_id: availabilityPostId })
      .eq("id", booking!.id);
  }

  // When Stripe is configured, notification fires after the deposit is paid
  // (see app/api/stripe/webhooks/route.ts case "booking").
  // When Stripe is not configured, notify immediately.
  const stripeConfigured = !!getStripe();

  const { data: companionProfile } = await supabase
    .from("companion_profiles")
    .select("user_id")
    .eq("id", companionId)
    .single();

  if (companionProfile && !stripeConfigured) {
    const dateStr = new Date(scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    await notify({
      userId: companionProfile.user_id,
      type: "booking_request",
      title: "New booking request",
      body: `You have a new booking request for ${dateStr}.`,
      link: "/companion/bookings",
    });

    void (async () => {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const [companionAuthRes, clientProfileRes, currentUserRes] = await Promise.all([
          admin.auth.admin.getUserById(companionProfile.user_id),
          supabase.from("profiles").select("full_name").eq("id", userId).single(),
          supabase.auth.getUser(),
        ]);
        const companionEmail = companionAuthRes.data?.user?.email;
        const companionName = companionAuthRes.data?.user?.user_metadata?.full_name as string | undefined
          ?? "Host";
        const clientName = clientProfileRes.data?.full_name
          ?? currentUserRes.data?.user?.user_metadata?.full_name as string | undefined
          ?? "A member";
        if (companionEmail) {
          await sendBookingRequestEmail({
            companionEmail,
            companionName,
            clientName,
            bookingType,
            scheduledAt,
            durationHours,
            totalAmount,
          });
        }
      } catch (emailErr) {
        console.error("[email] sendBookingRequestEmail failed:", emailErr);
      }
    })();
  }

  return { success: true, bookingId: booking!.id };
}

export async function respondToBooking(
  bookingId: string,
  action: "confirmed" | "cancelled"
): Promise<BookingState> {
  const { supabase, userId } = await requireClient();

  const booking = await requireCompanionOwner(supabase, bookingId, userId);
  if (!booking) return { error: "Booking not found." };

  // Prevent double-responding
  if (booking.status !== "pending") {
    return { error: "This booking has already been responded to." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({
      status: action,
      ...(action === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
    })
    .eq("id", bookingId)
    .eq("status", "pending");

  if (error) return { error: error.message };

  // On confirm: mark the linked availability post as booked
  if (action === "confirmed") {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: apRow } = await (supabase.from("bookings") as any)
      .select("availability_post_id")
      .eq("id", bookingId)
      .single();
    const apId = apRow?.availability_post_id as string | null;
    if (apId) {
      await supabase
        .from("availability_posts")
        .update({ is_booked: true })
        .eq("id", apId);
    }
  }

  // Notify the client
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("client_id, scheduled_at")
    .eq("id", bookingId)
    .single();

  if (bookingData) {
    const dateStr = new Date(bookingData.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    await notify({
      userId: bookingData.client_id,
      type: action === "confirmed" ? "booking_confirmed" : "booking_declined",
      title: action === "confirmed" ? "Booking confirmed!" : "Booking declined",
      body: action === "confirmed"
        ? `Your booking for ${dateStr} has been confirmed.`
        : `Your booking request for ${dateStr} was not accepted.`,
      link: "/bookings",
    });

    void (async () => {
      try {
        const { createAdminClient } = await import("@/lib/supabase/admin");
        const admin = createAdminClient();
        const [clientAuthRes, companionProfileRes] = await Promise.all([
          admin.auth.admin.getUserById(bookingData.client_id),
          supabase
            .from("profiles")
            .select("full_name")
            .eq("id", userId)
            .single(),
        ]);
        const clientEmail = clientAuthRes.data?.user?.email;
        const clientName = clientAuthRes.data?.user?.user_metadata?.full_name as string | undefined
          ?? "Member";
        const companionName = companionProfileRes.data?.full_name ?? "Your host";
        if (clientEmail) {
          await sendBookingResponseEmail({
            clientEmail,
            clientName,
            companionName,
            status: action,
            scheduledAt: bookingData.scheduled_at,
          });
        }
      } catch (emailErr) {
        console.error("[email] sendBookingResponseEmail failed:", emailErr);
      }
    })();
  }

  return { success: true };
}

// ── cancelBooking ─────────────────────────────────────────────
// Called after confirmation by either host or client.

export async function cancelBooking(bookingId: string): Promise<BookingState> {
  const { supabase, userId } = await requireClient();

  const { data: booking } = await supabase
    .from("bookings")
    .select("id, client_id, companion_id, scheduled_at, status")
    .eq("id", bookingId)
    .single();

  if (!booking) return { error: "Booking not found." };
  if (booking.status !== "confirmed") return { error: "Only confirmed bookings can be cancelled." };

  const isClient = booking.client_id === userId;

  // For host: verify companion ownership
  if (!isClient) {
    const { data: cp } = await supabase
      .from("companion_profiles")
      .select("user_id")
      .eq("id", booking.companion_id)
      .eq("user_id", userId)
      .maybeSingle();
    if (!cp) return { error: "Booking not found." };
  }

  const { error } = await supabase
    .from("bookings")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  const dateStr = new Date(booking.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
  const { data: profile } = await supabase.from("profiles").select("full_name").eq("id", userId).single();
  const actorName = profile?.full_name ?? "Someone";

  if (isClient) {
    // Notify host
    const { data: cp } = await supabase
      .from("companion_profiles")
      .select("user_id")
      .eq("id", booking.companion_id)
      .single();
    if (cp) {
      await notify({
        userId: cp.user_id,
        type: "booking_cancelled_by_client",
        title: "Booking cancelled by client",
        body: `${actorName} cancelled their booking for ${dateStr}.`,
        link: "/companion/bookings",
      });
    }
  } else {
    // Notify client
    await notify({
      userId: booking.client_id,
      type: "booking_cancelled",
      title: "Booking cancelled",
      body: `Your booking for ${dateStr} has been cancelled by the host.`,
      link: "/bookings",
    });
  }

  return { success: true };
}
