// Service Worker for Lâm Gia PWA - Native Push Notifications

self.addEventListener("install", (event) => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

// Lắng nghe sự kiện Push Notification từ Server (Node.js web-push)
self.addEventListener("push", (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = { title: "Thông báo Gia đình", body: event.data.text() };
    }
  }

  const title = data.title || "Lâm Gia";
  const options = {
    body: data.body || "Bạn có thông báo mới từ gia đình",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    vibrate:
      data.priority === "urgent" ? [300, 100, 300, 100, 300] : [100, 50, 100],
    tag: data.tag || "family-notification",
    data: { url: data.url || "/" },
    renotify: true,
    requireInteraction: data.priority === "urgent", // Giữ thông báo trên màn hình nếu là SOS/Khẩn
    actions:
      data.priority === "urgent"
        ? [{ action: "open", title: "🚨 Xem ngay" }]
        : [],
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Xử lý khi người dùng click vào thông báo trên màn hình khóa/thanh notification
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const urlToOpen = event.notification.data ? event.notification.data.url : "/";

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (let client of windowClients) {
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
