-- Add audience visibility control to posts
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'public'
    CHECK (audience IN ('public', 'followers', 'private'));

-- Replace the blanket select policy with one that hides private posts
DROP POLICY IF EXISTS "posts_select_all" ON posts;
CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (audience != 'private' OR auth.uid() = user_id);
