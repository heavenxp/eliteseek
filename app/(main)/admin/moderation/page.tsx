import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { AdminActionButton } from "../admin-action-button";
import { approveContent, rejectContent, resolveFlag } from "@/app/actions/admin";
import type { ContentPost, CompanionProfile } from "@/lib/database.types";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    pending: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    flagged: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    approved: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    rejected: "bg-red-500/10 text-red-400 border-red-500/20",
  };
  return (
    <span
      className={[
        "rounded-full border px-2.5 py-0.5 text-xs",
        colors[status] ?? "bg-white/5 text-muted/50 border-white/10",
      ].join(" ")}
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {status}
    </span>
  );
}

type PostRow = Pick<
  ContentPost,
  "id" | "title" | "body" | "media_urls" | "companion_id" | "created_at" | "moderation_status"
> & {
  companion_profiles: Pick<CompanionProfile, "display_name" | "user_id"> | null;
};

export default async function AdminModerationPage() {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("content_posts")
    .select(
      `id, title, body, media_urls, companion_id, created_at, moderation_status,
       companion_profiles!companion_id(display_name, user_id)`
    )
    .in("moderation_status", ["pending", "flagged"])
    .order("created_at", { ascending: false })
    .limit(50);

  const posts = (data as PostRow[] | null) ?? [];

  // Hive flags on surfaces without their own moderation column (messages,
  // feed posts, stories, profile photos). moderation_log is admin-only RLS,
  // so the service-role client reads it; page access is gated by the admin
  // layout.
  const { data: flagRows } = await createAdminClient()
    .from("moderation_log")
    .select("id, subject_id, content_id, content_type, action, moderation_score, created_at")
    .in("action", ["flagged", "rejected"])
    .is("reviewed_by", null)
    .order("created_at", { ascending: false })
    .limit(50);

  const flags = flagRows ?? [];
  const flagSubjectIds = [...new Set(flags.map((f) => f.subject_id))];
  const { data: flagProfiles } = flagSubjectIds.length
    ? await createAdminClient()
        .from("profiles")
        .select("id, full_name")
        .in("id", flagSubjectIds)
    : { data: [] };
  const flagNameMap = new Map((flagProfiles ?? []).map((p) => [p.id, p.full_name]));

  const FLAG_TYPE_LABELS: Record<string, string> = {
    message: "Message",
    feed_post: "Feed post",
    story: "Story",
    profile_photo: "Profile photo",
    content_post: "Content post",
  };

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div>
        <h1
          className="text-3xl font-light text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Content Moderation
        </h1>
        <p
          className="mt-1 text-sm text-muted/50"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {posts.length} post{posts.length !== 1 ? "s" : ""} awaiting review
        </p>
      </div>

      {error ? (
        <p className="text-sm text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Failed to load posts.
        </p>
      ) : posts.length === 0 ? (
        <div className="glass-card p-12 text-center">
          <p
            className="text-xl font-light text-foreground/50"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            No posts pending review
          </p>
          <p
            className="mt-1 text-sm text-muted/40"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            All content is up to date.
          </p>
        </div>
      ) : (
        <ul className="space-y-4">
          {posts.map((post) => {
            const cp = Array.isArray(post.companion_profiles)
              ? post.companion_profiles[0] ?? null
              : post.companion_profiles;
            const companionName = cp?.display_name ?? post.companion_id;
            const mediaCount = Array.isArray(post.media_urls)
              ? post.media_urls.length
              : 0;
            const bodyExcerpt = post.body
              ? post.body.slice(0, 180) + (post.body.length > 180 ? "…" : "")
              : null;

            return (
              <li key={post.id} className="glass-card p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2
                        className="text-base font-light text-foreground"
                        style={{ fontFamily: "var(--font-cormorant)" }}
                      >
                        {post.title ?? "(untitled)"}
                      </h2>
                      <StatusBadge status={post.moderation_status} />
                    </div>
                    <p
                      className="mt-1 text-xs text-muted/50"
                      style={{ fontFamily: "var(--font-dm-sans)" }}
                    >
                      By <span className="text-foreground/60">{companionName}</span>
                      {" · "}
                      {formatDate(post.created_at)}
                      {mediaCount > 0 && ` · ${mediaCount} media`}
                    </p>
                    {bodyExcerpt && (
                      <p
                        className="mt-2 text-sm text-muted/60 leading-relaxed"
                        style={{ fontFamily: "var(--font-dm-sans)" }}
                      >
                        {bodyExcerpt}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 shrink-0">
                    <AdminActionButton
                      action={() => approveContent(post.id)}
                      label="Approve"
                      variant="gold"
                    />
                    <AdminActionButton
                      action={() => rejectContent(post.id)}
                      label="Reject"
                      variant="danger"
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* ── Hive flags (messages, feed posts, stories, photos) ── */}
      <div className="pt-4">
        <h2
          className="text-2xl font-light text-foreground"
          style={{ fontFamily: "var(--font-cormorant)" }}
        >
          Flagged by moderation
        </h2>
        <p
          className="mt-1 text-sm text-muted/50"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {flags.length} item{flags.length !== 1 ? "s" : ""} awaiting review across messages, feed, stories, and photos
        </p>
      </div>

      {flags.length === 0 ? (
        <div className="glass-card p-8 text-center">
          <p
            className="text-base font-light text-foreground/50"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Nothing flagged — the queue is clear.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {flags.map((flag) => (
            <li key={flag.id} className="glass-card flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="rounded-full border border-[rgba(212,175,55,0.25)] bg-[rgba(212,175,55,0.07)] px-2.5 py-0.5 text-xs text-gold"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {FLAG_TYPE_LABELS[flag.content_type ?? ""] ?? flag.content_type}
                  </span>
                  <StatusBadge status={flag.action} />
                  {flag.moderation_score != null && (
                    <span className="text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      score {Number(flag.moderation_score).toFixed(2)}
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  By <span className="text-foreground/60">{flagNameMap.get(flag.subject_id) ?? flag.subject_id}</span>
                  {" · "}
                  {formatDate(flag.created_at)}
                </p>
              </div>
              <div className="flex shrink-0 gap-2">
                <AdminActionButton
                  action={() => resolveFlag(flag.id, "dismissed")}
                  label="Dismiss"
                  variant="ghost"
                />
                {flag.content_id && flag.content_type !== "profile_photo" && (
                  <AdminActionButton
                    action={() => resolveFlag(flag.id, "removed")}
                    label="Remove content"
                    variant="danger"
                  />
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
