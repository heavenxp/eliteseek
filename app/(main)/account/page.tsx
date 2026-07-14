import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Icon } from "@/components/icons";

type ClientTab = "activity" | "unlocked" | "bookings";

type CompanionItem = {
  id: string;
  displayName: string;
  username: string | null;
};

type FollowItem = {
  id: string;
  fullName: string;
  username: string | null;
};

type ActivityPost = {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  image_url: string | null;
  tags: string[];
  audience: "public" | "followers" | "private";
};

type BookingItem = {
  id: string;
  status: string;
  companion_id: string;
  scheduled_at: string | null;
  booking_type: string | null;
  total_amount: number | null;
  companionName: string;
  username: string | null;
};

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string; modal?: string }>;
}) {
  const { tab, modal } = await searchParams;
  const activeTab: ClientTab =
    tab === "unlocked" || tab === "bookings" ? tab : "activity";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, full_name, role, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) redirect("/login");

  const isCompanion = profile.role === "companion";

  const initials = (profile.full_name ?? "?")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const memberSince = new Date(profile.created_at).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ── Companion path (layout unchanged) ─────────────────────────
  if (isCompanion) {
    const [bookingResult, companionResult] = await Promise.all([
      supabase.from("bookings").select("id, status").eq("companion_id", user.id),
      supabase
        .from("companion_profiles")
        .select("username, verification_tier")
        .eq("user_id", user.id)
        .single(),
    ]);

    const bookings = bookingResult.data ?? [];
    const companionProfile = companionResult.data;

    const pendingCount = bookings.filter((b) => b.status === "pending").length;
    const confirmedCount = bookings.filter((b) => b.status === "confirmed").length;
    const completedCount = bookings.filter((b) => b.status === "completed").length;

    const verificationLabel =
      companionProfile?.verification_tier === "select"
        ? "EliteSeek Select"
        : companionProfile?.verification_tier === "verified"
          ? "Verified Host"
          : "Host";

    return (
      <div className="page-bg min-h-screen">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <div className="glass-card mb-6 rounded-2xl p-6">
            <div className="flex items-center gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.1)] text-xl font-semibold text-gold">
                {initials}
              </div>
              <div className="flex-1 min-w-0">
                <h1
                  className="text-2xl font-light text-foreground"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {profile.full_name}
                </h1>
                <p className="text-sm text-muted/60" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Elite Host · Since {memberSince}
                </p>
                <span
                  className="mt-1.5 inline-block rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-0.5 text-xs text-gold"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {verificationLabel}
                </span>
              </div>
              <Link href="/account/settings" className="btn-ghost rounded-xl p-2.5" aria-label="Settings">
                <Icon name="camera" className="h-4 w-4" />
              </Link>
            </div>
          </div>

          <div className="mb-6 grid grid-cols-3 gap-3">
            {[
              { label: "Pending", value: pendingCount },
              { label: "Confirmed", value: confirmedCount },
              { label: "Completed", value: completedCount },
            ].map((stat) => (
              <div key={stat.label} className="glass-card rounded-2xl p-4 text-center">
                <p
                  className="text-3xl font-light text-gold"
                  style={{ fontFamily: "var(--font-cormorant)" }}
                >
                  {stat.value}
                </p>
                <p className="mt-0.5 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  {stat.label}
                </p>
              </div>
            ))}
          </div>

          <div className="glass-card overflow-hidden rounded-2xl">
            <CompanionLinks />
          </div>
        </div>
      </div>
    );
  }

  // ── Client: Wave 1 ────────────────────────────────────────────
  const [
    clientResult,
    followsResult,
    followersResult,
    bookingsResult,
    unlocksResult,
    subsResult,
  ] = await Promise.all([
    supabase.from("client_profiles").select("membership_tier").eq("user_id", user.id).single(),
    supabase.from("follows").select("following_id").eq("follower_id", user.id),
    supabase.from("follows").select("follower_id").eq("following_id", user.id),
    supabase
      .from("bookings")
      .select("id, status, companion_id, scheduled_at, booking_type, total_amount")
      .eq("client_id", user.id)
      .order("scheduled_at", { ascending: false })
      .limit(20),
    supabase.from("profile_unlocks").select("companion_id").eq("client_id", user.id),
    supabase
      .from("subscriptions")
      .select("companion_id")
      .eq("client_id", user.id)
      .eq("status", "active"),
  ]);

  const followingUserIds = (followsResult.data ?? []).map((r) => r.following_id);
  const followerUserIds = (followersResult.data ?? []).map((r) => r.follower_id);
  const allBookings = bookingsResult.data ?? [];
  const unlockCompanionIds = (unlocksResult.data ?? []).map((r) => r.companion_id);
  const subCompanionIds = (subsResult.data ?? []).map((r) => r.companion_id);
  const unlockedCompanionIds = [...new Set([...unlockCompanionIds, ...subCompanionIds])];
  const bookingCompanionIds = [
    ...new Set(allBookings.map((b) => b.companion_id).filter(Boolean)),
  ] as string[];

  // ── Client: Wave 2 ────────────────────────────────────────────
  const admin = createAdminClient();
  const [
    followingCompRes,
    followerProfilesRes,
    followerCompRes,
    unlockedCompRes,
    activityPostsRes,
    bookingCompRes,
  ] = await Promise.all([
    followingUserIds.length > 0
      ? admin
          .from("companion_profiles")
          .select("user_id, display_name, username")
          .in("user_id", followingUserIds)
      : Promise.resolve({
          data: [] as { user_id: string; display_name: string | null; username: string | null }[],
        }),
    followerUserIds.length > 0
      ? admin.from("profiles").select("id, full_name").in("id", followerUserIds)
      : Promise.resolve({ data: [] as { id: string; full_name: string }[] }),
    followerUserIds.length > 0
      ? admin
          .from("companion_profiles")
          .select("user_id, username")
          .in("user_id", followerUserIds)
      : Promise.resolve({ data: [] as { user_id: string; username: string | null }[] }),
    unlockedCompanionIds.length > 0
      ? admin
          .from("companion_profiles")
          .select("id, display_name, username")
          .in("id", unlockedCompanionIds)
      : Promise.resolve({
          data: [] as { id: string; display_name: string | null; username: string | null }[],
        }),
    supabase
      .from("posts")
      .select("id, content, created_at, user_id, image_url, tags, audience")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(30),
    bookingCompanionIds.length > 0
      ? admin
          .from("companion_profiles")
          .select("id, display_name, username")
          .in("id", bookingCompanionIds)
      : Promise.resolve({
          data: [] as { id: string; display_name: string | null; username: string | null }[],
        }),
  ]);

  // ── Build maps & lists ────────────────────────────────────────
  const followingCompMap = new Map(
    (followingCompRes.data ?? []).map((p) => [p.user_id, p])
  );
  const followerProfileMap = new Map(
    (followerProfilesRes.data ?? []).map((p) => [p.id, p])
  );
  const followerCompMap = new Map(
    (followerCompRes.data ?? []).map((p) => [p.user_id, p.username])
  );
  const unlockedCompMap = new Map(
    (unlockedCompRes.data ?? []).map((p) => [p.id, p])
  );
  const bookingCompMap = new Map(
    (bookingCompRes.data ?? []).map((p) => [p.id, p])
  );

  const followingList: FollowItem[] = followingUserIds.map((uid) => {
    const cp = followingCompMap.get(uid);
    return {
      id: uid,
      fullName: cp?.display_name ?? "Host",
      username: cp?.username ?? null,
    };
  });

  const followerList: FollowItem[] = followerUserIds.map((uid) => {
    const p = followerProfileMap.get(uid);
    return {
      id: uid,
      fullName: p?.full_name ?? "Member",
      username: followerCompMap.get(uid) ?? null,
    };
  });

  const unlockedList: CompanionItem[] = unlockedCompanionIds.map((id) => {
    const cp = unlockedCompMap.get(id);
    return {
      id,
      displayName: cp?.display_name ?? "Host",
      username: cp?.username ?? null,
    };
  });

  const activityPosts: ActivityPost[] = (activityPostsRes.data ?? []).map((p) => ({
    id: p.id,
    content: p.content,
    created_at: p.created_at,
    user_id: p.user_id,
    image_url: p.image_url,
    tags: (p.tags ?? []) as string[],
    audience: ((p as { audience?: string }).audience ?? "public") as ActivityPost["audience"],
  }));

  const bookingItems: BookingItem[] = allBookings.map((b) => {
    const cp = bookingCompMap.get(b.companion_id);
    return {
      id: b.id,
      status: b.status,
      companion_id: b.companion_id,
      scheduled_at: b.scheduled_at,
      booking_type: b.booking_type,
      total_amount: b.total_amount,
      companionName: cp?.display_name ?? "Host",
      username: cp?.username ?? null,
    };
  });

  // ── Display values ────────────────────────────────────────────
  const tierLabel =
    clientResult.data?.membership_tier === "elite"
      ? "Elite"
      : clientResult.data?.membership_tier === "silver"
        ? "Silver"
        : "Bronze";

  const handle = "@" + (profile.full_name ?? "member").toLowerCase().replace(/\s+/g, "");

  // ── Server action: delete own post ───────────────────────────
  async function deleteOwnPost(postId: string) {
    "use server";
    const supabase = await createClient();
    await supabase.from("posts").delete().eq("id", postId).eq("user_id", user!.id);
    revalidatePath("/account");
  }

  // ── Modal URL helpers ─────────────────────────────────────────
  const tabHref = (t: ClientTab) =>
    t === "activity" ? "/account" : `/account?tab=${t}`;
  const closeModalHref = tabHref(activeTab);
  const addModal = (base: string, m: string) =>
    base.includes("?") ? `${base}&modal=${m}` : `${base}?modal=${m}`;

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,1)]">
      {/* Page label */}
      <div className="flex justify-center pt-4">
        <span
          className="rounded-full border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.06)] px-4 py-1 text-[11px] tracking-widest text-gold/60 uppercase"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Your Profile
        </span>
      </div>

      {/* Cover */}
      <div className="relative h-44 w-full overflow-hidden md:h-56">
        <div className="h-full w-full bg-gradient-to-br from-[rgba(212,175,55,0.06)] via-[rgba(20,10,40,0.8)] to-[rgba(8,8,16,1)]" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-[rgba(8,8,16,1)] to-transparent" />
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {/* Avatar + Edit button */}
        <div className="-mt-10 flex items-end justify-between md:-mt-12">
          <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full border-4 border-[rgba(8,8,16,1)] bg-[rgba(212,175,55,0.1)] md:h-24 md:w-24">
            <span
              className="text-3xl font-light text-gold/50 md:text-4xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {initials}
            </span>
          </div>
          <Link
            href="/account/settings"
            className="mb-2 flex items-center gap-1.5 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(255,255,255,0.03)] px-4 py-2 text-sm text-muted/70 transition-colors hover:border-[rgba(212,175,55,0.35)] hover:text-muted"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <Icon name="camera" className="h-4 w-4" />
            Edit
          </Link>
        </div>

        {/* Name, handle, tier badge, member since */}
        <div className="mt-3">
          <h1
            className="text-2xl font-semibold text-foreground md:text-3xl"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {profile.full_name}
          </h1>
          <p className="mt-0.5 text-sm text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {handle}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className="rounded-full border border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] px-3 py-0.5 text-xs text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {tierLabel} Tier
            </span>
            <span className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Member since {memberSince}
            </span>
          </div>
        </div>

        {/* Stats row */}
        <div
          className="mt-4 flex gap-8 border-b border-[rgba(255,255,255,0.06)] pb-4"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <Link
            href={addModal(closeModalHref, "following")}
            className="flex flex-col items-start transition-opacity hover:opacity-70"
          >
            <span className="text-base font-semibold text-foreground">
              {followingList.length}
            </span>
            <span className="text-[10px] text-muted/40">Following</span>
          </Link>
          <Link
            href={addModal(closeModalHref, "followers")}
            className="flex flex-col items-start transition-opacity hover:opacity-70"
          >
            <span className="text-base font-semibold text-foreground">
              {followerList.length}
            </span>
            <span className="text-[10px] text-muted/40">Followers</span>
          </Link>
          <Link
            href="/bookings"
            className="flex flex-col items-start transition-opacity hover:opacity-70"
          >
            <span className="text-base font-semibold text-foreground">
              {allBookings.length}
            </span>
            <span className="text-[10px] text-muted/40">Bookings</span>
          </Link>
        </div>

        {/* Quick links */}
        <div className="-mx-4 overflow-x-auto px-4 py-4 scrollbar-none">
          <div className="flex gap-3" style={{ width: "max-content" }}>
            {[
              { href: "/messages",        icon: "message",          label: "Messages"   },
              { href: "/bookings",         icon: "calendar",         label: "Bookings"   },
              { href: "/membership",       icon: "star",             label: "Membership" },
              { href: "/account/settings", icon: "settings",         label: "Settings"   },
            ].map(({ href, icon, label }) => (
              <Link
                key={href}
                href={href}
                className="flex flex-col items-center gap-1.5 rounded-2xl border border-[rgba(212,175,55,0.12)] bg-[rgba(212,175,55,0.04)] px-5 py-3 transition-colors hover:border-[rgba(212,175,55,0.28)] hover:bg-[rgba(212,175,55,0.08)]"
              >
                <div className="flex h-9 w-9 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.18)] bg-[rgba(212,175,55,0.08)]">
                  <Icon name={icon} className="h-4 w-4 text-gold/70" />
                </div>
                <span
                  className="text-[10px] text-muted/50"
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {label}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Tabs: Activity | Unlocked | Bookings */}
        <div className="sticky top-[65px] z-20 -mx-4 bg-[rgba(8,8,16,0.95)] px-4 backdrop-blur-sm">
          <div className="flex border-b border-[rgba(255,255,255,0.06)]">
            {(["activity", "unlocked", "bookings"] as ClientTab[]).map((t) => (
              <Link
                key={t}
                href={tabHref(t)}
                className={`flex-1 py-3 text-center text-sm capitalize transition-colors ${
                  activeTab === t
                    ? "border-b-2 border-gold font-medium text-gold"
                    : "text-muted/50 hover:text-muted/80"
                }`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {t}
              </Link>
            ))}
          </div>
        </div>

        {/* Tab content */}
        <div className="pb-24 pt-5">
          {activeTab === "activity" && <ActivityTab posts={activityPosts} deleteAction={deleteOwnPost} />}
          {activeTab === "unlocked" && <UnlockedTab companions={unlockedList} />}
          {activeTab === "bookings" && <BookingsTab bookings={bookingItems} />}
        </div>
      </div>

      {/* Following modal */}
      {modal === "following" && (
        <FollowModal title="Following" items={followingList} closeHref={closeModalHref} />
      )}

      {/* Followers modal */}
      {modal === "followers" && (
        <FollowModal title="Followers" items={followerList} closeHref={closeModalHref} />
      )}
    </div>
  );
}

// ── Activity tab ───────────────────────────────────────────────

function ActivityTab({
  posts,
  deleteAction,
}: {
  posts: ActivityPost[];
  deleteAction: (postId: string) => Promise<void>;
}) {
  if (posts.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p
          className="text-lg font-light text-foreground/40"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          No posts yet
        </p>
        <p className="text-sm text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Your posts will appear here
        </p>
        <Link
          href="/feed"
          className="mt-2 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] px-5 py-2.5 text-sm text-gold/80 transition-colors hover:border-[rgba(212,175,55,0.35)] hover:bg-[rgba(212,175,55,0.1)]"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Go to feed
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((post) => (
        <ActivityPostCard key={post.id} post={post} deleteAction={deleteAction} />
      ))}
    </div>
  );
}

