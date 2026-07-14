ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS searchable boolean NOT NULL DEFAULT true;
