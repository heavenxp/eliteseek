import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { GiftsClient } from "./gifts-client";
import { GIFTING_ENABLED } from "@/lib/flags";
import type { WishlistItem, CompanionProfile } from "@/lib/database.types";

export type WishlistItemWithCompanion = WishlistItem & {
  companion: Pick<CompanionProfile, "display_name" | "username"> | null;
};

export default async function GiftsPage({
  searchParams,
}: {
  searchParams: Promise<{ companion?: string }>;
}) {
  if (!GIFTING_ENABLED) notFound();

  const { companion: companionFilter } = await searchParams;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch wishlist items with companion info
  let query = supabase
    .from("wishlist_items")
    .select(
      `id, companion_id, name, description, price, image_url, external_url, category,
       is_purchased, purchased_by, purchased_at, created_at,
       companion:host_profiles!companion_id (display_name, username)`
    )
    .eq("is_purchased", false)
    .order("created_at", { ascending: false });

  if (companionFilter) {
    query = query.eq("companion_id", companionFilter);
  }

  const { data: rawItems } = await query;

  const wishlistItems: WishlistItemWithCompanion[] = (rawItems ?? []).map((item) => {
    const companion = Array.isArray(item.companion)
      ? (item.companion[0] ?? null)
      : item.companion;
    return {
      ...item,
      description: item.description ?? null,
      image_url: item.image_url ?? null,
      external_url: item.external_url ?? null,
      category: item.category ?? null,
      purchased_by: item.purchased_by ?? null,
      purchased_at: item.purchased_at ?? null,
      companion: companion as Pick<CompanionProfile, "display_name" | "username"> | null,
    };
  });

  // Fetch sent gifts history
  const { data: sentGifts } = await supabase
    .from("gifts")
    .select(
      `id, amount, message, status, created_at, virtual_gift_name,
       recipient:host_profiles!recipient_id (display_name, username)`
    )
    .eq("sender_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const gifts = (sentGifts ?? []).map((g) => {
    const recipient = Array.isArray(g.recipient) ? (g.recipient[0] ?? null) : g.recipient;
    return { ...g, recipient };
  });

  return (
    <GiftsClient
      currentUserId={user.id}
      wishlistItems={wishlistItems}
      sentGifts={gifts}
      companionFilter={companionFilter ?? null}
    />
  );
}
