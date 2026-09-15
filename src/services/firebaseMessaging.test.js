import { getPushAvailability } from "./firebaseMessaging";

const FIREBASE_ENV_KEYS = [
  "REACT_APP_FIREBASE_API_KEY",
  "REACT_APP_FIREBASE_AUTH_DOMAIN",
  "REACT_APP_FIREBASE_PROJECT_ID",
  "REACT_APP_FIREBASE_STORAGE_BUCKET",
  "REACT_APP_FIREBASE_MESSAGING_SENDER_ID",
  "REACT_APP_FIREBASE_APP_ID",
  "REACT_APP_FIREBASE_VAPID_KEY",
];

describe("Firebase Messaging availability", () => {
  const originalSecureContext = window.isSecureContext;
  const originalNotification = window.Notification;
  const originalPushManager = window.PushManager;
  const originalServiceWorker = navigator.serviceWorker;
  const originalFirebaseEnvironment = Object.fromEntries(
    FIREBASE_ENV_KEYS.map((key) => [key, process.env[key]]),
  );

  afterEach(() => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: originalSecureContext,
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: originalNotification,
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: originalPushManager,
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: originalServiceWorker,
    });
    FIREBASE_ENV_KEYS.forEach((key) => {
      if (originalFirebaseEnvironment[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalFirebaseEnvironment[key];
      }
    });
  });

  test("disables push silently on an insecure HTTP context", async () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: false,
    });

    await expect(getPushAvailability()).resolves.toEqual({
      available: false,
      reason: "insecure-context",
    });
  });

  test("disables push when Firebase has not been configured", async () => {
    Object.defineProperty(window, "isSecureContext", {
      configurable: true,
      value: true,
    });
    Object.defineProperty(window, "Notification", {
      configurable: true,
      value: function Notification() {},
    });
    Object.defineProperty(window, "PushManager", {
      configurable: true,
      value: function PushManager() {},
    });
    Object.defineProperty(navigator, "serviceWorker", {
      configurable: true,
      value: {},
    });
    FIREBASE_ENV_KEYS.forEach((key) => {
      process.env[key] = "";
    });

    await expect(getPushAvailability()).resolves.toEqual({
      available: false,
      reason: "missing-configuration",
    });
  });
});
