/**
 * Notifications Slice
 * Notification state management
 * Phase 2 feature
 */

import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { Notification } from '../../types/models.types';

interface NotificationsState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  fcmToken: string | null;
  permissionGranted: boolean;
}

const initialState: NotificationsState = {
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  error: null,
  fcmToken: null,
  permissionGranted: false,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.isLoading = action.payload;
    },

    setNotifications: (state, action: PayloadAction<Notification[]>) => {
      state.notifications = action.payload;
      state.unreadCount = action.payload.filter((n) => !n.read).length;
      state.isLoading = false;
      state.error = null;
    },

    addNotification: (state, action: PayloadAction<Notification>) => {
      // Add to the beginning of the list
      state.notifications.unshift(action.payload);
      if (!action.payload.read) {
        state.unreadCount += 1;
      }
    },

    markAsRead: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification && !notification.read) {
        notification.read = true;
        notification.read_at = new Date().toISOString();
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
    },

    markAllAsRead: (state) => {
      const now = new Date().toISOString();
      state.notifications.forEach((notification) => {
        if (!notification.read) {
          notification.read = true;
          notification.read_at = now;
        }
      });
      state.unreadCount = 0;
    },

    removeNotification: (state, action: PayloadAction<string>) => {
      const notification = state.notifications.find(
        (n) => n.id === action.payload
      );
      if (notification && !notification.read) {
        state.unreadCount = Math.max(0, state.unreadCount - 1);
      }
      state.notifications = state.notifications.filter(
        (n) => n.id !== action.payload
      );
    },

    setFcmToken: (state, action: PayloadAction<string | null>) => {
      state.fcmToken = action.payload;
    },

    setPermissionGranted: (state, action: PayloadAction<boolean>) => {
      state.permissionGranted = action.payload;
    },

    setError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.isLoading = false;
    },

    clearError: (state) => {
      state.error = null;
    },

    clearNotifications: (state) => {
      state.notifications = [];
      state.unreadCount = 0;
    },

    resetState: () => initialState,
  },
});

export const {
  setLoading,
  setNotifications,
  addNotification,
  markAsRead,
  markAllAsRead,
  removeNotification,
  setFcmToken,
  setPermissionGranted,
  setError,
  clearError,
  clearNotifications,
  resetState,
} = notificationsSlice.actions;

// Selectors
export const selectAllNotifications = (state: {
  notifications: NotificationsState;
}) => state.notifications.notifications;

export const selectUnreadNotifications = (state: {
  notifications: NotificationsState;
}) => state.notifications.notifications.filter((n) => !n.read);

export const selectUnreadCount = (state: {
  notifications: NotificationsState;
}) => state.notifications.unreadCount;

export const selectNotificationsLoading = (state: {
  notifications: NotificationsState;
}) => state.notifications.isLoading;

export const selectNotificationsError = (state: {
  notifications: NotificationsState;
}) => state.notifications.error;

export const selectFcmToken = (state: { notifications: NotificationsState }) =>
  state.notifications.fcmToken;

export const selectPermissionGranted = (state: {
  notifications: NotificationsState;
}) => state.notifications.permissionGranted;

export default notificationsSlice.reducer;
