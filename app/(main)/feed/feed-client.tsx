"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition, useState, useRef, useEffect } from "react";
import { createPost, toggleLike, toggleFollow, createComment, deletePost } from "@/app/actions/feed";
import { searchUsers, type SearchResult } from "@/app/actions/search";
import type { OnlineUser } from "@/app/actions/presence";
import { formatDistanceToNowStrict } from "date-fns";
import { StoriesBar } from "@/components/stories/stories-bar";
import { clientTierAtLeast, getClientTier } from "@/lib/tiers";

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
  locked_price: number | null;
  content_min_tier: string | null;
  comments: FeedComment[];
  comment_count: number;
};

export type FeedTab = "for_you" | "following";

export type ViewerProfile = {
  name: string;
  avatar: string | null;
  role: string;
};

type Props = {
  posts: FeedPost[];
  currentUserId: string | null;
  activeTab: FeedTab;
  trendingTags: string[];
  viewerClientTier: string;
  viewer: ViewerProfile;
  onlineUsers: { hosts: OnlineUser[]; clients: OnlineUser[] };
};

const MAX_TAGS = 5;
const PRESET_TAGS = ["Travel", "Dining", "Events", "Nightlife", "Wellness", "Business", "Art", "Sports"];

const COUNTRIES = [
  "Australia", "Austria", "Belgium", "Brazil", "Canada", "Denmark",
  "France", "Germany", "Ireland", "Italy", "Japan", "Netherlands",
  "New Zealand", "Norway", "Singapore", "South Africa", "Spain",
  "Sweden", "Switzerland", "United Arab Emirates", "United Kingdom",
  "United States",
];

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
      className="shrink-0 flex items-center justify-center rounded-full bg-white/10 text-white/60 font-medium"
      style={{ width: size, height: size, fontSize: Math.round(size * 0.38), fontFamily: "var(--font-dm-sans)" }}
    >
      {name.charAt(0).toUpperCase()}
    </div>
  );
}

// ── Trending tags ──────────────────────────────────────────────
function TrendingTags({
  tags,
  activeTag,
  onSelect,
}: {
  tags: string[];
  activeTag: string | null;
  onSelect: (tag: string | null) => void;
}) {
  if (tags.length === 0) return null;
  return (
    <div
      className="flex gap-2 overflow-x-auto border-b border-white/[0.05] px-4 py-3"
      style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
    >
      <button
        onClick={() => onSelect(null)}
        className={[
          "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all",
          activeTag === null
            ? "border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]"
            : "border-white/10 text-white/35 hover:text-white/70",
        ].join(" ")}
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        All
      </button>
      {tags.map((tag) => (
        <button
          key={tag}
          onClick={() => onSelect(activeTag === tag ? null : tag)}
          className={[
            "shrink-0 rounded-full border px-3.5 py-1.5 text-[12px] font-medium transition-all",
            activeTag === tag
              ? "border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]"
              : "border-white/10 text-white/35 hover:text-white/70",
          ].join(" ")}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {tag}
        </button>
      ))}
    </div>
  );
}

