-- Add is_admin flag to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

-- Lightweight rate-limit events table (used by lib/rate-limit.ts)
CREATE TABLE IF NOT EXISTS rate_limit_events (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action     text        NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS rate_limit_events_lookup_idx
  ON rate_limit_events (user_id, action, created_at DESC);

-- Purge rows older than 1 hour automatically via a simple check in the utility
-- (no cron needed — we just ignore old rows in the query)

ALTER TABLE rate_limit_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own events"
  ON rate_limit_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own events"
  ON rate_limit_events FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can bypass RLS for cleanup
CREATE POLICY "Service role full access"
  ON rate_limit_events
  USING (true)
  WITH CHECK (true);
