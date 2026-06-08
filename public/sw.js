// RentFlow Service Worker for Push Notifications

self.addEventListener("push", function (event) {
  if (!event.data) return;

  const data = event.data.json();
  
  const options = {
    body: data.body || "You have a new notification",
    icon: "/pwa-192x192.png",
    badge: "/pwa-192x192.png",
    vibrate: [100, 50, 100],
    data: {
      url: data.url || "/",
      ...data.data,
    },
    actions: data.actions || [],
    tag: data.tag || "rentflow-notification",
    renotify: true,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || "RentFlow", options)
  );
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data?.url || "/";

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(function (clientList) {
      // Check if there's already a window open
      for (const client of clientList) {
        if (client.url.includes(self.registration.scope) && "focus" in client) {
          client.focus();
          if (urlToOpen !== "/") {
            client.navigate(urlToOpen);
          }
          return;
        }
      }
      // Open a new window if none found
      if (clients.openWindow) {
        return clients.openWindow(urlToOpen);
      }
    })
  );
});

// Handle notification close
self.addEventListener("notificationclose", function (event) {
  console.log("Notification closed:", event.notification.tag);
});