function ActivityPostCard({
  post,
  deleteAction,
}: {
  post: ActivityPost;
  deleteAction: (postId: string) => Promise<void>;
}) {
  const diff = Date.now() - new Date(post.created_at).getTime();
  const mins = Math.floor(diff / 60000);
  const timeAgo =
    mins < 60
      ? `${Math.max(1, mins)}m ago`
      : mins < 1440
        ? `${Math.floor(mins / 60)}h ago`
        : mins < 10080
          ? `${Math.floor(mins / 1440)}d ago`
          : new Date(post.created_at).toLocaleDateString("en-GB", { day: "numeric", month: "short" });

  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.08)] bg-[rgba(255,255,255,0.02)] p-4">
      <p className="text-xs text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
        {timeAgo}
      </p>
      <p
        className="mt-1.5 text-sm leading-relaxed text-foreground/70 whitespace-pre-wrap break-words"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {post.content}
      </p>
      {post.image_url && (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={post.image_url}
          alt=""
          className="mt-3 w-full rounded-xl object-cover"
          style={{ maxHeight: "300px" }}
        />
      )}
      {post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {post.tags.slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-[rgba(212,175,55,0.06)] px-2 py-0.5 text-[10px] text-gold/50"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-[10px] text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {post.audience === "public"
            ? "Public"
            : post.audience === "followers"
            ? "Followers only"
            : "Only me"}
        </span>
        <form action={deleteAction.bind(null, post.id)}>
          <button
            type="submit"
            aria-label="Delete post"
            className="p-1 text-muted/30 transition-colors hover:text-red-400/70"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </form>
      </div>
    </div>
  );
}

