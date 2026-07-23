import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from "react";
import { notificationsAPI } from "../utils/api";
import { useAuth } from "./AuthContext";

const NotificationContext = createContext(undefined);

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { isAuthenticated } = useAuth();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [hasMoreNotifications, setHasMoreNotifications] = useState(false);
  const lastFetchParams = useRef({ unread: true });

  const fetchNotifications = useCallback(async (params) => {
    if (!isAuthenticated) return;
    const requestParams = params || lastFetchParams.current;
    if (params) lastFetchParams.current = params;
    setLoading(true);
    try {
      const response = await notificationsAPI.getAll(requestParams);
      const items = response.data.data || [];
      setNotifications(items);
      if (requestParams.per_page) {
        const total = Number(response.data.total);
        setHasMoreNotifications(
          Number.isFinite(total)
            ? items.length < total
            : Boolean(response.data.next_page_url) || items.length >= Number(requestParams.per_page)
        );
      }
      // Also fetch unread count to be sure
      const countRes = await notificationsAPI.getUnreadCount();
      setUnreadCount(countRes.data.unread_count || 0);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const markAsRead = async (id) => {
    try {
      await notificationsAPI.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read_at: new Date().toISOString() } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch (error) {
      console.error("Error marking notification as read:", error);
    }
  };

  const markAllAsRead = async () => {
    try {
      await notificationsAPI.markAllAsRead();
      setNotifications((prev) =>
        prev.map((n) => ({ ...n, read_at: new Date().toISOString() }))
      );
      setUnreadCount(0);
    } catch (error) {
      console.error("Error marking all notifications as read:", error);
    }
  };

  const deleteNotification = async (id) => {
    try {
      await notificationsAPI.delete(id);
      const deletedWasUnread = !notifications.find(n => n.id === id)?.read_at;
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (deletedWasUnread) {
        setUnreadCount((prev) => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error("Error deleting notification:", error);
    }
  };

  // Poll for notifications every 2 minutes if authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      const interval = setInterval(() => {
        fetchNotifications();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, fetchNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    hasMoreNotifications,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
