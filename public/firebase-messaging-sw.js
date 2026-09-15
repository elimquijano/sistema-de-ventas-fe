self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const message = event.notification.data?.FCM_MSG;
  const target =
    event.notification.data?.url ||
    message?.fcmOptions?.link ||
    message?.data?.url ||
    message?.data?.link ||
    "/dashboard/notifications";

  event.waitUntil((async () => {
    const targetUrl = new URL(target, self.location.origin);
    if (targetUrl.origin !== self.location.origin) return;

    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    const existingWindow = windows.find((client) => client.url.startsWith(self.location.origin));

    if (existingWindow) {
      await existingWindow.focus();
      existingWindow.navigate(targetUrl.href);
      return;
    }

    await clients.openWindow(targetUrl.href);
  })());
});

const params = new URL(self.location.href).searchParams;
const firebaseConfigValue = params.get("firebaseConfig");

if (firebaseConfigValue) {
  try {
    const firebaseConfig = JSON.parse(firebaseConfigValue);

    importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-app-compat.js");
    importScripts("https://www.gstatic.com/firebasejs/12.19.0/firebase-messaging-compat.js");

    firebase.initializeApp(firebaseConfig);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      // Los mensajes con `notification` ya son mostrados automáticamente por FCM.
      if (payload.notification) return;

      const title = payload.data?.title || "Stock Master";
      const options = {
        body: payload.data?.body || "Tienes una nueva notificación.",
        icon: payload.data?.icon || "/logo.png",
        tag: payload.data?.notification_id || payload.messageId,
        data: {
          url: payload.data?.url || payload.data?.link || "/dashboard/notifications",
        },
      };

      self.registration.showNotification(title, options);
    });
  } catch (error) {
    console.warn("Firebase Messaging no pudo iniciarse en segundo plano:", error);
  }
}
