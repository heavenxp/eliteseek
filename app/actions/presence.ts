"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function updateLastSeen(): Promise<void> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  await supabase
    .from("profiles")
    .update({ last_seen: new Date().toISOString() })
    .eq("id", user.id);
}

export type OnlineUser = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "companion" | "client";
  username: string | null;
};

export async function getOnlineUsers(): Promise<{ hosts: OnlineUser[]; clients: OnlineUser[] }> {
  const admin = createAdminClient();
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, full_name, avatar_url, role")
    .gt("last_seen", fiveMinAgo)
    .eq("is_suspended", false)
    .limit(60);

  if (!profiles || profiles.length === 0) return { hosts: [], clients: [] };

  const hostIds = profiles.filter((p) => p.role === "companion").map((p) => p.id);

  let usernameMap = new Map<string, string>();
  if (hostIds.length > 0) {
    const { data: companions } = await admin
      .from("companion_profiles")
      .select("user_id, username")
      .in("user_id", hostIds);

    for (const c of companions ?? []) {
      if (c.username) usernameMap.set(c.user_id, c.username);
    }
  }

  const users: OnlineUser[] = profiles.map((p) => ({
    id: p.id,
    full_name: p.full_name,
    avatar_url: p.avatar_url,
    role: p.role as "companion" | "client",
    username: usernameMap.get(p.id) ?? null,
  }));

  return {
    hosts: users.filter((u) => u.role === "companion"),
    clients: users.filter((u) => u.role === "client"),
  };
}
