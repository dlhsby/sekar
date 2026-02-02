/**
 * FCM Service Tests
 *
 * Tests for Firebase Cloud Messaging service integration.
 * Tests the public API and Firebase integration patterns.
 */

import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from '../../../store/slices/notificationsSlice';

// Mock Firebase Messaging module
const mockGetToken = jest.fn();
const mockRequestPermission = jest.fn();
const mockHasPermission = jest.fn();
const mockDeleteToken = jest.fn();
const mockOnMessage = jest.fn();
const mockOnTokenRefresh = jest.fn();
const mockOnNotificationOpenedApp = jest.fn();
const mockGetInitialNotification = jest.fn();

const mockMessagingInstance = {
  getToken: mockGetToken,
  requestPermission: mockRequestPermission,
  hasPermission: mockHasPermission,
  deleteToken: mockDeleteToken,
  onMessage: mockOnMessage,
  onTokenRefresh: mockOnTokenRefresh,
  onNotificationOpenedApp: mockOnNotificationOpenedApp,
  getInitialNotification: mockGetInitialNotification,
};

// Mock the Firebase messaging module with proper structure
const mockMessaging = jest.fn(() => mockMessagingInstance);

// Add AuthorizationStatus enum to the mock
mockMessaging.AuthorizationStatus = {
  AUTHORIZED: 1,
  DENIED: 0,
  NOT_DETERMINED: -1,
  PROVISIONAL: 2,
};

jest.mock('@react-native-firebase/messaging', () => ({
  __esModule: true,
  default: mockMessaging,
}));

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn().mockResolvedValue('test-device-123'),
}));

// Mock API
jest.mock('../../api/notificationsApi', () => ({
  registerDevice: jest.fn().mockResolvedValue({ error: null }),
  unregisterDevice: jest.fn().mockResolvedValue({ error: null }),
}));

import fcmService, { NotificationPermission } from '../fcmService';
import { registerDevice, unregisterDevice } from '../../api/notificationsApi';

