/**
 * FCM Service Tests
 *
 * Tests for Firebase Cloud Messaging service integration.
 * Tests the public API and Firebase integration patterns.
 */

import { configureStore } from '@reduxjs/toolkit';
import notificationsReducer from '../../../store/slices/notificationsSlice';

// Mock Firebase messaging module - must use jest.fn() inside the factory
// because jest.mock is hoisted before variable declarations
jest.mock('@react-native-firebase/messaging', () => {
  const mockMessagingInstance = {
    getToken: jest.fn(),
    requestPermission: jest.fn(),
    hasPermission: jest.fn(),
    deleteToken: jest.fn(),
    onMessage: jest.fn(),
    onTokenRefresh: jest.fn(),
    onNotificationOpenedApp: jest.fn(),
    getInitialNotification: jest.fn(),
  };

  const mockMessaging = jest.fn(() => mockMessagingInstance);

  // Add AuthorizationStatus enum to the mock
  (mockMessaging as any).AuthorizationStatus = {
    AUTHORIZED: 1,
    DENIED: 0,
    NOT_DETERMINED: -1,
    PROVISIONAL: 2,
  };

  return {
    __esModule: true,
    default: mockMessaging,
  };
});

// Mock DeviceInfo
jest.mock('react-native-device-info', () => ({
  getUniqueId: jest.fn().mockResolvedValue('test-device-123'),
  getDeviceName: jest.fn().mockResolvedValue('Test Device'),
  getModel: jest.fn().mockResolvedValue('Test Model'),
  getVersion: jest.fn().mockResolvedValue('1.0.0'),
}));

// Mock API
jest.mock('../../api/notificationsApi', () => ({
  registerDevice: jest.fn().mockResolvedValue({ error: null }),
  unregisterDevice: jest.fn().mockResolvedValue({ error: null }),
}));

// Mock @notifee/react-native
jest.mock('@notifee/react-native', () => ({
  __esModule: true,
  default: {
    displayNotification: jest.fn(),
    createChannel: jest.fn(),
    getInitialNotification: jest.fn(),
    onBackgroundEvent: jest.fn(),
    onForegroundEvent: jest.fn(),
  },
  AndroidImportance: {
    HIGH: 4,
    DEFAULT: 3,
    LOW: 2,
    MIN: 1,
    NONE: 0,
  },
}));

import fcmService, { NotificationPermission } from '../fcmService';
import messaging from '@react-native-firebase/messaging';
import { registerDevice, unregisterDevice } from '../../api/notificationsApi';

// Get reference to the mock
const mockMessaging = messaging as jest.MockedFunction<typeof messaging>;

