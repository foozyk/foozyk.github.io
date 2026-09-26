/* ==========================================================
   НАШ ГОД — Service Worker (v21, clean-slate)
   Самоочистка: сносим все старые кэши и снимаем себя.
   ========================================================== */

const CACHE_NAME = "nash-god-v21";

const ASSETS = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./questions.js",
  "./words.js",
  "./lessons.js",
  "./firebase-config.js",
  "./manifest.json",
  "./confetti.browser.min.js",
  "./icon-192.png"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  return;
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});