/* ==========================================================
   НАШ ГОД — Service Worker (v23)
   - clean-slate кэш (как в v22)
   - push-уведомления (Web Push VAPID)
   ========================================================== */

const CACHE_NAME = "nash-god-v23";

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
  "./icon.svg",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-maskable.svg",
  "./icon-maskable-192.png",
  "./icon-maskable-512.png",
  "./apple-touch-icon.png"
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

/* ---------- Web Push ---------- */
self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch (e) { data = { body: event.data && event.data.text ? event.data.text() : "" }; }
  const title = data.title || "Наш год";
  const options = {
    body: data.body || "Загляни в приложение ✨",
    icon: "./icon-192.png",
    badge: "./icon-192.png",
    tag: data.tag || "nashgod-daily",
    renotify: false,
    data: { url: data.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = (event.notification.data && event.notification.data.url) || "./";
  event.waitUntil((async () => {
    const allClients = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const c of allClients) {
      if (c.url.includes(self.registration.scope) && "focus" in c) return c.focus();
    }
    if (self.clients.openWindow) return self.clients.openWindow(url);
  })());
});