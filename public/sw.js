const CACHE_NAME = "eliteseek-v1";

// Assets to pre-cache on install
const PRECACHE_URLS = [
  "/",
  "/browse",
  "/offline",
];

// Static asset patterns to cache at runtime
const STATIC_PATTERNS = [
  /\/_next\/static\//,
  /\/favicon/,
  /\/icon-/,
  /\/apple-touch-icon/,
];

// ── Install ────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => {})
      .finally(() => self.skipWaiting())
  );
});

// ── Activate ───────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
      )
      .then(() => self.clients.claim())
  );
});

// ── Fetch ──────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle same-origin GET requests
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // Skip API routes, auth callbacks, and Supabase
  if (
    url.pathname.startsWith("/api/") ||
    url.pathname.startsWith("/auth/") ||
    url.hostname.includes("supabase")
  ) {
    return;
  }

  // Static assets: cache-first
  const isStatic = STATIC_PATTERNS.some((p) => p.test(url.pathname));
  if (isStatic) {
    event.respondWith(
      caches.match(request).then(
        (cached) =>
          cached ||
          fetch(request).then((res) => {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
            return res;
          })
      )
    );
    return;
  }

  // Navigation: network-first, fall back to cache then /offline
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((res) => {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          return res;
        })
        .catch(
          () =>
            caches.match(request) ||
            caches.match("/offline") ||
            new Response("You are offline", {
              status: 503,
              headers: { "Content-Type": "text/plain" },
            })
        )
    );
  }
});
