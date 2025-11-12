/****************************************************
 * 📦 SERVICE WORKER v3.4 — Planning TPL (avec logo SVG)
 ****************************************************/

const CACHE_VERSION = "v3.4";
const CACHE_NAME = `tpl-calendar-cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./tpl-logo.png",
  "./tpl-logo-blue.svg",

  // ✅ FullCalendar
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/locales-all.global.min.js"
];

/****************************************************
 * 🧱 INSTALLATION — Mise en cache initiale
 ****************************************************/
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé — version", CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.allSettled(
          ASSETS.map(async (url) => {
            try {
              const res = await fetch(url, { cache: "no-store" });
              if (res.ok) await cache.put(url, res.clone());
            } catch (err) {
              console.warn("⚠️ Skip asset (erreur réseau):", url, err.message);
            }
          })
        )
      )
      .then(() => self.skipWaiting())
  );
});

/****************************************************
 * 🚀 ACTIVATION — Nettoyage anciens caches
 ****************************************************/
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker actif — purge anciens caches…");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

/****************************************************
 * ⚙️ FETCH — Cache d’abord, puis fallback réseau
 ****************************************************/
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.url.startsWith("chrome-extension") || request.url.startsWith("data:")) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) return cachedResponse;

      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || !networkResponse.ok || networkResponse.type === "opaque") return networkResponse;
          const responseClone = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          return networkResponse;
        })
        .catch(() => (request.mode === "navigate" ? caches.match("./offline.html") : undefined));
    })
  );
});

/****************************************************
 * 🧭 Message depuis la page
 ****************************************************/
self.addEventListener("message", (event) => {
  if (event.data === "forceUpdate") {
    console.log("♻️ Forçage mise à jour SW");
    self.skipWaiting();
  }
});
