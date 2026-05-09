"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type FollowListItem = {
  id: string;
  name: string;
  username: string | null;
  tier: "bronze" | "silver" | "elite" | null;
  followedAt: string;
};

export async function getFollowerList(companionUserId: string): Promise<FollowListItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const { data: follows } = await admin
    .from("follows")
    .select("follower_id, created_at")
    .eq("following_id", companionUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!follows?.length) return [];
  const ids = follows.map((f) => f.follower_id);

  const [profilesRes, tiersRes, companionRes] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", ids),
    admin.from("client_profiles").select("user_id, membership_tier").in("user_id", ids),
    admin.from("companion_profiles").select("user_id, username").in("user_id", ids),
  ]);

  const nameMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name as string]));
  const tierMap = new Map(
    (tiersRes.data ?? []).map((p) => [p.user_id, p.membership_tier as "bronze" | "silver" | "elite"])
  );
  const usernameMap = new Map(
    (companionRes.data ?? []).map((p) => [p.user_id, p.username as string | null])
  );

  return follows.map((f) => ({
    id: f.follower_id,
    name: nameMap.get(f.follower_id) ?? "Member",
    username: usernameMap.get(f.follower_id) ?? null,
    tier: tierMap.get(f.follower_id) ?? null,
    followedAt: f.created_at,
  }));
}

export async function getFollowingList(companionUserId: string): Promise<FollowListItem[]> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const admin = createAdminClient();

  const { data: follows } = await admin
    .from("follows")
    .select("following_id, created_at")
    .eq("follower_id", companionUserId)
    .order("created_at", { ascending: false })
    .limit(100);

  if (!follows?.length) return [];
  const ids = follows.map((f) => f.following_id);

  const [profilesRes, companionRes] = await Promise.all([
    admin.from("profiles").select("id, full_name").in("id", ids),
    admin.from("companion_profiles").select("user_id, username").in("user_id", ids),
  ]);

  const nameMap = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name as string]));
  const usernameMap = new Map(
    (companionRes.data ?? []).map((p) => [p.user_id, p.username as string | null])
  );

  return follows.map((f) => ({
    id: f.following_id,
    name: nameMap.get(f.following_id) ?? "Member",
    username: usernameMap.get(f.following_id) ?? null,
    tier: null,
    followedAt: f.created_at,
  }));
}
