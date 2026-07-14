"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { getMessages, sendMessage, getProfile } from "@/app/actions/events";
import type { EventMessage } from "@/app/actions/events";

type Props = {
  eventId: string;
  currentUserId: string;
  currentUserName: string;
  currentUserAvatar: string | null;
};

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

export function EventChat({ eventId, currentUserId, currentUserName, currentUserAvatar }: Props) {
  const [messages, setMessages] = useState<EventMessage[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [recording, setRecording] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [mediaFile, setMediaFile] = useState<File | null>(null);
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [fullscreenSrc, setFullscreenSrc] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const profileCacheRef = useRef<Map<string, { full_name: string; avatar_url: string | null }>>(new Map());

  // Initial load
  useEffect(() => {
    getMessages(eventId).then((msgs) => {
      for (const m of msgs) {
        if (m.sender) profileCacheRef.current.set(m.user_id, m.sender);
      }
      setMessages(msgs);
      setLoaded(true);
    });
  }, [eventId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (loaded) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loaded]);

  // Realtime subscription
  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`event-chat-${eventId}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "event_messages", filter: `event_id=eq.${eventId}` },
        async (payload) => {
          const raw = payload.new as {
            id: string; event_id: string; user_id: string;
            content: string | null; message_type: string;
            audio_url: string | null; media_url: string | null; created_at: string;
          };

          if (raw.user_id === currentUserId) return;

          let sender = profileCacheRef.current.get(raw.user_id) ?? null;
          if (!sender) {
            const p = await getProfile(raw.user_id);
            if (p) { sender = p; profileCacheRef.current.set(raw.user_id, p); }
          }

          setMessages((prev) => {
            if (prev.some((m) => m.id === raw.id)) return prev;
            return [...prev, {
              id: raw.id, event_id: raw.event_id, user_id: raw.user_id,
              content: raw.content, message_type: raw.message_type as "text" | "voice",
              audio_url: raw.audio_url, media_url: raw.media_url, created_at: raw.created_at, sender,
            }];
          });
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [eventId, currentUserId]);

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

  async function handleSend() {
    const content = text.trim();
    if (!content && !mediaFile) return;
    if (sending || uploading) return;

    let mediaUrl: string | null = null;

    if (mediaFile) {
      setUploading(true);
      const supabase = createClient();
      const ext = mediaFile.name.split(".").pop() ?? "bin";
      const path = `${currentUserId}/event-messages/${Date.now()}.${ext}`;
      const { data: upload, error } = await supabase.storage
        .from("content-media")
        .upload(path, mediaFile, { upsert: false, contentType: mediaFile.type });
      setUploading(false);

      if (error || !upload) return;
      const { data: { publicUrl } } = supabase.storage.from("content-media").getPublicUrl(upload.path);
      mediaUrl = publicUrl;
    }

    setSending(true);
    setText("");
    clearMedia();

    const tempId = `temp-${Date.now()}`;
    const optimistic: EventMessage = {
      id: tempId, event_id: eventId, user_id: currentUserId,
      content: content || null, message_type: "text",
      audio_url: null, media_url: mediaUrl,
      created_at: new Date().toISOString(),
      sender: { full_name: currentUserName, avatar_url: currentUserAvatar },
    };
    setMessages((prev) => [...prev, optimistic]);

    const result = await sendMessage(eventId, content || null, "text", undefined, mediaUrl ?? undefined);
    if (result.error) {
      setMessages((prev) => prev.filter((m) => m.id !== tempId));
      setText(content);
    }
    setSending(false);
  }

  async function startRecording() {
    if (typeof MediaRecorder === "undefined") return;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        await uploadVoice(new Blob(audioChunksRef.current, { type: mimeType }), mimeType);
      };
      recorder.start();
      mediaRecorderRef.current = recorder;
      setRecording(true);
    } catch { /* microphone not available */ }
  }

  function stopRecording() {
    mediaRecorderRef.current?.stop();
    mediaRecorderRef.current = null;
    setRecording(false);
  }

  async function uploadVoice(blob: Blob, mimeType: string) {
    setUploading(true);
    const supabase = createClient();
    const ext = mimeType.includes("webm") ? "webm" : "m4a";
    const path = `events/${eventId}/voice/${Date.now()}.${ext}`;
    const { data: upload, error } = await supabase.storage
      .from("content-media")
      .upload(path, blob, { upsert: false, contentType: mimeType });
    if (!error && upload) {
      const { data: { publicUrl } } = supabase.storage.from("content-media").getPublicUrl(upload.path);
      await sendMessage(eventId, null, "voice", publicUrl);
    }
    setUploading(false);
  }

  const isVideo = (url: string) => /\.(mp4|mov|webm|m4v)(\?|$)/i.test(url);
  const busy = sending || uploading || recording;

  return (
    <>
      {fullscreenSrc && (
        <FullscreenImage src={fullscreenSrc} onClose={() => setFullscreenSrc(null)} />
      )}

      <div className="flex flex-col" style={{ height: "420px" }}>
        <div className="border-b border-white/[0.06] px-4 py-3">
          <p className="text-xs uppercase tracking-[0.1em] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            Group Chat
          </p>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {!loaded && (
            <p className="text-center text-xs text-white/20 pt-8" style={{ fontFamily: "var(--font-dm-sans)" }}>Loading…</p>
          )}
          {loaded && messages.length === 0 && (
            <p className="text-center text-xs text-white/20 pt-8" style={{ fontFamily: "var(--font-dm-sans)" }}>No messages yet. Say hello!</p>
          )}
          {messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={msg}
              isOwn={msg.user_id === currentUserId}
              onExpandImage={setFullscreenSrc}
            />
          ))}
          <div ref={bottomRef} />
        </div>

        {/* Recording indicator */}
        {recording && (
          <div className="border-t border-white/[0.06] px-4 py-2 flex items-center gap-2">
            <span className="h-2 w-2 animate-pulse rounded-full bg-red-400" />
            <span className="text-xs text-red-400/80" style={{ fontFamily: "var(--font-dm-sans)" }}>
              Recording… release to send
            </span>
          </div>
        )}

        {/* Media preview strip */}
        {mediaPreview && (
          <div className="border-t border-white/[0.06] px-3 pt-2 pb-1">
            <div className="relative inline-block">
              {mediaFile?.type.startsWith("video/") ? (
                <video src={mediaPreview} className="h-16 w-16 rounded-xl object-cover" />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaPreview} alt="Preview" className="h-16 w-16 rounded-xl object-cover" />
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

        {/* Input */}
        <div className="border-t border-white/[0.06] p-3 flex items-center gap-2">
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,image/webp,image/gif,video/mp4,video/quicktime,video/webm"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Voice record — hold to record */}
          <button
            type="button"
            onPointerDown={(e) => { e.preventDefault(); if (!recording && !uploading) startRecording(); }}
            onPointerUp={() => { if (recording) stopRecording(); }}
            onPointerLeave={() => { if (recording) stopRecording(); }}
            disabled={uploading}
            title="Hold to record voice message"
            className={[
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors disabled:opacity-40 select-none",
              recording
                ? "bg-red-500/20 text-red-400 animate-pulse"
                : "bg-white/[0.05] text-white/35 hover:text-white/60",
            ].join(" ")}
          >
            <svg className="h-4 w-4" fill={recording ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />
            </svg>
          </button>

          {/* + attach button */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            title="Attach photo or video"
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-white/35 hover:text-white/60 transition-colors disabled:opacity-40"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
          </button>

          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            placeholder={recording ? "Recording…" : uploading ? "Uploading…" : "Send a message…"}
            disabled={recording || uploading}
            className="flex-1 rounded-xl border border-white/[0.08] bg-white/[0.03] px-3 py-2 text-sm text-foreground placeholder:text-white/20 focus:border-[rgba(212,175,55,0.3)] focus:outline-none disabled:opacity-40 transition-colors"
            style={{ fontFamily: "var(--font-dm-sans)" }}
          />

          <button
            type="button"
            onClick={handleSend}
            disabled={(!text.trim() && !mediaFile) || busy}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#d4af37] text-black hover:bg-[#c9a432] transition-colors disabled:opacity-30"
          >
            {uploading || sending ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border border-black/20 border-t-black" />
            ) : (
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </>
  );
}

function MessageBubble({
  message,
  isOwn,
  onExpandImage,
}: {
  message: EventMessage;
  isOwn: boolean;
  onExpandImage: (src: string) => void;
}) {
  const name = message.sender?.full_name ?? "Unknown";
  const avatar = message.sender?.avatar_url;
  const isVideo = message.media_url && /\.(mp4|mov|webm|m4v)(\?|$)/i.test(message.media_url);

  return (
    <div className={`flex gap-2 ${isOwn ? "flex-row-reverse" : ""}`}>
      <div className="h-7 w-7 shrink-0 rounded-full overflow-hidden bg-[rgba(212,175,55,0.08)] border border-[rgba(212,175,55,0.15)] flex items-center justify-center">
        {avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={avatar} alt="" className="h-full w-full object-cover" />
        ) : (
          <span className="text-[10px] font-medium text-[#d4af37]/60">
            {name.charAt(0).toUpperCase()}
          </span>
        )}
      </div>

      <div className={`flex flex-col gap-0.5 max-w-[72%] ${isOwn ? "items-end" : "items-start"}`}>
        {!isOwn && (
          <span className="px-1 text-[10px] text-white/30" style={{ fontFamily: "var(--font-dm-sans)" }}>
            {name}
          </span>
        )}
        <div
          className={[
            "rounded-2xl px-3 py-2 text-sm leading-relaxed",
            isOwn
              ? "bg-[rgba(212,175,55,0.12)] text-white/90 rounded-tr-sm"
              : "bg-white/[0.05] text-white/80 rounded-tl-sm",
          ].join(" ")}
          style={{ fontFamily: "var(--font-dm-sans)" }}
        >
          {message.message_type === "voice" && message.audio_url ? (
            <audio src={message.audio_url} controls className="h-8 max-w-[200px] [&::-webkit-media-controls-panel]:bg-transparent" />
          ) : (
            <>
              {message.content && <span>{message.content}</span>}
              {message.media_url && (
                isVideo ? (
                  <video
                    src={message.media_url}
                    controls
                    playsInline
                    className="mt-1 max-h-40 max-w-[200px] rounded-xl object-cover"
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={message.media_url}
                    alt=""
                    className="mt-1 max-h-40 max-w-[200px] cursor-zoom-in rounded-xl object-cover"
                    onClick={() => onExpandImage(message.media_url!)}
                  />
                )
              )}
            </>
          )}
        </div>
        <span className="px-1 text-[9px] text-white/20" style={{ fontFamily: "var(--font-dm-sans)" }}>
          {new Date(message.created_at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
        </span>
      </div>
    </div>
  );
}
