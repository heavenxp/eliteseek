-- Feed ranking signals

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country text;

ALTER TABLE posts ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

CREATE INDEX IF NOT EXISTS posts_tags_idx ON posts USING GIN (tags);
