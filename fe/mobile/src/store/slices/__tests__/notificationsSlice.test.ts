/**
 * Notifications Slice Tests
 * Unit tests for notifications state management
 */

import notificationsReducer, {
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
  selectUnreadNotifications,
  selectUnreadCount,
} from '../notificationsSlice';
import type { Notification } from '../../../types/models.types';

describe('notificationsSlice', () => {
  const initialState = {
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,
    fcmToken: null,
    permissionGranted: false,
  };

  const mockNotification: Notification = {
    id: 'notif-001',
    user_id: 'user-001',
    title: 'New Task Assigned',
    body: 'You have been assigned a new task',
    type: 'task_assigned',
    read: false,
    created_at: '2026-01-19T10:00:00Z',
  };

  const mockNotifications: Notification[] = [
    mockNotification,
    {
      ...mockNotification,
      id: 'notif-002',
      title: 'Task Deadline Reminder',
      body: 'Task is due soon',
      type: 'task_reminder',
      read: true,
      read_at: '2026-01-19T11:00:00Z',
    },
    {
      ...mockNotification,
      id: 'notif-003',
      title: 'Report Approved',
      body: 'Your report has been approved',
      type: 'report_approved',
      read: false,
    },
  ];

  describe('initial state', () => {
    it('should return initial state', () => {
      expect(notificationsReducer(undefined, { type: 'unknown' })).toEqual(
        initialState
      );
    });
  });

  describe('setLoading', () => {
    it('should set loading to true', () => {
      const state = notificationsReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);
    });

    it('should set loading to false', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = notificationsReducer(loadingState, setLoading(false));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('setNotifications', () => {
    it('should set notifications array', () => {
      const state = notificationsReducer(
        initialState,
        setNotifications(mockNotifications)
      );
      expect(state.notifications).toEqual(mockNotifications);
      expect(state.notifications).toHaveLength(3);
    });

    it('should calculate unread count', () => {
      const state = notificationsReducer(
        initialState,
        setNotifications(mockNotifications)
      );
      expect(state.unreadCount).toBe(2); // notif-001 and notif-003 are unread
    });

    it('should clear loading when setting notifications', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = notificationsReducer(
        loadingState,
        setNotifications(mockNotifications)
      );
      expect(state.isLoading).toBe(false);
    });

    it('should clear error when setting notifications', () => {
      const errorState = { ...initialState, error: 'Previous error' };
      const state = notificationsReducer(
        errorState,
        setNotifications(mockNotifications)
      );
      expect(state.error).toBeNull();
    });

    it('should handle empty notifications array', () => {
      const state = notificationsReducer(initialState, setNotifications([]));
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('addNotification', () => {
    it('should add notification to beginning of array', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: [mockNotifications[1]],
        unreadCount: 0,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        addNotification(mockNotification)
      );
      expect(state.notifications[0]).toEqual(mockNotification);
      expect(state.notifications).toHaveLength(2);
    });

    it('should increment unread count for unread notification', () => {
      const state = notificationsReducer(
        initialState,
        addNotification(mockNotification)
      );
      expect(state.unreadCount).toBe(1);
    });

    it('should not increment unread count for read notification', () => {
      const readNotification = { ...mockNotification, read: true };
      const state = notificationsReducer(
        initialState,
        addNotification(readNotification)
      );
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('markAsRead', () => {
    it('should mark notification as read', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        markAsRead('notif-001')
      );
      const notification = state.notifications.find((n) => n.id === 'notif-001');
      expect(notification?.read).toBe(true);
      expect(notification?.read_at).toBeDefined();
    });

    it('should decrement unread count', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        markAsRead('notif-001')
      );
      expect(state.unreadCount).toBe(1);
    });

    it('should not modify already read notification', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        markAsRead('notif-002')
      );
      expect(state.unreadCount).toBe(2); // unchanged
    });

    it('should not go below zero for unread count', () => {
      const stateWithZeroUnread = {
        ...initialState,
        notifications: [{ ...mockNotification, read: true }],
        unreadCount: 0,
      };
      const state = notificationsReducer(
        stateWithZeroUnread,
        markAsRead('notif-001')
      );
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('markAllAsRead', () => {
    it('should mark all notifications as read', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(stateWithNotifications, markAllAsRead());
      expect(state.notifications.every((n) => n.read)).toBe(true);
      expect(state.notifications.every((n) => n.read_at !== undefined)).toBe(true);
    });

    it('should set unread count to zero', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(stateWithNotifications, markAllAsRead());
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('removeNotification', () => {
    it('should remove notification from array', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        removeNotification('notif-001')
      );
      expect(state.notifications).toHaveLength(2);
      expect(
        state.notifications.find((n) => n.id === 'notif-001')
      ).toBeUndefined();
    });

    it('should decrement unread count when removing unread notification', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        removeNotification('notif-001')
      );
      expect(state.unreadCount).toBe(1);
    });

    it('should not affect unread count when removing read notification', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        removeNotification('notif-002')
      );
      expect(state.unreadCount).toBe(2);
    });
  });

  describe('setFcmToken', () => {
    it('should set FCM token', () => {
      const token = 'fcm-token-12345';
      const state = notificationsReducer(initialState, setFcmToken(token));
      expect(state.fcmToken).toBe(token);
    });

    it('should clear FCM token when null', () => {
      const stateWithToken = { ...initialState, fcmToken: 'existing-token' };
      const state = notificationsReducer(stateWithToken, setFcmToken(null));
      expect(state.fcmToken).toBeNull();
    });
  });

  describe('setPermissionGranted', () => {
    it('should set permission granted to true', () => {
      const state = notificationsReducer(
        initialState,
        setPermissionGranted(true)
      );
      expect(state.permissionGranted).toBe(true);
    });

    it('should set permission granted to false', () => {
      const grantedState = { ...initialState, permissionGranted: true };
      const state = notificationsReducer(grantedState, setPermissionGranted(false));
      expect(state.permissionGranted).toBe(false);
    });
  });

  describe('setError', () => {
    it('should set error message', () => {
      const state = notificationsReducer(
        initialState,
        setError('Failed to load')
      );
      expect(state.error).toBe('Failed to load');
    });

    it('should clear loading when setting error', () => {
      const loadingState = { ...initialState, isLoading: true };
      const state = notificationsReducer(loadingState, setError('Error'));
      expect(state.isLoading).toBe(false);
    });
  });

  describe('clearError', () => {
    it('should clear error', () => {
      const errorState = { ...initialState, error: 'Some error' };
      const state = notificationsReducer(errorState, clearError());
      expect(state.error).toBeNull();
    });
  });

  describe('clearNotifications', () => {
    it('should clear all notifications', () => {
      const stateWithNotifications = {
        ...initialState,
        notifications: mockNotifications,
        unreadCount: 2,
      };
      const state = notificationsReducer(
        stateWithNotifications,
        clearNotifications()
      );
      expect(state.notifications).toEqual([]);
      expect(state.unreadCount).toBe(0);
    });
  });

  describe('resetState', () => {
    it('should reset to initial state', () => {
      const modifiedState = {
        notifications: mockNotifications,
        unreadCount: 2,
        isLoading: true,
        error: 'Some error',
        fcmToken: 'some-token',
        permissionGranted: true,
      };
      const state = notificationsReducer(modifiedState, resetState());
      expect(state).toEqual(initialState);
    });
  });

  describe('selectors', () => {
    describe('selectUnreadNotifications', () => {
      it('should return only unread notifications', () => {
        const state = {
          notifications: { ...initialState, notifications: mockNotifications },
        };
        const result = selectUnreadNotifications(state);
        expect(result).toHaveLength(2);
        expect(result.every((n) => !n.read)).toBe(true);
      });
    });

    describe('selectUnreadCount', () => {
      it('should return unread count', () => {
        const state = {
          notifications: { ...initialState, unreadCount: 5 },
        };
        const result = selectUnreadCount(state);
        expect(result).toBe(5);
      });
    });
  });

  describe('state transitions', () => {
    it('should handle full fetch flow', () => {
      let state = notificationsReducer(initialState, setLoading(true));
      expect(state.isLoading).toBe(true);

      state = notificationsReducer(state, setNotifications(mockNotifications));
      expect(state.notifications).toEqual(mockNotifications);
      expect(state.isLoading).toBe(false);
      expect(state.unreadCount).toBe(2);
    });

    it('should handle new notification flow', () => {
      let state = notificationsReducer(
        initialState,
        setNotifications(mockNotifications)
      );
      expect(state.unreadCount).toBe(2);

      const newNotification: Notification = {
        id: 'notif-004',
        user_id: 'user-001',
        title: 'New Notification',
        body: 'This is a new notification',
        type: 'general',
        read: false,
        created_at: '2026-01-19T12:00:00Z',
      };
      state = notificationsReducer(state, addNotification(newNotification));
      expect(state.notifications).toHaveLength(4);
      expect(state.unreadCount).toBe(3);
    });

    it('should handle mark as read flow', () => {
      let state = notificationsReducer(
        initialState,
        setNotifications(mockNotifications)
      );
      expect(state.unreadCount).toBe(2);

      state = notificationsReducer(state, markAsRead('notif-001'));
      expect(state.unreadCount).toBe(1);

      state = notificationsReducer(state, markAsRead('notif-003'));
      expect(state.unreadCount).toBe(0);
    });

    it('should handle error flow', () => {
      let state = notificationsReducer(initialState, setLoading(true));

      state = notificationsReducer(state, setError('Network error'));
      expect(state.error).toBe('Network error');
      expect(state.isLoading).toBe(false);

      state = notificationsReducer(state, clearError());
      expect(state.error).toBeNull();
    });

    it('should handle FCM registration flow', () => {
      let state = notificationsReducer(
        initialState,
        setPermissionGranted(true)
      );
      expect(state.permissionGranted).toBe(true);

      state = notificationsReducer(state, setFcmToken('fcm-token-12345'));
      expect(state.fcmToken).toBe('fcm-token-12345');
    });
  });
});
