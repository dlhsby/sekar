/**
 * FCM Service Tests
 */

import { Platform } from 'react-native';
import DeviceInfo from 'react-native-device-info';
import fcmService, { NotificationPermission } from '../fcmService';
import * as notificationsApi from '../../api/notificationsApi';
import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from '../../../store/slices/notificationsSlice';

// Import mocked Firebase messaging
import messaging from '@react-native-firebase/messaging';

// Mock dependencies
jest.mock('react-native-device-info');
jest.mock('../../api/notificationsApi');

const mockDeviceInfo = DeviceInfo as jest.Mocked<typeof DeviceInfo>;
const mockNotificationsApi = notificationsApi as jest.Mocked<typeof notificationsApi>;

// Create a mock messaging instance that will be reused
const createMockMessaging = () => ({
  requestPermission: jest.fn(() => Promise.resolve(1)),
  hasPermission: jest.fn(() => Promise.resolve(1)),
  getToken: jest.fn(() => Promise.resolve('mock-fcm-token')),
  deleteToken: jest.fn(() => Promise.resolve()),
  onTokenRefresh: jest.fn(() => jest.fn()),
  onMessage: jest.fn(() => jest.fn()),
  setBackgroundMessageHandler: jest.fn(),
  onNotificationOpenedApp: jest.fn(() => jest.fn()),
  getInitialNotification: jest.fn(() => Promise.resolve(null)),
  AuthorizationStatus: {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
    PROVISIONAL: 2,
  },
});

