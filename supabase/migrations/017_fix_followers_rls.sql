-- Fix posts SELECT policy to enforce followers-only audience at the DB level.
-- Previously the policy only blocked 'private' posts, leaving 'followers' posts
-- accessible to anyone authenticated.

DROP POLICY IF EXISTS "posts_select" ON posts;

CREATE POLICY "posts_select" ON posts FOR SELECT
  USING (
    -- public posts visible to everyone (including unauthenticated)
    audience = 'public'
    -- owner always sees their own posts
    OR auth.uid() = user_id
    -- followers-only: must be following the author
    OR (
      audience = 'followers'
      AND EXISTS (
        SELECT 1 FROM follows
        WHERE follower_id = auth.uid()
          AND following_id = posts.user_id
      )
    )
  );
