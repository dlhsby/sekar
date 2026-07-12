/**
 * Notifications API Service Tests
 */

import * as notificationsApi from '../notificationsApi';
import * as apiClient from '../apiClient';

// Mock the API client
jest.mock('../apiClient', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  del: jest.fn(),
}));

const mockGet = apiClient.get as jest.MockedFunction<typeof apiClient.get>;
const mockPost = apiClient.post as jest.MockedFunction<typeof apiClient.post>;
const mockPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>;
const mockDel = apiClient.del as jest.MockedFunction<typeof apiClient.del>;

describe('notificationsApi', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('registerDevice', () => {
    it('registers device with FCM token', async () => {
      const deviceData = {
        fcm_token: 'fcm-token-123',
        device_id: 'device-123',
        platform: 'android' as const,
      };
      const mockResponse = { data: { success: true } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await notificationsApi.registerDevice(deviceData);

      expect(mockPost).toHaveBeenCalledWith(
        '/notifications/register',
        deviceData,
      );
      expect(result).toEqual(mockResponse);
    });

    it('registers iOS device', async () => {
      const deviceData = {
        fcm_token: 'fcm-token-456',
        device_id: 'ios-device-123',
        platform: 'ios' as const,
      };
      const mockResponse = { data: { success: true } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await notificationsApi.registerDevice(deviceData);

      expect(mockPost).toHaveBeenCalledWith(
        '/notifications/register',
        deviceData,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('unregisterDevice', () => {
    it('unregisters device', async () => {
      const mockResponse = { data: { success: true } };
      mockDel.mockResolvedValue(mockResponse);

      const result = await notificationsApi.unregisterDevice();

      expect(mockDel).toHaveBeenCalledWith('/notifications/unregister');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('getNotifications', () => {
    it('gets notifications without filters', async () => {
      const mockResponse = {
        data: {
          data: [],
          meta: {
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
            unread_count: 0,
          },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await notificationsApi.getNotifications();

      expect(mockGet).toHaveBeenCalledWith('/notifications', undefined);
      expect(result).toEqual(mockResponse);
    });

    it('gets unread notifications', async () => {
      const filters = { read: false, page: 1, limit: 20 };
      const mockResponse = {
        data: {
          data: [{ id: '1', title: 'New Task', read: false }],
          meta: {
            total: 1,
            page: 1,
            limit: 20,
            totalPages: 1,
            unread_count: 1,
          },
        },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await notificationsApi.getNotifications(filters);

      expect(mockGet).toHaveBeenCalledWith('/notifications', filters);
      expect(result).toEqual(mockResponse);
    });

    it('gets notifications by type', async () => {
      const filters = { type: 'task_assigned' };
      const mockResponse = { data: { data: [], meta: {} } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await notificationsApi.getNotifications(filters);

      expect(mockGet).toHaveBeenCalledWith('/notifications', filters);
    });
  });

  describe('getNotificationById', () => {
    it('gets notification by ID', async () => {
      const notificationId = 'notification-123';
      const mockResponse = {
        data: { id: notificationId, title: 'Test', read: false },
      };
      mockGet.mockResolvedValue(mockResponse);

      const result = await notificationsApi.getNotificationById(notificationId);

      expect(mockGet).toHaveBeenCalledWith(`/notifications/${notificationId}`);
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markAsRead', () => {
    it('marks notification as read', async () => {
      const notificationId = 'notification-123';
      const mockResponse = {
        data: { id: notificationId, read: true },
      };
      mockPut.mockResolvedValue(mockResponse);

      const result = await notificationsApi.markAsRead(notificationId);

      expect(mockPut).toHaveBeenCalledWith(
        `/notifications/${notificationId}/read`,
      );
      expect(result).toEqual(mockResponse);
    });
  });

  describe('markAllAsRead', () => {
    it('marks all notifications as read', async () => {
      const mockResponse = { data: { updated_count: 5 } };
      mockPut.mockResolvedValue(mockResponse);

      const result = await notificationsApi.markAllAsRead();

      expect(mockPut).toHaveBeenCalledWith('/notifications/read-all');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('broadcastNotification', () => {
    it('broadcasts notification to all users', async () => {
      const broadcastData = {
        title: 'Important Announcement',
        body: 'Please read this message.',
      };
      const mockResponse = { data: { sent_count: 100 } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await notificationsApi.broadcastNotification(broadcastData);

      expect(mockPost).toHaveBeenCalledWith(
        '/notifications/broadcast',
        broadcastData,
      );
      expect(result).toEqual(mockResponse);
    });

    it('broadcasts notification to specific roles', async () => {
      const broadcastData = {
        title: 'Worker Update',
        body: 'New task available.',
        target_roles: ['satgas' as const, 'linmas' as const],
      };
      const mockResponse = { data: { sent_count: 50 } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await notificationsApi.broadcastNotification(broadcastData);

      expect(mockPost).toHaveBeenCalledWith(
        '/notifications/broadcast',
        broadcastData,
      );
      expect(result).toEqual(mockResponse);
    });

    it('broadcasts notification to specific area', async () => {
      const broadcastData = {
        title: 'Area Alert',
        body: 'Weather warning.',
        target_location_id: 'area-123',
      };
      const mockResponse = { data: { sent_count: 10 } };
      mockPost.mockResolvedValue(mockResponse);

      const result = await notificationsApi.broadcastNotification(broadcastData);

      expect(mockPost).toHaveBeenCalledWith(
        '/notifications/broadcast',
        broadcastData,
      );
    });
  });

  describe('getUnreadCount', () => {
    it('gets unread notification count', async () => {
      const mockResponse = { data: { count: 5 } };
      mockGet.mockResolvedValue(mockResponse);

      const result = await notificationsApi.getUnreadCount();

      expect(mockGet).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toEqual(mockResponse);
    });
  });

  describe('default export', () => {
    it('exports all functions', () => {
      const defaultExport = notificationsApi.default;
      expect(defaultExport.registerDevice).toBeDefined();
      expect(defaultExport.unregisterDevice).toBeDefined();
      expect(defaultExport.getNotifications).toBeDefined();
      expect(defaultExport.getNotificationById).toBeDefined();
      expect(defaultExport.markAsRead).toBeDefined();
      expect(defaultExport.markAllAsRead).toBeDefined();
      expect(defaultExport.broadcastNotification).toBeDefined();
      expect(defaultExport.getUnreadCount).toBeDefined();
    });
  });
});
