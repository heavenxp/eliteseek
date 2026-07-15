-- ── Phase 6: events extended (PIVOT.md §2 — structured by design) ──
-- Adds forced end times, ticketing (price × capacity) on the Phase 4
-- Stripe-native escrow pattern, and the online event type.

-- ── 1. events: structure columns ──────────────────────────────
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS end_time time,
  ADD COLUMN IF NOT EXISTS price numeric(10,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  ADD COLUMN IF NOT EXISTS capacity integer CHECK (capacity IS NULL OR capacity >= 1),
  ADD COLUMN IF NOT EXISTS event_type text NOT NULL DEFAULT 'physical'
    CHECK (event_type IN ('physical', 'online'));

-- Backfill existing rows (test data): end = start + 2h, then enforce.
-- App-side creation always requires an explicit end time from here on.
UPDATE events SET end_time = time + interval '2 hours' WHERE end_time IS NULL;
ALTER TABLE events ALTER COLUMN end_time SET NOT NULL;

-- capacity: NULL = uncapped, permitted only for online events (streams /
-- watch parties) — physical events must cap at the DB level. Existing
-- physical test rows get a nominal cap before the constraint lands.
UPDATE events SET capacity = 20 WHERE event_type = 'physical' AND capacity IS NULL;
ALTER TABLE events ADD CONSTRAINT events_capacity_required_unless_online
  CHECK (event_type = 'online' OR capacity IS NOT NULL);

-- ── 2. Meeting links: separate member-gated table ─────────────
-- NOT a column on events: events_select exposes every column of public
-- events to any authenticated user via PostgREST, which would leak the
-- link to non-payers. Row here is readable only by members + creator.
CREATE TABLE IF NOT EXISTS event_meeting_links (
  event_id     uuid PRIMARY KEY REFERENCES events(id) ON DELETE CASCADE,
  meeting_link text NOT NULL,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE event_meeting_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "event_meeting_links: members and creator read"
  ON event_meeting_links FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM event_members m
      WHERE m.event_id = event_meeting_links.event_id
        AND m.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_meeting_links.event_id
        AND e.creator_id = auth.uid()
    )
  );

CREATE POLICY "event_meeting_links: creator write"
  ON event_meeting_links FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_meeting_links.event_id
        AND e.creator_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_meeting_links.event_id
        AND e.creator_id = auth.uid()
    )
  );

-- ── 3. Tickets: Phase 4 escrow pattern per seat ───────────────
-- Paid joins only — free events go straight to event_members with no
-- ticket row. Funds are captured to the platform Stripe balance
-- (transfer_group = event id) and transferred to the creator after the
-- event ends + dispute window; escrow_status mirrors Stripe as in bookings.
CREATE TABLE IF NOT EXISTS event_tickets (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id                 uuid NOT NULL REFERENCES events(id) ON DELETE CASCADE,
  user_id                  uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount                   numeric(10,2) NOT NULL CHECK (amount > 0),
  escrow_status            text NOT NULL DEFAULT 'held'
    CHECK (escrow_status IN ('held', 'release_scheduled', 'released', 'refunded', 'disputed')),
  stripe_payment_intent_id text,
  stripe_transfer_id       text,
  refunded_amount          numeric(10,2) NOT NULL DEFAULT 0,
  release_at               timestamptz,
  disputed_at              timestamptz,
  dispute_reason           text,
  created_at               timestamptz NOT NULL DEFAULT now(),
  UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_tickets_event ON event_tickets(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tickets_release
  ON event_tickets(escrow_status, release_at)
  WHERE escrow_status = 'release_scheduled';

ALTER TABLE event_tickets ENABLE ROW LEVEL SECURITY;

-- Ticket rows are written exclusively server-side (Stripe webhook via
-- service role) — no insert/update policies for authenticated on purpose.
CREATE POLICY "event_tickets: own or creator read"
  ON event_tickets FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM events e
      WHERE e.id = event_tickets.event_id
        AND e.creator_id = auth.uid()
    )
  );
