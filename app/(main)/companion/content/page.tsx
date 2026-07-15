import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { Icon } from "@/components/icons";
import { DeleteContentButton } from "./delete-content-button";
import { signPaths, applySignedUrls } from "@/lib/content-media";
import type { ContentPost } from "@/lib/database.types";
import type { MediaItem } from "@/app/actions/content";

export default async function ContentStudioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: companion } = await supabase
    .from("companion_profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!companion) redirect("/browse");

  const { data: posts } = await supabase
    .from("content_posts")
    .select("*")
    .eq("companion_id", companion.id)
    .order("created_at", { ascending: false });

  const allPosts = (posts ?? []) as ContentPost[];

  // content-media is private (migration 026) — sign the owner's thumbnails
  const urlByPath = await signPaths(
    allPosts.flatMap((p) =>
      ((p.media_urls as unknown as MediaItem[]) ?? []).map((m) => m.storage_path)
    )
  );
  for (const p of allPosts) {
    p.media_urls = applySignedUrls(
      ((p.media_urls as unknown as MediaItem[]) ?? []),
      urlByPath
    ) as unknown as ContentPost["media_urls"];
  }

  const stats = {
    total: allPosts.length,
    free: allPosts.filter((p) => !p.is_ppv && !p.is_subscribers_only).length,
    ppv: allPosts.filter((p) => p.is_ppv).length,
    subs: allPosts.filter((p) => p.is_subscribers_only).length,
  };

  return (
    <div className="page-bg min-h-screen">
      <div className="mx-auto max-w-3xl px-4 py-8 md:px-6 md:py-12">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1
              className="text-3xl font-light text-foreground"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Content Studio
            </h1>
            <p
              className="mt-1 text-sm text-muted/50"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {stats.total} posts · {stats.free} free · {stats.subs} subscribers · {stats.ppv} PPV
            </p>
          </div>
          <Link
            href="/companion/content/new"
            className="btn-gold flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            <Icon name="plus" className="h-4 w-4" />
            New Post
          </Link>
        </div>

        {allPosts.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="space-y-3">
            {allPosts.map((post) => (
              <ContentRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ContentRow({ post }: { post: ContentPost }) {
  const media = (post.media_urls as unknown as MediaItem[])?.[0] ?? null;
  const mediaCount = (post.media_urls as unknown as MediaItem[])?.length ?? 0;
  const date = new Date(post.created_at).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="flex items-center gap-4 rounded-xl border border-[rgba(212,175,55,0.1)] bg-[rgba(255,255,255,0.02)] px-4 py-3.5">
      {/* Thumbnail */}
      <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-[rgba(255,255,255,0.04)]">
        {media ? (
          media.type === "video" ? (
            <div className="flex h-full w-full items-center justify-center">
              <Icon name="video" className="h-5 w-5 text-muted/40" />
            </div>
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.url} alt="" className="h-full w-full object-cover" />
          )
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Icon name="photo" className="h-5 w-5 text-muted/40" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-1.5">
          <p
            className="truncate text-sm text-foreground/90"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {post.title || post.body?.slice(0, 50) || "Untitled post"}
          </p>
          {post.is_ppv && (
            <span className="rounded-full bg-[rgba(212,175,55,0.1)] px-2 py-0.5 text-[10px] text-gold/70">
              PPV ${post.ppv_price}
            </span>
          )}
          {post.is_subscribers_only && (
            <span className="rounded-full bg-[rgba(212,175,55,0.08)] px-2 py-0.5 text-[10px] text-gold/60">
              Subs only
            </span>
          )}
        </div>
        <p
          className="mt-0.5 text-xs text-muted/40"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {date} · {mediaCount} {mediaCount === 1 ? "file" : "files"}
        </p>
      </div>

      <DeleteContentButton postId={post.id} />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center gap-4 py-20 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.05)]">
        <Icon name="photo" className="h-6 w-6 text-gold/40" />
      </div>
      <p
        className="text-xl font-light text-foreground/60"
        style={{ fontFamily: "var(--font-cormorant)" }}
      >
        No content yet
      </p>
      <p
        className="text-sm text-muted/40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Upload photos and videos for your subscribers.
      </p>
      <Link
        href="/companion/content/new"
        className="btn-gold mt-2 rounded-xl px-6 py-2.5 text-sm"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Create your first post
      </Link>
    </div>
  );
}
