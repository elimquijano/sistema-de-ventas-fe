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
  getFirebaseToken,
  getPushAvailability,
  playForegroundNotificationSound,
  removeFirebaseToken,
  showForegroundPushNotification,
  subscribeToForegroundMessages,
} from "../services/firebaseMessaging";

const PushNotificationsContext = createContext(undefined);

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
  const pushEnabled =
    user?.notification_channel === "push" && Boolean(user?.has_fcm_token);
  const [saving, setSaving] = useState(false);
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

      updateUser({
        ...(responseUser || {}),
        notification_channel: "push",
        receive_notifications: true,
        has_fcm_token: true,
      });

      try {
        await refreshUser({ silent: true });
      } catch (refreshError) {
        console.warn("No se pudo refrescar el usuario después de activar push:", refreshError);
      }
    } catch (error) {
      if (firebaseToken) {
        await removeFirebaseToken().catch(() => {});
      }
      throw error;
    }
  }, [refreshUser, updateUser]);

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

    updateUser({
      notification_channel: "whatsapp",
      fcm_token: null,
      firebase_token: null,
      push_token: null,
      notification_token: null,
      device_token: null,
      has_fcm_token: false,
    });

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
    saving: saving || !availability.checked,
    togglePushNotifications,
  };

  return (
    <PushNotificationsContext.Provider value={value}>
      {children}
    </PushNotificationsContext.Provider>
  );
};
