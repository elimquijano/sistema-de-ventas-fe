import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import { useAuth } from "./AuthContext";
import {
  PushNotificationsProvider,
  usePushNotifications,
} from "./PushNotificationsContext";
import { notificationSettingsAPI } from "../utils/api";
import {
  getExistingFirebaseToken,
  getFirebaseToken,
  getPushAvailability,
  removeFirebaseToken,
  subscribeToForegroundMessages,
} from "../services/firebaseMessaging";

jest.mock("./AuthContext", () => ({ useAuth: jest.fn() }));
jest.mock("../utils/api", () => ({
  notificationSettingsAPI: {
    savePushToken: jest.fn(),
    deletePushToken: jest.fn(),
  },
}));
jest.mock("../services/firebaseMessaging", () => ({
  getExistingFirebaseToken: jest.fn(),
  getFirebaseToken: jest.fn(),
  getPushAvailability: jest.fn(),
  removeFirebaseToken: jest.fn(),
  subscribeToForegroundMessages: jest.fn(),
}));

const PushState = () => {
  const { pushEnabled, saving } = usePushNotifications();
  return (
    <input
      aria-label="Push"
      type="checkbox"
      checked={pushEnabled}
      disabled={saving}
      readOnly
    />
  );
};

beforeEach(() => {
  jest.clearAllMocks();
  getPushAvailability.mockResolvedValue({ available: true, reason: null });
  subscribeToForegroundMessages.mockResolvedValue(() => {});
});

test.each([
  ["push", true, false, true],
  ["push", true, true, true],
  ["push", false, true, false],
  ["whatsapp", true, true, false],
  ["push", undefined, true, false],
])(
  "channel=%s, has_fcm_token=%s, receive_notifications=%s => push=%s",
  async (channel, hasToken, receiveNotifications, expected) => {
    useAuth.mockReturnValue({
      user: {
        id: 1,
        notification_channel: channel,
        has_fcm_token: hasToken,
        receive_notifications: receiveNotifications,
      },
    });
    render(
      <PushNotificationsProvider>
        <PushState />
      </PushNotificationsProvider>,
    );

    await waitFor(() => expect(screen.getByRole("checkbox").disabled).toBe(false));
    expect(screen.getByRole("checkbox").checked).toBe(expected);
    expect(getExistingFirebaseToken).not.toHaveBeenCalled();
    expect(getFirebaseToken).not.toHaveBeenCalled();
    expect(removeFirebaseToken).not.toHaveBeenCalled();
    expect(notificationSettingsAPI.savePushToken).not.toHaveBeenCalled();
    expect(notificationSettingsAPI.deletePushToken).not.toHaveBeenCalled();
  },
);

test("the toggle follows refreshed user data without a local device marker", async () => {
  const auth = {
    user: { id: 1, notification_channel: "push", has_fcm_token: true },
  };
  useAuth.mockImplementation(() => auth);
  const content = (
    <PushNotificationsProvider>
      <PushState />
    </PushNotificationsProvider>
  );
  const { rerender } = render(content);
  await waitFor(() => expect(screen.getByRole("checkbox").disabled).toBe(false));
  expect(screen.getByRole("checkbox").checked).toBe(true);

  auth.user = { ...auth.user, has_fcm_token: false };
  rerender(
    <PushNotificationsProvider>
      <PushState />
    </PushNotificationsProvider>,
  );
  expect(screen.getByRole("checkbox").checked).toBe(false);
  expect(removeFirebaseToken).not.toHaveBeenCalled();
  expect(notificationSettingsAPI.deletePushToken).not.toHaveBeenCalled();
});
