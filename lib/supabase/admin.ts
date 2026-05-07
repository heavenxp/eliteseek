import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Service-role client for webhook and server-side operations that need to
// bypass RLS (e.g. recording payments from the Stripe webhook handler).
// Never expose this key to the browser.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
