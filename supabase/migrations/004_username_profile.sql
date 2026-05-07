-- ============================================================
-- EliteSeek — Username + Services Offered (Migration 004)
-- ============================================================

-- Add username column with uniqueness and format constraint
ALTER TABLE public.companion_profiles
  ADD COLUMN IF NOT EXISTS username text UNIQUE
    CHECK (username ~ '^[a-z0-9_]{3,30}$');

-- Add services_offered column
ALTER TABLE public.companion_profiles
  ADD COLUMN IF NOT EXISTS services_offered jsonb NOT NULL DEFAULT '[]';

-- Index for fast username lookups
CREATE UNIQUE INDEX IF NOT EXISTS companion_profiles_username_idx
  ON public.companion_profiles (username)
  WHERE username IS NOT NULL;

-- Seed usernames for the 8 existing companions
UPDATE public.companion_profiles SET username = 'isabelle_m'  WHERE user_id = 'c1000000-0000-0000-0000-000000000001';
UPDATE public.companion_profiles SET username = 'camille_r'   WHERE user_id = 'c1000000-0000-0000-0000-000000000002';
UPDATE public.companion_profiles SET username = 'valentina_s' WHERE user_id = 'c1000000-0000-0000-0000-000000000003';
UPDATE public.companion_profiles SET username = 'aria_k'      WHERE user_id = 'c1000000-0000-0000-0000-000000000004';
UPDATE public.companion_profiles SET username = 'sofia_l'     WHERE user_id = 'c1000000-0000-0000-0000-000000000005';
UPDATE public.companion_profiles SET username = 'nina_p'      WHERE user_id = 'c1000000-0000-0000-0000-000000000006';
UPDATE public.companion_profiles SET username = 'mia_t'       WHERE user_id = 'c1000000-0000-0000-0000-000000000007';
UPDATE public.companion_profiles SET username = 'elara_v'     WHERE user_id = 'c1000000-0000-0000-0000-000000000008';

-- Drop and recreate companion_cards view to include username and services_offered
DROP VIEW IF EXISTS public.companion_cards;

CREATE VIEW public.companion_cards AS
SELECT
  cp.id,
  cp.user_id,
  p.full_name,
  COALESCE(cp.display_name, p.full_name) AS display_name,
  cp.tagline,
  cp.location,
  cp.age,
  cp.tags,
  cp.languages,
  cp.visibility,
  cp.verification_tier,
  cp.is_featured,
  cp.is_available,
  cp.average_rating,
  cp.total_reviews,
  cp.booking_rate_hourly,
  cp.subscription_price,
  cp.profile_unlock_fee,
  cp.cover_image_url,
  cp.username,
  cp.services_offered,
  cp.created_at
FROM public.companion_profiles cp
JOIN public.profiles p ON p.id = cp.user_id;
