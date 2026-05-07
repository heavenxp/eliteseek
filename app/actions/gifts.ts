"use server";

import { createClient } from "@/lib/supabase/server";

type SendGiftInput = {
  recipientId: string;
  amount: number;
  message: string | null;
  wishlistItemId: string | null;
  virtualGiftName: string | null;
};

export async function sendGift(
  input: SendGiftInput
): Promise<{ error: string | null }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  if (!input.recipientId) return { error: "Recipient is required" };
  if (!input.amount || input.amount < 1) return { error: "Amount must be at least $1" };

  const { error } = await supabase.from("gifts").insert({
    sender_id: user.id,
    recipient_id: input.recipientId,
    wishlist_item_id: input.wishlistItemId,
    gift_type: "virtual",
    virtual_gift_name: input.virtualGiftName ?? "Custom Gift",
    amount: input.amount,
    message: input.message,
    status: "pending",
  });

  if (error) return { error: error.message };

  // Mark wishlist item purchased if applicable
  if (input.wishlistItemId) {
    await supabase
      .from("wishlist_items")
      .update({ is_purchased: true, purchased_by: user.id, purchased_at: new Date().toISOString() })
      .eq("id", input.wishlistItemId);
  }

  return { error: null };
}
