"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { createEvent } from "@/app/actions/events";

type Props = { userId: string };

export function CreateEventForm({ userId }: Props) {
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [hour, setHour] = useState("");
  const [minute, setMinute] = useState("");
  const [location, setLocation] = useState("");
  const [visibility, setVisibility] = useState<"public" | "private">("public");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0] ?? null;
    if (coverPreview) URL.revokeObjectURL(coverPreview);
    if (!f) { setCoverFile(null); setCoverPreview(null); return; }
    setCoverFile(f);
    setCoverPreview(URL.createObjectURL(f));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (submitting) return;

    if (!title.trim()) { setError("Title is required."); return; }
    if (!date) { setError("Date is required."); return; }
    if (!hour || !minute) { setError("Time is required."); return; }

    const time = `${hour}:${minute}`;

    setSubmitting(true);
    setError(null);

    let cover_image_url: string | null = null;

    if (coverFile) {
      const supabase = createClient();
      const ext = coverFile.name.split(".").pop() ?? "jpg";
      const path = `${userId}/events/${Date.now()}.${ext}`;
      const { data: upload, error: uploadErr } = await supabase.storage
        .from("content-media")
        .upload(path, coverFile, { upsert: false });

      if (uploadErr || !upload) {
        setError(uploadErr?.message ?? "Cover image upload failed.");
        setSubmitting(false);
        return;
      }
      const { data: { publicUrl } } = supabase.storage
        .from("content-media")
        .getPublicUrl(upload.path);
      cover_image_url = publicUrl;
    }

    const result = await createEvent({ title, description, date, time, location, visibility, cover_image_url });

    if (result.error) {
      setError(result.error);
      setSubmitting(false);
      return;
    }

    router.push(`/events/${result.eventId}`);
  }

  const inputClass =
    "w-full rounded-xl border border-white/[0.08] bg-white/[0.03] px-4 py-2.5 text-sm text-foreground placeholder:text-white/20 focus:border-[rgba(212,175,55,0.35)] focus:outline-none transition-colors";

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Cover image */}
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Cover Image
        </p>
        {coverPreview ? (
          <div className="relative h-44 overflow-hidden rounded-2xl bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={coverPreview} alt="" className="h-full w-full object-cover" />
            <button
              type="button"
              onClick={() => { if (coverPreview) URL.revokeObjectURL(coverPreview); setCoverFile(null); setCoverPreview(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white/80 hover:text-white transition-colors"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-44 w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-[rgba(212,175,55,0.15)] bg-[rgba(212,175,55,0.02)] hover:border-[rgba(212,175,55,0.3)] hover:bg-[rgba(212,175,55,0.04)] transition-colors"
          >
            <svg className="h-8 w-8 text-[#d4af37]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.4}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
            </svg>
            <span className="text-xs text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Upload cover image (optional)
            </span>
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={handleCoverChange}
        />
      </div>

      {/* Title */}
      <div>
        <label className="mb-2 block text-[11px] uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Title *
        </label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g. Rooftop Dinner at Nobu"
          className={inputClass}
          style={{ fontFamily: "var(--font-dm-sans)" }}
          maxLength={120}
        />
      </div>

      {/* Description */}
      <div>
        <label className="mb-2 block text-[11px] uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell guests what to expect…"
          rows={3}
          className={`${inputClass} resize-none`}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Date *
          </label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className={`${inputClass} [color-scheme:dark]`}
            style={{ fontFamily: "var(--font-dm-sans)" }}
          />
        </div>
        <div>
          <label className="mb-2 block text-[11px] uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Time *
          </label>
          <div className="flex gap-1.5">
            <select
              value={hour}
              onChange={(e) => setHour(e.target.value)}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground focus:border-[rgba(212,175,55,0.35)] focus:outline-none transition-colors appearance-none"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <option value="" disabled>HH</option>
              {Array.from({ length: 24 }, (_, i) => String(i).padStart(2, "0")).map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
            <span className="flex items-center text-white/30 text-sm">:</span>
            <select
              value={minute}
              onChange={(e) => setMinute(e.target.value)}
              className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2.5 text-sm text-foreground focus:border-[rgba(212,175,55,0.35)] focus:outline-none transition-colors appearance-none"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              <option value="" disabled>MM</option>
              {["00", "15", "30", "45"].map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <label className="mb-2 block text-[11px] uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Location
        </label>
        <input
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. Nobu, Malibu"
          className={inputClass}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        />
      </div>

      {/* Visibility */}
      <div>
        <p className="mb-2 text-[11px] uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
          Visibility
        </p>
        <div className="flex gap-2">
          {(["public", "private"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVisibility(v)}
              className={[
                "flex-1 rounded-xl border py-2.5 text-sm capitalize transition-colors",
                visibility === v
                  ? "border-[rgba(212,175,55,0.4)] bg-[rgba(212,175,55,0.1)] text-[#d4af37]"
                  : "border-white/[0.08] text-white/40 hover:border-white/20 hover:text-white/60",
              ].join(" ")}
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {v}
            </button>
          ))}
        </div>
        {visibility === "private" && (
          <p className="mt-2 text-xs text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            10 single-use invite codes will be generated automatically.
          </p>
        )}
      </div>

      {error && (
        <p className="text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-xl bg-[#d4af37] py-3 text-sm font-semibold text-black hover:bg-[#c9a432] transition-colors disabled:opacity-40"
        style={{ fontFamily: "var(--font-dm-sans)" }}
      >
        {submitting ? "Creating…" : "Create Event"}
      </button>
    </form>
  );
}
