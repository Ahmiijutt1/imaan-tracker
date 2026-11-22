/* Imaan & Zikr Tracker service worker.
   Pages are fetched from the network first, so new versions reach you right away.
   If you are offline, the last saved copy is used. Bump VERSION to force a clean cache. */
const VERSION = "imaan-v1";
const FONTS = "imaan-fonts-v1";
const ASSETS = ["./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./icon-maskable-512.png", "./apple-touch-icon.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((ks) => Promise.all(ks.filter((k) => k !== VERSION && k !== FONTS).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const u = new URL(r.url);

  // Google Fonts: cache after first use so Arabic text looks right offline
  if (u.hostname === "fonts.googleapis.com" || u.hostname === "fonts.gstatic.com") {
    e.respondWith(
      caches.open(FONTS).then((c) =>
        c.match(r).then((m) => m || fetch(r).then((res) => { c.put(r, res.clone()); return res; }).catch(() => m))
      )
    );
    return;
  }

  if (u.origin !== location.origin) return;

  // The app page: network first, fall back to the saved copy
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r)
        .then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put("./index.html", cp)); return res; })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Other files: saved copy first, then network
  e.respondWith(
    caches.match(r).then((m) => m || fetch(r).then((res) => { const cp = res.clone(); caches.open(VERSION).then((c) => c.put(r, cp)); return res; }))
  );
});
