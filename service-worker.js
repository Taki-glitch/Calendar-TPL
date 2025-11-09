const CACHE = "tpl-cache-v1";
const ASSETS = [
  "/",
  "/index.html",
  "/style.css",
  "/script.js",
  "/manifest.json",
  "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/main.min.js",
  "https://cdn.jsdelivr.net/npm/fullcalendar@6.1.10/main.min.css"
];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS)));
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
});

self.addEventListener("fetch", e => {
  e.respondWith(
    caches.match(e.request).then(res =>
      res ||
      fetch(e.request).then(fetchRes => {
        const clone = fetchRes.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, clone));
        return fetchRes;
      }).catch(() => caches.match("/index.html"))
    )
  );
});
