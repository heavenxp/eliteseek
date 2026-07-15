import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const { limited } = await checkRateLimit(supabase, user.id, "access_request", 5, 3600);
  if (limited) {
    return NextResponse.json(
      { error: "Too many requests. Please wait before sending another access request." },
      { status: 429 }
    );
  }

  const formData = await request.formData();
  const companionId = formData.get("companion_id") as string;
  const message = (formData.get("message") as string)?.trim() || null;

  await supabase.from("access_requests").upsert(
    { client_id: user.id, companion_id: companionId, message, status: "pending" },
    { onConflict: "client_id,companion_id" }
  );

  const { data: cp } = await supabase
    .from("host_profiles")
    .select("user_id")
    .eq("id", companionId)
    .single();

  if (cp) {
    await supabase.from("notifications").insert({
      user_id: cp.user_id,
      type: "access_request",
      title: "New profile access request",
      body: "Someone has requested access to your profile.",
      data: { companion_id: companionId, client_id: user.id },
    });
  }

  return NextResponse.redirect(new URL(`/companion/${companionId}`, request.url));
}
