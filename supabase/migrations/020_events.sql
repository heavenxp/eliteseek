-- events
CREATE TABLE IF NOT EXISTS events (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title          text        NOT NULL,
  description    text,
  date           date        NOT NULL,
  time           time        NOT NULL,
  location       text,
  visibility     text        NOT NULL DEFAULT 'public' CHECK (visibility IN ('public','private')),
  cover_image_url text,
  created_at     timestamptz NOT NULL DEFAULT now()
);

-- event_members
CREATE TABLE IF NOT EXISTS event_members (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id   uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role       text        NOT NULL DEFAULT 'attendee' CHECK (role IN ('host','attendee')),
  joined_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

-- event_invite_codes
CREATE TABLE IF NOT EXISTS event_invite_codes (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id    uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  code        text        NOT NULL UNIQUE,
  max_uses    integer     NOT NULL DEFAULT 1,
  uses_count  integer     NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- event_messages
CREATE TABLE IF NOT EXISTS event_messages (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id      uuid        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id       uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content       text,
  message_type  text        NOT NULL DEFAULT 'text' CHECK (message_type IN ('text','voice')),
  audio_url     text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS event_members_event_id_idx   ON event_members(event_id);
CREATE INDEX IF NOT EXISTS event_members_user_id_idx    ON event_members(user_id);
CREATE INDEX IF NOT EXISTS event_messages_event_id_idx  ON event_messages(event_id);
CREATE INDEX IF NOT EXISTS event_invite_codes_code_idx  ON event_invite_codes(code);

-- RLS
ALTER TABLE events              ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_members       ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_invite_codes  ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_messages      ENABLE ROW LEVEL SECURITY;

-- ── events policies ──────────────────────────────────────────────
CREATE POLICY "events_select" ON events
  FOR SELECT TO authenticated
  USING (
    visibility = 'public'
    OR creator_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = events.id
        AND event_members.user_id  = auth.uid()
    )
  );

CREATE POLICY "events_insert_own" ON events
  FOR INSERT TO authenticated
  WITH CHECK (creator_id = auth.uid());

CREATE POLICY "events_update_own" ON events
  FOR UPDATE TO authenticated
  USING (creator_id = auth.uid());

CREATE POLICY "events_delete_own" ON events
  FOR DELETE TO authenticated
  USING (creator_id = auth.uid());

-- ── event_members policies ────────────────────────────────────────
CREATE POLICY "event_members_select" ON event_members
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_members.event_id
        AND (e.visibility = 'public' OR e.creator_id = auth.uid())
    )
  );

CREATE POLICY "event_members_insert_self" ON event_members
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "event_members_delete_self" ON event_members
  FOR DELETE TO authenticated
  USING (user_id = auth.uid());

-- ── event_invite_codes policies ───────────────────────────────────
-- Codes visible only to the event creator via RLS;
-- join-with-code flow uses admin client to bypass.
CREATE POLICY "event_invite_codes_creator" ON event_invite_codes
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id           = event_invite_codes.event_id
        AND events.creator_id   = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events
      WHERE events.id           = event_invite_codes.event_id
        AND events.creator_id   = auth.uid()
    )
  );

-- ── event_messages policies ───────────────────────────────────────
CREATE POLICY "event_messages_select" ON event_messages
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_members
      WHERE event_members.event_id = event_messages.event_id
        AND event_members.user_id  = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id           = event_messages.event_id
        AND e.creator_id   = auth.uid()
    )
  );

CREATE POLICY "event_messages_insert" ON event_messages
  FOR INSERT TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND (
      EXISTS (
        SELECT 1 FROM event_members
        WHERE event_members.event_id = event_messages.event_id
          AND event_members.user_id  = auth.uid()
      )
      OR EXISTS (
        SELECT 1 FROM events e
        WHERE e.id         = event_messages.event_id
          AND e.creator_id = auth.uid()
      )
    )
  );
