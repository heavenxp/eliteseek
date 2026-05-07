-- Social feed tables

CREATE TABLE IF NOT EXISTS posts (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 500),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS post_likes (
  post_id    uuid NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE IF NOT EXISTS post_comments (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id    uuid        NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    text        NOT NULL CHECK (char_length(content) BETWEEN 1 AND 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS posts_user_id_idx        ON posts (user_id);
CREATE INDEX IF NOT EXISTS posts_created_at_idx     ON posts (created_at DESC);
CREATE INDEX IF NOT EXISTS post_likes_post_id_idx   ON post_likes (post_id);
CREATE INDEX IF NOT EXISTS post_comments_post_id_idx ON post_comments (post_id, created_at);

-- RLS
ALTER TABLE posts          ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes     ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments  ENABLE ROW LEVEL SECURITY;

-- posts policies
CREATE POLICY "posts_select_all"   ON posts FOR SELECT USING (true);
CREATE POLICY "posts_insert_own"   ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "posts_delete_own"   ON posts FOR DELETE USING (auth.uid() = user_id);

-- post_likes policies
CREATE POLICY "likes_select_all"   ON post_likes FOR SELECT USING (true);
CREATE POLICY "likes_insert_own"   ON post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "likes_delete_own"   ON post_likes FOR DELETE USING (auth.uid() = user_id);

-- post_comments policies
CREATE POLICY "comments_select_all"  ON post_comments FOR SELECT USING (true);
CREATE POLICY "comments_insert_own"  ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_delete_own"  ON post_comments FOR DELETE USING (auth.uid() = user_id);
