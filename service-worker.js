/****************************************************
 * 📦 SERVICE WORKER v3.5 — Planning TPL (fix synchronisation)
 ****************************************************/

const CACHE_VERSION = "v3.5";
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

  // FullCalendar
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/locales-all.global.min.js"
];

/****************************************************
 * 🧱 INSTALLATION — Mise en cache des assets statiques
 ****************************************************/
self.addEventListener("install", (event) => {
  console.log("✅ Service Worker installé — version", CACHE_VERSION);
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

/****************************************************
 * 🚀 ACTIVATION — Nettoyage anciens caches
 ****************************************************/
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.map((key) => key !== CACHE_NAME && caches.delete(key)))
    ).then(() => self.clients.claim())
  );
});

/****************************************************
 * ⚠️ URLS À NE JAMAIS METTRE EN CACHE
 * (planning → toujours en Network First)
 ****************************************************/
function isDynamicDataRequest(request) {
  const url = request.url;

  return (
    url.includes("script.google.com") || // Google Apps Script
    url.includes("workers.dev")         // Proxy Cloudflare
  );
}

/****************************************************
 * ⚙️ FETCH — stratégie hybridée :
 * - pour les données : Network First
 * - pour le reste : Cache First + fallback réseau
 ****************************************************/
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // ❌ On ne touche pas aux extensions / data URIs
  if (request.url.startsWith("chrome-extension") || request.url.startsWith("data:")) return;

  // 🟦 1) CAS SPÉCIAL : Données du planning → NETWORK FIRST
  if (isDynamicDataRequest(request)) {
    event.respondWith(
      fetch(request)
        .then((res) => res)
        .catch(() => {
          console.warn("⚠️ Offline — impossible de contacter le serveur.");
          return new Response(JSON.stringify([]), {
            headers: { "Content-Type": "application/json" }
          });
        })
    );
    return;
  }

  // 🟩 2) ASSETS → CACHE FIRST
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;

      return fetch(request)
        .then((res) => {
          if (!res || !res.ok) return res;
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return res;
        })
        .catch(() => {
          if (request.mode === "navigate") {
            return caches.match("./offline.html");
          }
        });
    })
  );
});

/****************************************************
 * 🔄 Mise à jour forcée
 ****************************************************/
self.addEventListener("message", (event) => {
  if (event.data === "forceUpdate") {
    console.log("♻️ Forçage mise à jour SW");
    self.skipWaiting();
  }
});
