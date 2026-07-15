-- ── "Become a host" needs self-insert on host_profiles ────────
-- Inserts previously came only from the signup trigger (SECURITY DEFINER).
-- One-account model: any authenticated user may create their own host row.
CREATE POLICY "host_profiles: self insert"
  ON host_profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);
