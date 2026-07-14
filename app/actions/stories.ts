"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

// ── Shared types ───────────────────────────────────────────────

export type StoryItem = {
  id: string;
  userId: string;
  mediaUrl: string;
  mediaType: "photo" | "video";
  audience: "public" | "followers";
  createdAt: string;
  expiresAt: string;
  viewedBy: string[];
};

export type StoryGroup = {
  userId: string;
  displayName: string;
  avatarUrl: string | null;
  stories: StoryItem[];
};

export type StoriesResult = {
  groups: StoryGroup[];         // excludes current user
  ownGroup: StoryGroup | null;  // current user's own stories (null if none)
  viewerId: string;
  viewerDisplayName: string;
  viewerAvatarUrl: string | null;
};

// ── getStories ─────────────────────────────────────────────────

export async function getStories(): Promise<StoriesResult | null> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  // RLS already enforces audience rules
  const { data: raw } = await supabase
    .from("stories")
    .select("id, user_id, media_url, media_type, audience, created_at, expires_at, viewed_by")
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: true });

  const admin = createAdminClient();
  let storiesRaw = raw ?? [];

  // Phase 2: unverified hosts are never visible to clients — drop their
  // stories (they still see their own).
  const authorIds = [...new Set(storiesRaw.map((s) => s.user_id))];
  if (authorIds.length > 0) {
    const { data: hostTiers } = await admin
      .from("companion_profiles")
      .select("user_id, verification_tier")
      .in("user_id", authorIds);
    const unverifiedHostIds = new Set(
      (hostTiers ?? [])
        .filter((h) => h.verification_tier === "unverified" && h.user_id !== user.id)
        .map((h) => h.user_id)
    );
    storiesRaw = storiesRaw.filter((s) => !unverifiedHostIds.has(s.user_id));
  }

  // Fetch viewer profile + all author profiles in one query
  const userIds = [...new Set([user.id, ...storiesRaw.map((s) => s.user_id)])];
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url")
    .in("id", userIds);

  const profileMap = new Map((profiles ?? []).map((p) => [p.id, p]));
  const viewerProfile = profileMap.get(user.id);

  // Group stories by user_id
  const groupMap = new Map<string, StoryGroup>();
  for (const s of storiesRaw) {
    if (!groupMap.has(s.user_id)) {
      const p = profileMap.get(s.user_id);
      groupMap.set(s.user_id, {
        userId: s.user_id,
        displayName: p?.full_name ?? "Unknown",
        avatarUrl: (p?.avatar_url as string | null) ?? null,
        stories: [],
      });
    }
    groupMap.get(s.user_id)!.stories.push({
      id: s.id,
      userId: s.user_id,
      mediaUrl: s.media_url,
      mediaType: s.media_type as "photo" | "video",
      audience: s.audience as "public" | "followers",
      createdAt: s.created_at,
      expiresAt: s.expires_at,
      viewedBy: (s.viewed_by as string[]) ?? [],
    });
  }

  const ownGroup = groupMap.get(user.id) ?? null;
  groupMap.delete(user.id);

  // Chronological order by each group's earliest story
  const groups = Array.from(groupMap.values());
  groups.sort((a, b) =>
    new Date(a.stories[0].createdAt).getTime() - new Date(b.stories[0].createdAt).getTime()
  );

  return {
    groups,
    ownGroup,
    viewerId: user.id,
    viewerDisplayName: viewerProfile?.full_name ?? "You",
    viewerAvatarUrl: (viewerProfile?.avatar_url as string | null) ?? null,
  };
}

// ── createStory ────────────────────────────────────────────────

export async function createStory(
  mediaUrl: string,
  mediaType: "photo" | "video",
  audience: "public" | "followers"
): Promise<{ error?: string; success?: boolean }> {
  console.log("[createStory] received:", { mediaUrl, mediaType, audience });

  const supabase = await createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  console.log("[createStory] auth:", { userId: user?.id ?? null, authError });
  if (!user) redirect("/login");

  const { data: insertData, error } = await supabase.from("stories").insert({
    user_id: user.id,
    media_url: mediaUrl,
    media_type: mediaType,
    audience,
  }).select();

  console.log("[createStory] insert result:", { insertData, error });

  if (error) return { error: error.message };
  return { success: true };
}

// ── deleteStory ────────────────────────────────────────────────

export async function deleteStory(
  storyId: string
): Promise<{ error?: string; success?: boolean }> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("stories")
    .delete()
    .eq("id", storyId)
    .eq("user_id", user.id);

  if (error) return { error: error.message };
  return { success: true };
}

// ── markStoryViewed ────────────────────────────────────────────

export async function markStoryViewed(storyId: string): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Admin client bypasses RLS so any viewer can append their ID
  const admin = createAdminClient();
  const { data } = await admin
    .from("stories")
    .select("viewed_by, user_id")
    .eq("id", storyId)
    .single();

  const current = (data?.viewed_by as string[]) ?? [];
  if (current.includes(user.id)) return;

  await admin
    .from("stories")
    .update({ viewed_by: [...current, user.id] })
    .eq("id", storyId);

  // Notify story owner on first view (skip if viewer is the owner)
  if (data && data.user_id !== user.id) {
    const { notify } = await import("@/app/actions/notifications");
    const { data: viewerProfile } = await admin.from("profiles").select("full_name").eq("id", user.id).single();
    await notify({
      userId: data.user_id as string,
      type: "story_viewed",
      title: `${viewerProfile?.full_name ?? "Someone"} viewed your story`,
      link: "/feed",
    });
  }
}
