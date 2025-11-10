/****************************************************
 * 📦 SERVICE WORKER v3.3 — Planning TPL (cache optimisé)
 * ----------------------------------------------------
 * ✅ Correction : "Response body is already used"
 * ✅ Optimisation du cache et fallback réseau
 ****************************************************/

const CACHE_VERSION = "v3.3"; // 🆕 incrémente à chaque mise à jour
const CACHE_NAME = `tpl-calendar-cache-${CACHE_VERSION}`;

const ASSETS = [
  "./",
  "./index.html",
  "./offline.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./tpl-logo.png",

  // ✅ FullCalendar (JS intégrés)
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/daygrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/timegrid@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/list@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/interaction@6.1.10/index.global.min.js",
  "https://cdn.jsdelivr.net/npm/@fullcalendar/core@6.1.10/locales-all.global.min.js",
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
              if (res.ok) {
                await cache.put(url, res.clone());
                console.log("📦 Cached:", url);
              } else {
                console.warn("⚠️ Non mis en cache (HTTP error):", url, res.status);
              }
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
 * 🚀 ACTIVATION — Nettoyage des anciens caches
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
 * ⚙️ FETCH — Cache d’abord, puis fallback réseau
 ****************************************************/
self.addEventListener("fetch", (event) => {
  const request = event.request;

  // 🚫 Ignorer les requêtes chrome-extension ou data:
  if (request.url.startsWith("chrome-extension") || request.url.startsWith("data:")) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("⚙️ Cache hit:", request.url);
        return cachedResponse;
      }

      // 🔁 Sinon → essai réseau + mise en cache
      return fetch(request)
        .then((networkResponse) => {
          // ⚠️ Certaines requêtes (ex: POST) n’ont pas de body clonable
          if (!networkResponse || !networkResponse.ok || networkResponse.type === "opaque") {
            return networkResponse;
          }

          const responseClone = networkResponse.clone(); // ✅ Correction ici
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseClone);
          });

          return networkResponse;
        })
        .catch(() => {
          // 🌐 Si hors ligne → retour vers offline.html
          if (request.mode === "navigate" || request.destination === "document") {
            return caches.match("./offline.html");
          }
        });
    })
  );
});

/****************************************************
 * 🧭 Message depuis la page (ex: purge manuelle)
 ****************************************************/
self.addEventListener("message", (event) => {
  if (event.data === "forceUpdate") {
    console.log("♻️ Forçage de la mise à jour du Service Worker");
    self.skipWaiting();
  }
});
