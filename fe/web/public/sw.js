"use strict";
(() => {
  // src/sw/sw.ts
  var CACHE_VERSION = "v1";
  var SHELL_CACHE = `sekar-shell-${CACHE_VERSION}`;
  var API_CACHE = `sekar-api-${CACHE_VERSION}`;
  var STATIC_CACHE = `sekar-static-${CACHE_VERSION}`;
  var SHELL_URLS = ["/", "/monitoring", "/tasks", "/offline"];
  var MUTATION_METHODS = /* @__PURE__ */ new Set(["POST", "PUT", "PATCH", "DELETE"]);
  var NETWORK_FIRST_TIMEOUT = 2e3;
  var SNAPSHOT_MAX_AGE = 30 * 1e3;
  var PLANT_SPECIES_MAX_AGE = 24 * 60 * 60 * 1e3;
  self.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
        await self.skipWaiting();
      })()
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const validCaches = /* @__PURE__ */ new Set([SHELL_CACHE, API_CACHE, STATIC_CACHE]);
        const cacheNames = await caches.keys();
        await Promise.all(
          cacheNames.filter((name) => !validCaches.has(name)).map((name) => caches.delete(name))
        );
        await self.clients.claim();
      })()
    );
  });
  self.addEventListener("message", (event) => {
    var _a;
    if (((_a = event.data) == null ? void 0 : _a.type) === "SKIP_WAITING") {
      self.skipWaiting();
    }
  });
  self.addEventListener("fetch", (event) => {
    const { request } = event;
    const url = new URL(request.url);
    if (url.origin !== self.location.origin && !url.pathname.startsWith("/api")) {
      return;
    }
    if (url.pathname.startsWith("/_next/static/")) {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    if (url.pathname.startsWith("/icons/") || url.pathname === "/manifest.webmanifest") {
      event.respondWith(cacheFirst(request, STATIC_CACHE));
      return;
    }
    if (url.pathname.startsWith("/api/auth/")) {
      event.respondWith(fetch(request));
      return;
    }
    if (MUTATION_METHODS.has(request.method)) {
      event.respondWith(fetch(request));
      return;
    }
    if (url.pathname === "/api/monitoring/snapshot") {
      event.respondWith(staleWhileRevalidate(request, API_CACHE, SNAPSHOT_MAX_AGE));
      return;
    }
    if (url.pathname === "/api/plant-species" || url.pathname.startsWith("/api/plant-species/")) {
      event.respondWith(cacheFirstWithTTL(request, API_CACHE, PLANT_SPECIES_MAX_AGE));
      return;
    }
    if (url.pathname.startsWith("/api/pruning-requests")) {
      event.respondWith(networkFirst(request, API_CACHE, NETWORK_FIRST_TIMEOUT));
      return;
    }
    if (request.mode === "navigate") {
      event.respondWith(navigationHandler(request));
      return;
    }
  });
  async function cacheFirst(request, cacheName) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) return cached;
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  }
  async function cacheFirstWithTTL(request, cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    if (cached) {
      const cachedDate = cached.headers.get("sw-cached-at");
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
      headers.set("sw-cached-at", String(Date.now()));
      const body = await cloned.arrayBuffer();
      const enhanced = new Response(body, { status: cloned.status, headers });
      cache.put(request, enhanced);
    }
    return response;
  }
  async function staleWhileRevalidate(request, cacheName, maxAge) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    const revalidate = fetch(request).then((response) => {
      if (response.ok) {
        const headers = new Headers(response.headers);
        headers.set("sw-cached-at", String(Date.now()));
        response.arrayBuffer().then((body) => {
          cache.put(request, new Response(body, { status: response.status, headers }));
        });
      }
      return response;
    });
    if (cached) {
      const cachedAt = cached.headers.get("sw-cached-at");
      const age = cachedAt ? Date.now() - parseInt(cachedAt, 10) : 0;
      if (age < maxAge) return cached;
    }
    return revalidate;
  }
  async function networkFirst(request, cacheName, timeoutMs) {
    const cache = await caches.open(cacheName);
    const networkPromise = fetch(request).then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    });
    const timeoutPromise = new Promise(
      (resolve) => setTimeout(() => resolve(null), timeoutMs)
    );
    const result = await Promise.race([networkPromise, timeoutPromise]);
    if (result) return result;
    const cached = await cache.match(request);
    if (cached) return cached;
    return networkPromise;
  }
  async function navigationHandler(request) {
    const cache = await caches.open(SHELL_CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await cache.match(request);
      if (cached) return cached;
      const offline = await cache.match("/offline");
      if (offline) return offline;
      return new Response("Offline", { status: 503, statusText: "Service Unavailable" });
    }
  }
})();
