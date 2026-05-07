-- ============================================================
-- EliteSeek — Initial Schema
-- Run this in Supabase SQL Editor (Project → SQL Editor → New query)
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";


-- ── Enums ───────────────────────────────────────────────────
create type user_role            as enum ('client', 'companion');
create type visibility_level     as enum ('public', 'locked', 'elite_only');
create type verification_tier    as enum ('unverified', 'verified', 'select');
create type membership_tier      as enum ('bronze', 'silver', 'elite');
create type booking_status       as enum ('pending', 'confirmed', 'cancelled', 'completed', 'disputed');
create type booking_type         as enum ('dinner', 'event', 'travel', 'social', 'virtual');
create type subscription_status  as enum ('active', 'cancelled', 'expired', 'past_due');
create type moderation_status    as enum ('pending', 'approved', 'rejected', 'flagged');
create type gift_type            as enum ('physical', 'virtual');
create type gift_status          as enum ('pending', 'sent', 'received', 'cancelled');
create type transaction_type     as enum ('subscription', 'ppv', 'booking', 'tip', 'gift', 'profile_unlock', 'membership');
create type transaction_status   as enum ('pending', 'completed', 'refunded', 'failed');
create type access_request_status as enum ('pending', 'approved', 'declined');
create type kyc_status           as enum ('not_started', 'pending', 'verified', 'failed');
create type stripe_account_status as enum ('not_connected', 'pending', 'active', 'restricted');


-- ── Shared updated_at trigger ────────────────────────────────
create or replace function update_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;


