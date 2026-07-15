"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { scanContent, recordModeration } from "@/lib/moderation";

// Scans a just-uploaded profile photo. Rejected photos are removed
// immediately; flagged ones stay up but land in the manual review queue.
export async function moderateProfilePhoto(
  url: string
): Promise<{ removed: boolean }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { removed: false };

  const verdict = await scanContent([url]);
  if (verdict.status === "approved" || verdict.status === "unscanned") {
    return { removed: false };
  }

  await recordModeration({
    subjectUserId: user.id,
    contentType: "profile_photo",
    verdict,
  });

  if (verdict.status === "rejected") {
    const admin = createAdminClient();
    // Clear wherever this exact URL landed (cover and/or avatar)
    await Promise.all([
      admin
        .from("host_profiles")
        .update({ cover_image_url: null })
        .eq("user_id", user.id)
        .eq("cover_image_url", url),
      admin
        .from("profiles")
        .update({ avatar_url: null })
        .eq("id", user.id)
        .eq("avatar_url", url),
    ]);
    return { removed: true };
  }

  return { removed: false };
}
