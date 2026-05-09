-- Allow hyphens in companion_profiles.username.
-- 004 defined CHECK (username ~ '^[a-z0-9_]{3,30}$') but
-- 013 backfills slugs via regexp_replace(..., '-', ...) producing hyphens.
ALTER TABLE companion_profiles
  DROP CONSTRAINT IF EXISTS companion_profiles_username_check;

ALTER TABLE companion_profiles
  ADD CONSTRAINT companion_profiles_username_check
    CHECK (username ~ '^[a-z0-9_-]{3,30}$');
