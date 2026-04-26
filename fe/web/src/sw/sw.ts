/// <reference lib="webworker" />

// This is the TypeScript source. Compile to public/sw.js via:
//   npx esbuild src/sw/sw.ts --bundle --outfile=public/sw.js --platform=browser --target=chrome90

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `sekar-shell-${CACHE_VERSION}`;
const STATIC_CACHE = `sekar-static-${CACHE_VERSION}`;

// Shell URLs to precache on install
const SHELL_URLS = ['/', '/monitoring', '/tasks', '/offline'];

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Precache shell pages; ignore individual failures (pages may not exist yet)
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
      // Do NOT call skipWaiting() here — let the explicit UpdateToast flow control activation.
    })()
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const validCaches = new Set([SHELL_CACHE, STATIC_CACHE]);
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => !validCaches.has(name))
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

// ─── Message ─────────────────────────────────────────────────────────────────

self.addEventListener('message', (event: ExtendableMessageEvent) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// ─── Fetch routing ───────────────────────────────────────────────────────────

self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Pass through cross-origin requests (API is on a different origin in production)
  if (url.origin !== self.location.origin) {
    return;
  }

  // Static assets: cache-first, 1 year
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Public icons and manifest: cache-first
  if (url.pathname.startsWith('/icons/') || url.pathname === '/manifest.webmanifest') {
    event.respondWith(cacheFirst(request, STATIC_CACHE));
    return;
  }

  // Navigation requests: network-first with offline fallback
  if (request.mode === 'navigate') {
    event.respondWith(navigationHandler(request));
    return;
  }
});

// ─── Strategies ──────────────────────────────────────────────────────────────

async function cacheFirst(request: Request, cacheName: string): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) return cached;

  const response = await fetch(request);
  if (response.ok) {
    cache.put(request, response.clone());
  }
  return response;
}

async function navigationHandler(request: Request): Promise<Response> {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Network failed — try cache
    const cached = await cache.match(request);
    if (cached) return cached;

    // Fall back to offline page
    const offline = await cache.match('/offline');
    if (offline) return offline;

    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
  }
}
