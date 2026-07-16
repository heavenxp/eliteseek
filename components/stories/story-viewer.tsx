"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatDistanceToNowStrict } from "date-fns";
import { markStoryViewed, deleteStory } from "@/app/actions/stories";
import type { StoryGroup } from "@/app/actions/stories";

const PHOTO_DURATION = 7000;

type Props = {
  groups: StoryGroup[];
  initialGroupIndex: number;
  currentUserId: string;
  onClose: () => void;
  onAddStory?: () => void;
};

export function StoryViewer({ groups, initialGroupIndex, currentUserId, onClose }: Props) {
  const router = useRouter();
  const [gi, setGi] = useState(initialGroupIndex);
  const [si, setSi] = useState(0);
  const [fading, setFading] = useState(false);
  const [paused, setPaused] = useState(false);
  const [mediaState, setMediaState] = useState<"loading" | "ready" | "error">("loading");
  const [deleting, startDeleteTransition] = useTransition();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  // Direct DOM ref for the active bar — bypasses React state for zero-jitter animation.
  const barRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  // Elapsed ms at last pause point, so resume can continue from the same position.
  const elapsedMsRef = useRef(0);
  const goNextRef = useRef<() => void>(() => {});
  const fadeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdFiredRef = useRef(false);
  const pointerStartRef = useRef<{ x: number; y: number } | null>(null);

  const group = groups[gi];
  const story = group?.stories[si];

  // Stable callback ref — same function identity every render, so React won't
  // call it on re-renders caused by paused/fading state changes.
  const setBarRef = useCallback((el: HTMLDivElement | null) => {
    barRef.current = el;
    if (el) el.style.width = "0%";
  }, []);

  function cancelRaf() {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }

  function startPhotoRaf(startElapsedMs: number) {
    cancelRaf();
    const startTime = Date.now() - startElapsedMs;

    function tick() {
      const elapsed = Date.now() - startTime;
      const p = Math.min(elapsed / PHOTO_DURATION, 1);
      elapsedMsRef.current = elapsed;
      if (barRef.current) barRef.current.style.width = `${p * 100}%`;
      if (p < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
        goNextRef.current();
      }
    }

    rafRef.current = requestAnimationFrame(tick);
  }

  // ── Navigation ─────────────────────────────────────────────────

  function navigate(action: () => void) {
    cancelRaf();
    if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
    setFading(true);
    fadeTimerRef.current = setTimeout(() => {
      action();
      setFading(false);
    }, 150);
  }

  function goNext() {
    navigate(() => {
      elapsedMsRef.current = 0;
      if (si + 1 < (groups[gi]?.stories.length ?? 0)) {
        setSi((s) => s + 1);
      } else if (gi + 1 < groups.length) {
        setGi((g) => g + 1);
        setSi(0);
      } else {
        onClose();
      }
    });
  }

  function goPrev() {
    navigate(() => {
      elapsedMsRef.current = 0;
      if (si > 0) {
        setSi((s) => s - 1);
      } else if (gi > 0) {
        setGi((g) => g - 1);
        setSi(groups[gi - 1].stories.length - 1);
      }
    });
  }

  function goNextUser() {
    navigate(() => {
      elapsedMsRef.current = 0;
      if (gi + 1 < groups.length) {
        setGi((g) => g + 1);
        setSi(0);
      } else {
        onClose();
      }
    });
  }

  goNextRef.current = goNext;

  // ── Story change: reset and start ──────────────────────────────

  useEffect(() => {
    if (!story) return;
    cancelRaf();
    elapsedMsRef.current = 0;
    setPaused(false);
    setMediaState("loading");
    markStoryViewed(story.id).catch(() => {});
    // barRef is reset to 0% by the setBarRef callback when the new bar mounts.
    // The photo timer starts from onLoad — never against a blank screen.
    return cancelRaf;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gi, si]);

  // ── Video pause/resume ──────────────────────────────────────────

  useEffect(() => {
    const vid = videoRef.current;
    if (!vid || story?.mediaType !== "video") return;
    if (paused) {
      vid.pause();
    } else {
      vid.play().catch(() => {});
    }
  }, [paused, story?.mediaType]);

  // ── Guards + cleanup ────────────────────────────────────────────

  useEffect(() => {
    if (!group || !story) onClose();
  }, [group, story, onClose]);

  useEffect(() => {
    return () => {
      cancelRaf();
      if (fadeTimerRef.current) clearTimeout(fadeTimerRef.current);
      if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    };
  }, []);

  if (!group || !story) return null;

  const isPhoto = story.mediaType === "photo";

  // ── Pointer handling: tap (< 200 ms) vs hold (≥ 200 ms) ────────

  function onPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
    pointerStartRef.current = { x: e.clientX, y: e.clientY };
    holdFiredRef.current = false;

    holdTimerRef.current = setTimeout(() => {
      holdFiredRef.current = true;
      if (isPhoto) cancelRaf();
      setPaused(true);
    }, 200);
  }

  function onPointerUp(e: React.PointerEvent<HTMLDivElement>) {
    if (!pointerStartRef.current) return;
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }

    const { x: sx, y: sy } = pointerStartRef.current;
    const ex = e.clientX;
    const ey = e.clientY;
    pointerStartRef.current = null;

    if (holdFiredRef.current) {
      holdFiredRef.current = false;
      setPaused(false);
      if (isPhoto) startPhotoRaf(elapsedMsRef.current);
      return;
    }

    if (sy - ey >= 50) { goNextUser(); return; }
    if (ey - sy >= 50) { onClose(); return; }

    if (Math.abs(ex - sx) < 15 && Math.abs(ey - sy) < 15) {
      if (ex < e.currentTarget.clientWidth * 0.5) goPrev();
      else goNext();
    }
  }

  function onPointerCancel() {
    if (holdTimerRef.current) {
      clearTimeout(holdTimerRef.current);
      holdTimerRef.current = null;
    }
    if (holdFiredRef.current) {
      holdFiredRef.current = false;
      setPaused(false);
      if (isPhoto) startPhotoRaf(elapsedMsRef.current);
    }
    pointerStartRef.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black touch-none select-none"
      onPointerDown={onPointerDown}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <div className="relative h-full w-full max-w-sm mx-auto overflow-hidden">

        {/* Media with cross-fade on story change */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            opacity: fading ? 0 : 1,
            transition: "opacity 0.3s ease",
          }}
        >
          {story.mediaType === "photo" ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={story.id}
              src={story.mediaUrl}
              alt=""
              className="h-full w-full object-cover"
              draggable={false}
              onLoad={() => {
                setMediaState("ready");
                startPhotoRaf(0);
              }}
              onError={() => setMediaState("error")}
            />
          ) : (
            <video
              key={story.id}
              ref={videoRef}
              src={story.mediaUrl}
              autoPlay
              playsInline
              muted={false}
              className="h-full w-full object-cover"
              onPlaying={() => setMediaState("ready")}
              onError={() => setMediaState("error")}
              onTimeUpdate={(e) => {
                const v = e.currentTarget;
                if (v.duration && barRef.current) {
                  barRef.current.style.width = `${(v.currentTime / v.duration) * 100}%`;
                  elapsedMsRef.current = v.currentTime * 1000;
                }
              }}
              onEnded={goNext}
            />
          )}
        </div>

        {/* Loading / error states */}
        {mediaState === "loading" && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-transparent" />
          </div>
        )}
        {mediaState === "error" && (
          <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3">
            <p className="text-sm text-white/70">
              This story couldn&apos;t be loaded.
            </p>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              className="pointer-events-auto rounded-full border border-white/25 bg-black/40 px-4 py-1.5 text-xs text-white/80 backdrop-blur-sm transition-colors hover:bg-black/60"

            >
              Skip
            </button>
          </div>
        )}

        {/* Gradient overlays */}
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-black/70 to-transparent pointer-events-none z-10" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/50 to-transparent pointer-events-none z-10" />

        {/* Progress bars
            Past bars (i < si): 100% via React style.
            Future bars (i > si): 0% via React style.
            Active bar (i === si): width driven entirely by RAF/timeupdate via DOM ref.
            No CSS transition on the active bar — RAF fires every frame so none is needed. */}
        <div className="absolute top-0 inset-x-0 flex gap-1 px-3 pt-3 pointer-events-none z-20">
          {group.stories.map((_, i) => (
            <div key={i} className="flex-1 h-0.5 rounded-full bg-white/30 overflow-hidden">
              <div
                ref={i === si ? setBarRef : null}
                className="h-full rounded-full bg-white"
                style={i !== si ? { width: i < si ? "100%" : "0%" } : undefined}
              />
            </div>
          ))}
        </div>

        {/* Header: avatar + name + time + close */}
        <div className="absolute top-6 inset-x-0 flex items-center justify-between px-3 pt-2 pointer-events-none z-20">
          <div className="flex items-center gap-2.5">
            <div className="h-9 w-9 shrink-0 rounded-full overflow-hidden border-2 border-white/20 bg-white/[0.07] flex items-center justify-center">
              {group.avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="text-sm font-medium text-gold/70">
                  {group.displayName.charAt(0).toUpperCase()}
                </span>
              )}
            </div>
            <div>
              <p className="text-sm font-semibold text-white leading-tight">
                {group.displayName}
              </p>
              <p className="text-[11px] text-white/50">
                {formatDistanceToNowStrict(new Date(story.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1 pointer-events-auto">
            {group.userId === currentUserId && (
              <button
                disabled={deleting}
                onClick={(e) => {
                  e.stopPropagation();
                  cancelRaf();
                  startDeleteTransition(async () => {
                    await deleteStory(story.id);
                    router.refresh();
                    goNext();
                  });
                }}
                className="p-2 text-white/50 transition-colors hover:text-red-400 disabled:opacity-40"
                aria-label="Delete story"
              >
                <svg className="h-[18px] w-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                </svg>
              </button>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onClose(); }}
              className="p-2 text-white/60 hover:text-white transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {story.audience === "followers" && (
          <div className="absolute bottom-6 inset-x-0 flex justify-center pointer-events-none z-20">
            <span
              className="rounded-full border border-white/20 bg-black/40 px-3 py-1 text-[11px] text-white/60 backdrop-blur-sm"

            >
              Followers only
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
