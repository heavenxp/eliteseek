"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  readonly userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "pwa-install-dismissed";
const INSTALLED_KEY = "pwa-installed";

export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Don't show if user already installed or dismissed recently
    if (
      localStorage.getItem(INSTALLED_KEY) ||
      localStorage.getItem(DISMISSED_KEY)
    ) {
      return;
    }

    // Don't show if already running as standalone PWA
    if (window.matchMedia("(display-mode: standalone)").matches) {
      localStorage.setItem(INSTALLED_KEY, "1");
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", handler);

    // Show the prompt after 30 seconds
    const timer = setTimeout(() => setVisible(true), 30_000);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      clearTimeout(timer);
    };
  }, []);

  // iOS detection — Safari doesn't fire beforeinstallprompt
  const [isIos, setIsIos] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    const isIosBrowser =
      /iphone|ipad|ipod/i.test(ua) &&
      !window.matchMedia("(display-mode: standalone)").matches &&
      !(navigator as unknown as { standalone?: boolean }).standalone;

    if (
      isIosBrowser &&
      !localStorage.getItem(INSTALLED_KEY) &&
      !localStorage.getItem(DISMISSED_KEY)
    ) {
      setIsIos(true);
      const timer = setTimeout(() => setVisible(true), 30_000);
      return () => clearTimeout(timer);
    }
  }, []);

  function dismiss() {
    setVisible(false);
    // Suppress for 7 days
    localStorage.setItem(DISMISSED_KEY, String(Date.now() + 7 * 24 * 60 * 60 * 1000));
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === "accepted") {
      localStorage.setItem(INSTALLED_KEY, "1");
    }
    setDeferredPrompt(null);
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install EliteSeek"
      className="fixed bottom-24 left-4 right-4 z-50 mx-auto max-w-sm overflow-hidden rounded-2xl border border-white/20 bg-[rgba(8,8,22,0.97)] shadow-[0_8px_48px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:left-auto sm:right-6 sm:w-80"
    >
      {/* Gold top accent */}
      <div className="h-[2px] w-full bg-gradient-to-r from-transparent via-gold to-transparent" />

      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Icon */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icon-192x192.png"
            alt="EliteSeek"
            width={48}
            height={48}
            className="shrink-0 rounded-xl"
          />

          <div className="flex-1 min-w-0">
            <p
              className="text-base font-light text-foreground"
              style={{ fontFamily: "var(--font-cormorant)" }}
            >
              Install EliteSeek
            </p>
            <p
              className="mt-0.5 text-xs text-muted/60 leading-relaxed"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              {isIos
                ? 'Tap the share icon then "Add to Home Screen" for the full app experience.'
                : "Add to your home screen for instant access and offline browsing."}
            </p>
          </div>

          <button
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 text-muted/30 hover:text-muted/60 transition-colors"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* iOS instructions */}
        {isIos && (
          <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted/50" style={{ fontFamily: "var(--font-dm-sans)" }}>
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
            </svg>
            Tap <strong className="text-muted/70">Share</strong> → <strong className="text-muted/70">Add to Home Screen</strong>
          </div>
        )}

        {/* Install button — only for non-iOS */}
        {!isIos && deferredPrompt && (
          <div className="mt-4 flex gap-2">
            <button
              onClick={dismiss}
              className="btn-ghost flex-1 rounded-xl py-2 text-xs"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Not now
            </button>
            <button
              onClick={install}
              className="btn-gold flex-1 rounded-xl py-2 text-xs"
              style={{ fontFamily: "var(--font-dm-sans)" }}
            >
              Install
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
