import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const formData = await request.formData();
  const companionId = formData.get("companion_id") as string;
  const amountPaid = parseFloat(formData.get("amount_paid") as string);

  await supabase.from("profile_unlocks").upsert(
    { client_id: user.id, companion_id: companionId, amount_paid: amountPaid },
    { onConflict: "client_id,companion_id" }
  );

  return NextResponse.redirect(new URL(`/companion/${companionId}`, request.url));
}
