-- Migration 013: add username column to profiles table and auto-generate for all rows

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS username text;

-- Auto-generate from full_name: lowercase, spaces/dots → hyphens, strip everything else.
-- Use row_number() to de-duplicate (earlier-created profile keeps the plain slug).
WITH generated AS (
  SELECT
    id,
    lower(
      regexp_replace(
        regexp_replace(full_name, '[. ]+', '-', 'g'),
        '[^a-z0-9-]', '', 'g'
      )
    ) AS base_slug,
    row_number() OVER (
      PARTITION BY lower(
        regexp_replace(
          regexp_replace(full_name, '[. ]+', '-', 'g'),
          '[^a-z0-9-]', '', 'g'
        )
      )
      ORDER BY created_at
    ) AS rn
  FROM profiles
  WHERE username IS NULL
)
UPDATE profiles p
SET username = CASE
  WHEN g.rn = 1 THEN g.base_slug
  ELSE g.base_slug || '-' || g.rn
END
FROM generated g
WHERE p.id = g.id;

ALTER TABLE profiles
  ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Auto-generate usernames for companion_profiles rows that don't have one yet
WITH generated AS (
  SELECT
    cp.id,
    lower(
      regexp_replace(
        regexp_replace(coalesce(cp.display_name, p.full_name), '[. ]+', '-', 'g'),
        '[^a-z0-9-]', '', 'g'
      )
    ) AS base_slug,
    row_number() OVER (
      PARTITION BY lower(
        regexp_replace(
          regexp_replace(coalesce(cp.display_name, p.full_name), '[. ]+', '-', 'g'),
          '[^a-z0-9-]', '', 'g'
        )
      )
      ORDER BY cp.created_at
    ) AS rn
  FROM companion_profiles cp
  JOIN profiles p ON p.id = cp.user_id
  WHERE cp.username IS NULL
)
UPDATE companion_profiles cp
SET username = CASE
  WHEN g.rn = 1 THEN g.base_slug
  ELSE g.base_slug || '-' || g.rn
END
FROM generated g
WHERE cp.id = g.id;
