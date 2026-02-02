/**
 * FCM Push Notification Service
 *
 * Handles Firebase Cloud Messaging push notifications for Phase 2.
 * Integrates with React Native Firebase and backend notification API.
 *
 * Features:
 * - Request notification permissions (iOS and Android)
 * - Token management and registration
 * - Foreground/background notification handling
 * - Redux integration for notification state
 *
 * Note: This service requires @react-native-firebase/messaging to be installed.
 * Install with: npm install @react-native-firebase/app @react-native-firebase/messaging
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import messaging from '@react-native-firebase/messaging';
import notifee, { AndroidImportance } from '@notifee/react-native';
import type { Notification } from '../../types/models.types';
import { registerDevice, unregisterDevice } from '../api/notificationsApi';
import type { Store } from '@reduxjs/toolkit';
import {
  setFcmToken,
  setPermissionGranted,
  addNotification,
  setError,
} from '../../store/slices/notificationsSlice';

/**
 * Permission status enum
 */
export enum NotificationPermission {
  AUTHORIZED = 1,
  DENIED = 0,
  NOT_DETERMINED = -1,
  PROVISIONAL = 2,
}

/**
 * Notification handler callback types
 */
export type NotificationHandler = (notification: Notification) => void;
export type TokenRefreshHandler = (token: string) => void;

/**
 * Remote message structure (mirrors Firebase RemoteMessage)
 */
interface RemoteMessage {
  messageId?: string;
  from?: string;
  data?: Record<string, string>;
  notification?: {
    title?: string;
    body?: string;
    android?: {
      channelId?: string;
      sound?: string;
    };
    ios?: {
      sound?: string;
    };
  };
  sentTime?: number;
}

/**
 * FCM Service Class
 *
 * Manages Firebase Cloud Messaging integration for push notifications.
 * This service is designed to work with @react-native-firebase/messaging.
 */
class FCMService {
  private messaging: any = null;
  private reduxStore: Store | null = null;
  private fcmToken: string | null = null;
  private permissionStatus: NotificationPermission = NotificationPermission.NOT_DETERMINED;
  private initialized = false;
  private unsubscribeTokenRefresh: (() => void) | null = null;
  private unsubscribeForeground: (() => void) | null = null;
  private unsubscribeBackground: (() => void) | null = null;
  private notificationHandlers: NotificationHandler[] = [];
  private openedHandlers: NotificationHandler[] = [];
  private tokenRefreshHandlers: TokenRefreshHandler[] = [];

  /**
   * Initialize FCM service with Redux store
   *
   * @param store - Redux store for dispatching actions
   */
  async initialize(store: Store): Promise<void> {
    if (this.initialized) {
      console.log('[FCM] Already initialized');
      return;
    }

    this.reduxStore = store;

    try {
      // Get Firebase Messaging instance
      this.messaging = messaging();

      console.log('[FCM] Initializing Firebase Cloud Messaging');

      // Create notification channel for Android
      if (Platform.OS === 'android') {
        await notifee.createChannel({
          id: 'sekar-notifications',
          name: 'SEKAR Notifications',
          importance: AndroidImportance.HIGH,
          sound: 'default',
        });
        console.log('[FCM] Notification channel created');
      }

      // Check permission status (don't request - PermissionManager handles that)
      const permission = await this.checkPermission();

      if (permission) {
        // Get and register token
        const token = await this.getToken();
        if (token) {
          await this.registerToken(token);
        }

        // Setup message handlers
        this.setupMessageHandlers();
        this.setupTokenRefreshListener();

        this.permissionStatus = NotificationPermission.AUTHORIZED;
      } else {
        console.log('[FCM] Permission not granted yet. Will initialize after permission is granted.');
        this.permissionStatus = NotificationPermission.DENIED;
      }

      this.initialized = true;
      console.log('[FCM] Initialization complete');
    } catch (error) {
      console.error('[FCM] Initialization failed:', error);
      console.warn('[FCM] Firebase Messaging not available. Install @react-native-firebase/messaging to enable push notifications.');

      // Dispatch error to Redux
      if (this.reduxStore) {
        this.reduxStore.dispatch(setError('Firebase Messaging tidak tersedia'));
      }
    }
  }

  /**
   * Request notification permission from user
   *
   * @returns Permission status
   */
  async requestPermission(): Promise<NotificationPermission> {
    if (!this.messaging) {
      console.warn('[FCM] Messaging not initialized');
      return NotificationPermission.DENIED;
    }

    try {
      console.log('[FCM] Requesting notification permission');

      const authStatus = await this.messaging.requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      this.permissionStatus = enabled
        ? NotificationPermission.AUTHORIZED
        : NotificationPermission.DENIED;

      // Update Redux state
      if (this.reduxStore) {
        this.reduxStore.dispatch(setPermissionGranted(enabled));
      }

      console.log('[FCM] Permission status:', enabled ? 'granted' : 'denied');

      return this.permissionStatus;
    } catch (error) {
      console.error('[FCM] Permission request failed:', error);
      this.permissionStatus = NotificationPermission.DENIED;

      if (this.reduxStore) {
        this.reduxStore.dispatch(setPermissionGranted(false));
      }

      return NotificationPermission.DENIED;
    }
  }

