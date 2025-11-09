const CACHE = "tpl-offline-v3";
const ASSETS = [
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/main.min.js",
  "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/main.min.css"
];

// 🧱 INSTALLATION : met en cache les ressources disponibles
self.addEventListener("install", event => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      for (const url of ASSETS) {
        try {
          const response = await fetch(url, { mode: "no-cors" });
          if (response.ok || response.type === "opaque") {
            await cache.put(url, response);
          } else {
            console.warn("⚠️ Non mis en cache :", url, response.status);
          }
        } catch (err) {
          console.warn("⚠️ Erreur de mise en cache :", url, err.message);
        }
      }
    })()
  );
});

// ♻️ ACTIVATION : nettoie les anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

// 🌐 FETCH : sert depuis le cache, sinon réseau
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return (
        res ||
        fetch(event.request).then(fetchRes => {
          const clone = fetchRes.clone();
          caches.open(CACHE).then(c => c.put(event.request, clone));
          return fetchRes;
        }).catch(() => caches.match("./index.html"))
      );
    })
  );
});
