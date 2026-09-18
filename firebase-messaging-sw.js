importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDZHP6OomAJG7Wl3WogGIbsdKiMMnFh_gg",
  authDomain: "our-year-1082f.firebaseapp.com",
  projectId: "our-year-1082f",
  storageBucket: "our-year-1082f.firebasestorage.app",
  messagingSenderId: "520482809096",
  appId: "1:520482809096:web:db98f2d6e0124e43a138bd"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const { title, body, icon } = payload.notification || {};
  self.registration.showNotification(title || 'Наш год', {
    body: body || '',
    icon: icon || './icon-192.png',
    badge: './icon-192.png',
    data: payload.data || {}
  });
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});