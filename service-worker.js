/**************************************************************
 * ⚙️ SERVICE WORKER — Planning TPL (v3.0 final)
 * Fonctionne avec GitHub Pages + FullCalendar + PWA + offline.html
 **************************************************************/

const CACHE_NAME = "tpl-calendar-cache-v3.0";

/* 🗂️ Liste des fichiers à précharger */
const OFFLINE_ASSETS = [
  "./",
  "./index.html",
  "./offline.html",  // ✅ page hors ligne animée
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./tpl-logo.png",
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
      // On ajoute les ressources une par une avec gestion d'erreur
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
      self.skipWaiting(); // activation immédiate
    })()
  );
});

/**************************************************************
 * 🚀 ACTIVATION — suppression des anciens caches
 **************************************************************/
self.addEventListener("activate", (event) => {
  console.log("🚀 Service Worker actif");

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
    )
  );

  self.clients.claim();
});

/**************************************************************
 * 🌐 FETCH — stratégie cache-first + fallback réseau + offline
 **************************************************************/
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // ⚠️ On ignore les requêtes non HTTP (chrome-extension:// etc.)
  if (!request.url.startsWith("http")) return;

  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      if (cachedResponse) {
        console.log("⚙️ Cache hit:", request.url);
        return cachedResponse;
      }

      // 🌍 Si pas dans le cache → requête réseau
      return fetch(request)
        .then((networkResponse) => {
          // On met en cache la nouvelle ressource si elle est OK
          if (networkResponse.ok) {
            const clone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          }
          return networkResponse;
        })
        .catch(() => {
          // 📵 Si tout échoue → page hors ligne
          console.warn("📴 Hors ligne, affichage de offline.html");
          return caches.match("./offline.html");
        });
    })
  );
});
