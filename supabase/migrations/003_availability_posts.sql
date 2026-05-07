-- ============================================================
-- EliteSeek — Availability Posts
-- ============================================================

create type availability_category as enum (
  'lunch',
  'dinner',
  'private_dining',
  'business_coaching',
  'social_coaching',
  'travel_companion',
  'event_plus_one',
  'yacht_luxury',
  'gallery_art',
  'weekend_getaway'
);

create table availability_posts (
  id             uuid                   primary key default gen_random_uuid(),
  companion_id   uuid                   not null references companion_profiles(id) on delete cascade,
  category       availability_category  not null,
  title          text                   not null check (char_length(title) >= 3),
  description    text,
  date_from      timestamptz            not null,
  date_to        timestamptz,
  location_city  text                   not null,
  venue_type     text,
  price          numeric(10,2)          not null check (price >= 0),
  max_guests     integer                not null default 1 check (max_guests >= 1 and max_guests <= 20),
  photos         jsonb                  not null default '[]',
  visibility     visibility_level       not null default 'public',
  is_booked      boolean                not null default false,
  created_at     timestamptz            not null default now(),
  updated_at     timestamptz            not null default now()
);

create trigger availability_posts_updated_at
  before update on availability_posts
  for each row execute function update_updated_at();

create index idx_availability_posts_companion on availability_posts(companion_id);
create index idx_availability_posts_date      on availability_posts(date_from);
create index idx_availability_posts_category  on availability_posts(category);
create index idx_availability_posts_feed      on availability_posts(date_from, is_booked, visibility);

alter table availability_posts enable row level security;

-- Companion: full access to own posts
create policy "availability_posts: companion manage"
  on availability_posts for all
  using  (auth.uid() = (select user_id from companion_profiles where id = companion_id))
  with check (auth.uid() = (select user_id from companion_profiles where id = companion_id));

-- Authenticated clients: read public upcoming posts
create policy "availability_posts: client read public"
  on availability_posts for select
  using (
    auth.uid() is not null
    and visibility = 'public'
    and is_booked = false
    and date_from > now() - interval '1 hour'
  );

-- Subscribers: read locked posts
create policy "availability_posts: subscriber read locked"
  on availability_posts for select
  using (
    auth.uid() is not null
    and visibility = 'locked'
    and is_booked = false
    and date_from > now() - interval '1 hour'
    and exists (
      select 1 from subscriptions s
      where s.client_id  = auth.uid()
        and s.companion_id = availability_posts.companion_id
        and s.status = 'active'
    )
  );