  /**
   * Get current FCM token
   *
   * @returns FCM token or null if unavailable
   */
  async getToken(): Promise<string | null> {
    if (!this.messaging) {
      console.warn('[FCM] Messaging not initialized');
      return null;
    }

    try {
      const token = await this.messaging.getToken();

      if (token) {
        this.fcmToken = token;

        // Update Redux state
        if (this.reduxStore) {
          this.reduxStore.dispatch(setFcmToken(token));
        }

        console.log('[FCM] Token retrieved:', token.substring(0, 20) + '...');
      }

      return token;
    } catch (error) {
      console.error('[FCM] Failed to get token:', error);
      return null;
    }
  }

  /**
   * Register FCM token with backend
   *
   * @param token - FCM token to register
   */
  async registerToken(token: string): Promise<boolean> {
    try {
      console.log('[FCM] Registering token with backend');

      const platform = Platform.OS as 'android' | 'ios';
      const deviceId = await DeviceInfo.getUniqueId();
      const deviceName = await DeviceInfo.getDeviceName();
      const deviceModel = await DeviceInfo.getModel();
      const appVersion = await DeviceInfo.getVersion();

      const response = await registerDevice({
        fcm_token: token,
        platform,
        device_id: deviceId,
        device_name: deviceName,
        device_model: deviceModel,
        app_version: appVersion,
      });

      if (response.error) {
        console.error('[FCM] Token registration failed:', response.error);
        return false;
      }

      console.log('[FCM] Token registered successfully');
      return true;
    } catch (error) {
      console.error('[FCM] Token registration error:', error);
      return false;
    }
  }

  /**
   * Unregister FCM token from backend
   *
   * @param token - FCM token to unregister
   */
  async unregisterToken(token?: string): Promise<boolean> {
    try {
      console.log('[FCM] Unregistering token from backend');

      const response = await unregisterDevice();

      if (response.error) {
        console.error('[FCM] Token unregistration failed:', response.error);
        return false;
      }

      // Clear local token
      this.fcmToken = null;

      if (this.reduxStore) {
        this.reduxStore.dispatch(setFcmToken(null));
      }

      console.log('[FCM] Token unregistered successfully');
      return true;
    } catch (error) {
      console.error('[FCM] Token unregistration error:', error);
      return false;
    }
  }

  /**
   * Setup token refresh listener
   */
  private setupTokenRefreshListener(): void {
    if (!this.messaging) {return;}

    console.log('[FCM] Setting up token refresh listener');

    this.unsubscribeTokenRefresh = this.messaging.onTokenRefresh(async (token: string) => {
      console.log('[FCM] Token refreshed:', token.substring(0, 20) + '...');

      this.fcmToken = token;

      // Update Redux state
      if (this.reduxStore) {
        this.reduxStore.dispatch(setFcmToken(token));
      }

      // Register new token with backend
      await this.registerToken(token);

      // Notify handlers
      this.tokenRefreshHandlers.forEach(handler => handler(token));
    });
  }

  /**
   * Setup message handlers for foreground and background notifications
   */
  private setupMessageHandlers(): void {
    if (!this.messaging) {return;}

    console.log('[FCM] Setting up message handlers');

    // Foreground message handler
    this.unsubscribeForeground = this.messaging.onMessage(
      async (remoteMessage: RemoteMessage) => {
        console.log('[FCM] Foreground notification received:', remoteMessage);

        const notification = this.convertToNotification(remoteMessage);

        // Display notification in system tray when app is in foreground
        try {
          await notifee.displayNotification({
            title: remoteMessage.notification?.title || 'SEKAR',
            body: remoteMessage.notification?.body || '',
            android: {
              channelId: 'sekar-notifications',
              smallIcon: 'ic_launcher',
              pressAction: {
                id: 'default',
              },
            },
            data: remoteMessage.data,
          });
          console.log('[FCM] Foreground notification displayed in tray');
        } catch (error) {
          console.warn('[FCM] Failed to display foreground notification:', error);
        }

        // Dispatch to Redux
        if (this.reduxStore) {
          this.reduxStore.dispatch(addNotification(notification));
        }

        // Notify handlers
        this.notificationHandlers.forEach(handler => handler(notification));
      }
    );

    // Background message handler is set in index.js before app registration
    // See index.js for the setBackgroundMessageHandler implementation
  }

