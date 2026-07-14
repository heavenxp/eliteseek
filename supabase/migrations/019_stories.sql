-- Instagram-style 24-hour stories

CREATE TABLE IF NOT EXISTS stories (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  media_url   text        NOT NULL,
  media_type  text        NOT NULL CHECK (media_type IN ('photo', 'video')),
  audience    text        NOT NULL DEFAULT 'public' CHECK (audience IN ('public', 'followers')),
  created_at  timestamptz NOT NULL DEFAULT now(),
  expires_at  timestamptz NOT NULL DEFAULT (now() + INTERVAL '24 hours'),
  viewed_by   uuid[]      NOT NULL DEFAULT '{}'
);

CREATE INDEX IF NOT EXISTS stories_user_id_idx    ON stories (user_id);
CREATE INDEX IF NOT EXISTS stories_expires_at_idx ON stories (expires_at);

ALTER TABLE stories ENABLE ROW LEVEL SECURITY;

-- Public stories visible to all authenticated users;
-- followers-only stories visible only to the author or their followers.
CREATE POLICY "stories_select" ON stories
  FOR SELECT
  TO authenticated
  USING (
    expires_at > now()
    AND (
      audience = 'public'
      OR auth.uid() = user_id
      OR (
        audience = 'followers'
        AND EXISTS (
          SELECT 1 FROM follows
          WHERE follower_id  = auth.uid()
            AND following_id = stories.user_id
        )
      )
    )
  );

CREATE POLICY "stories_insert_own" ON stories
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Owner can update (e.g. edit audience); viewed_by is updated via admin in server actions.
CREATE POLICY "stories_update_own" ON stories
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "stories_delete_own" ON stories
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);
