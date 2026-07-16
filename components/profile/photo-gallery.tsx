"use client";

import type { ProfilePhoto } from "@/lib/database.types";

function isUrl(s: string): boolean {
  return s.startsWith("http://") || s.startsWith("https://") || s.startsWith("/");
}

export function PhotoGallery({
  photos,
  isOwner = false,
}: {
  photos: ProfilePhoto[];
  isOwner?: boolean;
}) {
  if (photos.length === 0) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="companion-placeholder relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10"
            style={{ opacity: 1 - i * 0.12 }}
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-xl font-bold tracking-tight text-gold/10"
               
              >
                {i + 1}
              </span>
            </div>
            {isOwner && i === 0 && (
              <div className="absolute inset-0 flex items-center justify-center bg-[rgba(8,8,16,0.4)]">
                <span
                  className="text-xs text-muted/40"

                >
                  + Add photos
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {photos.map((photo) =>
        isUrl(photo.storage_path) ? (
          <div
            key={photo.id}
            className="relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={photo.storage_path}
              alt=""
              className="h-full w-full object-cover"
            />
          </div>
        ) : (
          <div
            key={photo.id}
            className="companion-placeholder relative aspect-[3/4] overflow-hidden rounded-xl border border-white/10"
          >
            <div className="absolute inset-0 flex items-center justify-center">
              <span
                className="text-xl font-bold tracking-tight text-gold/15"
               
              >
                {photo.sort_order + 1}
              </span>
            </div>
          </div>
        )
      )}
    </div>
  );
}
