import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { PostCard } from "@/components/posts/post-card";
import { ProfileActions } from "./profile-actions";
import type { AvailabilityPost, AvailabilityCategory } from "@/lib/database.types";

const CATEGORY_LABELS: Record<AvailabilityCategory, string> = {
  lunch: "Lunch", dinner: "Dinner", private_dining: "Private Dining",
  business_coaching: "Business Coaching", social_coaching: "Social Coaching",
  travel_companion: "Travel Experience", event_plus_one: "Event Plus-One",
  yacht_luxury: "Yacht / Luxury", gallery_art: "Gallery & Art",
  weekend_getaway: "Weekend Getaway",
};

export default async function CompanionProfilePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch companion profile
  const { data: companion } = await supabase
    .from("companion_profiles")
    .select(`
      id, user_id, display_name, bio, tagline, location, age,
      tags, languages, visibility, verification_tier,
      is_featured, is_available, average_rating, total_reviews,
      booking_rate_hourly, subscription_price, profile_unlock_fee, cover_image_url,
      profiles!inner(full_name)
    `)
    .eq("id", id)
    .single();

  if (!companion) notFound();

  const isOwner = companion.user_id === user.id;

  // Determine access level
  let hasUnlocked = false;
  let accessRequestStatus: "pending" | "approved" | "declined" | null = null;
  let clientMembershipTier: string = "bronze";

  if (!isOwner) {
    const [unlockResult, requestResult, clientResult] = await Promise.all([
      supabase
        .from("profile_unlocks")
        .select("id")
        .eq("client_id", user.id)
        .eq("companion_id", id)
        .maybeSingle(),
      supabase
        .from("access_requests")
        .select("status")
        .eq("client_id", user.id)
        .eq("companion_id", id)
        .maybeSingle(),
      supabase
        .from("client_profiles")
        .select("membership_tier")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);

    hasUnlocked = !!unlockResult.data;
    accessRequestStatus = (requestResult.data?.status ?? null) as typeof accessRequestStatus;
    clientMembershipTier = clientResult.data?.membership_tier ?? "bronze";
  }

  const isFullyVisible = isOwner
    || companion.visibility === "public"
    || hasUnlocked
    || accessRequestStatus === "approved"
    || (companion.visibility === "elite_only" && clientMembershipTier === "elite");

  const isEliteBlocked = companion.visibility === "elite_only"
    && !isOwner && !hasUnlocked && accessRequestStatus !== ("approved" as string)
    && clientMembershipTier !== "elite";

  // Fetch availability posts (only if visible)
  const { data: posts } = isFullyVisible
    ? await supabase
        .from("availability_posts")
        .select("*")
        .eq("companion_id", id)
        .eq("is_booked", false)
        .gt("date_from", new Date().toISOString())
        .order("date_from", { ascending: true })
        .limit(12)
    : { data: null };

  const upcomingPosts = (posts ?? []) as AvailabilityPost[];
  const profile = companion.profiles as unknown as { full_name: string };

  return (
    <div className="mx-auto max-w-4xl px-4 py-8 md:px-6 md:py-12">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-6 sm:flex-row sm:items-start">
        {/* Avatar placeholder */}
        <div className="companion-placeholder h-32 w-32 shrink-0 overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)]">
          <div className="flex h-full items-center justify-center">
            <span className="text-4xl font-light text-gold/30" style={{ fontFamily: "var(--font-cormorant)" }}>
              {companion.display_name?.charAt(0) ?? "?"}
            </span>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="text-3xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              {companion.display_name ?? profile.full_name}
              {companion.age && (
                <span className="ml-2 text-2xl text-muted/40">{companion.age}</span>
              )}
            </h1>
            {companion.verification_tier === "select" && (
              <span className="badge-select rounded-full px-3 py-1 text-xs">
                <span className="flex items-center gap-1">
                  <Icon name="star" className="h-3 w-3" />
                  EliteSeek Select
                </span>
              </span>
            )}
            {companion.verification_tier === "verified" && (
              <span className="badge-verified rounded-full px-3 py-1 text-xs">Verified</span>
            )}
          </div>

          {companion.tagline && (
            <p className="mt-1.5 text-base text-muted/70 italic" style={{ fontFamily: "var(--font-cormorant)" }}>
              {companion.tagline}
            </p>
          )}

          <div className="mt-3 flex flex-wrap items-center gap-4">
            {companion.location && (
              <span className="flex items-center gap-1.5 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                <Icon name="map-pin" className="h-4 w-4 text-gold/50" />
                {companion.location}
              </span>
            )}
            {companion.average_rating && (
              <span className="flex items-center gap-1.5 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                <Icon name="star" className="h-4 w-4 text-gold" />
                {Number(companion.average_rating).toFixed(1)}
                {companion.total_reviews > 0 && ` (${companion.total_reviews} reviews)`}
              </span>
            )}
            <span
              className={`flex items-center gap-1.5 text-sm ${companion.is_available ? "text-emerald-400" : "text-muted/40"}`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${companion.is_available ? "bg-emerald-400 animate-pulse" : "bg-muted/30"}`} />
              {companion.is_available ? "Available now" : "Unavailable"}
            </span>
          </div>
        </div>
      </div>

      {/* Lock gate */}
      {!isFullyVisible && (
        <LockGate
          companionId={id}
          companionName={companion.display_name ?? profile.full_name}
          visibility={companion.visibility as string}
          unlockFee={companion.profile_unlock_fee}
          accessRequestStatus={accessRequestStatus ?? "none"}
          isEliteBlocked={isEliteBlocked}
          clientTier={clientMembershipTier}
        />
      )}

      {/* Full profile content */}
      {isFullyVisible && (
        <>
          {/* Bio */}
          {companion.bio && (
            <section className="mb-8">
              <div className="gold-divider mb-6" />
              <p className="text-base leading-relaxed text-muted/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {companion.bio}
              </p>
            </section>
          )}

          {/* Tags & Languages */}
          {(companion.tags?.length > 0 || companion.languages?.length > 0) && (
            <section className="mb-8 grid gap-6 sm:grid-cols-2">
              {companion.tags?.length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    Experiences
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {companion.tags.map((tag: string) => (
                      <span key={tag} className="rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] px-3 py-1 text-xs text-gold/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {companion.languages?.length > 0 && (
                <div>
                  <p className="mb-2.5 text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    Languages
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {companion.languages.map((lang: string) => (
                      <span key={lang} className="rounded-full border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.03)] px-3 py-1 text-xs text-muted/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                        {lang}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Pricing */}
          {(companion.booking_rate_hourly || companion.subscription_price) && (
            <section className="mb-8">
              <div className="gold-divider mb-6" />
              <p className="mb-3 text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Pricing
              </p>
              <div className="flex flex-wrap gap-4">
                {companion.booking_rate_hourly && (
                  <div className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] px-5 py-4">
                    <p className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
                      ${companion.booking_rate_hourly.toLocaleString()}
                      <span className="ml-1 text-base text-muted/50">/hr</span>
                    </p>
                    <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>Hourly rate</p>
                  </div>
                )}
                {companion.subscription_price && (
                  <div className="rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.04)] px-5 py-4">
                    <p className="text-2xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
                      ${companion.subscription_price}
                      <span className="ml-1 text-base text-muted/50">/mo</span>
                    </p>
                    <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>Monthly subscription</p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Availability posts */}
          <section className="mb-8">
            <div className="gold-divider mb-6" />
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs uppercase tracking-[0.1em] text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Upcoming Availability
              </p>
              {isOwner && (
                <a href="/companion/posts/new" className="text-xs text-gold/60 hover:text-gold underline underline-offset-2" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  + Add post
                </a>
              )}
            </div>

            {upcomingPosts.length === 0 ? (
              <p className="text-sm text-muted/40 py-4" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {isOwner ? "You have no upcoming availability posts." : "No availability posts right now."}
              </p>
            ) : (
              <div className="space-y-4">
                {upcomingPosts.map((post) => (
                  <ProfileActions
                    key={post.id}
                    post={post}
                    companionId={id}
                    companionName={companion.display_name ?? profile.full_name}
                    hourlyRate={companion.booking_rate_hourly}
                    isOwner={isOwner}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Book Now (general) */}
          {!isOwner && companion.booking_rate_hourly && (
            <section>
              <div className="gold-divider mb-6" />
              <ProfileActions
                companionId={id}
                companionName={companion.display_name ?? profile.full_name}
                hourlyRate={companion.booking_rate_hourly}
                isOwner={false}
              />
            </section>
          )}
        </>
      )}
    </div>
  );
}

function LockGate({
  companionId,
  companionName,
  visibility,
  unlockFee,
  accessRequestStatus,
  isEliteBlocked,
  clientTier,
}: {
  companionId: string;
  companionName: string;
  visibility: string;
  unlockFee: number | null;
  accessRequestStatus: string;
  isEliteBlocked: boolean;
  clientTier: string;
}) {
  return (
    <div className="mb-8 overflow-hidden rounded-2xl border border-[rgba(212,175,55,0.2)] bg-[rgba(255,255,255,0.02)]">
      {/* Blurred preview */}
      <div className="relative h-40 overflow-hidden">
        <div className="absolute inset-0 blur-xl opacity-30 bg-gradient-to-br from-gold/20 to-transparent" />
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon name="lock" className="h-10 w-10 text-gold/30" />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-[rgba(8,8,16,0.9)] to-transparent" />
      </div>

      <div className="p-6 text-center">
        {isEliteBlocked ? (
          <>
            <p className="text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              Elite Members Only
            </p>
            <p className="mt-2 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {clientTier === "silver"
                ? "You can send an access request and the Elite Host may approve you."
                : "This profile requires an Elite membership to view."
              }
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              <a
                href="/membership"
                className="btn-gold rounded-xl px-8 py-3 text-sm"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                Upgrade to Elite
              </a>
              {clientTier === "silver" && accessRequestStatus === "none" && (
                <RequestAccessForm companionId={companionId} />
              )}
              {accessRequestStatus === "pending" && (
                <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Your access request is pending review.
                </p>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="text-xl font-light text-foreground" style={{ fontFamily: "var(--font-cormorant)" }}>
              {companionName}&apos;s profile is locked
            </p>
            <p className="mt-2 text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {unlockFee
                ? `Unlock this profile for $${unlockFee} to see the full bio, photos, and book experiences.`
                : "Request access to view this profile."
              }
            </p>
            <div className="mt-6 flex flex-col items-center gap-3">
              {unlockFee && accessRequestStatus !== "approved" && (
                <UnlockForm companionId={companionId} fee={unlockFee} />
              )}
              {accessRequestStatus === "none" && (
                <RequestAccessForm companionId={companionId} />
              )}
              {accessRequestStatus === "pending" && (
                <p className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Your access request is pending review.
                </p>
              )}
              {accessRequestStatus === "declined" && (
                <p className="text-xs text-red-400/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Your access request was not approved.
                </p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function UnlockForm({ companionId, fee }: { companionId: string; fee: number }) {
  return (
    <form action="/api/access/unlock" method="post">
      <input type="hidden" name="companion_id" value={companionId} />
      <input type="hidden" name="amount_paid" value={fee} />
      <button
        type="submit"
        className="btn-gold rounded-xl px-8 py-3 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Unlock Profile · ${fee}
      </button>
    </form>
  );
}

function RequestAccessForm({ companionId }: { companionId: string }) {
  return (
    <form action="/api/access/request" method="post">
      <input type="hidden" name="companion_id" value={companionId} />
      <button
        type="submit"
        className="btn-ghost rounded-xl px-6 py-2.5 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Request Access
      </button>
    </form>
  );
}
