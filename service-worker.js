/**************************************************************
 * ⚙️ service-worker.js — Planning TPL
 * ------------------------------------------------------------
 * - Cache intelligent pour mode offline
 * - Ignore le proxy Cloudflare et les appels Apps Script
 * - Gère la mise à jour automatique
 **************************************************************/

const CACHE_NAME = "planning-tpl-v4.0";
const OFFLINE_URL = "offline.html";

// 🗂️ Fichiers à mettre en cache
const FILES_TO_CACHE = [
  "/",
  "index.html",
  "style.css",
  "script.js",
  "manifest.json",
  "offline.html",
  "tpl-logo.png",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/locales-all.global.min.js",
];

// 📦 Installation
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé — version", CACHE_NAME);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(FILES_TO_CACHE))
  );
  self.skipWaiting();
});

// 🔁 Activation et nettoyage
self.addEventListener("activate", (event) => {
  console.log("⚙️ Service Worker activé");
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    )
  );
  self.clients.claim();
});

// 🌐 Interception des requêtes
self.addEventListener("fetch", (event) => {
  const requestUrl = event.request.url;

  // 🚫 Ne jamais mettre en cache les appels au proxy ou à Google Apps Script
  if (
    requestUrl.includes("script.google.com") ||
    requestUrl.includes("workers.dev/?url=")
  ) {
    return event.respondWith(fetch(event.request));
  }

  // ✅ Pour tout le reste : cache + fallback offline
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("⚙️ Cache hit:", requestUrl);
        // En parallèle, on met à jour le cache
        fetch(event.request).then((response) => {
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, response.clone()));
        });
        return cachedResponse;
      }

      // Si pas en cache, on essaie le réseau
      return fetch(event.request)
        .then((response) => {
          // Sauvegarde dans le cache
          if (response && response.status === 200 && response.type === "basic") {
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, response.clone());
            });
          }
          return response;
        })
        .catch(() => caches.match(OFFLINE_URL));
    })
  );
});

// 🔄 Mise à jour automatique du SW
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