// ── Unlocked tab ───────────────────────────────────────────────

function UnlockedTab({ companions }: { companions: CompanionItem[] }) {
  if (companions.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p
          className="text-lg font-light text-foreground/40"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          No unlocked profiles
        </p>
        <p className="text-sm text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Profiles you&apos;ve unlocked or subscribed to appear here
        </p>
        <Link
          href="/browse"
          className="mt-2 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] px-5 py-2.5 text-sm text-gold/80 transition-colors hover:border-[rgba(212,175,55,0.35)] hover:bg-[rgba(212,175,55,0.1)]"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Browse companions
        </Link>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {companions.map((c) => (
        <UnlockedCard key={c.id} companion={c} />
      ))}
    </div>
  );
}

function UnlockedCard({ companion }: { companion: CompanionItem }) {
  const initial = companion.displayName.charAt(0).toUpperCase();
  const inner = (
    <div className="flex items-center gap-3 rounded-2xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] p-4 transition-colors hover:border-[rgba(212,175,55,0.22)] hover:bg-[rgba(212,175,55,0.03)]">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] text-sm font-medium text-gold">
        {initial}
      </div>
      <div className="flex-1 min-w-0">
        <p
          className="truncate text-sm font-medium text-foreground/90"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {companion.displayName}
        </p>
        {companion.username && (
          <p className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            @{companion.username}
          </p>
        )}
      </div>
      <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-muted/30" />
    </div>
  );
  return companion.username ? (
    <Link href={`/profile/${companion.username}`}>{inner}</Link>
  ) : (
    <div>{inner}</div>
  );
}