describe('FCMService', () => {
  let store: ReturnType<typeof configureStore>;
  let mockMessagingInstance: ReturnType<typeof mockMessaging>;
  let mockGetToken: jest.Mock;
  let mockRequestPermission: jest.Mock;
  let mockHasPermission: jest.Mock;
  let mockDeleteToken: jest.Mock;
  let mockOnMessage: jest.Mock;
  let mockOnTokenRefresh: jest.Mock;
  let mockOnNotificationOpenedApp: jest.Mock;
  let mockGetInitialNotification: jest.Mock;

  beforeEach(() => {
    // Create a fresh store for each test
    store = configureStore({
      reducer: {
        notifications: notificationsReducer,
      },
    });

    // Clear all mocks first
    jest.clearAllMocks();

    // Get fresh references to the mock instance AFTER clearAllMocks
    mockMessagingInstance = mockMessaging();
    mockGetToken = mockMessagingInstance.getToken as jest.Mock;
    mockRequestPermission = mockMessagingInstance.requestPermission as jest.Mock;
    mockHasPermission = mockMessagingInstance.hasPermission as jest.Mock;
    mockDeleteToken = mockMessagingInstance.deleteToken as jest.Mock;
    mockOnMessage = mockMessagingInstance.onMessage as jest.Mock;
    mockOnTokenRefresh = mockMessagingInstance.onTokenRefresh as jest.Mock;
    mockOnNotificationOpenedApp = mockMessagingInstance.onNotificationOpenedApp as jest.Mock;
    mockGetInitialNotification = mockMessagingInstance.getInitialNotification as jest.Mock;

    // Reset service state by creating a new instance
    // Note: Since fcmService is a singleton, we need to work with its state
    (fcmService as any).initialized = false;
    (fcmService as any).messaging = null;
    (fcmService as any).fcmToken = null;
    (fcmService as any).permissionStatus = NotificationPermission.NOT_DETERMINED;
    (fcmService as any).unsubscribeTokenRefresh = null;
    (fcmService as any).unsubscribeForeground = null;
    (fcmService as any).unsubscribeBackground = null;
    (fcmService as any).notificationHandlers = [];
    (fcmService as any).openedHandlers = [];
    (fcmService as any).tokenRefreshHandlers = [];
    (fcmService as any).reduxStore = null;

    // Setup default mock returns
    mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.DENIED);
  });

  describe('initialize()', () => {
    it('should successfully initialize with permission granted', async () => {
      // Mock successful permission check (initialize uses hasPermission, not requestPermission)
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-fcm-token-123');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);

      // Verify messaging was initialized
      expect(mockMessaging).toHaveBeenCalled();

      // Verify permission was checked (initialize uses checkPermission -> hasPermission)
      expect(mockHasPermission).toHaveBeenCalled();

      // Verify token was retrieved
      expect(mockGetToken).toHaveBeenCalled();

      // Verify token was registered (just check it was called, mock confirms proper integration)
      expect(registerDevice).toHaveBeenCalled();

      // Verify handlers were set up
      expect(mockOnMessage).toHaveBeenCalled();
      expect(mockOnTokenRefresh).toHaveBeenCalled();
    });

    it('should handle permission denied gracefully', async () => {
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.DENIED);

      await fcmService.initialize(store);

      // Verify permission was checked (initialize uses hasPermission)
      expect(mockHasPermission).toHaveBeenCalled();

      // Token should not be retrieved when permission denied
      expect(mockGetToken).not.toHaveBeenCalled();

      // Handlers should not be set up
      expect(mockOnMessage).not.toHaveBeenCalled();
    });

    it('should handle initialization failure', async () => {
      // Force module import to fail by mocking a different error
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
      const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();

      mockHasPermission.mockRejectedValue(new Error('Firebase not configured'));

      await fcmService.initialize(store);

      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
      consoleWarnSpy.mockRestore();
    });

    it('should not reinitialize if already initialized', async () => {
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      // Initialize once
      await fcmService.initialize(store);

      // Try to initialize again
      await fcmService.initialize(store);

      // Should log that it's already initialized
      expect(consoleDebugSpy).toHaveBeenCalledWith('[FCM] Already initialized');

      consoleDebugSpy.mockRestore();
    });
  });

  describe('requestPermission()', () => {
    it('should request and return AUTHORIZED status', async () => {
      mockRequestPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);
      const status = await fcmService.requestPermission();

      expect(status).toBe(NotificationPermission.AUTHORIZED);
    });

    it('should handle PROVISIONAL status', async () => {
      mockRequestPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.PROVISIONAL);
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);
      const status = await fcmService.requestPermission();

      expect(status).toBe(NotificationPermission.AUTHORIZED);
    });

    it('should handle permission denial', async () => {
      mockRequestPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.DENIED);

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
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token'); // Need token for initialization
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
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});
      await fcmService.initialize(store);
    });

    it('should check and return permission status', async () => {
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);

      const hasPermission = await fcmService.checkPermission();

      expect(hasPermission).toBe(true);
      expect(mockHasPermission).toHaveBeenCalled();
    });

    it('should return false when permission is denied', async () => {
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.DENIED);

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
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
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
      const consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation();

      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
      mockGetToken.mockResolvedValue('test-token');
      mockOnMessage.mockReturnValue(() => {});
      mockOnTokenRefresh.mockReturnValue(() => {});

      await fcmService.initialize(store);
      fcmService.setupNotificationHandlers();

      expect(consoleDebugSpy).toHaveBeenCalledWith('[FCM] Notification handlers are already set up');

      consoleDebugSpy.mockRestore();
    });
  });

  describe('onNotificationReceived()', () => {
    it('should add and remove notification handlers', async () => {
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
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
      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
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

      mockHasPermission.mockResolvedValue((mockMessaging as any).AuthorizationStatus.AUTHORIZED);
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
