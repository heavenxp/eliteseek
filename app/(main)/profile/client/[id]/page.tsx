import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { toggleFollow } from "@/app/actions/feed";

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
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: { user: viewer } } = await supabase.auth.getUser();

  const [profileRes, clientRes, postsRes, viewerRoleRes, followRes] = await Promise.all([
    admin.from("profiles").select("id, full_name, created_at").eq("id", id).single(),
    admin.from("client_profiles").select("membership_tier").eq("user_id", id).maybeSingle(),
    supabase
      .from("posts")
      .select("id, content, created_at, image_url, tags")
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
    elite:  "border-[rgba(212,175,55,0.3)] bg-[rgba(212,175,55,0.08)] text-gold",
  };

  return (
    <div className="min-h-screen bg-[rgba(8,8,16,1)]">
      {/* Cover */}
      <div className="relative h-36 w-full overflow-hidden md:h-48">
        <div className="h-full w-full bg-gradient-to-br from-[rgba(212,175,55,0.04)] via-[rgba(20,10,40,0.7)] to-[rgba(8,8,16,1)]" />
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[rgba(8,8,16,1)] to-transparent" />
      </div>

      <div className="mx-auto max-w-2xl px-4">
        {/* Avatar + Follow button row */}
        <div className="-mt-10 flex items-end justify-between md:-mt-12">
          <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[rgba(8,8,16,1)] bg-[rgba(212,175,55,0.08)] md:h-24 md:w-24">
            <span
              className="text-3xl font-light text-gold/40 md:text-4xl"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              {initials}
            </span>
          </div>

          {viewerIsCompanion && viewer?.id !== id && (
            <form action={handleFollow} className="mb-2">
              <button
                type="submit"
                className={`rounded-xl px-5 py-2 text-sm transition-colors ${
                  isFollowing
                    ? "border border-[rgba(212,175,55,0.3)] bg-transparent text-gold hover:bg-[rgba(212,175,55,0.06)]"
                    : "btn-gold"
                }`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {isFollowing ? "Following" : "Follow"}
              </button>
            </form>
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

        {/* Posts */}
        <div className="py-5">
          <p
            className="mb-4 text-xs uppercase tracking-[0.1em] text-muted/40"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Posts · {posts.length}
          </p>

          {posts.length === 0 ? (
            <p
              className="py-12 text-center text-sm text-muted/30"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              No posts yet
            </p>
          ) : (
            <div className="space-y-3 pb-24">
              {posts.map((post) => (
                <ClientPost key={post.id} post={post} />
              ))}
            </div>
          )}
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
};

function ClientPost({ post }: { post: RawPost }) {
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
              className="rounded-full bg-[rgba(212,175,55,0.06)] px-2 py-0.5 text-[10px] text-gold/50"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              #{tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
