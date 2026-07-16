"use client";

import { useCallback, useEffect, useState } from "react";
import { getStories } from "@/app/actions/stories";
import type { StoryGroup, StoriesResult } from "@/app/actions/stories";
import { StoryCreateSheet } from "./story-create-sheet";
import { StoryViewer } from "./story-viewer";

type Props = { currentUserId: string | null };

export function StoriesBar({ currentUserId }: Props) {
  const [data, setData] = useState<StoriesResult | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [viewerGroups, setViewerGroups] = useState<StoryGroup[] | null>(null);
  const [viewerInitialIndex, setViewerInitialIndex] = useState(0);
  const [refreshKey, setRefreshKey] = useState(0);

  const load = useCallback(async () => {
    const result = await getStories();
    setData(result);
  }, []);

  useEffect(() => {
    if (currentUserId) load();
  }, [currentUserId, load, refreshKey]);

  if (!currentUserId || !data) return null;

  const { groups, ownGroup, viewerId, viewerDisplayName, viewerAvatarUrl } = data;

  function openViewer(allGroups: StoryGroup[], index: number) {
    setViewerGroups(allGroups);
    setViewerInitialIndex(index);
  }

  function handleOwnCircleClick() {
    if (ownGroup) {
      setViewerGroups([ownGroup]);
      setViewerInitialIndex(0);
    } else {
      setShowCreate(true);
    }
  }

  // Check if a group has unseen stories
  function hasUnseen(group: StoryGroup) {
    return group.stories.some((s) => !s.viewedBy.includes(viewerId));
  }

  return (
    <>
      <div
        className="flex gap-4 overflow-x-auto border-b border-white/[0.05] px-4 py-4"
        style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" }}
      >
        {/* ── Your Story ── */}
        <button
          onClick={handleOwnCircleClick}
          className="flex shrink-0 flex-col items-center gap-1.5"
        >
          <div className="relative">
            {/* Ring */}
            <div
              className={[
                "h-16 w-16 rounded-full p-[2.5px]",
                ownGroup
                  ? "bg-gradient-to-tr from-gold via-gold-light to-gold"
                  : "bg-white/10",
              ].join(" ")}
            >
              <div className="h-full w-full rounded-full overflow-hidden bg-[#0d0d1a] flex items-center justify-center">
                {viewerAvatarUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={viewerAvatarUrl} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span
                    className="text-lg font-medium text-gold/60"
                   
                  >
                    {viewerDisplayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>

            {/* + badge — always opens create sheet */}
            <button
              onClick={(e) => { e.stopPropagation(); setShowCreate(true); }}
              className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-gold border-2 border-[#080810]"
              aria-label="Add to story"
            >
              <svg className="h-2.5 w-2.5 text-black" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>
          </div>
          <span
            className="max-w-[64px] truncate text-[11px] text-white/50"

          >
            Your story
          </span>
        </button>

        {/* ── Other users ── */}
        {groups.map((group, idx) => {
          const unseen = hasUnseen(group);
          return (
            <button
              key={group.userId}
              onClick={() => openViewer(groups, idx)}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <div
                className={[
                  "h-16 w-16 rounded-full p-[2.5px]",
                  unseen
                    ? "bg-gradient-to-tr from-gold via-gold-light to-gold"
                    : "bg-white/15",
                ].join(" ")}
              >
                <div className="h-full w-full rounded-full overflow-hidden bg-[#0d0d1a] flex items-center justify-center">
                  {group.avatarUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={group.avatarUrl} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span
                      className="text-lg font-medium text-gold/60"
                     
                    >
                      {group.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              <span
                className="max-w-[64px] truncate text-[11px] text-white/50"

              >
                {group.displayName.split(" ")[0]}
              </span>
            </button>
          );
        })}
      </div>

      {/* Create sheet */}
      {showCreate && (
        <StoryCreateSheet
          userId={viewerId}
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            setRefreshKey((k) => k + 1);
          }}
        />
      )}

      {/* Viewer */}
      {viewerGroups && (
        <StoryViewer
          groups={viewerGroups}
          initialGroupIndex={viewerInitialIndex}
          currentUserId={currentUserId}
          onClose={() => { setViewerGroups(null); load(); }}
          onAddStory={() => { setViewerGroups(null); setShowCreate(true); }}
        />
      )}
    </>
  );
}