  /**
   * Add listener for foreground notifications
   *
   * @param handler - Callback function to handle notification
   * @returns Unsubscribe function
   */
  onNotificationReceived(handler: NotificationHandler): () => void {
    this.notificationHandlers.push(handler);

    return () => {
      const index = this.notificationHandlers.indexOf(handler);
      if (index > -1) {
        this.notificationHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Add listener for notification tap (app opened from notification)
   *
   * @param handler - Callback function to handle notification tap
   * @returns Unsubscribe function
   */
  onNotificationOpened(handler: NotificationHandler): () => void {
    if (!this.messaging) {
      console.warn('[FCM] Messaging not initialized');
      return () => {};
    }

    this.openedHandlers.push(handler);

    // Listen for notification that opened the app from background/quit state
    const unsubscribe = this.messaging.onNotificationOpenedApp(
      async (remoteMessage: RemoteMessage) => {
        console.log('[FCM] Notification opened app:', remoteMessage);

        const notification = this.convertToNotification(remoteMessage);

        // Notify all handlers
        this.openedHandlers.forEach(h => h(notification));
      }
    );

    return () => {
      const index = this.openedHandlers.indexOf(handler);
      if (index > -1) {
        this.openedHandlers.splice(index, 1);
      }
      unsubscribe();
    };
  }

  /**
   * Get notification that opened the app from quit state
   *
   * @returns Initial notification or null
   */
  async getInitialNotification(): Promise<Notification | null> {
    if (!this.messaging) {
      console.warn('[FCM] Messaging not initialized');
      return null;
    }

    try {
      const remoteMessage = await this.messaging.getInitialNotification();

      if (remoteMessage) {
        console.log('[FCM] Initial notification:', remoteMessage);
        return this.convertToNotification(remoteMessage);
      }

      return null;
    } catch (error) {
      console.error('[FCM] Failed to get initial notification:', error);
      return null;
    }
  }

  /**
   * Add listener for token refresh events
   *
   * @param handler - Callback function to handle token refresh
   * @returns Unsubscribe function
   */
  onTokenRefresh(handler: TokenRefreshHandler): () => void {
    this.tokenRefreshHandlers.push(handler);

    return () => {
      const index = this.tokenRefreshHandlers.indexOf(handler);
      if (index > -1) {
        this.tokenRefreshHandlers.splice(index, 1);
      }
    };
  }

  /**
   * Convert Firebase RemoteMessage to app Notification format
   *
   * @param remoteMessage - Firebase remote message
   * @returns Notification object
   */
  private convertToNotification(remoteMessage: RemoteMessage): Notification {
    const now = new Date().toISOString();

    return {
      id: remoteMessage.messageId || `local_${Date.now()}`,
      user_id: '', // Will be set by backend when stored
      title: remoteMessage.notification?.title || 'Notifikasi Baru',
      body: remoteMessage.notification?.body || '',
      type: remoteMessage.data?.type || 'general',
      data: remoteMessage.data as Record<string, any> | undefined,
      read: false,
      created_at: remoteMessage.sentTime
        ? new Date(remoteMessage.sentTime).toISOString()
        : now,
    };
  }

  /**
   * Check if permission is granted
   *
   * @returns True if permission is granted
   */
  async checkPermission(): Promise<boolean> {
    if (!this.messaging) {
      return false;
    }

    try {
      const authStatus = await this.messaging.hasPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      this.permissionStatus = enabled
        ? NotificationPermission.AUTHORIZED
        : NotificationPermission.DENIED;

      return enabled;
    } catch (error) {
      console.error('[FCM] Permission check failed:', error);
      return false;
    }
  }

  /**
   * Public method to setup notification handlers (called from App.tsx)
   * This is a no-op since handlers are already set up in initialize()
   */
  setupNotificationHandlers(): void {
    if (!this.initialized) {
      console.warn('[FCM] Service not initialized yet');
      return;
    }

    if (!this.messaging) {
      console.warn('[FCM] Messaging not available');
      return;
    }

    console.log('[FCM] Notification handlers are already set up');
  }

  /**
   * Get current token without requesting new one
   *
   * @returns Current FCM token or null
   */
  getCurrentToken(): string | null {
    return this.fcmToken;
  }

  /**
   * Get current permission status
   *
   * @returns Permission status
   */
  getPermissionStatus(): NotificationPermission {
    return this.permissionStatus;
  }

  /**
   * Delete FCM token
   */
  async deleteToken(): Promise<boolean> {
    if (!this.messaging) {
      console.warn('[FCM] Messaging not initialized');
      return false;
    }

    try {
      console.log('[FCM] Deleting token');

      await this.messaging.deleteToken();
      this.fcmToken = null;

      if (this.reduxStore) {
        this.reduxStore.dispatch(setFcmToken(null));
      }

      console.log('[FCM] Token deleted successfully');
      return true;
    } catch (error) {
      console.error('[FCM] Failed to delete token:', error);
      return false;
    }
  }

  /**
   * Cleanup and remove all listeners
   */
  cleanup(): void {
    console.log('[FCM] Cleaning up service');

    if (this.unsubscribeTokenRefresh) {
      this.unsubscribeTokenRefresh();
      this.unsubscribeTokenRefresh = null;
    }

    if (this.unsubscribeForeground) {
      this.unsubscribeForeground();
      this.unsubscribeForeground = null;
    }

    this.notificationHandlers = [];
    this.openedHandlers = [];
    this.tokenRefreshHandlers = [];
    this.initialized = false;
  }
}

/**
 * Singleton instance
 */
const fcmService = new FCMService();

export default fcmService;
