export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

// ── Enums ────────────────────────────────────────────────────
export type UserRole             = "client" | "companion";
export type VisibilityLevel      = "public" | "locked" | "elite_only";
export type LockLevel            = "public" | "request" | "silver" | "elite";
export type VerificationTier     = "unverified" | "verified" | "select";
export type IdentityStatus       = "unverified" | "pending" | "verified" | "failed";
export type EscrowStatus         = "unpaid" | "held" | "release_scheduled" | "released" | "refunded" | "disputed";
export type MembershipTier       = "bronze" | "silver" | "elite";
export type HostTier             = "pearl" | "rose" | "ruby" | "sapphire" | "diamond";
export type ClientTier           = "bronze" | "silver" | "gold" | "platinum";
export type BookingStatus        = "pending" | "confirmed" | "cancelled" | "completed" | "disputed";
export type BookingType          = "dinner" | "event" | "travel" | "social" | "virtual";
export type SubscriptionStatus   = "active" | "cancelled" | "expired" | "past_due";
export type ModerationStatus     = "pending" | "approved" | "rejected" | "flagged";
export type GiftType             = "physical" | "virtual";
export type GiftStatus           = "pending" | "sent" | "received" | "cancelled";
export type TransactionType      = "subscription" | "ppv" | "booking" | "tip" | "gift" | "profile_unlock" | "membership";
export type TransactionStatus    = "pending" | "completed" | "refunded" | "failed";
export type AccessRequestStatus  = "pending" | "approved" | "declined";
export type KycStatus            = "not_started" | "pending" | "verified" | "failed";
export type StripeAccountStatus  = "not_connected" | "pending" | "active" | "restricted";
export type AvailabilityCategory =
  | "lunch" | "dinner" | "private_dining"
  | "business_coaching" | "social_coaching"
  | "travel_companion" | "event_plus_one"
  | "yacht_luxury" | "gallery_art" | "weekend_getaway";

// ── Row types ────────────────────────────────────────────────
export interface Profile {
  id: string;
  full_name: string;
  username: string | null;
  role: UserRole;
  avatar_url: string | null;
  phone: string | null;
  date_of_birth: string | null;
  country: string | null;
  kyc_status: KycStatus;
  kyc_session_id: string | null;
  is_suspended: boolean;
  suspension_reason: string | null;
  is_admin: boolean;
  last_seen: string | null;
  searchable: boolean;
  created_at: string;
  updated_at: string;
}

