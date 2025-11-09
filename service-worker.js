/**************************************************************
 * ⚙️ SERVICE WORKER — Planning TPL (v2.2 incassable)
 **************************************************************/

const CACHE_NAME = "tpl-calendar-cache-v2.2";

const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./tpl-logo.png",
  "./Othertpl-logo.png",
  // ✅ FullCalendar CSS
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.css",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.css",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.css",
  // ✅ FullCalendar JS
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/locales-all.global.min.js"
];

/**************************************************************
 * 🧩 INSTALLATION — préchargement intelligent
 **************************************************************/
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé");

  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      for (const url of OFFLINE_ASSETS) {
        try {
          const response = await fetch(url, { mode: "no-cors" });
          if (response && (response.ok || response.type === "opaque")) {
            await cache.put(url, response);
            console.log("📦 Cached:", url);
          } else {
            console.warn("⚠️ Skip (HTTP error):", url);
          }
        } catch (err) {
          console.warn("⚠️ Skip (fetch failed):", url, err);
        }
      }
      self.skipWaiting();
    })()
  );
});

/**************************************************************
 * 🚀 ACTIVATION — nettoyage de l’ancien cache
 **************************************************************/
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker actif");
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.map(key => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

/**************************************************************
 * 🌐 FETCH — stratégie cache-first avec fallback réseau
 **************************************************************/
self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (!request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(request).then(response => {
      if (response) return response;
      return fetch(request)
        .then(networkResponse => {
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => caches.match("./index.html"));
    })
  );
});