-- ============================================================
-- PROFILES (base — extends auth.users)
-- ============================================================
create table profiles (
  id                uuid        primary key references auth.users(id) on delete cascade,
  full_name         text        not null,
  role              user_role   not null,
  avatar_url        text,
  phone             text,
  date_of_birth     date,
  kyc_status        kyc_status  not null default 'not_started',
  kyc_session_id    text,
  is_suspended      boolean     not null default false,
  suspension_reason text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create trigger profiles_updated_at
  before update on profiles
  for each row execute function update_updated_at();

alter table profiles enable row level security;

-- Users can read their own profile
create policy "profiles: own read"
  on profiles for select
  using (auth.uid() = id);

-- Authenticated users can read any profile's public fields (name, role, avatar)
-- Full data is gated per-feature below
create policy "profiles: authenticated read"
  on profiles for select
  to authenticated
  using (true);

-- Users can update their own profile
create policy "profiles: own update"
  on profiles for update
  using (auth.uid() = id);


-- ============================================================
-- COMPANION PROFILES
-- ============================================================
create table companion_profiles (
  id                    uuid                 primary key default gen_random_uuid(),
  user_id               uuid                 not null unique references profiles(id) on delete cascade,
  display_name          text,
  bio                   text,
  tagline               text,
  location              text,
  age                   integer              check (age >= 18 and age <= 99),
  languages             text[]               not null default '{}',
  tags                  text[]               not null default '{}',
  visibility            visibility_level     not null default 'public',
  verification_tier     verification_tier    not null default 'unverified',
  profile_unlock_fee    numeric(10,2)        check (profile_unlock_fee >= 10 or profile_unlock_fee is null),
  subscription_price    numeric(10,2)        check (subscription_price >= 9.99 or subscription_price is null),
  booking_rate_hourly   numeric(10,2),
  tip_menu              jsonb                not null default '[]',
  is_available          boolean              not null default true,
  available_from        time,
  available_until       time,
  cover_image_url       text,
  stripe_account_id     text,
  stripe_account_status stripe_account_status not null default 'not_connected',
  moderation_strikes    integer              not null default 0 check (moderation_strikes >= 0),
  is_featured           boolean              not null default false,
  total_reviews         integer              not null default 0,
  average_rating        numeric(3,2)         check (average_rating >= 0 and average_rating <= 5),
  created_at            timestamptz          not null default now(),
  updated_at            timestamptz          not null default now()
);

create trigger companion_profiles_updated_at
  before update on companion_profiles
  for each row execute function update_updated_at();

create index idx_companion_profiles_user_id   on companion_profiles(user_id);
create index idx_companion_profiles_visibility on companion_profiles(visibility);
create index idx_companion_profiles_location   on companion_profiles(location);
create index idx_companion_profiles_tags       on companion_profiles using gin(tags);

alter table companion_profiles enable row level security;

-- Public profiles visible to all; locked/elite_only filtered via application logic
create policy "companion_profiles: public read"
  on companion_profiles for select
  using (visibility = 'public' or auth.uid() = user_id);

create policy "companion_profiles: own update"
  on companion_profiles for update
  using (auth.uid() = user_id);


-- ============================================================
-- CLIENT PROFILES
-- ============================================================
create table client_profiles (
  id                      uuid            primary key default gen_random_uuid(),
  user_id                 uuid            not null unique references profiles(id) on delete cascade,
  membership_tier         membership_tier not null default 'bronze',
  membership_expires_at   timestamptz,
  stripe_customer_id      text,
  stripe_subscription_id  text,
  created_at              timestamptz     not null default now(),
  updated_at              timestamptz     not null default now()
);

create trigger client_profiles_updated_at
  before update on client_profiles
  for each row execute function update_updated_at();

create index idx_client_profiles_user_id on client_profiles(user_id);

alter table client_profiles enable row level security;

create policy "client_profiles: own read/update"
  on client_profiles for all
  using (auth.uid() = user_id);


-- ============================================================
-- PROFILE PHOTOS
-- ============================================================
create table profile_photos (
  id                uuid              primary key default gen_random_uuid(),
  companion_id      uuid              not null references companion_profiles(id) on delete cascade,
  storage_path      text              not null,
  is_cover          boolean           not null default false,
  is_public         boolean           not null default true,
  moderation_status moderation_status not null default 'pending',
  moderation_score  numeric(5,4),
  sort_order        integer           not null default 0,
  created_at        timestamptz       not null default now()
);

create index idx_profile_photos_companion on profile_photos(companion_id);

alter table profile_photos enable row level security;

create policy "profile_photos: public approved read"
  on profile_photos for select
  using (
    is_public = true and moderation_status = 'approved'
    or auth.uid() = (select user_id from companion_profiles where id = companion_id)
  );

create policy "profile_photos: own insert/delete"
  on profile_photos for all
  using (auth.uid() = (select user_id from companion_profiles where id = companion_id));


-- ============================================================
-- PROFILE UNLOCKS
-- ============================================================
create table profile_unlocks (
  id                        uuid        primary key default gen_random_uuid(),
  client_id                 uuid        not null references profiles(id) on delete cascade,
  companion_id              uuid        not null references companion_profiles(id) on delete cascade,
  amount_paid               numeric(10,2) not null default 0,
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now(),
  unique(client_id, companion_id)
);

create index idx_profile_unlocks_client    on profile_unlocks(client_id);
create index idx_profile_unlocks_companion on profile_unlocks(companion_id);

alter table profile_unlocks enable row level security;

create policy "profile_unlocks: own read"
  on profile_unlocks for select
  using (auth.uid() = client_id
      or auth.uid() = (select user_id from companion_profiles where id = companion_id));

create policy "profile_unlocks: client insert"
  on profile_unlocks for insert
  with check (auth.uid() = client_id);


-- ============================================================
-- ACCESS REQUESTS (request to view locked profile)
-- ============================================================
create table access_requests (
  id           uuid                   primary key default gen_random_uuid(),
  client_id    uuid                   not null references profiles(id) on delete cascade,
  companion_id uuid                   not null references companion_profiles(id) on delete cascade,
  status       access_request_status  not null default 'pending',
  message      text,
  responded_at timestamptz,
  created_at   timestamptz            not null default now(),
  unique(client_id, companion_id)
);

create index idx_access_requests_companion on access_requests(companion_id);
create index idx_access_requests_client    on access_requests(client_id);

alter table access_requests enable row level security;

create policy "access_requests: participants read"
  on access_requests for select
  using (
    auth.uid() = client_id
    or auth.uid() = (select user_id from companion_profiles where id = companion_id)
  );

create policy "access_requests: client insert"
  on access_requests for insert
  with check (auth.uid() = client_id);

create policy "access_requests: companion update"
  on access_requests for update
  using (auth.uid() = (select user_id from companion_profiles where id = companion_id));


-- ============================================================
-- BOOKINGS
-- ============================================================
create table bookings (
  id                        uuid           primary key default gen_random_uuid(),
  client_id                 uuid           not null references profiles(id),
  companion_id              uuid           not null references companion_profiles(id),
  booking_type              booking_type   not null,
  status                    booking_status not null default 'pending',
  scheduled_at              timestamptz    not null,
  duration_hours            numeric(4,1)   not null check (duration_hours > 0),
  location                  text,
  notes                     text,
  total_amount              numeric(10,2)  not null check (total_amount >= 0),
  platform_fee              numeric(10,2)  not null check (platform_fee >= 0),
  companion_earnings        numeric(10,2)  not null check (companion_earnings >= 0),
  stripe_payment_intent_id  text,
  cancelled_at              timestamptz,
  cancellation_reason       text,
  completed_at              timestamptz,
  review_score              integer        check (review_score >= 1 and review_score <= 5),
  review_text               text,
  created_at                timestamptz    not null default now(),
  updated_at                timestamptz    not null default now()
);

create trigger bookings_updated_at
  before update on bookings
  for each row execute function update_updated_at();

create index idx_bookings_client    on bookings(client_id);
create index idx_bookings_companion on bookings(companion_id);
create index idx_bookings_status    on bookings(status);
create index idx_bookings_scheduled on bookings(scheduled_at);

alter table bookings enable row level security;

create policy "bookings: participants read"
  on bookings for select
  using (
    auth.uid() = client_id
    or auth.uid() = (select user_id from companion_profiles where id = companion_id)
  );

create policy "bookings: client insert"
  on bookings for insert
  with check (auth.uid() = client_id);

create policy "bookings: participants update"
  on bookings for update
  using (
    auth.uid() = client_id
    or auth.uid() = (select user_id from companion_profiles where id = companion_id)
  );


-- ============================================================
-- CONTENT POSTS (creator content)
-- ============================================================
create table content_posts (
  id                  uuid              primary key default gen_random_uuid(),
  companion_id        uuid              not null references companion_profiles(id) on delete cascade,
  title               text,
  body                text,
  -- [{url, type: 'photo'|'video', thumbnail_url, storage_path}]
  media_urls          jsonb             not null default '[]',
  is_ppv              boolean           not null default false,
  ppv_price           numeric(10,2)     check (ppv_price >= 3 or ppv_price is null),
  is_subscribers_only boolean           not null default false,
  moderation_status   moderation_status not null default 'pending',
  moderation_score    numeric(5,4),
  published_at        timestamptz,
  created_at          timestamptz       not null default now(),
  updated_at          timestamptz       not null default now()
);

create trigger content_posts_updated_at
  before update on content_posts
  for each row execute function update_updated_at();

create index idx_content_posts_companion  on content_posts(companion_id);
create index idx_content_posts_published  on content_posts(published_at desc);
create index idx_content_posts_moderation on content_posts(moderation_status);

alter table content_posts enable row level security;

-- Approved public posts visible to all authenticated users
create policy "content_posts: approved read"
  on content_posts for select
  to authenticated
  using (
    moderation_status = 'approved' and published_at is not null
    or auth.uid() = (select user_id from companion_profiles where id = companion_id)
  );

create policy "content_posts: own insert/update/delete"
  on content_posts for all
  using (auth.uid() = (select user_id from companion_profiles where id = companion_id));


-- ============================================================
-- SUBSCRIPTIONS
-- ============================================================
create table subscriptions (
  id                     uuid                primary key default gen_random_uuid(),
  client_id              uuid                not null references profiles(id) on delete cascade,
  companion_id           uuid                not null references companion_profiles(id) on delete cascade,
  status                 subscription_status not null default 'active',
  price_per_month        numeric(10,2)       not null check (price_per_month >= 9.99),
  current_period_start   timestamptz         not null,
  current_period_end     timestamptz         not null,
  stripe_subscription_id text                unique,
  cancelled_at           timestamptz,
  created_at             timestamptz         not null default now(),
  updated_at             timestamptz         not null default now(),
  unique(client_id, companion_id)
);

create trigger subscriptions_updated_at
  before update on subscriptions
  for each row execute function update_updated_at();

create index idx_subscriptions_client    on subscriptions(client_id);
create index idx_subscriptions_companion on subscriptions(companion_id);
create index idx_subscriptions_status    on subscriptions(status);

alter table subscriptions enable row level security;

create policy "subscriptions: participants read"
  on subscriptions for select
  using (
    auth.uid() = client_id
    or auth.uid() = (select user_id from companion_profiles where id = companion_id)
  );

create policy "subscriptions: client insert"
  on subscriptions for insert
  with check (auth.uid() = client_id);


-- ============================================================
-- CONTENT PURCHASES (PPV)
-- ============================================================
create table content_purchases (
  id                        uuid        primary key default gen_random_uuid(),
  client_id                 uuid        not null references profiles(id) on delete cascade,
  post_id                   uuid        not null references content_posts(id) on delete cascade,
  amount_paid               numeric(10,2) not null check (amount_paid >= 3),
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now(),
  unique(client_id, post_id)
);

create index idx_content_purchases_client on content_purchases(client_id);
create index idx_content_purchases_post   on content_purchases(post_id);

alter table content_purchases enable row level security;

create policy "content_purchases: own read"
  on content_purchases for select
  using (auth.uid() = client_id);

create policy "content_purchases: client insert"
  on content_purchases for insert
  with check (auth.uid() = client_id);


-- ============================================================
-- WISHLIST ITEMS
-- ============================================================
create table wishlist_items (
  id            uuid        primary key default gen_random_uuid(),
  companion_id  uuid        not null references companion_profiles(id) on delete cascade,
  name          text        not null,
  description   text,
  price         numeric(10,2) not null check (price > 0),
  image_url     text,
  external_url  text,
  category      text,
  is_purchased  boolean     not null default false,
  purchased_by  uuid        references profiles(id),
  purchased_at  timestamptz,
  created_at    timestamptz not null default now()
);

create index idx_wishlist_items_companion on wishlist_items(companion_id);

alter table wishlist_items enable row level security;

create policy "wishlist_items: authenticated read"
  on wishlist_items for select
  to authenticated
  using (true);

create policy "wishlist_items: companion manage"
  on wishlist_items for all
  using (auth.uid() = (select user_id from companion_profiles where id = companion_id));

-- Allow marking as purchased by client
create policy "wishlist_items: client purchase update"
  on wishlist_items for update
  using (auth.role() = 'authenticated')
  with check (is_purchased = true and purchased_by = auth.uid());


-- ============================================================
-- GIFTS
-- ============================================================
create table gifts (
  id                        uuid        primary key default gen_random_uuid(),
  sender_id                 uuid        not null references profiles(id) on delete cascade,
  recipient_id              uuid        not null references companion_profiles(id) on delete cascade,
  wishlist_item_id          uuid        references wishlist_items(id),
  gift_type                 gift_type   not null,
  virtual_gift_name         text,
  amount                    numeric(10,2) not null check (amount > 0),
  message                   text,
  status                    gift_status not null default 'pending',
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now()
);

create trigger gifts_updated_at
  before update on gifts
  for each row execute function update_updated_at();

create index idx_gifts_sender    on gifts(sender_id);
create index idx_gifts_recipient on gifts(recipient_id);

alter table gifts enable row level security;

create policy "gifts: participants read"
  on gifts for select
  using (
    auth.uid() = sender_id
    or auth.uid() = (select user_id from companion_profiles where id = recipient_id)
  );

create policy "gifts: sender insert"
  on gifts for insert
  with check (auth.uid() = sender_id);


-- ============================================================
-- TIPS
-- ============================================================
create table tips (
  id                        uuid        primary key default gen_random_uuid(),
  client_id                 uuid        not null references profiles(id) on delete cascade,
  companion_id              uuid        not null references companion_profiles(id) on delete cascade,
  amount                    numeric(10,2) not null check (amount > 0),
  message                   text,
  stripe_payment_intent_id  text,
  created_at                timestamptz not null default now()
);

create index idx_tips_client    on tips(client_id);
create index idx_tips_companion on tips(companion_id);

alter table tips enable row level security;

create policy "tips: participants read"
  on tips for select
  using (
    auth.uid() = client_id
    or auth.uid() = (select user_id from companion_profiles where id = companion_id)
  );

create policy "tips: client insert"
  on tips for insert
  with check (auth.uid() = client_id);


-- ============================================================
-- CONVERSATIONS
-- ============================================================
create table conversations (
  id               uuid        primary key default gen_random_uuid(),
  client_id        uuid        not null references profiles(id) on delete cascade,
  companion_id     uuid        not null references profiles(id) on delete cascade,
  last_message_at  timestamptz,
  created_at       timestamptz not null default now(),
  unique(client_id, companion_id)
);

create index idx_conversations_client    on conversations(client_id);
create index idx_conversations_companion on conversations(companion_id);
create index idx_conversations_last_msg  on conversations(last_message_at desc);

alter table conversations enable row level security;

create policy "conversations: participants read"
  on conversations for select
  using (auth.uid() = client_id or auth.uid() = companion_id);

create policy "conversations: participants insert"
  on conversations for insert
  with check (auth.uid() = client_id or auth.uid() = companion_id);


-- ============================================================
-- MESSAGES
-- ============================================================
create table messages (
  id               uuid        primary key default gen_random_uuid(),
  conversation_id  uuid        not null references conversations(id) on delete cascade,
  sender_id        uuid        not null references profiles(id) on delete cascade,
  content          text        not null,
  is_read          boolean     not null default false,
  created_at       timestamptz not null default now()
);

create index idx_messages_conversation on messages(conversation_id, created_at desc);
create index idx_messages_sender       on messages(sender_id);

alter table messages enable row level security;

create policy "messages: conversation participants"
  on messages for all
  using (
    auth.uid() in (
      select client_id from conversations where id = conversation_id
      union
      select companion_id from conversations where id = conversation_id
    )
  );


-- Trigger: update last_message_at on conversations
create or replace function update_conversation_last_message()
returns trigger
language plpgsql
as $$
begin
  update conversations
  set last_message_at = new.created_at
  where id = new.conversation_id;
  return new;
end;
$$;

create trigger messages_update_conversation
  after insert on messages
  for each row execute function update_conversation_last_message();


-- ============================================================
-- NOTIFICATIONS
-- ============================================================
create table notifications (
  id         uuid        primary key default gen_random_uuid(),
  user_id    uuid        not null references profiles(id) on delete cascade,
  type       text        not null,
  title      text        not null,
  body       text,
  data       jsonb       not null default '{}',
  is_read    boolean     not null default false,
  created_at timestamptz not null default now()
);

create index idx_notifications_user    on notifications(user_id, created_at desc);
create index idx_notifications_unread  on notifications(user_id) where is_read = false;

alter table notifications enable row level security;

create policy "notifications: own read/update"
  on notifications for all
  using (auth.uid() = user_id);


-- ============================================================
-- TRANSACTIONS (financial ledger)
-- ============================================================
create table transactions (
  id                        uuid               primary key default gen_random_uuid(),
  type                      transaction_type   not null,
  from_user_id              uuid               references profiles(id),
  to_user_id                uuid               references profiles(id),
  gross_amount              numeric(10,2)      not null check (gross_amount >= 0),
  platform_fee              numeric(10,2)      not null default 0 check (platform_fee >= 0),
  net_amount                numeric(10,2)      not null check (net_amount >= 0),
  stripe_payment_intent_id  text,
  stripe_transfer_id        text,
  status                    transaction_status not null default 'pending',
  reference_id              uuid,
  reference_type            text,
  metadata                  jsonb              not null default '{}',
  created_at                timestamptz        not null default now(),
  updated_at                timestamptz        not null default now()
);

create trigger transactions_updated_at
  before update on transactions
  for each row execute function update_updated_at();

create index idx_transactions_from_user on transactions(from_user_id);
create index idx_transactions_to_user   on transactions(to_user_id);
create index idx_transactions_type      on transactions(type);
create index idx_transactions_status    on transactions(status);
create index idx_transactions_reference on transactions(reference_id);

alter table transactions enable row level security;

create policy "transactions: own read"
  on transactions for select
  using (auth.uid() = from_user_id or auth.uid() = to_user_id);


-- ============================================================
-- MODERATION LOG
-- ============================================================
create table moderation_log (
  id               uuid        primary key default gen_random_uuid(),
  subject_id       uuid        not null references profiles(id) on delete cascade,
  content_id       uuid,
  content_type     text,
  action           text        not null,
  reason           text,
  moderation_score numeric(5,4),
  hive_response    jsonb,
  reviewed_by      uuid        references profiles(id),
  created_at       timestamptz not null default now()
);

create index idx_moderation_log_subject on moderation_log(subject_id);
create index idx_moderation_log_content on moderation_log(content_id);

alter table moderation_log enable row level security;
-- Moderation log readable by admins only — enforced via service role in API routes


-- ============================================================
-- MODERATION STRIKES
-- ============================================================
create table moderation_strikes (
  id           uuid        primary key default gen_random_uuid(),
  user_id      uuid        not null references profiles(id) on delete cascade,
  reason       text        not null,
  evidence_url text,
  content_id   uuid,
  issued_by    uuid        references profiles(id),
  created_at   timestamptz not null default now()
);

create index idx_moderation_strikes_user on moderation_strikes(user_id);

alter table moderation_strikes enable row level security;

create policy "moderation_strikes: own read"
  on moderation_strikes for select
  using (auth.uid() = user_id);


-- ============================================================
-- HANDLE NEW USER TRIGGER
-- Fires after every new auth.users insert to create the profile
-- and role-specific sub-profile automatically.
-- ============================================================
create or replace function handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role      user_role;
  v_full_name text;
begin
  -- Pull metadata set during signUp()
  v_role      := coalesce((new.raw_user_meta_data->>'role')::user_role, 'client');
  v_full_name := coalesce(
    nullif(trim(new.raw_user_meta_data->>'full_name'), ''),
    split_part(new.email, '@', 1)
  );

  insert into public.profiles (id, full_name, role)
  values (new.id, v_full_name, v_role)
  on conflict (id) do nothing;

  if v_role = 'companion' then
    insert into public.companion_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  else
    insert into public.client_profiles (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();


-- ============================================================
-- HELPFUL VIEWS
-- ============================================================

-- Companion card view — safe public data for browse feed
create or replace view companion_cards as
select
  cp.id,
  cp.user_id,
  p.full_name,
  coalesce(cp.display_name, p.full_name) as display_name,
  cp.tagline,
  cp.location,
  cp.age,
  cp.tags,
  cp.languages,
  cp.visibility,
  cp.verification_tier,
  cp.is_featured,
  cp.is_available,
  cp.average_rating,
  cp.total_reviews,
  cp.booking_rate_hourly,
  cp.subscription_price,
  cp.profile_unlock_fee,
  cp.cover_image_url,
  cp.created_at
from companion_profiles cp
join profiles p on p.id = cp.user_id
where p.is_suspended = false;

-- Client membership view
create or replace view client_membership as
select
  p.id,
  p.full_name,
  p.avatar_url,
  cl.membership_tier,
  cl.membership_expires_at,
  cl.stripe_customer_id
from client_profiles cl
join profiles p on p.id = cl.user_id;


-- ============================================================
-- REALTIME
-- Enable Supabase Realtime on messaging and notifications
-- ============================================================
alter publication supabase_realtime add table messages;
alter publication supabase_realtime add table notifications;
alter publication supabase_realtime add table conversations;


-- ============================================================
-- STORAGE BUCKETS
-- Run these after creating the buckets in Supabase Storage UI,
-- or they will be created automatically via the Dashboard.
-- ============================================================
-- Bucket: profile-photos   (public)
-- Bucket: content-media    (private, served via signed URLs)
-- Bucket: avatars          (public)