export interface Post {
  id: string;
  user_id: string;
  content: string;
  tags: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface PostLike {
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

export interface Follow {
  follower_id: string;
  following_id: string;
  created_at: string;
}

export interface CompanionProfile {
  id: string;
  user_id: string;
  display_name: string | null;
  bio: string | null;
  tagline: string | null;
  location: string | null;
  age: number | null;
  languages: string[];
  tags: string[];
  visibility: VisibilityLevel;
  lock_level: LockLevel;
  verification_tier: VerificationTier;
  profile_unlock_fee: number | null;
  subscription_price: number | null;
  booking_rate_hourly: number | null;
  tip_menu: Json;
  is_available: boolean;
  available_from: string | null;
  available_until: string | null;
  cover_image_url: string | null;
  stripe_account_id: string | null;
  stripe_account_status: StripeAccountStatus;
  identity_status: IdentityStatus;
  stripe_identity_session_id: string | null;
  identity_verified_at: string | null;
  cancellation_policy: "flexible" | "moderate" | "strict";
  trusted_contact_name: string | null;
  trusted_contact_email: string | null;
  trusted_contact_phone: string | null;
  moderation_strikes: number;
  is_featured: boolean;
  total_reviews: number;
  average_rating: number | null;
  username: string | null;
  services_offered: Json;
  created_at: string;
  updated_at: string;
}

export interface Service {
  name: string;
  description?: string;
  price?: number;
  duration?: string;
}

export interface ClientProfile {
  id: string;
  user_id: string;
  membership_tier: MembershipTier;
  client_tier: ClientTier;
  membership_expires_at: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProfilePhoto {
  id: string;
  companion_id: string;
  storage_path: string;
  is_cover: boolean;
  is_public: boolean;
  moderation_status: ModerationStatus;
  moderation_score: number | null;
  sort_order: number;
  created_at: string;
}

export interface ProfileUnlock {
  id: string;
  client_id: string;
  companion_id: string;
  amount_paid: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface AccessRequest {
  id: string;
  client_id: string;
  companion_id: string;
  status: AccessRequestStatus;
  message: string | null;
  responded_at: string | null;
  created_at: string;
}

export interface Booking {
  id: string;
  client_id: string;
  companion_id: string;
  booking_type: BookingType;
  status: BookingStatus;
  scheduled_at: string;
  duration_hours: number;
  location: string | null;
  notes: string | null;
  total_amount: number;
  platform_fee: number;
  companion_earnings: number;
  stripe_payment_intent_id: string | null;
  cancelled_at: string | null;
  cancellation_reason: string | null;
  completed_at: string | null;
  review_score: number | null;
  review_text: string | null;
  escrow_status: EscrowStatus;
  paid_at: string | null;
  release_at: string | null;
  stripe_transfer_id: string | null;
  checkin_at: string | null;
  checkout_at: string | null;
  disputed_at: string | null;
  dispute_reason: string | null;
  sos_notified_at: string | null;
  cancellation_policy: "flexible" | "moderate" | "strict" | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPost {
  id: string;
  companion_id: string;
  title: string | null;
  body: string | null;
  media_urls: Json;
  is_ppv: boolean;
  ppv_price: number | null;
  is_subscribers_only: boolean;
  moderation_status: ModerationStatus;
  moderation_score: number | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface Subscription {
  id: string;
  client_id: string;
  companion_id: string;
  status: SubscriptionStatus;
  price_per_month: number;
  current_period_start: string;
  current_period_end: string;
  stripe_subscription_id: string | null;
  cancelled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContentPurchase {
  id: string;
  client_id: string;
  post_id: string;
  amount_paid: number;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface WishlistItem {
  id: string;
  companion_id: string;
  name: string;
  description: string | null;
  price: number;
  image_url: string | null;
  external_url: string | null;
  category: string | null;
  is_purchased: boolean;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
}

export interface Gift {
  id: string;
  sender_id: string;
  recipient_id: string;
  wishlist_item_id: string | null;
  gift_type: GiftType;
  virtual_gift_name: string | null;
  amount: number;
  message: string | null;
  status: GiftStatus;
  stripe_payment_intent_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface Tip {
  id: string;
  client_id: string;
  companion_id: string;
  amount: number;
  message: string | null;
  stripe_payment_intent_id: string | null;
  created_at: string;
}

export interface Conversation {
  id: string;
  client_id: string;
  companion_id: string;
  last_message_at: string | null;
  created_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  media_url: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: string;
  title: string;
  body: string | null;
  data: Json;
  is_read: boolean;
  created_at: string;
}

export interface Transaction {
  id: string;
  type: TransactionType;
  from_user_id: string | null;
  to_user_id: string | null;
  gross_amount: number;
  platform_fee: number;
  net_amount: number;
  stripe_payment_intent_id: string | null;
  stripe_transfer_id: string | null;
  status: TransactionStatus;
  reference_id: string | null;
  reference_type: string | null;
  metadata: Json;
  created_at: string;
  updated_at: string;
}

// ── View types ───────────────────────────────────────────────
export interface CompanionCard {
  id: string;
  user_id: string;
  full_name: string;
  display_name: string;
  tagline: string | null;
  location: string | null;
  age: number | null;
  tags: string[];
  languages: string[];
  visibility: VisibilityLevel;
  lock_level: LockLevel;
  verification_tier: VerificationTier;
  host_tier: HostTier;
  is_featured: boolean;
  is_available: boolean;
  average_rating: number | null;
  total_reviews: number;
  booking_rate_hourly: number | null;
  subscription_price: number | null;
  profile_unlock_fee: number | null;
  cover_image_url: string | null;
  username: string | null;
  created_at: string;
}

export interface AvailabilityPost {
  id: string;
  companion_id: string;
  category: AvailabilityCategory;
  title: string;
  description: string | null;
  date_from: string;
  date_to: string | null;
  location_city: string;
  venue_type: string | null;
  price: number;
  max_guests: number;
  photos: Json;
  visibility: VisibilityLevel;
  is_booked: boolean;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityPostWithCompanion extends AvailabilityPost {
  companion: {
    id: string;
    display_name: string;
    verification_tier: VerificationTier;
    average_rating: number | null;
    cover_image_url: string | null;
  };
}

// ── Revenue fee helpers ──────────────────────────────────────
export const PLATFORM_FEES = {
  subscription: 0.20,
  ppv: 0.20,
  profile_unlock: 0.20,
  tip: 0.20,
  gift: 0.20,
  booking: 0.15,
  membership: 1.00, // platform keeps all
} as const;

export function calculateFees(type: keyof typeof PLATFORM_FEES, grossAmount: number) {
  const feeRate = PLATFORM_FEES[type];
  const platformFee = +(grossAmount * feeRate).toFixed(2);
  const netAmount = +(grossAmount - platformFee).toFixed(2);
  return { grossAmount, platformFee, netAmount };
}
