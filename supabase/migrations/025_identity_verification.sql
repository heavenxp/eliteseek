-- ── Stripe Identity KYC for hosts (Phase 2) ───────────────────
-- identity_status tracks the KYC lifecycle; verification_tier stays the
-- public-facing badge and is promoted to 'verified' by the webhook.
ALTER TABLE companion_profiles
  ADD COLUMN IF NOT EXISTS identity_status text NOT NULL DEFAULT 'unverified'
    CHECK (identity_status IN ('unverified', 'pending', 'verified', 'failed')),
  ADD COLUMN IF NOT EXISTS stripe_identity_session_id text,
  ADD COLUMN IF NOT EXISTS identity_verified_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_companion_identity_session
  ON companion_profiles(stripe_identity_session_id)
  WHERE stripe_identity_session_id IS NOT NULL;
