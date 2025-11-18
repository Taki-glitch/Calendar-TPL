/****************************************************
 * 📦 SERVICE WORKER v3.6 — Planning TPL (modules friendly)
 ****************************************************/

const CACHE_VERSION = "v3.6";
const CACHE_NAME = `tpl-calendar-cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./style.css",
  "./app.js",
  "./modules/theme.js",
  "./modules/i18n.js",
  "./modules/storage.js",
  "./modules/calendar.js",
  "./modules/umap.js",
  "./modules/export.js",
  "./manifest.json",
  "./tpl-logo.png",
  "./tpl-logo-blue.svg",
  // FullCalendar (CSS/JS are external CDN - keep them but caching may be opaque)
];

/* install */
self.addEventListener("install", (event) => {
  console.log("SW install", CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS)).then(() => self.skipWaiting())
  );
});

/* activate */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((k) => k !== CACHE_NAME && caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isDynamicDataRequest(request) {
  const url = request.url;
  return url.includes("script.google.com") || url.includes("workers.dev");
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.url.startsWith("chrome-extension") || req.url.startsWith("data:")) return;

  if (isDynamicDataRequest(req)) {
    // network-first
    event.respondWith(
      fetch(req)
        .then((res) => res)
        .catch(() => {
          // fallback to local offline page if navigation
          if (req.mode === "navigate") return caches.match("./offline.html");
          // otherwise return empty JSON for service endpoints
          return new Response(JSON.stringify([]), { headers: { "Content-Type": "application/json" } });
        })
    );
    return;
  }

  // cache-first for assets
  event.respondWith(
    caches.match(req).then((cached) => {
      if (cached) return cached;
      return fetch(req)
        .then((res) => {
          if (!res || !res.ok) return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, clone));
          return res;
        })
        .catch(() => {
          if (req.mode === "navigate") return caches.match("./offline.html");
        });
    })
  );
});

self.addEventListener("message", (evt) => {
  if (evt.data === "forceUpdate") self.skipWaiting();
});
