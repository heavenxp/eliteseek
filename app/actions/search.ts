"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export type SearchResult = {
  id: string;
  full_name: string;
  avatar_url: string | null;
  role: "companion" | "client";
  country: string | null;
  username: string | null;
  display_name: string | null;
  location: string | null;
};

export async function searchUsers({
  q,
  role,
  country,
  city,
}: {
  q: string;
  role: "everyone" | "companion" | "client";
  country: string;
  city: string;
}): Promise<SearchResult[]> {
  const admin = createAdminClient();

  if (!q && !country && !city) return [];

  let query = admin
    .from("profiles")
    .select("id, full_name, avatar_url, role, country")
    .eq("is_suspended", false)
    .eq("searchable", true)
    .limit(50);

  if (q) query = query.ilike("full_name", `%${q}%`);
  if (role !== "everyone") query = query.eq("role", role);
  if (country) query = query.eq("country", country);

  const { data: profiles } = await query;
  if (!profiles || profiles.length === 0) return [];

  const hostIds = profiles.filter((p) => p.role === "companion").map((p) => p.id);

  const companionMap = new Map<string, { username: string | null; display_name: string | null; location: string | null }>();
  if (hostIds.length > 0) {
    const { data: companions } = await admin
      .from("companion_profiles")
      .select("user_id, username, display_name, location")
      // Phase 2: unverified hosts are never visible to clients
      .in("verification_tier", ["verified", "select"])
      .in("user_id", hostIds);

    for (const c of companions ?? []) {
      companionMap.set(c.user_id, {
        username: c.username ?? null,
        display_name: c.display_name ?? null,
        location: c.location ?? null,
      });
    }
  }

  return profiles
    .filter((p) => {
      // Hosts absent from companionMap are unverified — drop them
      if (p.role === "companion" && !companionMap.has(p.id)) return false;
      if (city && p.role === "companion") {
        const loc = companionMap.get(p.id)?.location ?? "";
        return loc.toLowerCase().includes(city.toLowerCase());
      }
      return true;
    })
    .map((p) => ({
      id: p.id,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      role: p.role as "companion" | "client",
      country: p.country,
      username: companionMap.get(p.id)?.username ?? null,
      display_name: companionMap.get(p.id)?.display_name ?? null,
      location: companionMap.get(p.id)?.location ?? null,
    }));
}
