"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sendMessage } from "@/app/actions/messages";
import { Icon } from "@/components/icons";
import type { Message } from "@/lib/database.types";

type Props = {
  conversationId: string;
  currentUserId: string;
  otherName: string;
  otherProfileHref: string;
  initialMessages: Message[];
};

// Audio URLs are stored under a /voice/ path segment
function isAudioUrl(url: string) { return /\/voice\//i.test(url); }
function isVideoUrl(url: string) { return /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url) && !isAudioUrl(url); }

// ── Fullscreen image viewer ────────────────────────────────────
function FullscreenImage({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain"
        onClick={(e) => e.stopPropagation()}
      />
      <button
        onClick={onClose}
        className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-white/10 text-white/70 hover:bg-white/20"
        aria-label="Close"
      >
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>
    </div>
  );
}

export function ChatView({
  conversationId,
  currentUserId,
  otherName,
  otherProfileHref,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<Message[]>(initialMessages);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Realtime — skip own messages; those are added optimistically to avoid duplicates
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages", filter: `conversation_id=eq.${conversationId}` },
        (payload) => {
          const msg = payload.new as Message;
          if (msg.sender_id === currentUserId) return;
          setMessages((prev) => {
            if (prev.some((m) => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [conversationId, currentUserId]);

  // ── Photo / video ──────────────────────────────────────────
  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    if (file) {
      setMediaFile(file);
      setMediaPreview(URL.createObjectURL(file));
    } else {
      setMediaFile(null);
      setMediaPreview(null);
    }
    e.target.value = "";
  }

  function clearMedia() {
    if (mediaPreview) URL.revokeObjectURL(mediaPreview);
    setMediaFile(null);
    setMediaPreview(null);
  }

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed && !mediaFile) return;
    setError(null);

    let mediaUrl: string | null = null;

    if (mediaFile) {
      setUploading(true);
      const supabase = createClient();
      const ext = mediaFile.name.split(".").pop() ?? "bin";
      const path = `${currentUserId}/messages/${Date.now()}.${ext}`;
      const { data: upload, error: uploadError } = await supabase.storage
        .from("shared-media")
        .upload(path, mediaFile, { upsert: false, contentType: mediaFile.type });
      setUploading(false);
      if (uploadError || !upload) { setError("Failed to upload. Please try again."); return; }
      const { data: { publicUrl } } = supabase.storage.from("shared-media").getPublicUrl(upload.path);
      mediaUrl = publicUrl;
    }

    const tempMsg: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: trimmed,
      is_read: false,
      media_url: mediaUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);
    setText("");
    clearMedia();

    const fd = new FormData();
    fd.set("conversation_id", conversationId);
    if (trimmed) fd.set("content", trimmed);
    if (mediaUrl) fd.set("media_url", mediaUrl);

    startTransition(async () => {
      const result = await sendMessage(null, fd);
      if (result?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        setText(trimmed);
        setError(result.error);
      }
    });
  }

  // ── Voice recording ────────────────────────────────────────
  async function startRecording() {
    if (typeof MediaRecorder === "undefined" || recording || uploading) return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const ext = mimeType.includes("webm") ? "webm" : "m4a";
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        if (blob.size > 0) await uploadAndSendVoice(blob, ext, mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { /* microphone not available */ }
  }

  function stopRecording() {
    if (!recording) return;
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  async function uploadAndSendVoice(blob: Blob, ext: string, mimeType: string) {
    setUploading(true);
    const supabase = createClient();
    const path = `${currentUserId}/messages/voice/${Date.now()}.${ext}`;
    const { data: upload, error } = await supabase.storage
      .from("shared-media")
      .upload(path, blob, { upsert: false, contentType: mimeType });

    if (error || !upload) { setUploading(false); setError("Failed to send voice message."); return; }
    const { data: { publicUrl } } = supabase.storage.from("shared-media").getPublicUrl(upload.path);

    // Optimistically add with the real public URL so the audio player is immediately usable
    const tempMsg: Message = {
      id: `temp-voice-${Date.now()}`,
      conversation_id: conversationId,
      sender_id: currentUserId,
      content: "",
      is_read: false,
      media_url: publicUrl,
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, tempMsg]);

    const fd = new FormData();
    fd.set("conversation_id", conversationId);
    fd.set("media_url", publicUrl);

    startTransition(async () => {
      const result = await sendMessage(null, fd);
      if (result?.error) {
        setMessages((prev) => prev.filter((m) => m.id !== tempMsg.id));
        setError("Failed to send voice message.");
      }
    });
    setUploading(false);
  }

  const grouped = groupByDate(messages);
  const busy = isPending || uploading || recording;

  return (
    <>
      {fullscreenSrc && (
        <FullscreenImage src={fullscreenSrc} onClose={() => setFullscreenSrc(null)} />
      )}

      <div className="flex h-full flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 border-b border-[rgba(212,175,55,0.1)] px-4 py-3.5">
          <Link href="/messages" className="flex items-center text-muted/50 hover:text-muted md:hidden">
            <Icon name="chevron-left" className="h-5 w-5" />
          </Link>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[rgba(212,175,55,0.12)] text-sm font-medium text-gold" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {otherName.charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <Link
              href={otherProfileHref}
              className="truncate text-sm text-foreground/80 hover:text-gold transition-colors"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {otherName}
            </Link>
          </div>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {messages.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <Icon name="message" className="h-10 w-10 text-gold/20" />
              <p className="text-sm text-muted/40" style={{ fontFamily: "var(--font-dm-sans)" }}>
                Start the conversation with {otherName}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {grouped.map(({ date, msgs }) => (
                <div key={date}>
                  <div className="mb-4 flex items-center gap-3">
                    <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" />
                    <span className="text-[10px] text-muted/30" style={{ fontFamily: "var(--font-dm-sans)" }}>{date}</span>
                    <div className="h-px flex-1 bg-[rgba(255,255,255,0.05)]" />
                  </div>
                  <div className="space-y-2">
                    {msgs.map((msg) => {
                      const isOwn = msg.sender_id === currentUserId;
                      const url = msg.media_url;
                      const hasText = !!msg.content;
                      const isAudio = url ? isAudioUrl(url) : false;
                      const isVisual = url ? !isAudioUrl(url) : false; // image or video
                      const timeStr = new Date(msg.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
                      const timestampCls = `text-[10px] ${isOwn ? "text-[rgba(201,184,255,0.45)] text-right" : "text-muted/30"}`;

                      return (
                        <div key={msg.id} className={`flex ${isOwn ? "justify-end" : "justify-start"}`}>
                          <div className={`flex flex-col gap-1 ${isOwn ? "items-end" : "items-start"}`} style={{ maxWidth: "75%" }}>

                            {/* Bubble — only for text and/or audio */}
                            {(hasText || isAudio) && (
                              <div
                                className={[
                                  "rounded-2xl px-4 py-2.5",
                                  isOwn
                                    ? "rounded-br-sm border border-[#460000] text-white"
                                    : "rounded-bl-sm bg-[rgba(255,255,255,0.05)] text-foreground/80",
                                ].join(" ")}
                                style={isOwn ? { background: "transparent", boxShadow: "0 0 12px rgba(70,0,0,0.8), 0 0 4px rgba(200,0,0,0.6), inset 0 0 8px rgba(70,0,0,0.3)" } : undefined}
                              >
                                {hasText && (
                                  <p className="text-sm leading-relaxed" style={{ fontFamily: "var(--font-dm-sans)" }}>
                                    {msg.content}
                                  </p>
                                )}
                                {isAudio && (
                                  <audio src={url!} controls className="mt-2 block h-9 max-w-[220px]" />
                                )}
                                {/* Timestamp inside bubble when no visual media follows */}
                                {!isVisual && (
                                  <p className={`mt-1 ${timestampCls}`} style={{ fontFamily: "var(--font-dm-sans)" }}>
                                    {timeStr}
                                  </p>
                                )}
                              </div>
                            )}

                            {/* Visual media — no bubble, rendered bare */}
                            {isVisual && (
                              isVideoUrl(url!) ? (
                                <video
                                  src={url!}
                                  controls
                                  playsInline
                                  className="block max-h-48 w-full max-w-[240px] object-cover"
                                  style={{ borderRadius: 12 }}
                                />
                              ) : (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img
                                  src={url!}
                                  alt=""
                                  className="block max-h-52 max-w-[240px] cursor-zoom-in object-cover"
                                  style={{ borderRadius: 12 }}
                                  onClick={() => setFullscreenSrc(url!)}
                                />
                              )
                            )}

                            {/* Timestamp below visual media */}
                            {isVisual && (
                              <p className={timestampCls} style={{ fontFamily: "var(--font-dm-sans)" }}>
                                {timeStr}
                              </p>
                            )}

                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Media preview strip */}
        {mediaPreview && (
          <div className="border-t border-[rgba(212,175,55,0.08)] px-3 pt-2 pb-1">
            <div className="relative inline-block">
              {mediaFile?.type.startsWith("video/") ? (
                <video src={mediaPreview} className="h-20 w-20 rounded-xl object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaPreview} alt="Preview" className="h-20 w-20 rounded-xl object-cover" />
              )}
              <button
                onClick={clearMedia}
                className="absolute -right-2 -top-2 flex h-5 w-5 items-center justify-center rounded-full bg-[rgba(8,8,16,0.9)] border border-white/10 text-white/60 hover:text-white"
                aria-label="Remove"
              >
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Recording indicator */}
        {recording && (
          <div className="border-t border-[rgba(212,175,55,0.08)] px-4 py-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-xs text-red-400/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Recording… release to send
            </span>
          </div>
        )}

        {/* Input */}
        <div className="border-t border-[rgba(212,175,55,0.1)] p-3">
          <div className="flex items-end gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* + attach */}
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={busy}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(255,255,255,0.04)] text-muted/40 transition-colors hover:bg-[rgba(212,175,55,0.1)] hover:text-gold/70 disabled:opacity-40"
              aria-label="Attach media"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
            </button>

            {/* Mic — hold to record */}
            <button
              type="button"
              onPointerDown={(e) => { e.preventDefault(); startRecording(); }}
              onPointerUp={stopRecording}
              onPointerLeave={stopRecording}
              disabled={uploading || isPending || !!mediaFile}
              title="Hold to record voice message"
              className={[
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors disabled:opacity-40 select-none",
                recording
                  ? "bg-red-500/20 text-red-400 animate-pulse"
                  : "bg-[rgba(255,255,255,0.04)] text-muted/40 hover:bg-[rgba(212,175,55,0.1)] hover:text-gold/70",
              ].join(" ")}
              aria-label="Hold to record voice message"
            >
              <svg className="h-5 w-5" fill={recording ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
              </svg>
            </button>

            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={1}
              placeholder={recording ? "Recording…" : uploading ? "Uploading…" : `Message ${otherName}…`}
              disabled={recording || uploading}
              className="auth-input flex-1 resize-none py-2.5 text-sm"
              style={{ fontFamily: "var(--font-dm-sans)" }}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />

            <button
              type="button"
              onClick={handleSubmit}
              disabled={busy || (!text.trim() && !mediaFile)}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[rgba(212,175,55,0.15)] text-gold transition-all hover:bg-[rgba(212,175,55,0.25)] disabled:opacity-40"
            >
              {uploading ? (
                <span className="h-4 w-4 animate-spin rounded-full border border-gold/30 border-t-gold" />
              ) : (
                <Icon name="send" className="h-4 w-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="mt-1.5 text-xs text-red-400" style={{ fontFamily: "var(--font-dm-sans)" }}>
              {error}
            </p>
          )}
        </div>
      </div>
    </>
  );
}

function groupByDate(messages: Message[]) {
  const groups: { date: string; msgs: Message[] }[] = [];
  let current: { date: string; msgs: Message[] } | null = null;
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  for (const msg of messages) {
    const d = new Date(msg.created_at);
    let label: string;
    if (d.toDateString() === today.toDateString()) label = "Today";
    else if (d.toDateString() === yesterday.toDateString()) label = "Yesterday";
    else label = d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });

    if (!current || current.date !== label) {
      current = { date: label, msgs: [] };
      groups.push(current);
    }
    current.msgs.push(msg);
  }
  return groups;
}
