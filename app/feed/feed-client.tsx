"use client";

import Link from "next/link";
import { useActionState, useOptimistic, useTransition, useState, useRef } from "react";
import { createPost, toggleLike, toggleFollow, createComment } from "@/app/actions/feed";
import { formatDistanceToNowStrict } from "date-fns";

// ── Types ──────────────────────────────────────────────────────
export type FeedComment = {
  id: string;
  content: string;
  created_at: string;
  author: { full_name: string; avatar_url: string | null };
};

export type FeedPost = {
  id: string;
  content: string;
  created_at: string;
  author_id: string;
  author: { full_name: string; avatar_url: string | null };
  like_count: number;
  is_liked: boolean;
  is_following: boolean;
  comments: FeedComment[];
  comment_count: number;
};

export type FeedTab = "for_you" | "following";

type Props = {
  posts: FeedPost[];
  currentUserId: string | null;
  activeTab: FeedTab;
};

// ── Compose box ────────────────────────────────────────────────
export function ComposeBox() {
  const [state, formAction, isPending] = useActionState(createPost, null);
  const ref = useRef<HTMLFormElement>(null);
  const [chars, setChars] = useState(0);

  return (
    <form
      ref={ref}
      action={async (fd) => {
        ref.current?.reset();
        setChars(0);
        await formAction(fd);
      }}
      className="border-b border-white/[0.06] px-4 py-4"
    >
      <textarea
        name="content"
        rows={3}
        maxLength={500}
        placeholder="What's on your mind?"
        onChange={(e) => setChars(e.target.value.length)}
        className="w-full resize-none bg-transparent text-[15px] text-white/90 placeholder:text-white/25 focus:outline-none"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      />
      <div className="mt-2 flex items-center justify-between">
        <span
          className={`text-xs ${chars > 450 ? "text-red-400" : "text-white/25"}`}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {chars}/500
        </span>
        <div className="flex items-center gap-3">
          {state?.error && (
            <span className="text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {state.error}
            </span>
          )}
          <button
            type="submit"
            disabled={isPending || chars === 0}
            className="rounded-full bg-white px-5 py-1.5 text-xs font-semibold text-black transition-opacity disabled:opacity-40"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {isPending ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </form>
  );
}

// ── Tabs ───────────────────────────────────────────────────────
function FeedTabs({ activeTab }: { activeTab: FeedTab }) {
  const tabs: { label: string; value: FeedTab; href: string }[] = [
    { label: "For You", value: "for_you", href: "/feed" },
    { label: "Following", value: "following", href: "/feed?tab=following" },
  ];

  return (
    <div className="flex border-b border-white/[0.06]">
      {tabs.map((tab) => (
        <Link
          key={tab.value}
          href={tab.href}
          className={[
            "flex-1 py-3 text-center text-[14px] font-medium transition-colors",
            activeTab === tab.value
              ? "text-white border-b-2 border-white -mb-px"
              : "text-white/35 hover:text-white/60",
          ].join(" ")}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {tab.label}
        </Link>
      ))}
    </div>
  );
}

// ── Avatar ─────────────────────────────────────────────────────
function Avatar({ name, url, size = 36 }: { name: string; url: string | null; size?: number }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt={name}
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/60 text-xs font-medium"
      style={{ width: size, height: size, fontFamily: "var(--font-dm-sans)" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Follow button ──────────────────────────────────────────────
function FollowButton({ authorId, isFollowing }: { authorId: string; isFollowing: boolean }) {
  const [isPending, startTransition] = useTransition();
  const [optimisticFollowing, applyOptimistic] = useOptimistic(isFollowing, (_: boolean, next: boolean) => next);

  function handle() {
    startTransition(async () => {
      applyOptimistic(!optimisticFollowing);
      await toggleFollow(authorId);
    });
  }

  return (
    <button
      onClick={handle}
      disabled={isPending}
      className={[
        "rounded-full border px-3 py-0.5 text-[12px] font-medium transition-all disabled:opacity-50",
        optimisticFollowing
          ? "border-white/20 text-white/50 hover:border-red-400/40 hover:text-red-400"
          : "border-white/30 text-white/70 hover:border-white/60 hover:text-white",
      ].join(" ")}
      style={{ fontFamily: "var(--font-dm-sans)" }}
    >
      {optimisticFollowing ? "Following" : "Follow"}
    </button>
  );
}

// ── Comment item ───────────────────────────────────────────────
function CommentItem({ comment }: { comment: FeedComment }) {
  return (
    <div className="flex gap-2.5 py-2">
      <Avatar name={comment.author.full_name} url={comment.author.avatar_url} size={26} />
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-white/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {comment.author.full_name}
          </span>
          <span className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {formatDistanceToNowStrict(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] text-white/70 leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {comment.content}
        </p>
      </div>
    </div>
  );
}

// ── Comment section ────────────────────────────────────────────
function CommentSection({
  postId,
  comments,
  commentCount,
  currentUserId,
}: {
  postId: string;
  comments: FeedComment[];
  commentCount: number;
  currentUserId: string | null;
}) {
  const [text, setText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [localComments, setLocalComments] = useState<FeedComment[]>(comments);

  function submit() {
    if (!text.trim() || !currentUserId) return;
    const optimistic: FeedComment = {
      id: `opt-${Date.now()}`,
      content: text.trim(),
      created_at: new Date().toISOString(),
      author: { full_name: "You", avatar_url: null },
    };
    setLocalComments((c) => [...c, optimistic]);
    const draft = text;
    setText("");
    startTransition(async () => {
      const result = await createComment(postId, draft);
      if (result?.error) {
        setError(result.error);
        setLocalComments((c) => c.filter((x) => x.id !== optimistic.id));
      }
    });
  }

  const remaining = commentCount - comments.length;

  return (
    <div className="mt-1 border-t border-white/[0.05] pt-2">
      {remaining > 0 && (
        <p className="mb-1 text-xs text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {remaining} more comment{remaining !== 1 ? "s" : ""}
        </p>
      )}
      <div className="space-y-0">
        {localComments.map((c) => (
          <CommentItem key={c.id} comment={c} />
        ))}
      </div>
      {currentUserId && (
        <div className="mt-2 flex gap-2 items-center">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submit())}
            maxLength={300}
            placeholder="Add a comment…"
            className="flex-1 bg-white/[0.05] rounded-full px-3.5 py-1.5 text-[13px] text-white/80 placeholder:text-white/25 focus:outline-none focus:ring-1 focus:ring-white/20"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          />
          <button
            onClick={submit}
            disabled={isPending || !text.trim()}
            className="text-xs text-[#d4af37] font-medium disabled:opacity-30 transition-opacity"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {isPending ? "…" : "Reply"}
          </button>
        </div>
      )}
      {error && (
        <p className="mt-1 text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </p>
      )}
    </div>
  );
}

// ── Post card ──────────────────────────────────────────────────
function PostCard({ post, currentUserId }: { post: FeedPost; currentUserId: string | null }) {
  const [showComments, setShowComments] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticPost, applyLikeOptimistic] = useOptimistic(post, (state, liked: boolean) => ({
    ...state,
    is_liked: liked,
    like_count: liked ? state.like_count + 1 : state.like_count - 1,
  }));

  const isOwnPost = currentUserId === post.author_id;

  function handleLike() {
    if (!currentUserId) return;
    startTransition(async () => {
      applyLikeOptimistic(!optimisticPost.is_liked);
      await toggleLike(post.id);
    });
  }

  return (
    <article className="border-b border-white/[0.06] px-4 py-4">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Avatar name={post.author.full_name} url={post.author.avatar_url} size={38} />
          {showComments && (post.comments.length > 0 || post.comment_count > 0) && (
            <div className="mt-2 w-px flex-1 bg-white/[0.08]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <span
                className="truncate text-[14px] font-semibold text-white/90"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {post.author.full_name}
              </span>
              <span className="shrink-0 text-xs text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            {!isOwnPost && currentUserId && (
              <FollowButton authorId={post.author_id} isFollowing={post.is_following} />
            )}
          </div>

          {/* Content */}
          <p
            className="mt-1 text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap break-words"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {post.content}
          </p>

          {/* Actions */}
          <div className="mt-3 flex items-center gap-5">
            {/* Like */}
            <button
              onClick={handleLike}
              disabled={isPending || !currentUserId}
              className="group flex items-center gap-1.5 text-white/40 transition-colors hover:text-red-400 disabled:pointer-events-none"
            >
              <svg
                className={`h-[18px] w-[18px] transition-colors ${optimisticPost.is_liked ? "fill-red-400 text-red-400" : "fill-none"}`}
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z"
                />
              </svg>
              <span
                className={`text-xs tabular-nums ${optimisticPost.is_liked ? "text-red-400" : ""}`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {optimisticPost.like_count > 0 ? optimisticPost.like_count : ""}
              </span>
            </button>

            {/* Comment toggle */}
            <button
              onClick={() => setShowComments((v) => !v)}
              className="flex items-center gap-1.5 text-white/40 transition-colors hover:text-white/70"
            >
              <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z"
                />
              </svg>
              <span className="text-xs tabular-nums" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {optimisticPost.comment_count > 0 ? optimisticPost.comment_count : ""}
              </span>
            </button>
          </div>

          {/* Comments */}
          {showComments && (
            <CommentSection
              postId={post.id}
              comments={post.comments}
              commentCount={post.comment_count}
              currentUserId={currentUserId}
            />
          )}
        </div>
      </div>
    </article>
  );
}

// ── Feed client (tabs + list) ──────────────────────────────────
export function FeedClient({ posts, currentUserId, activeTab }: Props) {
  const isEmpty = posts.length === 0;

  return (
    <>
      <FeedTabs activeTab={activeTab} />

      {isEmpty ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-6">
          {activeTab === "following" ? (
            <>
              <p className="text-[15px] text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                No posts from people you follow yet.
              </p>
              <p className="mt-1 text-xs text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Follow someone from the For You tab to see their posts here.
              </p>
            </>
          ) : (
            <p className="text-[15px] text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Nothing yet. Be the first to post.
            </p>
          )}
        </div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} currentUserId={currentUserId} />)
      )}
    </>
  );
}
