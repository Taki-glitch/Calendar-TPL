const CACHE_NAME = "tpl-cache-v1";
const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./script.js",
  "./manifest.json",
  "./tpl-logo.png",
  "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/main.min.css",
  "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/main.min.js"
];

// Installation
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
});

// Nettoyage anciens caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
});

// Interception
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(response =>
      response ||
      fetch(event.request).then(res => {
        const resClone = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, resClone));
        return res;
      }).catch(() => caches.match("./index.html"))
    )
  );
});
