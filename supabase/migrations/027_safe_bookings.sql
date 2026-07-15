-- ── Phase 4: Safe Bookings ─────────────────────────────────────
-- Escrow is Stripe-native (separate charges & transfers): funds are captured
-- into the platform's Stripe balance and transferred to the host only after
-- completion + 48h dispute window. escrow_status mirrors Stripe state for UX;
-- PaymentIntents / Transfers / Refunds remain the source of truth.

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS escrow_status text NOT NULL DEFAULT 'unpaid'
    CHECK (escrow_status IN ('unpaid', 'held', 'release_scheduled', 'released', 'refunded', 'disputed')),
  ADD COLUMN IF NOT EXISTS paid_at timestamptz,
  ADD COLUMN IF NOT EXISTS release_at timestamptz,
  ADD COLUMN IF NOT EXISTS stripe_transfer_id text,
  ADD COLUMN IF NOT EXISTS checkin_at timestamptz,
  ADD COLUMN IF NOT EXISTS checkout_at timestamptz,
  ADD COLUMN IF NOT EXISTS disputed_at timestamptz,
  ADD COLUMN IF NOT EXISTS dispute_reason text,
  ADD COLUMN IF NOT EXISTS sos_notified_at timestamptz,
  ADD COLUMN IF NOT EXISTS refunded_amount numeric(10,2) NOT NULL DEFAULT 0,
  -- Policy snapshot at booking time so a host changing policy later can't
  -- retroactively change refund terms
  ADD COLUMN IF NOT EXISTS cancellation_policy text
    CHECK (cancellation_policy IS NULL OR cancellation_policy IN ('flexible', 'moderate', 'strict'));

CREATE INDEX IF NOT EXISTS idx_bookings_escrow_release
  ON bookings(escrow_status, release_at)
  WHERE escrow_status = 'release_scheduled';

-- Safety: SOS scan needs paid, un-checked-out bookings past their window
CREATE INDEX IF NOT EXISTS idx_bookings_sos
  ON bookings(scheduled_at)
  WHERE escrow_status IN ('held', 'release_scheduled') AND checkout_at IS NULL;

-- ── Host settings: cancellation policy + trusted contact ──────
ALTER TABLE companion_profiles
  ADD COLUMN IF NOT EXISTS cancellation_policy text NOT NULL DEFAULT 'moderate'
    CHECK (cancellation_policy IN ('flexible', 'moderate', 'strict')),
  ADD COLUMN IF NOT EXISTS trusted_contact_name text,
  ADD COLUMN IF NOT EXISTS trusted_contact_email text,
  ADD COLUMN IF NOT EXISTS trusted_contact_phone text;

-- ── Client ratings: hosts rate clients after completed bookings;
--    visible to other hosts BEFORE accepting a request ───────────
CREATE TABLE IF NOT EXISTS client_reviews (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id   uuid        NOT NULL UNIQUE REFERENCES bookings(id) ON DELETE CASCADE,
  companion_id uuid        NOT NULL REFERENCES companion_profiles(id) ON DELETE CASCADE,
  client_id    uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating       integer     NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_client_reviews_client ON client_reviews(client_id);

ALTER TABLE client_reviews ENABLE ROW LEVEL SECURITY;

-- Any verified host may read client ratings (they decide whether to accept);
-- clients may read reviews about themselves.
CREATE POLICY "client_reviews: hosts read"
  ON client_reviews FOR SELECT
  TO authenticated
  USING (
    client_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM companion_profiles cp WHERE cp.user_id = auth.uid()
    )
  );

-- Only the host on the completed booking can rate, once (UNIQUE booking_id)
CREATE POLICY "client_reviews: booking host insert"
  ON client_reviews FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM bookings b
      JOIN companion_profiles cp ON cp.id = b.companion_id
      WHERE b.id = booking_id
        AND cp.user_id = auth.uid()
        AND cp.id = companion_id
        AND b.client_id = client_reviews.client_id
        AND b.completed_at IS NOT NULL
    )
  );
