-- Locked posts: host can set a gift price to unlock content
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS locked_price numeric
    CHECK (locked_price IS NULL OR locked_price >= 1);