describe('fcmService', () => {
  let store: ReturnType<typeof configureStore>;
  let mockMessaging: ReturnType<typeof createMockMessaging>;

  beforeEach(() => {
    jest.clearAllMocks();

    // Create mock store
    store = configureStore({
      reducer: {
        notifications: notificationsReducer,
      },
    });

    // Create fresh mock messaging instance
    mockMessaging = createMockMessaging();

    // Mock DeviceInfo
    mockDeviceInfo.getUniqueId.mockResolvedValue('device-123');

    // Mock API responses
    mockNotificationsApi.registerDevice.mockResolvedValue({
      data: { success: true },
    });
    mockNotificationsApi.unregisterDevice.mockResolvedValue({
      data: { success: true },
    });

    // Reset service state and inject mock messaging
    (fcmService as any).initialized = false;
    (fcmService as any).fcmToken = null;
    (fcmService as any).permissionStatus = NotificationPermission.NOT_DETERMINED;
    (fcmService as any).messaging = mockMessaging;
    (fcmService as any).reduxStore = store;
  });

  afterEach(() => {
    fcmService.cleanup();
  });

  describe('initialize', () => {
    it('requests permission when messaging is available', async () => {
      (fcmService as any).initialized = false;
      mockMessaging.requestPermission.mockResolvedValue(1); // AUTHORIZED
      mockMessaging.getToken.mockResolvedValue('fcm-token-123');

      await fcmService.requestPermission();
      await fcmService.getToken();
      await fcmService.registerToken('fcm-token-123');

      expect(mockMessaging.requestPermission).toHaveBeenCalled();
      expect(mockMessaging.getToken).toHaveBeenCalled();
      expect(mockNotificationsApi.registerDevice).toHaveBeenCalledWith({
        fcm_token: 'fcm-token-123',
        device_id: 'device-123',
        platform: Platform.OS,
      });
    });

    it('handles permission denied gracefully', async () => {
      mockMessaging.requestPermission.mockResolvedValue(0); // DENIED

      const permission = await fcmService.requestPermission();

      expect(permission).toBe(NotificationPermission.DENIED);
      expect(store.getState().notifications.permissionGranted).toBe(false);
    });

    it('handles provisional permission (iOS)', async () => {
      mockMessaging.requestPermission.mockResolvedValue(2); // PROVISIONAL

      const permission = await fcmService.requestPermission();

      expect(permission).toBe(NotificationPermission.AUTHORIZED);
      expect(store.getState().notifications.permissionGranted).toBe(true);
    });
  });

  describe('requestPermission', () => {
    it('requests and grants permission', async () => {
      mockMessaging.requestPermission.mockResolvedValue(1);

      const result = await fcmService.requestPermission();

      expect(mockMessaging.requestPermission).toHaveBeenCalled();
      expect(result).toBe(NotificationPermission.AUTHORIZED);
      expect(store.getState().notifications.permissionGranted).toBe(true);
    });

    it('handles permission denial', async () => {
      mockMessaging.requestPermission.mockResolvedValue(0);

      const result = await fcmService.requestPermission();

      expect(result).toBe(NotificationPermission.DENIED);
      expect(store.getState().notifications.permissionGranted).toBe(false);
    });

    it('handles permission error', async () => {
      mockMessaging.requestPermission.mockRejectedValue(new Error('Permission error'));

      const result = await fcmService.requestPermission();

      expect(result).toBe(NotificationPermission.DENIED);
    });

    it('returns DENIED when messaging not initialized', async () => {
      (fcmService as any).messaging = null;

      const result = await fcmService.requestPermission();

      expect(result).toBe(NotificationPermission.DENIED);
    });
  });

  describe('getToken', () => {
    it('gets FCM token', async () => {
      const token = 'fcm-token-new';
      mockMessaging.getToken.mockResolvedValue(token);

      const result = await fcmService.getToken();

      expect(mockMessaging.getToken).toHaveBeenCalled();
      expect(result).toBe(token);
      expect(store.getState().notifications.fcmToken).toBe(token);
    });

    it('handles token retrieval failure', async () => {
      mockMessaging.getToken.mockRejectedValue(new Error('Token error'));

      const result = await fcmService.getToken();

      expect(result).toBeNull();
    });

    it('returns null when no token available', async () => {
      mockMessaging.getToken.mockResolvedValue(null);

      const result = await fcmService.getToken();

      expect(result).toBeNull();
    });

    it('returns null when messaging not initialized', async () => {
      (fcmService as any).messaging = null;

      const result = await fcmService.getToken();

      expect(result).toBeNull();
    });
  });

  describe('registerToken', () => {
    it('registers token with backend', async () => {
      const token = 'fcm-token-123';

      const result = await fcmService.registerToken(token);

      expect(mockNotificationsApi.registerDevice).toHaveBeenCalledWith({
        fcm_token: token,
        device_id: 'device-123',
        platform: Platform.OS,
      });
      expect(result).toBe(true);
    });

    it('handles registration failure', async () => {
      mockNotificationsApi.registerDevice.mockResolvedValue({
        error: 'Registration failed',
      });

      const result = await fcmService.registerToken('token');

      expect(result).toBe(false);
    });

    it('handles registration error', async () => {
      mockNotificationsApi.registerDevice.mockRejectedValue(
        new Error('Network error')
      );

      const result = await fcmService.registerToken('token');

      expect(result).toBe(false);
    });
  });

  describe('unregisterToken', () => {
    it('unregisters token from backend', async () => {
      // Set a token first
      (fcmService as any).fcmToken = 'test-token';

      const result = await fcmService.unregisterToken();

      expect(mockNotificationsApi.unregisterDevice).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(store.getState().notifications.fcmToken).toBeNull();
    });

    it('handles unregistration failure', async () => {
      mockNotificationsApi.unregisterDevice.mockResolvedValue({
        error: 'Unregistration failed',
      });

      const result = await fcmService.unregisterToken();

      expect(result).toBe(false);
    });
  });

  describe('deleteToken', () => {
    it('deletes FCM token', async () => {
      // Set a token first
      (fcmService as any).fcmToken = 'test-token';
      mockMessaging.deleteToken.mockResolvedValue(undefined);

      const result = await fcmService.deleteToken();

      expect(mockMessaging.deleteToken).toHaveBeenCalled();
      expect(result).toBe(true);
      expect(store.getState().notifications.fcmToken).toBeNull();
    });

    it('handles deletion error', async () => {
      mockMessaging.deleteToken.mockRejectedValue(new Error('Delete error'));

      const result = await fcmService.deleteToken();

      expect(result).toBe(false);
    });

    it('returns false when messaging not initialized', async () => {
      (fcmService as any).messaging = null;

      const result = await fcmService.deleteToken();

      expect(result).toBe(false);
    });
  });

  describe('checkPermission', () => {
    it('checks permission status - granted', async () => {
      mockMessaging.hasPermission.mockResolvedValue(1); // AUTHORIZED

      const result = await fcmService.checkPermission();

      expect(mockMessaging.hasPermission).toHaveBeenCalled();
      expect(result).toBe(true);
    });

    it('checks permission status - denied', async () => {
      mockMessaging.hasPermission.mockResolvedValue(0); // DENIED

      const result = await fcmService.checkPermission();

      expect(result).toBe(false);
    });

    it('checks permission status - provisional', async () => {
      mockMessaging.hasPermission.mockResolvedValue(2); // PROVISIONAL

      const result = await fcmService.checkPermission();

      expect(result).toBe(true);
    });

    it('handles permission check error', async () => {
      mockMessaging.hasPermission.mockRejectedValue(new Error('Check error'));

      const result = await fcmService.checkPermission();

      expect(result).toBe(false);
    });

    it('returns false when messaging not initialized', async () => {
      (fcmService as any).messaging = null;

      const result = await fcmService.checkPermission();

      expect(result).toBe(false);
    });
  });

  describe('onNotificationReceived', () => {
    it('adds notification handler', () => {
      const handler = jest.fn();

      const unsubscribe = fcmService.onNotificationReceived(handler);

      expect(typeof unsubscribe).toBe('function');
      const handlers = (fcmService as any).notificationHandlers;
      expect(handlers).toContain(handler);
    });

    it('removes notification handler on unsubscribe', () => {
      const handler = jest.fn();

      const unsubscribe = fcmService.onNotificationReceived(handler);
      unsubscribe();

      // Verify handler was removed by checking internal state
      const handlers = (fcmService as any).notificationHandlers;
      expect(handlers).not.toContain(handler);
    });

    it('supports multiple handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      fcmService.onNotificationReceived(handler1);
      fcmService.onNotificationReceived(handler2);

      const handlers = (fcmService as any).notificationHandlers;
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
    });
  });

  describe('onNotificationOpened', () => {
    it('adds notification opened handler', () => {
      const handler = jest.fn();
      mockMessaging.onNotificationOpenedApp.mockReturnValue(jest.fn());

      const unsubscribe = fcmService.onNotificationOpened(handler);

      expect(typeof unsubscribe).toBe('function');
      expect(mockMessaging.onNotificationOpenedApp).toHaveBeenCalled();

      const handlers = (fcmService as any).openedHandlers;
      expect(handlers).toContain(handler);
    });

    it('removes handler on unsubscribe', () => {
      const handler = jest.fn();
      mockMessaging.onNotificationOpenedApp.mockReturnValue(jest.fn());

      const unsubscribe = fcmService.onNotificationOpened(handler);
      unsubscribe();

      const handlers = (fcmService as any).openedHandlers;
      expect(handlers).not.toContain(handler);
    });

    it('returns empty unsubscribe when messaging not initialized', () => {
      (fcmService as any).messaging = null;
      const handler = jest.fn();

      const unsubscribe = fcmService.onNotificationOpened(handler);

      expect(typeof unsubscribe).toBe('function');
      expect(mockMessaging.onNotificationOpenedApp).not.toHaveBeenCalled();
    });
  });

  describe('getInitialNotification', () => {
    it('gets initial notification', async () => {
      const mockRemoteMessage = {
        messageId: 'msg-123',
        notification: {
          title: 'Test Notification',
          body: 'Test body',
        },
        data: { type: 'task_assigned' },
        sentTime: Date.now(),
      };
      mockMessaging.getInitialNotification.mockResolvedValue(mockRemoteMessage);

      const result = await fcmService.getInitialNotification();

      expect(mockMessaging.getInitialNotification).toHaveBeenCalled();
      expect(result).not.toBeNull();
      expect(result?.title).toBe('Test Notification');
      expect(result?.body).toBe('Test body');
      expect(result?.type).toBe('task_assigned');
    });

    it('returns null when no initial notification', async () => {
      mockMessaging.getInitialNotification.mockResolvedValue(null);

      const result = await fcmService.getInitialNotification();

      expect(result).toBeNull();
    });

    it('handles error getting initial notification', async () => {
      mockMessaging.getInitialNotification.mockRejectedValue(new Error('Failed'));

      const result = await fcmService.getInitialNotification();

      expect(result).toBeNull();
    });

    it('returns null when messaging not initialized', async () => {
      (fcmService as any).messaging = null;

      const result = await fcmService.getInitialNotification();

      expect(result).toBeNull();
    });
  });

  describe('onTokenRefresh', () => {
    it('adds token refresh handler', () => {
      const handler = jest.fn();

      const unsubscribe = fcmService.onTokenRefresh(handler);

      expect(typeof unsubscribe).toBe('function');
      const handlers = (fcmService as any).tokenRefreshHandlers;
      expect(handlers).toContain(handler);
    });

    it('removes handler on unsubscribe', () => {
      const handler = jest.fn();

      const unsubscribe = fcmService.onTokenRefresh(handler);
      unsubscribe();

      // Verify handler was removed by checking internal state
      const handlers = (fcmService as any).tokenRefreshHandlers;
      expect(handlers).not.toContain(handler);
    });

    it('supports multiple handlers', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      fcmService.onTokenRefresh(handler1);
      fcmService.onTokenRefresh(handler2);

      const handlers = (fcmService as any).tokenRefreshHandlers;
      expect(handlers).toContain(handler1);
      expect(handlers).toContain(handler2);
    });
  });

  describe('getCurrentToken', () => {
    it('returns current token', async () => {
      mockMessaging.requestPermission.mockResolvedValue(1);
      mockMessaging.getToken.mockResolvedValue('current-token');

      await fcmService.initialize(store);
      await fcmService.getToken();

      const token = fcmService.getCurrentToken();

      expect(token).toBe('current-token');
    });

    it('returns null when no token', () => {
      const token = fcmService.getCurrentToken();

      expect(token).toBeNull();
    });
  });

  describe('getPermissionStatus', () => {
    it('returns permission status after requesting', async () => {
      mockMessaging.requestPermission.mockResolvedValue(1);

      await fcmService.requestPermission();

      const status = fcmService.getPermissionStatus();

      expect(status).toBe(NotificationPermission.AUTHORIZED);
    });

    it('returns NOT_DETERMINED initially', () => {
      const status = fcmService.getPermissionStatus();

      expect(status).toBe(NotificationPermission.NOT_DETERMINED);
    });

    it('returns DENIED after permission denied', async () => {
      mockMessaging.requestPermission.mockResolvedValue(0);

      await fcmService.requestPermission();

      const status = fcmService.getPermissionStatus();

      expect(status).toBe(NotificationPermission.DENIED);
    });
  });

  describe('cleanup', () => {
    it('cleans up service and removes listeners', () => {
      const handler1 = jest.fn();
      const handler2 = jest.fn();

      fcmService.onNotificationReceived(handler1);
      fcmService.onTokenRefresh(handler2);

      fcmService.cleanup();

      expect((fcmService as any).initialized).toBe(false);
      expect((fcmService as any).notificationHandlers).toEqual([]);
      expect((fcmService as any).openedHandlers).toEqual([]);
      expect((fcmService as any).tokenRefreshHandlers).toEqual([]);
    });

    it('clears unsubscribe functions', () => {
      (fcmService as any).unsubscribeTokenRefresh = jest.fn();
      (fcmService as any).unsubscribeForeground = jest.fn();

      fcmService.cleanup();

      expect((fcmService as any).unsubscribeTokenRefresh).toBeNull();
      expect((fcmService as any).unsubscribeForeground).toBeNull();
    });
  });

  describe('Firebase not installed', () => {
    it('handles missing Firebase gracefully', async () => {
      // Reset the service without messaging instance
      (fcmService as any).initialized = false;
      (fcmService as any).messaging = null;

      // Should not throw, just log warning
      await fcmService.initialize(store);

      // Service should handle gracefully
      expect(fcmService.getCurrentToken()).toBeNull();
      expect(fcmService.getPermissionStatus()).toBe(NotificationPermission.NOT_DETERMINED);
    });
  });
});
