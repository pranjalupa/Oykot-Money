/**
 * A deliberately small service worker. It exists for two things: so the app
 * opens instantly from the home screen, and so losing signal shows a page
 * instead of Chrome's dinosaur.
 *
 * What it will NOT do is cache your pages. Every screen here is private and
 * user-specific, and a stale budget is worse than no budget — so navigations
 * always go to the network, and only fall back to /offline when the network
 * isn't there. Static build assets are safe to cache: Next fingerprints them,
 * so a new deploy asks for new file names anyway.
 */
const VERSION = "v1";
const SHELL = `shell-${VERSION}`;
const ASSETS = `assets-${VERSION}`;
const OFFLINE = "/offline";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll([OFFLINE, "/icons/icon-192.png"])).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;
  // Auth and data go straight through, always.
  if (url.pathname.startsWith("/api") || url.pathname.startsWith("/auth")) return;

  if (request.mode === "navigate") {
    event.respondWith(fetch(request).catch(() => caches.match(OFFLINE).then((r) => r ?? Response.error())));
    return;
  }

  // Fingerprinted build output and icons: serve from cache, refresh behind it.
  if (url.pathname.startsWith("/_next/static") || url.pathname.startsWith("/icons")) {
    event.respondWith(
      caches.open(ASSETS).then(async (cache) => {
        const hit = await cache.match(request);
        const fresh = fetch(request)
          .then((res) => {
            if (res.ok) cache.put(request, res.clone());
            return res;
          })
          .catch(() => hit);
        return hit ?? fresh;
      }),
    );
  }
});
