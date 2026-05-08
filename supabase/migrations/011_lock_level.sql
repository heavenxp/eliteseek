-- Profile lock level system

ALTER TABLE companion_profiles
  ADD COLUMN IF NOT EXISTS lock_level text NOT NULL DEFAULT 'public'
  CHECK (lock_level IN ('public', 'request', 'silver', 'elite'));

-- Recreate companion_cards view to expose lock_level
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
  cp.lock_level,
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
