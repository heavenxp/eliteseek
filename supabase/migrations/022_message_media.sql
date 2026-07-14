-- ── Direct messages: add media_url ───────────────────────────
ALTER TABLE messages
  ADD COLUMN IF NOT EXISTS media_url text;

-- ── Event group messages: add media_url ──────────────────────
ALTER TABLE event_messages
  ADD COLUMN IF NOT EXISTS media_url text;
