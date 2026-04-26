"use strict";
(() => {
  // src/sw/sw.ts
  var CACHE_VERSION = "v1";
  var SHELL_CACHE = `sekar-shell-${CACHE_VERSION}`;
  var STATIC_CACHE = `sekar-static-${CACHE_VERSION}`;
  var SHELL_URLS = ["/", "/monitoring", "/tasks", "/offline"];
  self.addEventListener("install", (event) => {
    event.waitUntil(
      (async () => {
        const cache = await caches.open(SHELL_CACHE);
        await Promise.allSettled(SHELL_URLS.map((url) => cache.add(url)));
      })()
    );
  });
  self.addEventListener("activate", (event) => {
    event.waitUntil(
      (async () => {
        const validCaches = /* @__PURE__ */ new Set([SHELL_CACHE, STATIC_CACHE]);
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
    if (url.origin !== self.location.origin) {
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
