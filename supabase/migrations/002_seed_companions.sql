-- ============================================================
-- EliteSeek — Seed Companions (development / demo data)
-- Bypasses auth.users FK so profiles can be seeded without
-- creating real auth accounts.
-- ============================================================

SET session_replication_role = replica;

INSERT INTO public.profiles (id, full_name, role, kyc_status, created_at, updated_at) VALUES
  ('c1000000-0000-0000-0000-000000000001', 'Isabelle M.',   'companion', 'verified', now() - interval '30 days', now()),
  ('c1000000-0000-0000-0000-000000000002', 'Camille R.',    'companion', 'verified', now() - interval '25 days', now()),
  ('c1000000-0000-0000-0000-000000000003', 'Valentina S.',  'companion', 'verified', now() - interval '20 days', now()),
  ('c1000000-0000-0000-0000-000000000004', 'Aria K.',       'companion', 'verified', now() - interval '18 days', now()),
  ('c1000000-0000-0000-0000-000000000005', 'Sofia L.',      'companion', 'verified', now() - interval '14 days', now()),
  ('c1000000-0000-0000-0000-000000000006', 'Nina P.',       'companion', 'verified', now() - interval '10 days', now()),
  ('c1000000-0000-0000-0000-000000000007', 'Mia T.',        'companion', 'verified', now() - interval '7 days',  now()),
  ('c1000000-0000-0000-0000-000000000008', 'Elara V.',      'companion', 'verified', now() - interval '3 days',  now())
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.companion_profiles (
  user_id, display_name, bio, tagline, location, age,
  tags, languages,
  visibility, verification_tier,
  subscription_price, booking_rate_hourly, profile_unlock_fee,
  tip_menu, is_available, is_featured,
  average_rating, total_reviews,
  created_at, updated_at
) VALUES
(
  'c1000000-0000-0000-0000-000000000001',
  'Isabelle M.',
  'Art curator by day, the most captivating dinner companion you will ever meet. I live for gallery openings, Michelin-starred tables, and conversations that linger past midnight.',
  'Art curator & the most captivating dinner companion',
  'Monaco', 26,
  ARRAY['Dinners', 'Travel', 'Events', 'Art', 'Fashion'],
  ARRAY['English', 'French', 'Italian'],
  'public', 'select',
  29.99, 350.00, 25.00,
  '[{"name":"Rose","amount":50},{"name":"Champagne","amount":120},{"name":"Weekend Companion","amount":500}]',
  true, true,
  5.0, 48,
  now() - interval '30 days', now()
),
(
  'c1000000-0000-0000-0000-000000000002',
  'Camille R.',
  'Former runway model fluent in five languages and effortlessly elegant in any room. My world is events, fashion weeks, and the kind of social occasions that become stories.',
  'Former model. Fluent in five languages. Effortlessly elegant.',
  'Paris', 24,
  ARRAY['Events', 'Fashion', 'Travel', 'Galas', 'Social'],
  ARRAY['English', 'French', 'Spanish', 'Italian', 'Portuguese'],
  'public', 'verified',
  19.99, 280.00, null,
  '[{"name":"Flowers","amount":40},{"name":"Dinner Gift","amount":80}]',
  true, true,
  4.9, 63,
  now() - interval '25 days', now()
),
(
  'c1000000-0000-0000-0000-000000000003',
  'Valentina S.',
  'Classical pianist and socialite who turns every room into a stage. My passions are opera, fine dining, and the art of meaningful conversation. Based in Milan, available worldwide.',
  'Classical pianist. She turns every room into a stage.',
  'Milan', 28,
  ARRAY['Galas', 'Opera', 'Travel', 'Dinners', 'Events'],
  ARRAY['English', 'Italian', 'French', 'Russian'],
  'locked', 'select',
  49.99, 500.00, 50.00,
  '[{"name":"Flowers","amount":60},{"name":"Champagne","amount":150},{"name":"Private Performance","amount":400}]',
  true, true,
  5.0, 31,
  now() - interval '20 days', now()
),
(
  'c1000000-0000-0000-0000-000000000004',
  'Aria K.',
  'Luxury lifestyle curator with an eye for the extraordinary. Whether it is a yacht evening in the Gulf or a private dinner in Burj Al Arab, I curate the experience around you.',
  'Luxury lifestyle curator with an eye for the extraordinary.',
  'Dubai', 25,
  ARRAY['Travel', 'Dinners', 'Events', 'Yachts', 'Social'],
  ARRAY['English', 'Arabic', 'French'],
  'public', 'verified',
  24.99, 400.00, null,
  '[{"name":"Rose","amount":50},{"name":"Gift","amount":100}]',
  false, false,
  4.8, 57,
  now() - interval '18 days', now()
),
(
  'c1000000-0000-0000-0000-000000000005',
  'Sofia L.',
  'Theatre director and social butterfly. London is my stage but I travel extensively. I bring warmth, wit, and genuine curiosity to every engagement.',
  'Theatre director. Warmth, wit, and genuine curiosity.',
  'London', 27,
  ARRAY['Theatre', 'Dinners', 'Social', 'Events', 'Travel'],
  ARRAY['English', 'Spanish', 'German'],
  'public', 'verified',
  14.99, 220.00, null,
  '[{"name":"Tea & Flowers","amount":35},{"name":"Theatre Gift","amount":90}]',
  true, false,
  4.7, 42,
  now() - interval '14 days', now()
),
(
  'c1000000-0000-0000-0000-000000000006',
  'Nina P.',
  'Gallerist and art world insider in New York. I know every opening, every collector, and the best table at every restaurant in Manhattan. Cultured, sharp, and endlessly engaging.',
  'Gallerist. Art world insider. Best table in every room.',
  'New York', 29,
  ARRAY['Art', 'Galas', 'Social', 'Dinners', 'Events'],
  ARRAY['English', 'French', 'Russian'],
  'public', 'verified',
  34.99, 380.00, 30.00,
  '[{"name":"Flowers","amount":55},{"name":"Art Book","amount":80},{"name":"Gallery Night","amount":200}]',
  true, false,
  4.9, 38,
  now() - interval '10 days', now()
),
(
  'c1000000-0000-0000-0000-000000000007',
  'Mia T.',
  'Sydney born, world-schooled. Passionate about coastal adventures, great food, and meeting fascinating people. Sun, sea, and spontaneous stories — that is my world.',
  'Coastal soul. Spontaneous stories. Always available.',
  'Sydney', 23,
  ARRAY['Travel', 'Social', 'Dinners', 'Events', 'Beach'],
  ARRAY['English'],
  'public', 'verified',
  9.99, 180.00, null,
  '[{"name":"Flowers","amount":30}]',
  true, false,
  4.6, 19,
  now() - interval '7 days', now()
),
(
  'c1000000-0000-0000-0000-000000000008',
  'Elara V.',
  'Singapore-based global citizen, equally at home at a black tie gala or a private island. Former diplomat, now your most sophisticated companion for life''s finest occasions.',
  'Former diplomat. Global citizen. Sophistication personified.',
  'Singapore', 31,
  ARRAY['Galas', 'Events', 'Travel', 'Dinners', 'Social'],
  ARRAY['English', 'Mandarin', 'French', 'Japanese'],
  'public', 'select',
  39.99, 450.00, 40.00,
  '[{"name":"Flowers","amount":60},{"name":"Silk Gift","amount":150},{"name":"Private Dinner","amount":350}]',
  true, false,
  4.9, 22,
  now() - interval '3 days', now()
)
ON CONFLICT (user_id) DO NOTHING;

RESET session_replication_role;