describe('FCMService', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        notifications: notificationsReducer,
      },
    });

    // Clear all mocks
    jest.clearAllMocks();

    // Reset service state by creating a new instance
    // Note: Since fcmService is a singleton, we need to work with its state
    (fcmService as any).initialized = false;
    (fcmService as any).messaging = null;
    (fcmService as any).fcmToken = null;
    (fcmService as any).permissionStatus = NotificationPermission.NOT_DETERMINED;
  });

  describe('initialize()', () => {
    it('should successfully initialize with permission granted', async () => {
      // Mock successful permission
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-fcm-token-123');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);

      // Verify messaging was initialized
      expect(mockMessaging).toHaveBeenCalled();

      // Verify permission was requested
      expect(mockRequestPermission).toHaveBeenCalled();

      // Verify token was retrieved
      expect(mockGetToken).toHaveBeenCalled();

      // Verify token was registered
      expect(registerDevice).toHaveBeenCalledWith({
        fcm_token: 'test-fcm-token-123',
        device_id: 'test-device-123',
        platform: 'android', // Default in tests
      });

      // Verify handlers were set up
      expect(mockOnMessage).toHaveBeenCalled();
      expect(mockOnTokenRefresh).toHaveBeenCalled();
    });

    it('should handle permission denied gracefully', async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.DENIED);

      await fcmService.initialize(store);

      // Verify permission was requested
      expect(mockRequestPermission).toHaveBeenCalled();

      // Token should not be retrieved when permission denied
      expect(mockGetToken).not.toHaveBeenCalled();

      // Handlers should not be set up
      expect(mockOnMessage).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      // Force module import to fail by mocking a different error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockRequestPermission.mockRejectedValue(new Error('Firebase not configured'));

      await fcmService.initialize(store);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should not reinitialize if already initialized', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      // Initialize once
      await fcmService.initialize(store);

      // Try to initialize again
      await fcmService.initialize(store);

      // Should log that it's already initialized
      expect(consoleLogSpy).toHaveBeenCalledWith('[FCM] Already initialized');

      consoleLogSpy.mockRestore();
    });
  });

  describe('requestPermission()', () => {
    it('should request and return AUTHORIZED status', async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);
      const status = await fcmService.requestPermission();

      expect(status).toBe(NotificationPermission.AUTHORIZED);
    });

    it('should handle PROVISIONAL status', async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.PROVISIONAL);
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);
      const status = await fcmService.requestPermission();

      expect(status).toBe(NotificationPermission.AUTHORIZED);
    });

    it('should handle permission denial', async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.DENIED);

      await fcmService.initialize(store);
      const status = await fcmService.requestPermission();

      expect(status).toBe(NotificationPermission.DENIED);
    });

    it('should handle permission request error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockRequestPermission.mockRejectedValue(new Error('Permission denied by system'));
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);
      const status = await fcmService.requestPermission();

      expect(status).toBe(NotificationPermission.DENIED);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('getToken()', () => {
    beforeEach(async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});
      await fcmService.initialize(store);
    });

    it('should retrieve FCM token', async () => {
      mockGetToken.mockResolvedValue('new-fcm-token-456');

      const token = await fcmService.getToken();

      expect(token).toBe('new-fcm-token-456');
      expect(mockGetToken).toHaveBeenCalled();
    });

    it('should handle token retrieval failure', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockGetToken.mockRejectedValue(new Error('Failed to get token'));

      const token = await fcmService.getToken();

      expect(token).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('checkPermission()', () => {
    beforeEach(async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});
      await fcmService.initialize(store);
    });

    it('should check and return permission status', async () => {
      mockHasPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);

      const hasPermission = await fcmService.checkPermission();

      expect(hasPermission).toBe(true);
      expect(mockHasPermission).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      mockHasPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.DENIED);

      const hasPermission = await fcmService.checkPermission();

      expect(hasPermission).toBe(false);
    });

    it('should handle permission check error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockHasPermission.mockRejectedValue(new Error('Permission check failed'));

      const hasPermission = await fcmService.checkPermission();

      expect(hasPermission).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('deleteToken()', () => {
    beforeEach(async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token-to-delete');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});
      await fcmService.initialize(store);
    });

    it('should delete FCM token', async () => {
      mockDeleteToken.mockResolvedValue(undefined);

      const result = await fcmService.deleteToken();

      expect(result).toBe(true);
      expect(mockDeleteToken).toHaveBeenCalled();
    });

    it('should handle token deletion error', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockDeleteToken.mockRejectedValue(new Error('Failed to delete token'));

      const result = await fcmService.deleteToken();

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('setupNotificationHandlers()', () => {
    it('should be a no-op when not initialized', () => {
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      fcmService.setupNotificationHandlers();

      expect(consoleWarnSpy).toHaveBeenCalledWith('[FCM] Service not initialized yet');

      consoleWarnSpy.mockRestore();
    });

    it('should log when handlers are already set up', async () => {
      const consoleLogSpy = jest.spyOn(console, 'log').mockImplementation();

      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);
      fcmService.setupNotificationHandlers();

      expect(consoleLogSpy).toHaveBeenCalledWith('[FCM] Notification handlers are already set up');

      consoleLogSpy.mockRestore();
    });
  });

  describe('onNotificationReceived()', () => {
    it('should add and remove notification handlers', async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);

      const handler = jest.fn();
      const unsubscribe = fcmService.onNotificationReceived(handler);

      // Handler should be registered
      expect((fcmService as any).notificationHandlers).toContain(handler);

      // Unsubscribe
      unsubscribe();

      // Handler should be removed
      expect((fcmService as any).notificationHandlers).not.toContain(handler);
    });
  });

  describe('getInitialNotification()', () => {
    beforeEach(async () => {
      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});
      await fcmService.initialize(store);
    });

    it('should retrieve initial notification', async () => {
      const mockRemoteMessage = {
        messageId: 'msg-123',
        notification: {
          title: 'Test Notification',
          body: 'Test Body',
        },
        data: { type: 'test' },
        sentTime: 1234567890000,
      };

      mockGetInitialNotification.mockResolvedValue(mockRemoteMessage);

      const notification = await fcmService.getInitialNotification();

      expect(notification).toBeDefined();
      expect(notification?.title).toBe('Test Notification');
      expect(notification?.body).toBe('Test Body');
      expect(notification?.type).toBe('test');
    });

    it('should return null when no initial notification', async () => {
      mockGetInitialNotification.mockResolvedValue(null);

      const notification = await fcmService.getInitialNotification();

      expect(notification).toBeNull();
    });

    it('should handle error getting initial notification', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      mockGetInitialNotification.mockRejectedValue(new Error('Failed to get notification'));

      const notification = await fcmService.getInitialNotification();

      expect(notification).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });
  });

  describe('cleanup()', () => {
    it('should clean up all listeners and reset state', async () => {
      const unsubscribeToken = jest.fn();
      const unsubscribeForeground = jest.fn();

      mockRequestPermission.mockResolvedValue(mockMessaging.AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(unsubscribeForeground);
      mockOnTokenRefresh.mockReturnValue(unsubscribeToken);

      await fcmService.initialize(store);

      const handler = jest.fn();
      fcmService.onNotificationReceived(handler);

      fcmService.cleanup();

      // Verify unsubscribe functions were called
      expect(unsubscribeToken).toHaveBeenCalled();
      expect(unsubscribeForeground).toHaveBeenCalled();

      // Verify handlers were cleared
      expect((fcmService as any).notificationHandlers).toHaveLength(0);
      expect((fcmService as any).openedHandlers).toHaveLength(0);
      expect((fcmService as any).tokenRefreshHandlers).toHaveLength(0);

      // Verify initialized flag was reset
      expect((fcmService as any).initialized).toBe(false);
    });
  });
});
