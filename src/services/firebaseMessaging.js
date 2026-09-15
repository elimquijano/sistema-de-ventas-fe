const FIREBASE_CONFIG_KEYS = [
  "apiKey",
  "authDomain",
  "projectId",
  "storageBucket",
  "messagingSenderId",
  "appId",
];

const getFirebaseConfig = () => ({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
});

const getVapidKey = () => process.env.REACT_APP_FIREBASE_VAPID_KEY;

const hasFirebaseConfig = () => {
  if (typeof window === "undefined") return false;
  const config = getFirebaseConfig();
  return FIREBASE_CONFIG_KEYS.every((key) => Boolean(config[key])) && Boolean(getVapidKey());
};

export class PushNotificationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = "PushNotificationError";
    this.code = code;
  }
}

export const getPushAvailability = async () => {
  if (typeof window === "undefined") {
    return { available: false, reason: "server-rendering" };
  }

  if (!window.isSecureContext) {
    return { available: false, reason: "insecure-context" };
  }

  if (
    !("Notification" in window) ||
    !("serviceWorker" in navigator) ||
    !("PushManager" in window)
  ) {
    return { available: false, reason: "unsupported-browser" };
  }

  if (!hasFirebaseConfig()) {
    return { available: false, reason: "missing-configuration" };
  }

  try {
    const { isSupported } = await import("firebase/messaging");
    return (await isSupported())
      ? { available: true, reason: null }
      : { available: false, reason: "unsupported-browser" };
  } catch (error) {
    console.warn("Firebase Messaging no está disponible:", error);
    return { available: false, reason: "unsupported-browser" };
  }
};

let firebaseAppPromise;

const getFirebaseApp = async () => {
  if (!firebaseAppPromise) {
    firebaseAppPromise = import("firebase/app").then(
      ({ getApp, getApps, initializeApp }) =>
        getApps().length ? getApp() : initializeApp(getFirebaseConfig()),
    );
  }

  return firebaseAppPromise;
};

const getMessagingInstance = async () => {
  const availability = await getPushAvailability();
  if (!availability.available) {
    throw new PushNotificationError(
      availability.reason,
      "Las notificaciones push no están disponibles en este entorno.",
    );
  }

  const [{ getMessaging }, app] = await Promise.all([
    import("firebase/messaging"),
    getFirebaseApp(),
  ]);

  return getMessaging(app);
};

const registerMessagingServiceWorker = async () => {
  const publicPath = (process.env.PUBLIC_URL || "").replace(/\/$/, "");
  const serviceWorkerUrl = new URL(
    `${publicPath}/firebase-messaging-sw.js`,
    window.location.origin,
  );

  serviceWorkerUrl.searchParams.set(
    "firebaseConfig",
    JSON.stringify(getFirebaseConfig()),
  );

  return navigator.serviceWorker.register(serviceWorkerUrl.toString());
};

const retrieveFirebaseToken = async () => {
  const messaging = await getMessagingInstance();

  const [{ getToken }, serviceWorkerRegistration] = await Promise.all([
    import("firebase/messaging"),
    registerMessagingServiceWorker(),
  ]);

  const token = await getToken(messaging, {
    vapidKey: getVapidKey(),
    serviceWorkerRegistration,
  });

  if (!token) {
    throw new PushNotificationError(
      "missing-token",
      "Firebase no devolvió un token para este navegador.",
    );
  }

  return token;
};

export const getFirebaseToken = async () => {
  const availability = await getPushAvailability();
  if (!availability.available) {
    throw new PushNotificationError(
      availability.reason,
      "Las notificaciones push no están disponibles en este entorno.",
    );
  }

  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    throw new PushNotificationError(
      "permission-denied",
      "El navegador no tiene permiso para mostrar notificaciones.",
    );
  }

  return retrieveFirebaseToken();
};

export const getExistingFirebaseToken = async () => {
  const availability = await getPushAvailability();
  if (!availability.available || Notification.permission !== "granted") {
    return null;
  }

  try {
    return await retrieveFirebaseToken();
  } catch (error) {
    console.warn("No se pudo recuperar el token local de Firebase:", error);
    return null;
  }
};

export const removeFirebaseToken = async () => {
  const availability = await getPushAvailability();
  if (!availability.available) return false;

  const [messaging, { deleteToken }] = await Promise.all([
    getMessagingInstance(),
    import("firebase/messaging"),
  ]);

  return deleteToken(messaging);
};

export const subscribeToForegroundMessages = async (callback) => {
  const availability = await getPushAvailability();
  if (!availability.available || Notification.permission !== "granted") {
    return () => {};
  }

  const [messaging, { onMessage }] = await Promise.all([
    getMessagingInstance(),
    import("firebase/messaging"),
  ]);

  return onMessage(messaging, callback);
};

export const showForegroundPushNotification = async (payload) => {
  if (!("Notification" in window) || Notification.permission !== "granted") {
    return;
  }

  const title = payload.notification?.title || payload.data?.title || "Stock Master";
  const body = payload.notification?.body || payload.data?.body || "Tienes una nueva notificación.";
  const targetUrl =
    payload.fcmOptions?.link ||
    payload.data?.url ||
    payload.data?.link ||
    "/dashboard/notifications";

  const options = {
    body,
    icon: payload.notification?.icon || payload.data?.icon || "/logo.png",
    tag: payload.data?.notification_id || payload.messageId,
    data: { url: targetUrl },
  };

  try {
    const notification = new Notification(title, options);

    notification.onclick = () => {
      window.focus();
      try {
        const url = new URL(targetUrl, window.location.origin);
        if (url.origin === window.location.origin) window.location.assign(url.href);
      } catch (error) {
        console.warn("No se pudo abrir el enlace de la notificación:", error);
      }
      notification.close();
    };
  } catch (error) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.showNotification(title, options);
    } catch (serviceWorkerError) {
      console.warn(
        "No se pudo mostrar la notificación en primer plano:",
        serviceWorkerError,
      );
    }
  }
};

export const playForegroundNotificationSound = () => {
  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;

    const context = new AudioContext();
    const gain = context.createGain();
    gain.connect(context.destination);
    gain.gain.setValueAtTime(0.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.16, context.currentTime + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.45);

    [659.25, 783.99].forEach((frequency, index) => {
      const oscillator = context.createOscillator();
      oscillator.type = "sine";
      oscillator.frequency.value = frequency;
      oscillator.connect(gain);
      oscillator.start(context.currentTime + index * 0.12);
      oscillator.stop(context.currentTime + 0.32 + index * 0.12);
    });

    window.setTimeout(() => context.close().catch(() => {}), 700);
  } catch (error) {
    console.warn("El navegador bloqueó el sonido de la notificación:", error);
  }
};

export const getPushErrorMessage = (error) => {
  if (error?.code === "permission-denied") {
    return "Debes permitir las notificaciones en la configuración del navegador.";
  }

  if (error?.code === "insecure-context") {
    return "Las notificaciones push requieren HTTPS.";
  }

  return (
    error?.response?.data?.message ||
    error?.message ||
    "No se pudo actualizar las notificaciones push."
  );
};
