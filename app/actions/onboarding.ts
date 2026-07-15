"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type OnboardingState = { error?: string } | null;

// ── Auth guard helper ────────────────────────────────────────
async function requireUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return { supabase, user };
}

// ============================================================
// COMPANION STEPS
// ============================================================

export async function saveCompanionAbout(
  _: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { supabase, user } = await requireUser();

  const ageRaw = parseInt(formData.get("age") as string, 10);
  if (isNaN(ageRaw) || ageRaw < 18) return { error: "You must be 18 or older." };

  const { error } = await supabase
    .from("host_profiles")
    .update({
      display_name: (formData.get("display_name") as string).trim(),
      age: ageRaw,
      location: (formData.get("location") as string).trim(),
      tagline: (formData.get("tagline") as string).trim(),
      bio: (formData.get("bio") as string).trim(),
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return null;
}

export async function saveCompanionOfferings(
  _: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { supabase, user } = await requireUser();

  const tags = (formData.get("tags") as string)
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean);

  const languages = (formData.get("languages") as string)
    .split(",")
    .map((l) => l.trim())
    .filter(Boolean);

  const { error } = await supabase
    .from("host_profiles")
    .update({ tags, languages })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return null;
}

export async function saveCompanionPricing(
  _: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { supabase, user } = await requireUser();

  const subEnabled = formData.get("sub_enabled") === "true";
  const bookingEnabled = formData.get("booking_enabled") === "true";
  const unlockEnabled = formData.get("unlock_enabled") === "true";
  const tipMenuRaw = formData.get("tip_menu") as string;

  const subscriptionPrice = subEnabled
    ? parseFloat(formData.get("subscription_price") as string)
    : null;
  const bookingRate = bookingEnabled
    ? parseFloat(formData.get("booking_rate_hourly") as string)
    : null;
  const unlockFee = unlockEnabled
    ? parseFloat(formData.get("profile_unlock_fee") as string)
    : null;

  if (subEnabled && (isNaN(subscriptionPrice!) || subscriptionPrice! < 9.99))
    return { error: "Subscription price must be at least $9.99." };
  if (bookingEnabled && (isNaN(bookingRate!) || bookingRate! <= 0))
    return { error: "Booking rate must be greater than $0." };
  if (unlockEnabled && (isNaN(unlockFee!) || unlockFee! < 10))
    return { error: "Profile unlock fee must be at least $10." };

  let tipMenu: { name: string; amount: number }[] = [];
  try {
    tipMenu = JSON.parse(tipMenuRaw || "[]");
  } catch {
    // ignore malformed
  }

  const { error } = await supabase
    .from("host_profiles")
    .update({
      subscription_price: subscriptionPrice,
      booking_rate_hourly: bookingRate,
      profile_unlock_fee: unlockFee,
      tip_menu: tipMenu,
    })
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return null;
}

export async function saveCompanionVisibility(
  _: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { supabase, user } = await requireUser();

  const visibility = formData.get("visibility") as
    | "public"
    | "locked"
    | "elite_only";
  const isAvailable = formData.get("is_available") === "true";

  const { error } = await supabase
    .from("host_profiles")
    .update({ visibility, is_available: isAvailable })
    .eq("user_id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/browse");
  redirect("/browse");
}

// ============================================================
// CLIENT STEPS
// ============================================================

export async function saveClientPreferences(
  _: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { supabase, user } = await requireUser();

  const interests = (formData.get("interests") as string)
    .split(",")
    .map((i) => i.trim())
    .filter(Boolean);
  const city = (formData.get("city") as string | null)?.trim() ?? "";

  // Store as auth user metadata (no separate preferences table needed)
  const { error } = await supabase.auth.updateUser({
    data: { interests, city },
  });

  if (error) return { error: error.message };
  return null;
}

export async function saveClientMembership(
  _: OnboardingState,
  formData: FormData
): Promise<OnboardingState> {
  const { supabase, user } = await requireUser();

  const tier = formData.get("membership_tier") as
    | "bronze"
    | "silver"
    | "elite";

  // Bronze is free — just save the tier and redirect
  // Silver/Elite will go through Stripe billing (future)
  const { error } = await supabase
    .from("profiles")
    .update({ membership_tier: tier })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/browse");
  redirect("/browse");
}
