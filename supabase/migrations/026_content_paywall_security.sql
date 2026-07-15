-- ── Phase 3: paywalled content must not be publicly enumerable ─
-- Supabase advisor: content-media bucket was public → anyone could list
-- files and bypass the PPV/subscription paywall. Flip it private; media is
-- served via server-side signed URLs generated only after a purchase check.
-- (profile-photos stays public — genuinely public surface.)

UPDATE storage.buckets SET public = false WHERE id = 'content-media';

DROP POLICY IF EXISTS "content-media: public read" ON storage.objects;

-- Creators keep read access to their own folder (client-side previews in
-- the studio); everyone else goes through server-signed URLs.
CREATE POLICY "content-media: owner read"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'content-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── shared-media: public bucket for stories / chat / event media ──
-- These surfaces are not paywalled; they used to share content-media.
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'shared-media', 'shared-media', true,
  52428800,
  ARRAY['image/jpeg','image/jpg','image/png','image/webp','image/gif',
        'video/mp4','video/quicktime','video/webm','video/x-m4v']
)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "shared-media: public read"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'shared-media');

CREATE POLICY "shared-media: authenticated upload own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'shared-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "shared-media: own update"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'shared-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "shared-media: own delete"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'shared-media'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── Phase 3: SECURITY DEFINER views (Supabase ERROR-level) ────
-- Both views were created without security_invoker, so they execute with
-- the owner's privileges and bypass RLS on the underlying tables.
--   companion_cards: only consumer is the authenticated browse page;
--     base policies (profiles: authenticated read, companion_profiles:
--     public read) cover it → invoker is safe.
--   client_membership: exposes stripe_customer_id to any authenticated
--     user under definer semantics, and has NO code consumers → invoker
--     limits it to each user's own row (client_profiles: own read).
ALTER VIEW companion_cards SET (security_invoker = true);
ALTER VIEW client_membership SET (security_invoker = true);
