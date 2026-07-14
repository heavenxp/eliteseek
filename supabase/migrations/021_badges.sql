-- ── Host tier column ──────────────────────────────────────────
ALTER TABLE companion_profiles
  ADD COLUMN IF NOT EXISTS host_tier text NOT NULL DEFAULT 'pearl'
  CHECK (host_tier IN ('pearl', 'rose', 'ruby', 'sapphire', 'diamond'));

-- ── Client tier column ─────────────────────────────────────────
ALTER TABLE client_profiles
  ADD COLUMN IF NOT EXISTS client_tier text NOT NULL DEFAULT 'bronze'
  CHECK (client_tier IN ('bronze', 'silver', 'gold', 'platinum'));

-- ── Content min-tier column on posts ──────────────────────────
ALTER TABLE posts
  ADD COLUMN IF NOT EXISTS content_min_tier text
  CHECK (content_min_tier IS NULL OR content_min_tier IN ('silver', 'gold', 'platinum'));

-- ── Function: compute host tier from average rating ────────────
CREATE OR REPLACE FUNCTION compute_host_tier(avg_rating numeric)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN avg_rating IS NULL    THEN 'pearl'
    WHEN avg_rating >= 4.8     THEN 'diamond'
    WHEN avg_rating >= 4.3     THEN 'sapphire'
    WHEN avg_rating >= 3.7     THEN 'ruby'
    WHEN avg_rating >= 3.0     THEN 'rose'
    ELSE                            'pearl'
  END;
$$;

-- ── Trigger function ───────────────────────────────────────────
CREATE OR REPLACE FUNCTION update_host_tier()
RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN
  NEW.host_tier := compute_host_tier(NEW.average_rating);
  RETURN NEW;
END;
$$;

-- ── Trigger on companion_profiles ─────────────────────────────
DROP TRIGGER IF EXISTS companion_profiles_host_tier ON companion_profiles;
CREATE TRIGGER companion_profiles_host_tier
  BEFORE INSERT OR UPDATE OF average_rating ON companion_profiles
  FOR EACH ROW EXECUTE FUNCTION update_host_tier();

-- ── Backfill existing rows ─────────────────────────────────────
UPDATE companion_profiles
  SET host_tier = compute_host_tier(average_rating);

-- ── Function: compute client tier from total booking spend ─────
CREATE OR REPLACE FUNCTION compute_client_tier(total_spent numeric)
RETURNS text
LANGUAGE sql IMMUTABLE AS $$
  SELECT CASE
    WHEN total_spent >= 2000 THEN 'platinum'
    WHEN total_spent >= 500  THEN 'gold'
    WHEN total_spent >= 100  THEN 'silver'
    ELSE                          'bronze'
  END;
$$;

-- ── Recreate companion_cards view to include host_tier ─────────
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
  cp.host_tier,
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
