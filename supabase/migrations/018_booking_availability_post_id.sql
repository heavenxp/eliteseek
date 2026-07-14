-- Add availability_post_id to bookings so we can mark the post as booked
-- only when the host confirms (not at request time).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS availability_post_id uuid REFERENCES availability_posts(id);
