import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toggleFollow } from "@/app/actions/feed";
import { MessageButton } from "@/components/messages/message-button";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const { data } = await createAdminClient()
    .from("profiles")
    .select("full_name")
    .eq("id", id)
    .single();
  const name = data?.full_name ?? "Member";
  return { title: `${name} — EliteSeek` };
}

export default async function ClientProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const activeTab = tab === "media" ? "media" : "posts";
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();

  const [profileRes, clientRes, postsRes, viewerRoleRes, followRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, created_at").eq("id", id).single(),
    admin.from("profiles").select("membership_tier").eq("id", id).maybeSingle(),
    supabase
      .from("posts")
      .select("id, content, created_at, image_url, tags, audience")
      .eq("user_id", id)
      .order("created_at", { ascending: false })
      .limit(20),
    viewer
      ? supabase.from("profiles").select("role").eq("id", viewer.id).single()
      : Promise.resolve({ data: null }),
    viewer && viewer.id !== id
      ? supabase
          .from("follows")
          .select("follower_id")
          .eq("follower_id", viewer.id)
          .eq("following_id", id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
  ]);

  if (!profileRes.data) notFound();

  const viewerIsCompanion = viewerRoleRes.data?.role === "companion";
  const isFollowing = !!followRes.data;
  const isOwner = viewer?.id === id;

  async function deletePostAction(postId: string) {
    "use server";
    const supabase = await createClient();
    const { data: { user: authedUser } } = await supabase.auth.getUser();
    if (!authedUser || authedUser.id !== id) return;
    await supabase.from("posts").delete().eq("id", postId).eq("user_id", id);
    revalidatePath(`/profile/client/${id}`);
  }

  async function handleFollow() {
    "use server";
    await toggleFollow(id);
    revalidatePath(`/profile/client/${id}`);
  }

  const profile = profileRes.data;
  const tier = (clientRes.data?.membership_tier ?? "bronze") as "bronze" | "silver" | "elite";
  const posts = postsRes.data ?? [];

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

  const TIER_LABEL = { bronze: "Bronze", silver: "Silver", elite: "Elite" };
  const TIER_CLS = {
    bronze: "border-[rgba(180,120,60,0.3)] bg-[rgba(180,120,60,0.08)] text-[#c87941]",
    silver: "border-[rgba(180,180,200,0.25)] bg-[rgba(180,180,200,0.06)] text-[#a0a0b8]",
    elite:  "border-white/20 bg-white/[0.04] text-gold",
  };

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,1)]">
      {/* Cover */}
      <div className="relative h-36 w-full overflow-hidden md:h-48">
        <div className="h-full w-full bg-white/[0.03]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[rgba(8,8,16,1)] to-transparent" />
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {/* Avatar + Follow button row */}
        <div className="-mt-10 flex items-end justify-between md:-mt-12">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[rgba(8,8,16,1)] bg-white/[0.04] md:h-24 md:w-24">
            <span
              className="text-3xl font-light text-muted/40 md:text-4xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {initials}
            </span>
          </div>

          {viewerIsCompanion && viewer?.id !== id && (
            <div className="mb-2 flex items-center gap-2">
              <form action={handleFollow}>
                <button
                  type="submit"
                  className={`rounded-xl px-5 py-2 text-sm transition-colors ${
                    isFollowing
                      ? "border border-white/20 bg-transparent text-gold hover:bg-white/[0.04]"
                      : "btn-gold"
                  }`}
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {isFollowing ? "Following" : "Follow"}
                </button>
              </form>
              <MessageButton otherUserId={id} label="Message" />
            </div>
          )}
        </div>

        {/* Name + tier + member since */}
        <div className="mt-3">
          <h1
            className="text-2xl font-semibold text-foreground md:text-3xl"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            {profile.full_name}
          </h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span
              className={`rounded-full border px-3 py-0.5 text-xs ${TIER_CLS[tier]}`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {TIER_LABEL[tier]} Member
            </span>
            <span className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Member since {memberSince}
            </span>
          </div>
        </div>

        {/* Divider */}
        <div className="mt-5 border-b border-[rgba(255,255,255,0.06)]" />

        {/* Tabs */}
        <div className="flex border-b border-[rgba(255,255,255,0.06)]">
          {(["posts", "media"] as const).map((t) => (
            <a
              key={t}
              href={t === "posts" ? `/profile/client/${id}` : `/profile/client/${id}?tab=media`}
              className={`flex-1 py-3 text-center text-sm capitalize transition-colors ${
                activeTab === t
                  ? "border-b-2 border-gold font-medium text-gold"
                  : "text-muted/50 hover:text-muted/80"
              }`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {t}
            </a>
          ))}
        </div>

        {/* Tab content */}
        <div className="pb-24 pt-4">
          {activeTab === "posts" && (
            posts.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                No posts yet
              </p>
            ) : (
              <div className="space-y-3">
                {posts.map((post) => (
                  <ClientPost
                    key={post.id}
                    post={post}
                    isOwner={isOwner}
                    deleteAction={deletePostAction}
                  />
                ))}
              </div>
            )
          )}
          {activeTab === "media" && (() => {
            const mediaItems = posts.filter((p) => p.image_url != null);
            return mediaItems.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                No photos yet
              </p>
            ) : (
              <div className="grid grid-cols-3 gap-1">
                {mediaItems.map((post) => (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <div key={post.id} className="relative aspect-square overflow-hidden rounded-lg">
                    <img
                      src={post.image_url!}
                      alt=""
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            );
          })()}
        </div>
      </div>
    </div>
  );
}

type RawPost = {
  id: string;
  content: string;
  created_at: string;
  image_url: string | null;
  tags: string[] | null;
  audience: string | null;
};

function ClientPost({
  post,
  isOwner,
  deleteAction,
}: {
  post: RawPost;
  isOwner: boolean;
  deleteAction?: (postId: string) => Promise<void>;
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
    <div className="rounded-2xl border border-white/10 bg-[rgba(255,255,255,0.02)] p-4">
      <p
        className="text-xs text-muted/30"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {timeAgo}
      </p>
      <p
        className="mt-1.5 text-sm leading-relaxed text-foreground/75 whitespace-pre-wrap break-words"
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
          style={{ maxHeight: "320px" }}
        />
      )}
      {post.tags && post.tags.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(post.tags as string[]).slice(0, 4).map((tag) => (
            <span
              key={tag}
              className="rounded-full bg-white/[0.04] px-2 py-0.5 text-[10px] text-muted/40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
      {isOwner && (
        <div className="mt-2 flex items-center justify-between">
          <span className="text-[10px] text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {post.audience === "public"
              ? "Public"
              : post.audience === "followers"
              ? "Followers only"
              : "Only me"}
          </span>
          {deleteAction && (
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
          )}
        </div>
      )}
    </div>
  );
}
