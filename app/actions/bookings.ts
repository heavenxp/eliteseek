"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

async function requireClient() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, userId: user.id };
}

async function requireCompanionOwner(supabase: Awaited<ReturnType<typeof createClient>>, bookingId: string, userId: string) {
  const { data } = await supabase
    .from("bookings")
    .select("id, companion_id, companion_profiles!inner(user_id)")
    .eq("id", bookingId)
    .single();

  const profile = (Array.isArray(data?.companion_profiles) ? data.companion_profiles[0] : data?.companion_profiles) as { user_id: string } | null | undefined;
  if (!data || profile?.user_id !== userId) return null;
  return data;
}

export type BookingState = { error?: string; success?: boolean; bookingId?: string } | null;

export async function createBookingRequest(
  _: BookingState,
  formData: FormData
): Promise<BookingState> {
  const { supabase, userId } = await requireClient();

  const companionId = formData.get("companion_id") as string;
  const scheduledAt = formData.get("scheduled_at") as string;
  const durationHours = parseFloat(formData.get("duration_hours") as string);
  const bookingType = formData.get("booking_type") as string;
  const location = (formData.get("location") as string)?.trim() || null;
  const notes = (formData.get("notes") as string)?.trim() || null;
  const totalAmount = parseFloat(formData.get("total_amount") as string);

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
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  // Notify the companion
  const { data: companionProfile } = await supabase
    .from("companion_profiles")
    .select("user_id")
    .eq("id", companionId)
    .single();

  if (companionProfile) {
    await supabase.from("notifications").insert({
      user_id: companionProfile.user_id,
      type: "booking_request",
      title: "New booking request",
      body: `You have a new booking request for ${new Date(scheduledAt).toLocaleDateString("en-GB", { day: "numeric", month: "long" })}.`,
      data: { booking_id: booking!.id },
    });
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

  const { error } = await supabase
    .from("bookings")
    .update({
      status: action,
      ...(action === "cancelled" ? { cancelled_at: new Date().toISOString() } : {}),
      ...(action === "confirmed" ? { completed_at: null } : {}),
    })
    .eq("id", bookingId);

  if (error) return { error: error.message };

  // Notify the client
  const { data: bookingData } = await supabase
    .from("bookings")
    .select("client_id, scheduled_at")
    .eq("id", bookingId)
    .single();

  if (bookingData) {
    const dateStr = new Date(bookingData.scheduled_at).toLocaleDateString("en-GB", { day: "numeric", month: "long" });
    await supabase.from("notifications").insert({
      user_id: bookingData.client_id,
      type: action === "confirmed" ? "booking_confirmed" : "booking_declined",
      title: action === "confirmed" ? "Booking confirmed!" : "Booking declined",
      body: action === "confirmed"
        ? `Your booking for ${dateStr} has been confirmed.`
        : `Your booking request for ${dateStr} was not accepted.`,
      data: { booking_id: bookingId },
    });
  }

  return { success: true };
}