// ── Bookings tab ───────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
  pending:   "bg-[rgba(251,191,36,0.12)] text-amber-400",
  confirmed: "bg-[rgba(52,211,153,0.1)] text-emerald-400",
  completed: "bg-[rgba(52,211,153,0.08)] text-emerald-400/70",
  cancelled: "bg-[rgba(248,113,113,0.1)] text-red-400/80",
};

function BookingsTab({ bookings }: { bookings: BookingItem[] }) {
  if (bookings.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p
          className="text-lg font-light text-foreground/40"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          No bookings yet
        </p>
        <p className="text-sm text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Your booking history will appear here
        </p>
        <Link
          href="/browse"
          className="mt-2 rounded-xl border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.06)] px-5 py-2.5 text-sm text-gold/80 transition-colors hover:border-[rgba(212,175,55,0.35)] hover:bg-[rgba(212,175,55,0.1)]"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Browse companions
        </Link>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {bookings.map((b) => (
        <BookingCard key={b.id} booking={b} />
      ))}
    </div>
  );
}

function BookingCard({ booking }: { booking: BookingItem }) {
  const statusCls =
    STATUS_COLORS[booking.status] ?? "bg-[rgba(255,255,255,0.06)] text-muted/60";
  const dateStr = booking.scheduled_at
    ? new Date(booking.scheduled_at).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";
  const amount =
    booking.total_amount != null ? `$${Number(booking.total_amount).toFixed(0)}` : null;

  return (
    <div className="rounded-2xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          {booking.username ? (
            <Link
              href={`/profile/${booking.username}`}
              className="text-sm font-medium text-foreground/90 transition-colors hover:text-gold"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {booking.companionName}
            </Link>
          ) : (
            <p
              className="text-sm font-medium text-foreground/90"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {booking.companionName}
            </p>
          )}
          <p className="mt-0.5 text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {dateStr}
            {booking.booking_type ? ` · ${booking.booking_type}` : ""}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] capitalize ${statusCls}`}
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {booking.status}
          </span>
          {amount && (
            <span className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {amount}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Follow modal ───────────────────────────────────────────────

function FollowModal({
  title,
  items,
  closeHref,
}: {
  title: string;
  items: FollowItem[];
  closeHref: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <Link
        href={closeHref}
        className="absolute inset-0 bg-[rgba(8,8,16,0.75)] backdrop-blur-sm"
        aria-label="Close"
      />
      <div className="relative z-10 mx-4 w-full max-w-sm rounded-2xl border border-[rgba(212,175,55,0.15)] bg-[rgba(16,12,32,0.98)] p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2
            className="text-lg font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {title}
            <span className="ml-2 text-sm text-muted/40">{items.length}</span>
          </h2>
          <Link
            href={closeHref}
            className="rounded-full p-1.5 text-muted/40 transition-colors hover:text-muted/70"
          >
            <Icon name="x" className="h-4 w-4" />
          </Link>
        </div>
        {items.length === 0 ? (
          <p
            className="py-8 text-center text-sm text-muted/30"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            None yet
          </p>
        ) : (
          <ul className="max-h-80 space-y-2 overflow-y-auto">
            {items.map((item) => {
              const initial = item.fullName.charAt(0).toUpperCase();
              const row = (
                <div className="flex items-center gap-3 rounded-xl border border-[rgba(212,175,55,0.06)] bg-[rgba(255,255,255,0.02)] px-3 py-2.5 transition-colors hover:border-[rgba(212,175,55,0.15)] hover:bg-[rgba(212,175,55,0.04)]">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[rgba(212,175,55,0.1)] text-xs font-medium text-gold">
                    {initial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="truncate text-sm text-foreground/90"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      {item.fullName}
                    </p>
                    {item.username && (
                      <p
                        className="text-[11px] text-muted/40"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        @{item.username}
                      </p>
                    )}
                  </div>
                  {item.username && (
                    <Icon name="chevron-right" className="h-3.5 w-3.5 shrink-0 text-muted/30" />
                  )}
                </div>
              );
              return (
                <li key={item.id}>
                  {item.username ? (
                    <Link href={`/profile/${item.username}`}>{row}</Link>
                  ) : (
                    row
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}

// ── Companion section (unchanged) ──────────────────────────────

function CompanionLinks() {
  const links: {
    href: string;
    icon: string;
    label: string;
    desc: string;
  }[] = [
    {
      href: "/companion/posts/new",
      icon: "plus",
      label: "New Availability Post",
      desc: "Share when you're available",
    },
    {
      href: "/companion/access-requests",
      icon: "lock",
      label: "Access Requests",
      desc: "Profile access queue",
    },
    { href: "/account/earnings", icon: "star", label: "Earnings", desc: "Revenue & payouts" },
    { href: "/account/settings", icon: "camera", label: "Settings", desc: "Profile & pricing" },
  ];
  return (
    <ul className="divide-y divide-[rgba(212,175,55,0.08)]">
      {links.map((link) => (
        <li key={link.href}>
          <Link
            href={link.href}
            className="flex items-center gap-4 px-5 py-4 transition-colors hover:bg-[rgba(212,175,55,0.04)]"
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.06)]">
              <Icon name={link.icon} className="h-4 w-4 text-gold/70" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {link.label}
              </p>
              <p
                className="truncate text-xs text-muted/40"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {link.desc}
              </p>
            </div>
            <Icon name="chevron-right" className="h-4 w-4 shrink-0 text-muted/30" />
          </Link>
        </li>
      ))}
    </ul>
  );
}