// ── Compose box ────────────────────────────────────────────────
export function ComposeBox({ viewer }: { viewer: ViewerProfile }) {
  const router = useRouter();
  const ref = useRef<HTMLFormElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const [expanded, setExpanded] = useState(false);
  const [chars, setChars] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTagInput, setCustomTagInput] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [audience, setAudience] = useState<"public" | "followers" | "private">("public");
  const [showAudienceMenu, setShowAudienceMenu] = useState(false);
  const [contentMinTier, setContentMinTier] = useState<string | null>(null);

  const isHost = viewer.role === "companion" || viewer.role === "host";
  const audienceLabels = { public: "Public", followers: "Followers", private: "Only me" };

  useEffect(() => {
    if (expanded) textareaRef.current?.focus();
  }, [expanded]);

  useEffect(() => {
    if (expanded) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => { document.body.style.overflow = ""; };
  }, [expanded]);

  function collapse() {
    if (imagePreview) URL.revokeObjectURL(imagePreview);
    ref.current?.reset();
    setChars(0);
    setSelectedTags([]);
    setCustomTagInput("");
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setAudience("public");
    setShowAudienceMenu(false);
    setContentMinTier(null);
    setExpanded(false);
    setError(null);
  }

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
    if (isHost && contentMinTier) fd.set("content_min_tier", contentMinTier);
    startTransition(async () => {
      const result = await createPost(null, fd);
      if (result?.error) {
        setError(result.error);
      } else {
        collapse();
        router.refresh();
      }
    });
  }

  if (!expanded) {
    return (
      <div
        className="flex w-full cursor-text items-center gap-3 border-b border-white/[0.06] px-4 py-4 sm:py-3.5"
        onClick={() => setExpanded(true)}
      >
        <Avatar name={viewer.name} url={viewer.avatar} size={38} />
        <span
          className="flex-1 select-none text-[15px] text-white/25"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          What&apos;s on your mind?
        </span>
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); setExpanded(true); }}
          className="shrink-0 rounded-full border border-[#d4af37]/40 px-4 py-2 text-[13px] font-semibold text-[#d4af37] transition-colors hover:bg-[#d4af37]/10 sm:py-1.5"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Post
        </button>
      </div>
    );
  }

  return (
    <>
      <div className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={collapse} />
      <form
        ref={ref}
        onSubmit={handleSubmit}
        className="fixed inset-x-0 bottom-0 z-50 flex max-h-[90vh] flex-col overflow-y-auto rounded-t-2xl border-t border-white/[0.08] bg-[#080810] px-4 pb-8 pt-3 sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-lg sm:max-h-[80vh] sm:rounded-2xl sm:border sm:border-white/[0.15] sm:pb-5 sm:shadow-[0_20px_60px_rgba(0,0,0,0.8)]"
      >
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Avatar name={viewer.name} url={viewer.avatar} size={36} />
            <span className="text-[14px] font-semibold text-white/90" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {viewer.name}
            </span>
          </div>
          <button type="button" onClick={collapse} className="p-1 text-white/30 transition-colors hover:text-white/70" aria-label="Collapse">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <textarea
          ref={textareaRef}
          name="content"
          rows={4}
          maxLength={500}
          placeholder="What's on your mind?"
          onChange={(e) => setChars(e.target.value.length)}
          className="w-full resize-none bg-transparent text-[15px] leading-relaxed text-white/90 placeholder:text-white/25 focus:outline-none"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        />

        {imagePreview && (
          <div className="relative mt-2 overflow-hidden rounded-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={imagePreview} alt="Preview" className="max-h-64 w-full object-cover" />
            <button type="button" onClick={clearImage} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 transition-colors hover:text-white" aria-label="Remove image">
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {selectedTags.length > 0 && (
          <div className="mt-2.5 flex flex-wrap gap-1.5">
            {selectedTags.map((tag) => (
              <span key={tag} className="flex items-center gap-1 rounded-full border border-[#d4af37]/40 bg-[#d4af37]/[0.08] px-2.5 py-0.5 text-[11px] font-medium text-[#d4af37]/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                #{tag}
                <button type="button" onClick={() => removeTag(tag)} className="leading-none opacity-60 transition-opacity hover:opacity-100">×</button>
              </span>
            ))}
          </div>
        )}

        {showAudienceMenu && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {(["public", "followers", "private"] as const).map((a) => (
              <button key={a} type="button" onClick={() => { setAudience(a); setShowAudienceMenu(false); }}
                className={["rounded-full border px-3 py-1 text-[12px] font-medium transition-all", audience === a ? "border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]" : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/60"].join(" ")}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {audienceLabels[a]}
              </button>
            ))}
          </div>
        )}

        <div className="mt-3 border-t border-white/[0.05] pt-3">
          <div className="flex flex-wrap gap-1.5">
            {PRESET_TAGS.map((tag) => {
              const active = selectedTags.includes(tag);
              const disabled = !active && selectedTags.length >= MAX_TAGS;
              return (
                <button key={tag} type="button" onClick={() => togglePresetTag(tag)} disabled={disabled}
                  className={["rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all", active ? "border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]" : disabled ? "border-white/[0.04] text-white/15" : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50"].join(" ")}
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {tag}
                </button>
              );
            })}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="text"
              value={customTagInput}
              onChange={(e) => setCustomTagInput(e.target.value.slice(0, 20))}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addCustomTag())}
              placeholder={selectedTags.length >= MAX_TAGS ? `${MAX_TAGS} tags max` : "Custom tag…"}
              disabled={selectedTags.length >= MAX_TAGS}
              className="flex-1 rounded-full bg-white/[0.04] px-3 py-1.5 text-[12px] text-white/70 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 disabled:opacity-30"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            />
            <button type="button" onClick={addCustomTag} disabled={!customTagInput.trim() || selectedTags.length >= MAX_TAGS} className="text-[12px] text-white/40 transition-opacity hover:text-white/70 disabled:opacity-30" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Add
            </button>
          </div>
        </div>

        {isHost && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="text-[11px] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>Visible to:</span>
            {[null, "silver", "gold", "platinum"].map((t) => {
              const label = t === null ? "Everyone" : `${getClientTier(t).label}+`;
              const active = contentMinTier === t;
              return (
                <button key={t ?? "all"} type="button" onClick={() => setContentMinTier(t)}
                  className={["rounded-full border px-2.5 py-1 text-[11px] font-medium transition-all", active ? "border-[#d4af37]/50 bg-[#d4af37]/10 text-[#d4af37]" : "border-white/10 text-white/30 hover:border-white/20 hover:text-white/50"].join(" ")}
                  style={{ fontFamily: "var(--font-dm-sans)" }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between sm:mt-3">
          <div className="flex items-center gap-5 sm:gap-4">
            <button type="button" onClick={() => fileInputRef.current?.click()} className="p-1 text-white/35 transition-colors hover:text-white/70" aria-label="Attach image">
              <svg className="h-[22px] w-[22px] sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </button>
            <input ref={fileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,image/gif" className="hidden" onChange={handleImageChange} />

            <button type="button" onClick={() => setShowAudienceMenu((v) => !v)}
              className={["flex items-center gap-1 p-1 text-[12px] font-medium transition-colors", showAudienceMenu || audience !== "public" ? "text-[#d4af37]" : "text-white/35 hover:text-white/70"].join(" ")}
              style={{ fontFamily: "var(--font-dm-sans)" }} aria-label="Audience"
            >
              <svg className="h-[22px] w-[22px] sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12c0 .778.099 1.533.284 2.253" />
              </svg>
              {audience !== "public" && <span>{audienceLabels[audience]}</span>}
            </button>

          </div>

          <div className="flex items-center gap-3">
            {error && <span className="text-[12px] text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>{error}</span>}
            <span className={`text-[12px] tabular-nums ${chars > 450 ? "text-red-400" : "text-white/20"}`} style={{ fontFamily: "var(--font-dm-sans)" }}>
              {chars}/500
            </span>
            <button type="submit" disabled={isPending || chars === 0}
              className="rounded-full bg-[#d4af37] px-5 py-2 text-[13px] font-semibold text-black transition-opacity disabled:opacity-40 hover:bg-[#c9a432] sm:py-1.5"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {isPending ? "Posting…" : "Post"}
            </button>
          </div>
        </div>
      </form>
    </>
  );
}

// ── Tabs ───────────────────────────────────────────────────────
function FeedTabs({ activeTab }: { activeTab: FeedTab }) {
  const tabs = [
    { label: "For You", value: "for_you" as FeedTab, href: "/feed" },
    { label: "Following", value: "following" as FeedTab, href: "/feed?tab=following" },
  ];
  return (
    <div className="flex border-b border-white/[0.06]">
      {tabs.map((tab) => (
        <Link key={tab.value} href={tab.href}
          className={["flex flex-1 items-center justify-center py-3.5 text-center text-[14px] font-medium transition-colors", activeTab === tab.value ? "-mb-px border-b-2 border-white text-white" : "text-white/35 hover:text-white/60"].join(" ")}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {tab.label}
        </Link>
      ))}
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
    <button onClick={handle} disabled={isPending}
      className={["min-h-[36px] px-1 text-[13px] font-medium transition-colors disabled:opacity-50", optimisticFollowing ? "text-white/30 hover:text-red-400" : "text-[#d4af37] hover:text-[#c9a432]"].join(" ")}
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
          <span className="text-[12px] font-semibold text-white/80" style={{ fontFamily: "var(--font-dm-sans)" }}>{comment.author.full_name}</span>
          <span className="text-[10px] text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {formatDistanceToNowStrict(new Date(comment.created_at), { addSuffix: true })}
          </span>
        </div>
        <p className="mt-0.5 text-[13px] leading-relaxed text-white/70" style={{ fontFamily: "var(--font-dm-sans)" }}>{comment.content}</p>
      </div>
    </div>
  );
}

// ── Comment section ────────────────────────────────────────────
function CommentSection({ postId, comments, commentCount, currentUserId }: { postId: string; comments: FeedComment[]; commentCount: number; currentUserId: string | null }) {
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
    <div className="mt-2 border-t border-white/[0.05] pt-2">
      {remaining > 0 && (
        <p className="mb-1 text-[11px] text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {remaining} more comment{remaining !== 1 ? "s" : ""}
        </p>
      )}
      <div>{localComments.map((c) => <CommentItem key={c.id} comment={c} />)}</div>
      {currentUserId && (
        <div className="mt-2 flex items-center gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), submit())}
            maxLength={300}
            placeholder="Add a comment…"
            className="flex-1 rounded-full bg-white/[0.04] px-3.5 py-2 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-white/10 sm:py-1.5"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          />
          <button onClick={submit} disabled={isPending || !text.trim()} className="min-h-[36px] px-1 text-[12px] font-medium text-[#d4af37] transition-opacity disabled:opacity-30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {isPending ? "…" : "Post"}
          </button>
        </div>
      )}
      {error && <p className="mt-1 text-[11px] text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>{error}</p>}
    </div>
  );
}

// ── Post card ──────────────────────────────────────────────────
function PostCard({ post, currentUserId, viewerClientTier }: { post: FeedPost; currentUserId: string | null; viewerClientTier: string }) {
  const [showComments, setShowComments] = useState(false);
  const [isDeleted, setIsDeleted] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [optimisticPost, applyLikeOptimistic] = useOptimistic(post, (state, liked: boolean) => ({
    ...state,
    is_liked: liked,
    like_count: liked ? state.like_count + 1 : state.like_count - 1,
  }));

  const isOwnPost = currentUserId === post.author_id;
  const followersGated = post.audience === "followers" && !optimisticPost.is_following && currentUserId !== post.author_id;
  const lockedGated = !!post.locked_price && currentUserId !== post.author_id;
  const tierGated = !!post.content_min_tier && !isOwnPost && !clientTierAtLeast(viewerClientTier, post.content_min_tier);

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

  const profileHref = post.author.username
    ? `/profile/${post.author.username}`
    : `/profile/client/${post.author_id}`;

  return (
    <article className="border-b border-white/[0.05] px-4 py-5">
      <div className="flex gap-3">
        <div className="flex flex-col items-center">
          <Link href={profileHref}>
            <Avatar name={post.author.full_name} url={post.author.avatar_url} size={40} />
          </Link>
          {showComments && (post.comments.length > 0 || post.comment_count > 0) && (
            <div className="mt-2 w-px flex-1 bg-white/[0.07]" />
          )}
        </div>

        <div className="min-w-0 flex-1 pb-0.5">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <Link href={profileHref} className="text-[14px] font-semibold text-white/90 transition-colors hover:text-white" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {post.author.full_name}
              </Link>
              <span className="ml-2 text-[12px] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {formatDistanceToNowStrict(new Date(post.created_at), { addSuffix: true })}
              </span>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!isOwnPost && currentUserId && (
                <FollowButton authorId={post.author_id} isFollowing={post.is_following} />
              )}
              {isOwnPost && (
                <button onClick={handleDelete} disabled={isPending} className="p-1.5 text-white/20 transition-colors hover:text-red-400 disabled:opacity-30" aria-label="Delete post">
                  <svg className="h-[15px] w-[15px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="relative mt-2">
            <div className={(followersGated || lockedGated || tierGated) ? "blur-[4px] select-none pointer-events-none" : ""}>
              <p className="text-[15px] leading-relaxed text-white/85 whitespace-pre-wrap break-words" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {post.content}
              </p>
              {post.image_url && (
                <div className="mt-3 overflow-hidden rounded-2xl">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={post.image_url} alt="" className="w-full max-h-96 object-cover" />
                </div>
              )}
              {post.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {post.tags.map((tag) => (
                    <span key={tag} className="rounded-full bg-[#d4af37]/[0.06] px-2 py-0.5 text-[11px] text-[#d4af37]/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {followersGated && !lockedGated && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1.5">
                <svg className="h-5 w-5 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
                <p className="text-[12px] text-white/35" style={{ fontFamily: "var(--font-dm-sans)" }}>Followers only</p>
              </div>
            )}

            {lockedGated && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#d4af37]/20 bg-[rgba(8,8,16,0.75)] px-6 py-4 backdrop-blur-sm">
                  <svg className="h-5 w-5 text-[#d4af37]/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <p className="text-[13px] font-medium text-white/75" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    Locked post
                  </p>
                </div>
              </div>
            )}

            {tierGated && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex flex-col items-center gap-1.5 rounded-2xl border border-[#d4af37]/20 bg-[rgba(8,8,16,0.75)] px-6 py-4 backdrop-blur-sm">
                  <svg className="h-5 w-5 text-[#d4af37]/60" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.6}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                  </svg>
                  <p className="text-[13px] font-medium text-white/75" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    {getClientTier(post.content_min_tier!).label}+ members only
                  </p>
                  <Link href="/membership" className="text-[11px] text-[#d4af37]/60 underline underline-offset-2 hover:text-[#d4af37]" style={{ fontFamily: "var(--font-dm-sans)" }}>
                    Upgrade membership →
                  </Link>
                </div>
              </div>
            )}
          </div>

          <div className="mt-3 flex items-center gap-5">
            <button onClick={handleLike} disabled={isPending || !currentUserId} className="group flex min-h-[36px] items-center gap-1.5 text-white/35 transition-colors hover:text-red-400 disabled:pointer-events-none">
              <svg className={`h-[20px] w-[20px] transition-colors sm:h-[19px] sm:w-[19px] ${optimisticPost.is_liked ? "fill-red-400 text-red-400" : "fill-none"}`} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
              </svg>
              {optimisticPost.like_count > 0 && (
                <span className={`text-[13px] tabular-nums ${optimisticPost.is_liked ? "text-red-400" : ""}`} style={{ fontFamily: "var(--font-dm-sans)" }}>
                  {optimisticPost.like_count}
                </span>
              )}
            </button>

            <button onClick={() => setShowComments((v) => !v)} className="flex min-h-[36px] items-center gap-1.5 text-white/35 transition-colors hover:text-white/70">
              <svg className="h-[20px] w-[20px] sm:h-[19px] sm:w-[19px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 20.25c4.97 0 9-3.694 9-8.25s-4.03-8.25-9-8.25S3 7.444 3 12c0 2.104.859 4.023 2.273 5.48.432.447.74 1.04.586 1.641a4.483 4.483 0 01-.923 1.785A5.969 5.969 0 006 21c1.282 0 2.47-.402 3.445-1.087.81.22 1.668.337 2.555.337z" />
              </svg>
              {optimisticPost.comment_count > 0 && (
                <span className="text-[13px] tabular-nums" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  {optimisticPost.comment_count}
                </span>
              )}
            </button>

            <button className="flex min-h-[36px] items-center text-white/35 transition-colors hover:text-white/70" aria-label="Share">
              <svg className="h-[20px] w-[20px] sm:h-[19px] sm:w-[19px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
              </svg>
            </button>
          </div>

          {showComments && (
            <CommentSection postId={post.id} comments={post.comments} commentCount={post.comment_count} currentUserId={currentUserId} />
          )}

          {isOwnPost && (
            <div className="mt-2 flex items-center gap-1 text-[10px] text-white/20" style={{ fontFamily: "var(--font-dm-sans)" }}>
              <svg className="h-2.5 w-2.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                {post.audience === "public" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253M3 12c0 .778.099 1.533.284 2.253" />
                ) : post.audience === "followers" ? (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.257 0-4.362-.62-6.162-1.694M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                )}
              </svg>
              {post.audience === "public" ? "Public" : post.audience === "followers" ? "Followers only" : "Only me"}
            </div>
          )}
        </div>
      </div>
    </article>
  );
}

// ── Sidebar: Online Now ────────────────────────────────────────
function SidebarOnlineNow({ onlineUsers }: { onlineUsers: { hosts: OnlineUser[]; clients: OnlineUser[] } }) {
  const all = [...onlineUsers.hosts, ...onlineUsers.clients].slice(0, 8);

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <div className="mb-3 flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        <h3
          className="text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Online Now
        </h3>
      </div>

      {all.length === 0 ? (
        <p className="text-[12px] text-white/20" style={{ fontFamily: "var(--font-dm-sans)" }}>
          No one online right now
        </p>
      ) : (
      <div className="flex flex-col gap-2.5 overflow-y-auto" style={{ maxHeight: 300 }}>
        {all.map((u) => {
          const href =
            u.role === "companion"
              ? u.username ? `/profile/${u.username}` : `/companion/${u.id}`
              : `/profile/client/${u.id}`;
          const firstName = u.full_name.split(" ")[0];
          const initial = u.full_name.charAt(0).toUpperCase();
          return (
            <Link key={u.id} href={href} className="flex items-center gap-2.5 transition-opacity hover:opacity-75">
              <div className="relative shrink-0">
                <div className="flex h-7 w-7 items-center justify-center overflow-hidden rounded-full border border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.08)] text-[11px] font-medium text-[#d4af37]">
                  {u.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span style={{ fontFamily: "var(--font-dm-sans)" }}>{initial}</span>
                  )}
                </div>
                <span className="absolute -bottom-px -right-px h-2 w-2 rounded-full border border-[#080810] bg-emerald-400" />
              </div>
              <span className="flex-1 truncate text-[13px] text-white/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {firstName}
              </span>
              <span
                className={`shrink-0 text-[10px] ${u.role === "companion" ? "text-[#d4af37]/55" : "text-white/20"}`}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {u.role === "companion" ? "Host" : "Client"}
              </span>
            </Link>
          );
        })}
      </div>
      )}
    </div>
  );
}

// ── Sidebar: Search ────────────────────────────────────────────
function SidebarSearch() {
  const [query, setQuery] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isPending, startTransition] = useTransition();

  function doSearch(q: string, c: string, ci: string) {
    if (!q && !c && !ci) { setResults([]); return; }
    startTransition(async () => {
      const data = await searchUsers({ q, role: "everyone", country: c, city: ci });
      setResults(data ?? []);
    });
  }

  const hasQuery = query.trim().length > 0 || !!country || !!city;

  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.02] p-4">
      <h3
        className="mb-3 text-[10px] font-medium uppercase tracking-[0.14em] text-white/30"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        Search
      </h3>

      <input
        value={query}
        onChange={(e) => { setQuery(e.target.value); doSearch(e.target.value, country, city); }}
        placeholder="Search by name…"
        className="mb-2 w-full rounded-xl bg-white/[0.05] px-3 py-2 text-[13px] text-white/80 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/20"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      />

      <div className="mb-3 flex gap-2">
        <select
          value={country}
          onChange={(e) => { setCountry(e.target.value); doSearch(query, e.target.value, city); }}
          className="flex-1 rounded-xl bg-white/[0.05] px-2 py-1.5 text-[12px] text-white/50 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/20"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          <option value="">Country</option>
          {COUNTRIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <input
          value={city}
          onChange={(e) => { setCity(e.target.value); doSearch(query, country, e.target.value); }}
          placeholder="City"
          className="flex-1 rounded-xl bg-white/[0.05] px-2 py-1.5 text-[12px] text-white/50 placeholder:text-white/20 focus:outline-none focus:ring-1 focus:ring-[#d4af37]/20"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        />
      </div>

      {isPending && (
        <p className="py-2 text-center text-[12px] text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>Searching…</p>
      )}
      {!isPending && hasQuery && results.length === 0 && (
        <p className="py-2 text-center text-[12px] text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>No results</p>
      )}
      {!isPending && results.length > 0 && (
      <div className="overflow-y-auto" style={{ maxHeight: 400 }}>
      {results.map((r) => {
        const href = r.role === "companion" && r.username ? `/profile/${r.username}` : `/profile/client/${r.id}`;
        const initial = r.full_name.charAt(0).toUpperCase();
        return (
          <Link key={r.id} href={href} className="flex items-center gap-2.5 py-1.5 transition-opacity hover:opacity-75">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white/[0.07] text-[11px] text-white/40">
              {r.avatar_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <span style={{ fontFamily: "var(--font-dm-sans)" }}>{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[13px] text-white/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
                {r.full_name}
              </p>
              {r.location && (
                <p className="truncate text-[11px] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>{r.location}</p>
              )}
            </div>
            <span
              className={`shrink-0 text-[10px] ${r.role === "companion" ? "text-[#d4af37]/55" : "text-white/20"}`}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {r.role === "companion" ? "Host" : "Client"}
            </span>
          </Link>
        );
      })}
      </div>
      )}
    </div>
  );
}

// ── Feed client ────────────────────────────────────────────────
export function FeedClient({ posts, currentUserId, activeTab, trendingTags, viewerClientTier, viewer, onlineUsers }: Props) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const filtered = activeTag ? posts.filter((p) => p.tags.includes(activeTag)) : posts;
  const isEmpty = filtered.length === 0;

  return (
    <div className="md:grid md:grid-cols-[65fr_35fr]">
      {/* ── Main feed column ────────────────────────────── */}
      <div className="min-w-0 md:border-r md:border-white/[0.04]">
        <ComposeBox viewer={viewer} />
        <StoriesBar currentUserId={currentUserId} />
        <TrendingTags tags={trendingTags} activeTag={activeTag} onSelect={setActiveTag} />
        <FeedTabs activeTab={activeTab} />

        {isEmpty ? (
          <div className="flex flex-col items-center justify-center px-6 py-24 text-center">
            {activeTag ? (
              <p className="text-[15px] text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                No posts tagged #{activeTag} yet.
              </p>
            ) : activeTab === "following" ? (
              <>
                <p className="text-[15px] text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  No posts from people you follow yet.
                </p>
                <p className="mt-1 text-[12px] text-white/25" style={{ fontFamily: "var(--font-dm-sans)" }}>
                  Follow someone from the For You tab.
                </p>
              </>
            ) : (
              <p className="text-[15px] text-white/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Nothing yet. Be the first to post.
              </p>
            )}
          </div>
        ) : (
          filtered.map((post) => (
            <PostCard key={post.id} post={post} currentUserId={currentUserId} viewerClientTier={viewerClientTier} />
          ))
        )}
      </div>

      {/* ── Sidebar — desktop only ───────────────────────── */}
      <div className="hidden md:block">
        <div className="sticky top-[120px] flex flex-col gap-3 overflow-y-auto px-4 py-4" style={{ maxHeight: "calc(100vh - 120px)" }}>
          <SidebarOnlineNow onlineUsers={onlineUsers} />
          <SidebarSearch />
        </div>
      </div>
    </div>
  );
}
