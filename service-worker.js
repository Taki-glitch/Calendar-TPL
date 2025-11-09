/**************************************************************
 * ⚙️ Service Worker — Planning TPL (v3)
 * ------------------------------------------------------------
 * - Met en cache les fichiers essentiels
 * - Ignore les erreurs réseau (pour éviter Failed to execute addAll)
 * - Sert les fichiers depuis le cache si offline
 **************************************************************/

const CACHE_NAME = "tpl-cache-v3";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./tpl-logo.png"
];

// 📦 Installation : on met en cache les fichiers essentiels
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async cache => {
      const cachePromises = ASSETS.map(async url => {
        try {
          const response = await fetch(url);
          if (response.ok) await cache.put(url, response);
        } catch (err) {
          console.warn("⚠️ Échec de mise en cache :", url);
        }
      });
      await Promise.all(cachePromises);
    })
  );
  console.log("✅ Service Worker installé");
});

// 🧹 Activation : supprime les anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => {
            console.log("🗑️ Suppression ancien cache :", k);
            return caches.delete(k);
          })
      )
    )
  );
  console.log("🚀 Service Worker actif");
});

// 🌐 Interception des requêtes
self.addEventListener("fetch", event => {
  const { request } = event;

  // On ne met pas en cache les appels au Google Script ou aux proxys
  if (request.url.includes("script.google.com") || request.url.includes("allorigins.win")) {
    event.respondWith(fetch(request).catch(() => new Response("[]", { headers: { "Content-Type": "application/json" } })));
    return;
  }

  // Réponse depuis le cache, sinon réseau
  event.respondWith(
    caches.match(request).then(cachedResponse => {
      return (
        cachedResponse ||
        fetch(request)
          .then(networkResponse => {
            // On met à jour le cache en arrière-plan
            caches.open(CACHE_NAME).then(cache => {
              if (networkResponse && networkResponse.ok) {
                cache.put(request, networkResponse.clone());
              }
            });
            return networkResponse;
          })
          .catch(() => {
            // Si offline → retour du cache de secours
            if (request.mode === "navigate") {
              return caches.match("./index.html");
            }
          })
      );
    })
  );
});
