import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { useAuth } from "./AuthContext";
import { notificationSettingsAPI } from "../utils/api";
import {
  getExistingFirebaseToken,
  getFirebaseToken,
  getPushAvailability,
  playForegroundNotificationSound,
  removeFirebaseToken,
  showForegroundPushNotification,
  subscribeToForegroundMessages,
} from "../services/firebaseMessaging";

const PushNotificationsContext = createContext(undefined);
const PUSH_DEVICE_USER_KEY = "push_notifications_registered_user_id";

const getUserPushToken = (user) =>
  user?.fcm_token ||
  user?.firebase_token ||
  user?.push_token ||
  user?.notification_token ||
  user?.device_token ||
  user?.notification_settings?.token ||
  user?.notification_setting?.token ||
  null;

const getUserNotificationChannel = (user) =>
  user?.notification_channel ||
  user?.notification_settings?.notification_channel ||
  user?.notification_settings?.channel ||
  user?.notification_setting?.notification_channel ||
  user?.notification_setting?.channel;

const getResponseUser = (response) =>
  response?.data?.user || response?.data?.data?.user || null;

export const usePushNotifications = () => {
  const context = useContext(PushNotificationsContext);
  if (context === undefined) {
    throw new Error(
      "usePushNotifications must be used within a PushNotificationsProvider",
    );
  }
  return context;
};

export const PushNotificationsProvider = ({ children }) => {
  const { user, updateUser, refreshUser } = useAuth();
  const [pushEnabled, setPushEnabled] = useState(false);
  const [saving, setSaving] = useState(false);
  const [checkingPushState, setCheckingPushState] = useState(true);
  const [availability, setAvailability] = useState({
    checked: false,
    available: false,
    reason: null,
  });

  useEffect(() => {
    let active = true;

    getPushAvailability().then((result) => {
      if (active) setAvailability({ checked: true, ...result });
    });

    return () => {
      active = false;
    };
  }, []);

  const backendPushToken = getUserPushToken(user);
  const backendUsesPush =
    getUserNotificationChannel(user) === "push" &&
    user?.receive_notifications !== false;

  useEffect(() => {
    if (!availability.checked) return undefined;

    if (!user || !availability.available || !backendUsesPush) {
      if (
        user &&
        localStorage.getItem(PUSH_DEVICE_USER_KEY) === String(user.id)
      ) {
        localStorage.removeItem(PUSH_DEVICE_USER_KEY);
      }
      setPushEnabled(false);
      setCheckingPushState(false);
      return undefined;
    }

    let active = true;
    setCheckingPushState(true);

    getExistingFirebaseToken()
      .then((localToken) => {
        if (!active) return;

        const deviceWasRegisteredHere =
          localStorage.getItem(PUSH_DEVICE_USER_KEY) === String(user.id);
        const tokenMatchesBackend =
          Boolean(backendPushToken) && backendPushToken === localToken;
        const enabledOnThisDevice =
          Boolean(localToken) &&
          (tokenMatchesBackend || (!backendPushToken && deviceWasRegisteredHere));

        if (tokenMatchesBackend && !deviceWasRegisteredHere) {
          localStorage.setItem(PUSH_DEVICE_USER_KEY, String(user.id));
        }

        if (backendPushToken && !tokenMatchesBackend && deviceWasRegisteredHere) {
          localStorage.removeItem(PUSH_DEVICE_USER_KEY);
        }

        setPushEnabled(enabledOnThisDevice);
      })
      .finally(() => {
        if (active) setCheckingPushState(false);
      });

    return () => {
      active = false;
    };
  }, [
    availability.available,
    availability.checked,
    backendPushToken,
    backendUsesPush,
    user,
  ]);

  const enablePushNotifications = useCallback(async () => {
    const currentAvailability = await getPushAvailability();
    setAvailability({ checked: true, ...currentAvailability });

    if (!currentAvailability.available) {
      const error = new Error(
        currentAvailability.reason === "insecure-context"
          ? "Las notificaciones push requieren HTTPS."
          : "Las notificaciones push no están disponibles en este navegador.",
      );
      error.code = currentAvailability.reason;
      throw error;
    }

    let firebaseToken;
    try {
      firebaseToken = await getFirebaseToken();
      const response = await notificationSettingsAPI.savePushToken(firebaseToken);
      const responseUser = getResponseUser(response);

      localStorage.setItem(PUSH_DEVICE_USER_KEY, String(user.id));

      updateUser({
        ...(responseUser || {}),
        notification_channel: "push",
        receive_notifications: true,
        has_push_token: true,
      });
      setPushEnabled(true);

      try {
        await refreshUser({ silent: true });
      } catch (refreshError) {
        console.warn("No se pudo refrescar el usuario después de activar push:", refreshError);
      }
    } catch (error) {
      if (firebaseToken) {
        await removeFirebaseToken().catch(() => {});
      }
      localStorage.removeItem(PUSH_DEVICE_USER_KEY);
      throw error;
    }
  }, [refreshUser, updateUser, user]);

  const disablePushNotifications = useCallback(async () => {
    await notificationSettingsAPI.deletePushToken();

    try {
      await removeFirebaseToken();
    } catch (error) {
      console.warn(
        "El token fue eliminado del backend, pero Firebase no pudo limpiarlo localmente:",
        error,
      );
    }

    localStorage.removeItem(PUSH_DEVICE_USER_KEY);

    updateUser({
      notification_channel: "whatsapp",
      fcm_token: null,
      firebase_token: null,
      push_token: null,
      notification_token: null,
      device_token: null,
      has_push_token: false,
    });
    setPushEnabled(false);

    try {
      await refreshUser({ silent: true });
    } catch (refreshError) {
      console.warn("No se pudo refrescar el usuario después de desactivar push:", refreshError);
    }
  }, [refreshUser, updateUser]);

  const togglePushNotifications = useCallback(
    async (enabled) => {
      if (saving || enabled === pushEnabled) return;

      setSaving(true);
      try {
        if (enabled) {
          await enablePushNotifications();
        } else {
          await disablePushNotifications();
        }
      } finally {
        setSaving(false);
      }
    },
    [disablePushNotifications, enablePushNotifications, pushEnabled, saving],
  );

  useEffect(() => {
    if (!user || !availability.available || !pushEnabled) return undefined;

    let unsubscribe = () => {};
    let active = true;

    subscribeToForegroundMessages((payload) => {
      showForegroundPushNotification(payload);
      playForegroundNotificationSound();
      window.dispatchEvent(new CustomEvent("push-notification-received"));
    })
      .then((listener) => {
        if (active) unsubscribe = listener;
        else listener();
      })
      .catch((error) => {
        console.warn(
          "No se pudo escuchar notificaciones en primer plano:",
          error,
        );
      });

    return () => {
      active = false;
      unsubscribe();
    };
  }, [availability.available, pushEnabled, user]);

  const value = {
    availabilityChecked: availability.checked,
    available: availability.available,
    unavailableReason: availability.reason,
    pushEnabled,
    saving: saving || checkingPushState,
    togglePushNotifications,
  };

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
};
