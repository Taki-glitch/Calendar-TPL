/****************************************************
 * 📦 SERVICE WORKER v3.2 — Planning TPL (cache forcé)
 ****************************************************/

const CACHE_VERSION = "v3.2-" + Date.now(); // 🔥 cache unique à chaque build
const CACHE_NAME = `tpl-calendar-cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./tpl-logo.png",
  // ✅ FullCalendar assets
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/locales-all.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.css",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.css",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.css"
];

/****************************************************
 * 🧱 INSTALLATION
 ****************************************************/
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé — version", CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        Promise.all(
          ASSETS.map((url) =>
            fetch(url)
              .then((response) => {
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                cache.put(url, response.clone());
                console.log("📦 Cached:", url);
              })
              .catch((err) =>
                console.warn(`⚠️ Skip (HTTP error): ${url}`, err.message)
              )
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

/****************************************************
 * 🚀 ACTIVATION (suppression complète anciens caches)
 ****************************************************/
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker actif — purge des anciens caches…");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("🧹 Suppression ancien cache :", key);
            return caches.delete(key);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

/****************************************************
 * ⚙️ FETCH : prioriser le cache, fallback réseau
 ****************************************************/
self.addEventListener("fetch", (event) => {
  const request = event.request;
  event.respondWith(
    caches.match(request).then((response) => {
      if (response) {
        console.log("⚙️ Cache hit:", request.url);
        return response;
      }
      return fetch(request)
        .then((netRes) => {
          if (netRes && netRes.ok) {
            caches.open(CACHE_NAME).then((cache) =>
              cache.put(request, netRes.clone())
            );
          }
          return netRes;
        })
        .catch(() => caches.match("./offline.html"));
    })
  );
});
