"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PRICE_FLOORS } from "@/lib/pricing";
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
    .from("host_profiles")
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
  const searchable = formData.get("searchable") === "1";
  const rawPolicy = formData.get("cancellation_policy") as string | null;
  const cancellationPolicy = ["flexible", "moderate", "strict"].includes(rawPolicy ?? "")
    ? rawPolicy
    : "moderate";
  const trustedName = (formData.get("trusted_contact_name") as string)?.trim() || null;
  const trustedEmail = (formData.get("trusted_contact_email") as string)?.trim() || null;
  const trustedPhone = (formData.get("trusted_contact_phone") as string)?.trim() || null;

  const profileUnlockFee = unlockFeeRaw ? parseFloat(unlockFeeRaw) : null;
  const subscriptionPrice = subPriceRaw ? parseFloat(subPriceRaw) : null;
  const bookingRateHourly = bookingRateRaw ? parseFloat(bookingRateRaw) : null;

  // Enforce platform floors here too — onboarding checks alone left this
  // path open to under-floor pricing.
  if (subscriptionPrice && subscriptionPrice > 0 && subscriptionPrice < PRICE_FLOORS.subscription) {
    return { error: `Subscription price must be at least $${PRICE_FLOORS.subscription}.` };
  }
  if (profileUnlockFee && profileUnlockFee > 0 && profileUnlockFee < PRICE_FLOORS.profile_unlock) {
    return { error: `Profile unlock fee must be at least $${PRICE_FLOORS.profile_unlock}.` };
  }

  const { error } = await supabase
    .from("host_profiles")
    .update({
      visibility: visibility || "public",
      profile_unlock_fee: profileUnlockFee && profileUnlockFee > 0 ? profileUnlockFee : null,
      subscription_price: subscriptionPrice && subscriptionPrice > 0 ? subscriptionPrice : null,
      booking_rate_hourly: bookingRateHourly && bookingRateHourly > 0 ? bookingRateHourly : null,
      bio,
      tagline,
      location,
      cancellation_policy: cancellationPolicy,
      trusted_contact_name: trustedName,
      trusted_contact_email: trustedEmail,
      trusted_contact_phone: trustedPhone,
      is_available: isAvailable,
    })
    .eq("id", companion.id);

  if (error) return { error: error.message };

  await supabase.from("profiles").update({ searchable }).eq("id", user.id);

  revalidatePath("/account/settings");
  return { success: true };
}

export async function updateClientSettings(
  _: SettingsState,
  formData: FormData
): Promise<SettingsState> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const full_name = (formData.get("full_name") as string)?.trim();
  const phone = (formData.get("phone") as string)?.trim() || null;
  const searchable = formData.get("searchable") === "1";

  if (!full_name) return { error: "Display name is required." };

  const { error } = await supabase
    .from("profiles")
    .update({ full_name, phone, searchable })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/account/settings");
  return { success: true };
}
