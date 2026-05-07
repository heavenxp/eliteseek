import { SupabaseClient } from "@supabase/supabase-js";

export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  action: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ limited: boolean; retryAfter?: number }> {
  const cutoff = new Date(Date.now() - windowSeconds * 1000);
  const cutoffIso = cutoff.toISOString();

  const { count } = await supabase
    .from("rate_limit_events")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("action", action)
    .gte("created_at", cutoffIso);

  if ((count ?? 0) >= maxRequests) {
    return { limited: true, retryAfter: windowSeconds };
  }

  await supabase
    .from("rate_limit_events")
    .insert({ user_id: userId, action });

  return { limited: false };
}
