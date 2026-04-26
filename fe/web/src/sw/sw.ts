/// <reference lib="webworker" />

// This is the TypeScript source. Compile to public/sw.js via:
//   npx esbuild src/sw/sw.ts --bundle --outfile=public/sw.js --platform=browser --target=chrome90

declare const self: ServiceWorkerGlobalScope;

const CACHE_VERSION = 'v1';
const SHELL_CACHE = `sekar-shell-${CACHE_VERSION}`;
const API_CACHE = `sekar-api-${CACHE_VERSION}`;
const STATIC_CACHE = `sekar-static-${CACHE_VERSION}`;

// Shell URLs to precache on install
const SHELL_URLS = ['/', '/monitoring', '/tasks', '/offline'];

// Network-only methods
const MUTATION_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

// Timeout for network-first strategy (ms)
const NETWORK_FIRST_TIMEOUT = 2000;

// API cache TTL entries (ms)
const SNAPSHOT_MAX_AGE = 30 * 1000; // 30 seconds
const PLANT_SPECIES_MAX_AGE = 24 * 60 * 60 * 1000; // 1 day

// ─── Install ─────────────────────────────────────────────────────────────────

self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(SHELL_CACHE);
      // Precache shell pages; ignore individual failures (pages may not exist yet)
      await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
      await self.skipWaiting();
    })()
  );
});

// ─── Activate ────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const validCaches = new Set([SHELL_CACHE, API_CACHE, STATIC_CACHE]);
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

  // Only handle same-origin or our API requests
  if (url.origin !== self.location.origin && !url.pathname.startsWith('/api')) {
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

  // Auth API: network-only
  if (url.pathname.startsWith('/api/auth/')) {
    event.respondWith(fetch(request));
    return;
  }

  // Mutation methods: network-only
  if (MUTATION_METHODS.has(request.method)) {
    event.respondWith(fetch(request));
    return;
  }

  // Monitoring snapshot: stale-while-revalidate, 30s TTL
  if (url.pathname === '/api/monitoring/snapshot') {
    event.respondWith(staleWhileRevalidate(request, API_CACHE, SNAPSHOT_MAX_AGE));
    return;
  }

  // Plant species: cache-first, 1 day TTL
  if (url.pathname === '/api/plant-species' || url.pathname.startsWith('/api/plant-species/')) {
    event.respondWith(cacheFirstWithTTL(request, API_CACHE, PLANT_SPECIES_MAX_AGE));
    return;
  }

  // Pruning requests GET: network-first, 2s timeout
  if (url.pathname.startsWith('/api/pruning-requests')) {
    event.respondWith(networkFirst(request, API_CACHE, NETWORK_FIRST_TIMEOUT));
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

async function cacheFirstWithTTL(
  request: Request,
  cacheName: string,
  maxAge: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  if (cached) {
    const cachedDate = cached.headers.get('sw-cached-at');
    if (cachedDate) {
      const age = Date.now() - parseInt(cachedDate, 10);
      if (age < maxAge) return cached;
    } else {
      return cached;
    }
  }

  const response = await fetch(request);
  if (response.ok) {
    const cloned = response.clone();
    const headers = new Headers(cloned.headers);
    headers.set('sw-cached-at', String(Date.now()));
    const body = await cloned.arrayBuffer();
    const enhanced = new Response(body, { status: cloned.status, headers });
    cache.put(request, enhanced);
  }
  return response;
}

async function staleWhileRevalidate(
  request: Request,
  cacheName: string,
  maxAge: number
): Promise<Response> {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const revalidate = fetch(request).then((response) => {
    if (response.ok) {
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', String(Date.now()));
      response.arrayBuffer().then((body) => {
        cache.put(request, new Response(body, { status: response.status, headers }));
      });
    }
    return response;
  });

  if (cached) {
    const cachedAt = cached.headers.get('sw-cached-at');
    const age = cachedAt ? Date.now() - parseInt(cachedAt, 10) : 0;
    if (age < maxAge) return cached;
  }

  return revalidate;
}

async function networkFirst(
  request: Request,
  cacheName: string,
  timeoutMs: number
): Promise<Response> {
  const cache = await caches.open(cacheName);

  const networkPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  const timeoutPromise = new Promise<null>((resolve) =>
    setTimeout(() => resolve(null), timeoutMs)
  );

  const result = await Promise.race([networkPromise, timeoutPromise]);
  if (result) return result;

  const cached = await cache.match(request);
  if (cached) return cached;

  // Return the network promise even if timed out — may still resolve
  return networkPromise;
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
