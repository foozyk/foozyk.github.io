/* ==========================================================
   НАШ ГОД — Service Worker
   ========================================================== */

const CACHE_NAME = "nash-god-v20";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./questions.js",
  "./words.js",
  "./firebase-config.js",
  "./manifest.json",
  "./confetti.browser.min.js",
  "./icon-192.png"
];

/* install — кэшируем оболочку и сразу активируемся */
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(ASSETS).catch(() => {}))
      .then(() => self.skipWaiting())
  );
});

/* activate — сносим старые кэши и захватываем клиентов */
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

/* fetch — network-first для своего, cache-first для остального */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Внешние домены (Firebase, шрифты, API) — не трогаем, отдаём сети
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    fetch(req)
      .then(res => {
        // Обновляем кэш свежей версией
        const copy = res.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return res;
      })
      .catch(() => caches.match(req).then(c => c || caches.match("./index.html")))
  );
});

/* Сообщение из app.js — принудительное обновление по команде */
self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});