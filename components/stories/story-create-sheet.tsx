"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createStory } from "@/app/actions/stories";

type Props = {
  userId: string;
  onClose: () => void;
  onCreated: () => void;
};

export function StoryCreateSheet({ userId, onClose, onCreated }: Props) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [audience, setAudience] = useState<"public" | "followers">("public");
  const [uploading, setUploading] = useState(false);
  const [shared, setShared] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (preview) URL.revokeObjectURL(preview);
    if (!f) { setFile(null); setPreview(null); return; }
    setFile(f);
    setMediaType(f.type.startsWith("video/") ? "video" : "photo");
    setPreview(URL.createObjectURL(f));
    setError(null);
  }

  function clearFile() {
    if (preview) URL.revokeObjectURL(preview);
    setFile(null);
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleSubmit() {
    if (!file || uploading) return;
    setUploading(true);
    setError(null);

    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${userId}/stories/${Date.now()}.${ext}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("shared-media")
        .upload(path, file, { upsert: false });

      if (uploadError || !uploadData) {
        setError(uploadError?.message ?? "Upload failed.");
        setUploading(false);
        return;
      }

      const { data: { publicUrl } } = supabase.storage
        .from("shared-media")
        .getPublicUrl(uploadData.path);

      const result = await createStory(publicUrl, mediaType, audience);
      if (result.error) {
        setError(result.error);
        setUploading(false);
      } else {
        setShared(true);
        setTimeout(() => onCreated(), 900);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setUploading(false);
    }
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet */}
      <div className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl border-t border-[rgba(212,175,55,0.15)] bg-[#080810] px-5 pb-10 pt-4 sm:bottom-auto sm:left-1/2 sm:top-1/2 sm:-translate-x-1/2 sm:-translate-y-1/2 sm:w-full sm:max-w-sm sm:rounded-2xl sm:border sm:pb-6">
        {/* Drag handle */}
        <div className="mb-4 flex justify-center sm:hidden">
          <div className="h-1 w-10 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="mb-5 flex items-center justify-between">
          <h2
            className="text-xl font-light text-foreground"
            style={{ fontFamily: "var(--font-cormorant)" }}
          >
            Add to Your Story
          </h2>
          <button onClick={onClose} className="p-1 text-white/30 hover:text-white/70 transition-colors">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Media picker / preview */}
        {!preview ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-52 w-full flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed border-[rgba(212,175,55,0.2)] bg-[rgba(212,175,55,0.03)] transition-colors hover:border-[rgba(212,175,55,0.4)] hover:bg-[rgba(212,175,55,0.06)]"
          >
            <svg className="h-10 w-10 text-[#d4af37]/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <p
              className="text-sm text-white/40"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Choose photo or video
            </p>
          </button>
        ) : (
          <div className="relative overflow-hidden rounded-2xl bg-black" style={{ aspectRatio: "9/16", maxHeight: "240px" }}>
            {mediaType === "photo" ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={preview} alt="" className="h-full w-full object-cover" />
            ) : (
              <video src={preview} className="h-full w-full object-cover" controls={false} muted />
            )}
            <button
              onClick={clearFile}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 hover:text-white transition-colors"
              aria-label="Remove"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Audience */}
        <div className="mt-4">
          <p
            className="mb-2 text-[11px] uppercase tracking-[0.1em] text-white/30"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Audience
          </p>
          <div className="flex gap-2">
            {(["public", "followers"] as const).map((a) => (
              <button
                key={a}
                type="button"
                onClick={() => setAudience(a)}
                className={[
                  "flex-1 rounded-xl border py-2 text-sm capitalize transition-colors",
                  audience === a
                    ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)] text-[#d4af37]"
                    : "border-white/10 text-white/40 hover:border-white/20 hover:text-white/60",
                ].join(" ")}
                style={{ fontFamily: "var(--font-dm-sans)" }}
              >
                {a === "public" ? "Everyone" : "Followers"}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {error}
          </p>
        )}

        {shared ? (
          <div className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[rgba(212,175,55,0.12)] border border-[rgba(212,175,55,0.25)] py-3">
            <svg className="h-4 w-4 text-[#d4af37]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
            <span className="text-sm font-semibold text-[#d4af37]" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Story shared!
            </span>
          </div>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!file || uploading}
            className="mt-5 w-full rounded-xl bg-[#d4af37] py-3 text-sm font-semibold text-black transition-opacity disabled:opacity-40 hover:bg-[#c9a432]"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            {uploading ? "Sharing…" : "Share Story"}
          </button>
        )}
      </div>
    </>
  );
}
