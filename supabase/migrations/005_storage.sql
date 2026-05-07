-- ============================================================
-- STORAGE BUCKETS
-- ============================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'content-media', 'content-media', true,
    52428800, -- 50 MB
    array['image/jpeg','image/jpg','image/png','image/webp','image/gif',
          'video/mp4','video/quicktime','video/webm','video/x-m4v']
  ),
  (
    'profile-photos', 'profile-photos', true,
    10485760, -- 10 MB
    array['image/jpeg','image/jpg','image/png','image/webp']
  )
on conflict (id) do nothing;

-- ── content-media policies ───────────────────────────────────

create policy "content-media: public read"
  on storage.objects for select
  using (bucket_id = 'content-media');

create policy "content-media: authenticated upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "content-media: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "content-media: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content-media'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ── profile-photos policies ──────────────────────────────────

create policy "profile-photos: public read"
  on storage.objects for select
  using (bucket_id = 'profile-photos');

create policy "profile-photos: authenticated upload own folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-photos: own update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "profile-photos: own delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'profile-photos'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
