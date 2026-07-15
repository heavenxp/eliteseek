-- ── Apply ONLY after the one-account code deploy is live ──────
-- Drops the 028 transition views once nothing reads the old names.
DROP VIEW IF EXISTS companion_profiles;
DROP VIEW IF EXISTS client_profiles;
