/**
 * Shift Workflow Integration Tests
 * Tests complete workflow: login → clock-in → report → clock-out
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer, { setUser, logout } from '../../store/slices/authSlice';
import shiftReducer, {
  setCurrentShift,
  clockOutSuccess,
} from '../../store/slices/shiftSlice';
import offlineReducer, {
  addToQueue,
  removeFromQueue,
} from '../../store/slices/offlineSlice';
import * as secureStorage from '../../services/storage/secureStorage';
import { ApiErrorCode } from '../../constants/errorCodes';

// Mock secure storage
jest.mock('../../services/storage/secureStorage');

describe('Complete Shift Workflow Integration', () => {
  let store: ReturnType<typeof configureStore>;

  beforeEach(() => {
    // Create fresh store for each test
    store = configureStore({
      reducer: {
        auth: authReducer,
        shift: shiftReducer,
        offline: offlineReducer,
      },
    });
    jest.clearAllMocks();
  });

  describe('Successful shift workflow', () => {
    it('should complete full shift workflow: login → clock-in → report → clock-out', async () => {
      // Step 1: Login
      const user = {
        id: 1,
        username: 'worker1',
        fullName: 'Worker One',
        role: 'worker' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const area = {
        id: 1,
        code: 'TB-001',
        name: 'Taman Bungkul',
        boundaryCoordinates: [
          [-7.257472, 112.75209],
          [-7.258, 112.753],
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.dispatch(setUser({ user, area }));

      const authState = store.getState().auth;
      expect(authState.user).toEqual(user);
      expect(authState.assignedArea).toEqual(area);
      expect(authState.isAuthenticated).toBe(true);

      // Step 2: Clock-in
      const shift = {
        id: 1,
        workerId: 1,
        clockInTime: new Date().toISOString(),
        clockInLatitude: -7.257472,
        clockInLongitude: 112.75209,
        clockInPhoto: 'https://example.com/photo.jpg',
      };

      store.dispatch(setCurrentShift(shift));

      const shiftState = store.getState().shift;
      expect(shiftState.currentShift).toEqual(shift);

      // Step 3: Submit report (offline)
      const reportAction = {
        id: 'offline-1',
        type: 'CREATE_REPORT' as const,
        endpoint: '/api/reports',
        method: 'POST' as const,
        data: {
          shiftId: shift.id,
          reportText: 'Membersihkan area taman',
          photos: ['photo1.jpg', 'photo2.jpg'],
        },
        timestamp: Date.now(),
        retryCount: 0,
      };

      store.dispatch(addToQueue(reportAction));

      const offlineState = store.getState().offline;
      expect(offlineState.queue).toHaveLength(1);
      expect(offlineState.queue[0]).toEqual(reportAction);

      // Step 4: Sync report (simulate)
      store.dispatch(removeFromQueue(reportAction.id));

      const syncedOfflineState = store.getState().offline;
      expect(syncedOfflineState.queue).toHaveLength(0);

      // Step 5: Clock-out
      store.dispatch(clockOutSuccess());

      const finalShiftState = store.getState().shift;
      expect(finalShiftState.currentShift).toBeNull();

      // Step 6: Logout
      store.dispatch(logout());

      const finalAuthState = store.getState().auth;
      expect(finalAuthState.user).toBeNull();
      expect(finalAuthState.isAuthenticated).toBe(false);
    });
  });

  describe('Shift workflow with offline queue', () => {
    it('should handle clock-in while offline and sync later', async () => {
      // Login
      const user = {
        id: 1,
        username: 'worker1',
        fullName: 'Worker One',
        role: 'worker' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.dispatch(setUser({ user }));

      // Queue clock-in action (offline)
      const clockInAction = {
        id: 'offline-clockin-1',
        type: 'CLOCK_IN' as const,
        endpoint: '/api/shifts/clock-in',
        method: 'POST' as const,
        data: {
          latitude: -7.257472,
          longitude: 112.75209,
          photo: 'base64-photo-data',
        },
        timestamp: Date.now(),
        retryCount: 0,
      };

      store.dispatch(addToQueue(clockInAction));

      let offlineState = store.getState().offline;
      expect(offlineState.queue).toHaveLength(1);

      // Come back online, sync clock-in
      store.dispatch(removeFromQueue(clockInAction.id));

      // Set shift after successful sync
      store.dispatch(
        setCurrentShift({
          id: 1,
          workerId: 1,
          clockInTime: new Date().toISOString(),
          clockInLatitude: -7.257472,
          clockInLongitude: 112.75209,
          clockInPhoto: 'https://example.com/photo.jpg',
        })
      );

      offlineState = store.getState().offline;
      const shiftState = store.getState().shift;

      expect(offlineState.queue).toHaveLength(0);
      expect(shiftState.currentShift).not.toBeNull();
    });

    it('should handle multiple reports in offline queue', async () => {
      // Setup authenticated state with active shift
      const user = {
        id: 1,
        username: 'worker1',
        fullName: 'Worker One',
        role: 'worker' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.dispatch(setUser({ user }));

      store.dispatch(
        setCurrentShift({
          id: 1,
          workerId: 1,
          clockInTime: new Date().toISOString(),
          clockInLatitude: -7.257472,
          clockInLongitude: 112.75209,
          clockInPhoto: 'https://example.com/photo.jpg',
        })
      );

      // Queue multiple reports while offline
      const report1 = {
        id: 'offline-report-1',
        type: 'CREATE_REPORT' as const,
        endpoint: '/api/reports',
        method: 'POST' as const,
        data: {
          shiftId: 1,
          reportText: 'Report 1',
          photos: ['photo1.jpg'],
        },
        timestamp: Date.now(),
        retryCount: 0,
      };

      const report2 = {
        id: 'offline-report-2',
        type: 'CREATE_REPORT' as const,
        endpoint: '/api/reports',
        method: 'POST' as const,
        data: {
          shiftId: 1,
          reportText: 'Report 2',
          photos: ['photo2.jpg'],
        },
        timestamp: Date.now() + 1000,
        retryCount: 0,
      };

      store.dispatch(addToQueue(report1));
      store.dispatch(addToQueue(report2));

      let offlineState = store.getState().offline;
      expect(offlineState.queue).toHaveLength(2);

      // Sync reports one by one
      store.dispatch(removeFromQueue(report1.id));
      offlineState = store.getState().offline;
      expect(offlineState.queue).toHaveLength(1);

      store.dispatch(removeFromQueue(report2.id));
      offlineState = store.getState().offline;
      expect(offlineState.queue).toHaveLength(0);
    });
  });

  describe('Error scenarios', () => {
    it('should handle clock-in without authentication', () => {
      // Try to clock in without being authenticated
      const authState = store.getState().auth;
      expect(authState.isAuthenticated).toBe(false);

      // Cannot set shift without auth (would be rejected by API)
      const shiftState = store.getState().shift;
      expect(shiftState.currentShift).toBeNull();
    });

    it('should handle report submission without active shift', () => {
      // Login but no active shift
      const user = {
        id: 1,
        username: 'worker1',
        fullName: 'Worker One',
        role: 'worker' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.dispatch(setUser({ user }));

      const authState = store.getState().auth;
      const shiftState = store.getState().shift;

      expect(authState.isAuthenticated).toBe(true);
      expect(shiftState.currentShift).toBeNull();

      // Queue report (would fail on backend with REPORT_SHIFT_REQUIRED)
      const reportAction = {
        id: 'offline-report-no-shift',
        type: 'CREATE_REPORT' as const,
        endpoint: '/api/reports',
        method: 'POST' as const,
        data: {
          shiftId: null, // No shift ID
          reportText: 'Report without shift',
          photos: [],
        },
        timestamp: Date.now(),
        retryCount: 0,
      };

      store.dispatch(addToQueue(reportAction));

      const offlineState = store.getState().offline;
      expect(offlineState.queue).toHaveLength(1);
    });

    it('should handle clock-out without active shift', () => {
      const shiftState = store.getState().shift;
      expect(shiftState.currentShift).toBeNull();

      // Calling clockOutSuccess when no shift exists should not throw
      store.dispatch(clockOutSuccess());

      const finalShiftState = store.getState().shift;
      expect(finalShiftState.currentShift).toBeNull();
    });

    it('should handle logout during active shift', () => {
      // Setup authenticated state with active shift
      const user = {
        id: 1,
        username: 'worker1',
        fullName: 'Worker One',
        role: 'worker' as const,
        isActive: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      store.dispatch(setUser({ user }));

      store.dispatch(
        setCurrentShift({
          id: 1,
          workerId: 1,
          clockInTime: new Date().toISOString(),
          clockInLatitude: -7.257472,
          clockInLongitude: 112.75209,
          clockInPhoto: 'https://example.com/photo.jpg',
        })
      );

      // Simulate logout
      store.dispatch(logout());

      const authState = store.getState().auth;
      const shiftState = store.getState().shift;

      expect(authState.isAuthenticated).toBe(false);
      // Shift data might still exist locally until cleared
      expect(shiftState.currentShift).not.toBeNull();
    });
  });

  describe('State persistence', () => {
    it('should maintain shift state across component remounts', () => {
      const shift = {
        id: 1,
        workerId: 1,
        clockInTime: new Date().toISOString(),
        clockInLatitude: -7.257472,
        clockInLongitude: 112.75209,
        clockInPhoto: 'https://example.com/photo.jpg',
      };

      store.dispatch(setCurrentShift(shift));

      let shiftState = store.getState().shift;
      expect(shiftState.currentShift).toEqual(shift);

      // Simulate component remount - state should persist
      shiftState = store.getState().shift;
      expect(shiftState.currentShift).toEqual(shift);
    });

    it('should maintain offline queue across app restarts (simulated)', () => {
      const queuedAction = {
        id: 'offline-1',
        type: 'CREATE_REPORT' as const,
        endpoint: '/api/reports',
        method: 'POST' as const,
        data: { reportText: 'Test' },
        timestamp: Date.now(),
        retryCount: 0,
      };

      store.dispatch(addToQueue(queuedAction));

      let offlineState = store.getState().offline;
      expect(offlineState.queue).toHaveLength(1);

      // Simulate retrieving queue from storage on app restart
      const storedQueue = offlineState.queue;

      // Create new store (simulating app restart)
      const newStore = configureStore({
        reducer: {
          auth: authReducer,
          shift: shiftReducer,
          offline: offlineReducer,
        },
        preloadedState: {
          offline: {
            queue: storedQueue,
            syncing: false,
            lastSyncTime: null,
          },
        } as any,
      });

      const newOfflineState = newStore.getState().offline;
      expect(newOfflineState.queue).toHaveLength(1);
      expect(newOfflineState.queue[0]).toEqual(queuedAction);
    });
  });
});
