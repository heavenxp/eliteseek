"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function notify(params: {
  userId: string;
  type: string;
  title: string;
  body?: string;
  link?: string;
}): Promise<void> {
  const admin = createAdminClient();
  await admin.from("notifications").insert({
    user_id: params.userId,
    type: params.type,
    title: params.title,
    body: params.body ?? null,
    data: params.link ? { link: params.link } : {},
  });
}
