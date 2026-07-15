-- ── Phase 6: one-account model (PIVOT.md §2) ───────────────────
-- "Host" becomes a mode, not an identity:
--   companion_profiles → host_profiles  (rename only — every FK, index,
--     RLS policy, and trigger binds by OID and follows automatically)
--   client_profiles    → merged into profiles, then dropped (nothing
--     references client_profiles(id); it was pure per-user data)
-- Compatibility views under the old names bridge the window between this
-- migration running and the new code deploying; migration 029 drops them.

-- ── 1. companion_profiles → host_profiles ─────────────────────
ALTER TABLE companion_profiles RENAME TO host_profiles;

-- ── 2. Merge client_profiles into profiles ────────────────────
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS membership_tier membership_tier NOT NULL DEFAULT 'bronze',
  ADD COLUMN IF NOT EXISTS client_tier text NOT NULL DEFAULT 'bronze'
    CHECK (client_tier IN ('bronze', 'silver', 'gold', 'platinum')),
  ADD COLUMN IF NOT EXISTS membership_expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text;

UPDATE profiles p
SET membership_tier        = c.membership_tier,
    client_tier            = c.client_tier,
    membership_expires_at  = c.membership_expires_at,
    stripe_customer_id     = c.stripe_customer_id,
    stripe_subscription_id = c.stripe_subscription_id
FROM client_profiles c
WHERE c.user_id = p.id;

-- client_membership view reads client_profiles and has no code consumers
-- (established in migration 026 analysis) — drop it with the table.
DROP VIEW IF EXISTS client_membership;
DROP TABLE client_profiles;

-- ── 3. Compatibility views (transition window only) ───────────
-- Old deployed code keeps reading `companion_profiles` / `client_profiles`
-- for the ~2 minutes between this migration and the code deploy. Both are
-- single-relation views → selects work unchanged; security_invoker keeps
-- RLS enforced as the querying user. Dropped in migration 029.
CREATE VIEW companion_profiles
  WITH (security_invoker = true) AS
  SELECT * FROM host_profiles;

CREATE VIEW client_profiles
  WITH (security_invoker = true) AS
  SELECT
    id AS id,               -- old PK never referenced by FKs; user_id was the join key
    id AS user_id,
    membership_tier,
    client_tier,
    membership_expires_at,
    stripe_customer_id,
    stripe_subscription_id,
    created_at,
    updated_at
  FROM profiles
  WHERE role = 'client';
