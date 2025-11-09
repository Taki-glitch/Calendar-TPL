/**************************************************************
 * ⚙️ SERVICE WORKER — Planning TPL (v2.0)
 * Fonctionne avec GitHub Pages + FullCalendar + PWA
 **************************************************************/

const CACHE_NAME = "tpl-calendar-cache-v2";

// 🧱 Liste des fichiers à précharger (offline)
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
 * 🧩 INSTALLATION — préchargement du cache
 **************************************************************/
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé");
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(OFFLINE_ASSETS))
      .then(() => self.skipWaiting())
  );
});

/**************************************************************
 * 🚀 ACTIVATION — nettoyage de l’ancien cache
 **************************************************************/
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker actif");
  event.waitUntil(
    caches.keys().then((keys) => 
      Promise.all(keys.map((key) => {
        if (key !== CACHE_NAME) {
          console.log("🧹 Suppression ancien cache :", key);
          return caches.delete(key);
        }
      }))
    )
  );
  self.clients.claim();
});

/**************************************************************
 * 🌐 FETCH — stratégie cache-first avec fallback réseau
 **************************************************************/
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // ⚠️ On ignore les requêtes non-HTTP
  if (!request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(request).then((response) => {
      // 🗂️ 1. On retourne la ressource du cache si elle existe
      if (response) {
        console.log("⚙ Cache hit:", request.url);
        return response;
      }

      // 🌍 2. Sinon on la télécharge et on la met en cache
      return fetch(request)
        .then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200) return networkResponse;
          const cloned = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, cloned));
          console.log("🌐 Fetched & cached:", request.url);
          return networkResponse;
        })
        .catch(() => {
          // 📵 3. Si offline et non en cache → page d’accueil offline
          return caches.match("./index.html");
        });
    })
  );
});
