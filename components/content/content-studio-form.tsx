"use client";

import { useState, useRef, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Icon } from "@/components/icons";
import { createContentPost } from "@/app/actions/content";
import type { MediaItem } from "@/app/actions/content";

type FileWithPreview = {
  id: string;
  file: File;
  previewUrl: string;
  isVideo: boolean;
};

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const ACCEPTED = "image/jpeg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm";

export function ContentStudioForm() {
  const router = useRouter();
  const [files, setFiles] = useState<FileWithPreview[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isPpv, setIsPpv] = useState(false);
  const [isSubscribersOnly, setIsSubscribersOnly] = useState(false);
  const [ppvPrice, setPpvPrice] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = useCallback((newFiles: FileList | null) => {
    if (!newFiles) return;
    const valid: FileWithPreview[] = [];
    for (const file of Array.from(newFiles)) {
      if (file.size > MAX_FILE_SIZE) {
        setError(`${file.name} exceeds 50 MB limit.`);
        continue;
      }
      valid.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
        isVideo: file.type.startsWith("video/"),
      });
    }
    setFiles((prev) => [...prev, ...valid].slice(0, 10)); // max 10 files
  }, []);

  function removeFile(id: string) {
    setFiles((prev) => {
      const fw = prev.find((f) => f.id === id);
      if (fw) URL.revokeObjectURL(fw.previewUrl);
      return prev.filter((f) => f.id !== id);
    });
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const title = (formData.get("title") as string).trim() || null;
    const body = (formData.get("body") as string).trim() || null;
    const price = isPpv ? parseFloat(ppvPrice) : null;

    if (!title && !body && files.length === 0) {
      setError("Add some media or text before publishing.");
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) { setError("Not authenticated."); return; }

      // Upload files
      const mediaItems: MediaItem[] = [];
      for (let i = 0; i < files.length; i++) {
        const fw = files[i];
        const ext = fw.file.name.split(".").pop()?.toLowerCase() || "bin";
        const path = `${user.id}/${crypto.randomUUID()}.${ext}`;

        setUploadProgress(`Uploading ${i + 1} of ${files.length}…`);

        const { error: uploadErr } = await supabase.storage
          .from("content-media")
          .upload(path, fw.file);

        if (uploadErr) { setError(uploadErr.message); setUploadProgress(null); return; }

        const { data: { publicUrl } } = supabase.storage
          .from("content-media")
          .getPublicUrl(path);

        mediaItems.push({
          url: publicUrl,
          type: fw.isVideo ? "video" : "photo",
          storage_path: path,
        });
      }

      setUploadProgress(null);

      const result = await createContentPost({
        title,
        body,
        isPpv,
        ppvPrice: price,
        isSubscribersOnly,
        mediaItems,
      });

      if (result.error) {
        setError(result.error);
      } else {
        router.push("/companion/content");
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Upload zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`cursor-pointer rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          isDragging
            ? "border-gold/60 bg-white/[0.04]"
            : "border-white/10 hover:border-white/20 hover:bg-white/[0.04]"
        }`}
      >
        <Icon name="upload" className="mx-auto mb-3 h-8 w-8 text-muted/40" />
        <p className="text-sm text-foreground/70" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Drop photos or videos here
        </p>
        <p className="mt-1 text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          JPG, PNG, WebP, GIF, MP4, MOV, WebM · Max 50 MB per file · Up to 10 files
        </p>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED}
          multiple
          className="hidden"
          onChange={(e) => addFiles(e.target.files)}
          onClick={(e) => e.stopPropagation()}
        />
      </div>

      {/* File previews */}
      {files.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {files.map((fw) => (
            <div key={fw.id} className="group relative aspect-square overflow-hidden rounded-xl">
              {fw.isVideo ? (
                <video
                  src={fw.previewUrl}
                  className="h-full w-full object-cover"
                  muted
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={fw.previewUrl}
                  alt="preview"
                  className="h-full w-full object-cover"
                />
              )}
              {fw.isVideo && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Icon name="video" className="h-6 w-6 text-white/80 drop-shadow" />
                </div>
              )}
              <button
                type="button"
                onClick={() => removeFile(fw.id)}
                className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-white opacity-0 transition-opacity group-hover:opacity-100"
              >
                <Icon name="x" className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Caption */}
      <div>
        <label
          className="mb-1.5 block text-xs uppercase tracking-[0.08em] text-muted/50"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Title (optional)
        </label>
        <input
          name="title"
          type="text"
          placeholder="Give this post a title…"
          className="auth-input w-full"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        />
      </div>

      <div>
        <label
          className="mb-1.5 block text-xs uppercase tracking-[0.08em] text-muted/50"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          Caption (optional)
        </label>
        <textarea
          name="body"
          rows={3}
          placeholder="Write something for your subscribers…"
          className="auth-input w-full resize-none"
          style={{ fontFamily: "var(--font-dm-sans)" }}
        />
      </div>

      {/* Access toggles */}
      <div className="space-y-3">
        <ToggleRow
          id="subscribers-only"
          label="Subscribers only"
          description="Only your paying subscribers can see this"
          checked={isSubscribersOnly}
          onChange={(v) => { setIsSubscribersOnly(v); if (v) setIsPpv(false); }}
        />
        <ToggleRow
          id="ppv"
          label="Pay-per-view"
          description="Set a one-time unlock price"
          checked={isPpv}
          onChange={(v) => { setIsPpv(v); if (v) setIsSubscribersOnly(false); }}
        />
      </div>

      {isPpv && (
        <div>
          <label
            className="mb-1.5 block text-xs uppercase tracking-[0.08em] text-muted/50"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          >
            Unlock price (min $3)
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted/40">$</span>
            <input
              type="number"
              min="3"
              step="1"
              value={ppvPrice}
              onChange={(e) => setPpvPrice(e.target.value)}
              placeholder="10"
              className="auth-input w-full pl-7"
              required={isPpv}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            />
          </div>
        </div>
      )}

      {error && (
        <p className="text-sm text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="btn-gold w-full rounded-xl px-5 py-3 text-sm disabled:opacity-50"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {uploadProgress ?? (isPending ? "Publishing…" : "Publish")}
      </button>
    </form>
  );
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label
      htmlFor={id}
      className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-white/10 bg-[rgba(255,255,255,0.02)] px-4 py-3"
    >
      <div>
        <p className="text-sm text-foreground" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {label}
        </p>
        <p className="text-xs text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {description}
        </p>
      </div>
      <div className="relative">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="peer sr-only"
        />
        <div
          className={`h-6 w-11 rounded-full border transition-colors ${
            checked
              ? "border-gold/50 bg-white/10"
              : "border-[rgba(255,255,255,0.1)] bg-[rgba(255,255,255,0.04)]"
          }`}
        />
        <div
          className={`absolute top-0.5 h-5 w-5 rounded-full border transition-all ${
            checked
              ? "left-5 border-gold bg-gold"
              : "left-0.5 border-[rgba(255,255,255,0.2)] bg-[rgba(255,255,255,0.15)]"
          }`}
        />
      </div>
    </label>
  );
}
