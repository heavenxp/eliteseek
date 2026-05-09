"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition, useState, useRef } from "react";
import { createPost, toggleLike, toggleFollow, createComment, deletePost } from "@/app/actions/feed";
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
  author: { full_name: string; avatar_url: string | null; username: string | null };
  like_count: number;
  is_liked: boolean;
  is_following: boolean;
  tags: string[];
  image_url: string | null;
  audience: "public" | "followers" | "private";
  comments: FeedComment[];
  comment_count: number;
};

export type FeedTab = "for_you" | "following";

type Props = {
  posts: FeedPost[];
  currentUserId: string | null;
  activeTab: FeedTab;
};

const PRESET_TAGS = ["Travel", "Dining", "Events", "Nightlife", "Wellness", "Business", "Art", "Sports"];
const MAX_TAGS = 5;

// ── Compose box ────────────────────────────────────────────────
export function ComposeBox() {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [chars, setChars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audience, setAudience] = useState<"public" | "followers" | "private">("public");

  function togglePresetTag(tag: string) {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : prev.length < MAX_TAGS ? [...prev, tag] : prev
    );
  }

  function addCustomTag() {
    const tag = customTagInput.trim().toLowerCase();
    if (!tag || tag.length > 20 || selectedTags.map((t) => t.toLowerCase()).includes(tag) || selectedTags.length >= MAX_TAGS) return;
    setSelectedTags((prev) => [...prev, tag]);
    setCustomTagInput("");
  }

  function removeTag(tag: string) {
    setSelectedTags((prev) => prev.filter((t) => t !== tag));
  }

  function handleImageChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    } else {
      setImageFile(null);
      setImagePreview(null);
    }
  }

  function clearImage() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    if (selectedTags.length > 0) fd.set("tags", selectedTags.join(","));
    if (imageFile) fd.set("image", imageFile);
    fd.set("audience", audience);
    const capturedPreview = imagePreview;
    startTransition(async () => {
      const result = await createPost(null, fd);
      if (result?.error) {
        setError(result.error);
      } else {
        setError(null);
        ref.current?.reset();
        setChars(0);
        setSelectedTags([]);
        setCustomTagInput("");
        if (capturedPreview) URL.revokeObjectURL(capturedPreview);
        setImageFile(null);
        setImagePreview(null);
        if (fileInputRef.current) fileInputRef.current.value = "";
        setAudience("public");
        router.refresh();
      }
    });
  }

  const customTags = selectedTags.filter((t) => !PRESET_TAGS.includes(t));

  return (
    <form ref={ref} onSubmit={handleSubmit} className="border-b border-white/[0.06] px-4 py-4">
      <textarea
        name="content"
        rows={3}
        maxLength={500}
        placeholder="What's on your mind?"
        onChange={(e) => setChars(e.target.value.length)}
        className="w-full resize-none bg-transparent text-[15px] text-white/90 placeholder:text-white/25 focus:outline-none"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      />

      {/* Image preview */}
      {imagePreview && (
        <div className="relative mt-2 overflow-hidden rounded-xl">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imagePreview} alt="Preview" className="max-h-60 w-full object-cover" />
          <button
            type="button"
            onClick={clearImage}
            className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-black/60 text-white/80 hover:text-white transition-colors"
            aria-label="Remove image"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Audience selector */}
      <div className="mt-3 flex items-center gap-1.5">
        {(["public", "followers", "private"] as const).map((a) => {
          const labels = { public: "Public", followers: "Followers only", private: "Only me" };
          const active = audience === a;
          return (
            <button
              key={a}
              type="button"
              onClick={() => setAudience(a)}
              className={[
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all",
                active
                  ? "border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]"
                  : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50",
              ].join(" ")}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {labels[a]}
            </button>
          );
        })}
      </div>

      {/* Preset tag chips */}
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {PRESET_TAGS.map((tag) => {
          const active = selectedTags.includes(tag);
          const disabled = !active && selectedTags.length >= MAX_TAGS;
          return (
            <button
              key={tag}
              type="button"
              onClick={() => togglePresetTag(tag)}
              disabled={disabled}
              className={[
                "rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition-all",
                active
                  ? "border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]"
                  : disabled
                  ? "border-white/[0.04] text-white/15"
                  : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50",
              ].join(" ")}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {tag}
            </button>
          );
        })}
      </div>

      {/* Custom tag input */}
      <div className="mt-2 flex items-center gap-2">
        <input
          type="text"
          value={customTagInput}
          onChange={(e) => setCustomTagInput(e.target.value.slice(0, 20))}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
          placeholder={selectedTags.length >= MAX_TAGS ? `${MAX_TAGS} tags max` : "Add custom tag…"}
          disabled={selectedTags.length >= MAX_TAGS}
          className="flex-1 rounded-full bg-white/[0.04] px-3 py-1 text-[12px] text-white/70 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/15 disabled:opacity-30"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        />
        <button
          type="button"
          onClick={addCustomTag}
          disabled={!customTagInput.trim() || selectedTags.length >= MAX_TAGS}
          className="text-xs text-white/40 hover:text-white/70 disabled:opacity-30 transition-opacity"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Add
        </button>
      </div>

      {/* Custom tag chips */}
      {customTags.length > 0 && (
        <div className="mt-1.5 flex flex-wrap gap-1.5">
          {customTags.map((tag) => (
            <span
              key={tag}
              className="flex items-center gap-1 rounded-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-2.5 py-0.5 text-[11px] font-medium text-[#d4af37]"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="leading-none opacity-70 hover:opacity-100 transition-opacity"
                aria-label={`Remove ${tag}`}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={`text-xs ${chars > 450 ? "text-red-400" : "text-white/25"}`}
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {chars}/500
          </span>
          {/* Image upload button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="text-white/30 hover:text-white/60 transition-colors"
            aria-label="Attach image"
          >
            <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
            className="hidden"
            onChange={handleImageChange}
          />
        </div>
        <div className="flex items-center gap-3">
          {error && (
            <span className="text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {error}
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
  const [isDeleted, setIsDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticPost, applyLikeOptimistic] = useOptimistic(post, (state, liked: boolean) => ({
    ...state,
    is_liked: liked,
    like_count: liked ? state.like_count + 1 : state.like_count - 1,
  }));

  const isOwnPost = currentUserId === post.author_id;

  if (isDeleted) return null;

  function handleDelete() {
    startTransition(async () => {
      setIsDeleted(true);
      const result = await deletePost(post.id);
      if (result?.error) setIsDeleted(false);
    });
  }

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
          <Link href={post.author.username ? `/profile/${post.author.username}` : `/profile/client/${post.author_id}`}>
            <Avatar name={post.author.full_name} url={post.author.avatar_url} size={38} />
          </Link>
          {showComments && (post.comments.length > 0 || post.comment_count > 0) && (
            <div className="mt-2 w-px flex-1 bg-white/[0.08]" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-baseline gap-2 min-w-0">
              <Link
                href={post.author.username ? `/profile/${post.author.username}` : `/profile/client/${post.author_id}`}
                className="truncate text-[14px] font-semibold text-white/90 hover:text-white transition-colors"
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {post.author.full_name}
              </Link>
              <span className="shrink-0 text-xs text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            {isOwnPost ? (
              <button
                onClick={handleDelete}
                disabled={isPending}
                className="p-1 text-white/20 hover:text-red-400 transition-colors disabled:opacity-30"
                aria-label="Delete post"
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            ) : currentUserId && (
              <FollowButton authorId={post.author_id} isFollowing={post.is_following} />
            )}
          </div>

          {/* Content + image + tags (gated for followers-only posts) */}
          {(() => {
            const gated = post.audience === "followers" && !optimisticPost.is_following && currentUserId !== post.author_id;
            return (
              <div className="relative mt-1">
                <div className={gated ? "blur-[3px] select-none pointer-events-none" : ""}>
                  <p
                    className="text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap break-words"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {post.content}
                  </p>
                  {post.image_url && (
                    <div className="mt-2 overflow-hidden rounded-xl">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={post.image_url} alt="" className="w-full max-h-80 object-cover" />
                    </div>
                  )}
                  {post.tags.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {post.tags.map((tag) => (
                        <span
                          key={tag}
                          className="rounded-full border border-[#d4af37]/20 bg-[#d4af37]/[0.06] px-2 py-0.5 text-[11px] text-[#d4af37]/60"
                          style={{ fontFamily: "var(--font-dm-sans)" }}
                        >
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {gated && (
                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-1">
                    <svg className="h-4 w-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                    </svg>
                    <p className="text-[11px] text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      Followers only
                    </p>
                  </div>
                )}
                {post.audience !== "public" && currentUserId === post.author_id && (
                  <span
                    className="mt-1 inline-block text-[10px] text-white/25"
                    style={{ fontFamily: "var(--font-dm-sans)" }}
                  >
                    {post.audience === "followers" ? "Followers only" : "Only you"}
                  </span>
                )}
              </div>
            );
          })()}

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
