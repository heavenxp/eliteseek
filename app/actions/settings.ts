"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { VisibilityLevel } from "@/lib/database.types";

export type SettingsState = { error?: string; success?: boolean } | null;

export async function updateCompanionSettings(
  _: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!companion) return { error: "Profile not found." };

  const visibility = formData.get("visibility") as VisibilityLevel;
  const unlockFeeRaw = formData.get("profile_unlock_fee") as string;
  const subPriceRaw = formData.get("subscription_price") as string;
  const bookingRateRaw = formData.get("booking_rate_hourly") as string;
  const bio = (formData.get("bio") as string)?.trim() || null;
  const tagline = (formData.get("tagline") as string)?.trim() || null;
  const location = (formData.get("location") as string)?.trim() || null;
  const isAvailable = formData.get("is_available") === "1";

  const profileUnlockFee = unlockFeeRaw ? parseFloat(unlockFeeRaw) : null;
  const subscriptionPrice = subPriceRaw ? parseFloat(subPriceRaw) : null;
  const bookingRateHourly = bookingRateRaw ? parseFloat(bookingRateRaw) : null;

  const { error } = await supabase
    .from("companion_profiles")
    .update({
      visibility: visibility || "public",
      profile_unlock_fee: profileUnlockFee && profileUnlockFee > 0 ? profileUnlockFee : null,
      subscription_price: subscriptionPrice && subscriptionPrice > 0 ? subscriptionPrice : null,
      booking_rate_hourly: bookingRateHourly && bookingRateHourly > 0 ? bookingRateHourly : null,
      bio,
      tagline,
      location,
      is_available: isAvailable,
    })
    .eq("id", companion.id);

  if (error) return { error: error.message };

  revalidatePath("/account/settings");
  return { success: true };
}
