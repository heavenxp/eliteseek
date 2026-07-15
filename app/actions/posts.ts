"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { scanContent, recordModeration } from "@/lib/moderation";
import type { AvailabilityCategory, VisibilityLevel } from "@/lib/database.types";

async function requireCompanion() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");
  return { supabase, user, companionId: companion.id };
}

export type PostState = { error?: string; success?: boolean } | null;

export async function createAvailabilityPost(
  _: PostState,
  formData: FormData
): Promise<PostState> {
  const { supabase, companionId } = await requireCompanion();

  const category = formData.get("category") as AvailabilityCategory;
  const title = (formData.get("title") as string)?.trim();
  const description = (formData.get("description") as string)?.trim() || null;
  const dateFrom = formData.get("date_from") as string;
  const dateTo = (formData.get("date_to") as string) || null;
  const locationCity = (formData.get("location_city") as string)?.trim();
  const venueType = (formData.get("venue_type") as string)?.trim() || null;
  const price = parseFloat(formData.get("price") as string);
  const maxGuests = parseInt(formData.get("max_guests") as string, 10);
  const visibility = (formData.get("visibility") as VisibilityLevel) ?? "public";

  if (!category || !title || !dateFrom || !locationCity) {
    return { error: "Please fill in all required fields." };
  }
  if (isNaN(price) || price < 0) {
    return { error: "Please enter a valid price." };
  }
  if (isNaN(maxGuests) || maxGuests < 1) {
    return { error: "Max guests must be at least 1." };
  }
  if (new Date(dateFrom) < new Date()) {
    return { error: "Date must be in the future." };
  }

  // Phase 3: availability post copy runs through the Hive pipeline before
  // going live (rejected -> refused; flagged -> published but queued for review)
  const verdict = await scanContent([], [title, description, venueType].filter(Boolean).join("\n"));
  if (verdict.status === "rejected") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await recordModeration({ subjectUserId: user.id, contentType: "availability_post", verdict });
    return { error: "This post can't be published — it doesn't meet EliteSeek's content guidelines." };
  }

  const { error } = await supabase.from("availability_posts").insert({
    companion_id: companionId,
    category,
    title,
    description,
    date_from: dateFrom,
    date_to: dateTo || null,
    location_city: locationCity,
    venue_type: venueType,
    price,
    max_guests: maxGuests,
    visibility,
    photos: "[]",
  });

  if (error) return { error: error.message };

  if (verdict.status === "flagged") {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) await recordModeration({ subjectUserId: user.id, contentType: "availability_post", verdict });
  }

  redirect("/companion/posts");
}

export async function deleteAvailabilityPost(postId: string): Promise<PostState> {
  const { supabase, companionId } = await requireCompanion();

  const { error } = await supabase
    .from("availability_posts")
    .delete()
    .eq("id", postId)
    .eq("companion_id", companionId);

  if (error) return { error: error.message };
  return { success: true };
}
