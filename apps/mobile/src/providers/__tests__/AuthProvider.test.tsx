/**
 * AuthProvider Tests
 * Tests for authentication restoration and location tracking initialization
 */

import React from 'react';
import { render, waitFor, act } from '@testing-library/react-native';
import { View, Text } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { AuthProvider } from '../AuthProvider';
import authReducer from '../../store/slices/authSlice';
import shiftReducer from '../../store/slices/shiftSlice';
import * as secureStorage from '../../services/storage/secureStorage';
import * as authApi from '../../services/api/authApi';
import * as shiftsApi from '../../services/api/shiftsApi';
import { locationTracker } from '../../services/location/locationTracker';
import { permissionManager } from '../../services/permissions/PermissionManager';

// Mock dependencies
jest.mock('../../services/storage/secureStorage');
jest.mock('../../services/api/authApi');
jest.mock('../../services/api/shiftsApi');
jest.mock('../../services/location/locationTracker', () => ({
  locationTracker: {
    initialize: jest.fn(),
  },
}));
jest.mock('../../services/permissions/PermissionManager', () => ({
  permissionManager: {
    hasCompletedOnboarding: jest.fn(),
    checkLocationPermission: jest.fn(),
  },
}));

describe('AuthProvider', () => {
  let store: any;
  let mockConsoleDebug: jest.SpyInstance;
  let mockConsoleWarn: jest.SpyInstance;
  let mockConsoleError: jest.SpyInstance;

  const mockFieldUser = {
    id: 1,
    username: 'worker1',
    name: 'Test Worker',
    role: 'satgas',
    phone: '081234567890',
  };

  const mockMonitoringUser = {
    id: 2,
    username: 'topmanager1',
    name: 'Test Manager',
    role: 'management',
    phone: '081234567891',
  };

  const mockShift = {
    id: 123,
    user_id: 1,
    clock_in_time: '2026-01-26T08:00:00Z',
    clock_in_location: { latitude: -7.250445, longitude: 112.768845 },
    clock_out_time: null,
    clock_out_location: null,
    status: 'active',
  };

  beforeEach(() => {
    jest.clearAllMocks();

    // Re-apply console spies after clearAllMocks
    mockConsoleDebug = jest.spyOn(console, 'debug').mockImplementation();
    mockConsoleWarn = jest.spyOn(console, 'warn').mockImplementation();
    mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

    // Create store with auth and shift reducers
    store = configureStore({
      reducer: {
        auth: authReducer,
        shift: shiftReducer,
      },
    });

    // Default mocks
    (secureStorage.getToken as jest.Mock).mockResolvedValue(null);
    (secureStorage.getUser as jest.Mock).mockResolvedValue(null);
    (secureStorage.clearAll as jest.Mock).mockResolvedValue(undefined);

    // Default: permissions granted (allows location tracking)
    (permissionManager.hasCompletedOnboarding as jest.Mock).mockResolvedValue(true);
    (permissionManager.checkLocationPermission as jest.Mock).mockResolvedValue(true);
  });

  afterEach(() => {
    mockConsoleDebug.mockRestore();
    mockConsoleWarn.mockRestore();
    mockConsoleError.mockRestore();
  });

  describe('Initial State', () => {
    it('should show loading indicator when restoring', () => {
      const { UNSAFE_queryByType } = render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      // Should show loading initially (check state)
      expect(store.getState().auth.isRestoring).toBe(true);
    });

    it('should render children after restoration completes (no stored auth)', async () => {
      const { getByTestId } = render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.isRestoring).toBe(false);
      });

      expect(getByTestId('app-content')).toBeTruthy();
    });
  });

  describe('Auth Restoration - Success Cases', () => {
    it('should restore auth and load shift for worker with active shift', async () => {
      const mockToken = 'valid-token';
      const mockArea = { id: 1, name: 'Test Area' };

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: { ...mockFieldUser, assigned_area: mockArea },
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: mockShift,
      });
      (locationTracker.initialize as jest.Mock).mockResolvedValue(undefined);

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockFieldUser);
      });

      expect(store.getState().auth.assignedArea).toEqual(mockArea);
      expect(store.getState().shift.currentShift).toEqual(mockShift);
      expect(locationTracker.initialize).toHaveBeenCalledWith('123');
    });

    it('should restore auth for worker without active shift', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockFieldUser,
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: null,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockFieldUser);
      });

      expect(store.getState().shift.currentShift).toBeNull();
      expect(locationTracker.initialize).not.toHaveBeenCalled();
    });

    it('should restore auth for monitoring role (no shift loading)', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockMonitoringUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockMonitoringUser,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockMonitoringUser);
      });

      expect(shiftsApi.getCurrentShift).not.toHaveBeenCalled();
      expect(locationTracker.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Auth Restoration - Network Error Fallback', () => {
    it('should use cached credentials on network timeout', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockImplementation(
        () => new Promise((_, reject) =>
          setTimeout(() => reject(new Error('Network timeout')), 15000))
      );
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: null,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(
        () => {
          expect(store.getState().auth.user).toEqual(mockFieldUser);
        },
        { timeout: 15000 }
      );

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[AuthProvider] Network timeout, using cached credentials:',
        expect.any(Error)
      );
    }, 20000);

    it('should use cached credentials on API validation failure', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({ data: null });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: null,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockFieldUser);
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[AuthProvider] API validation failed, using cached credentials'
      );
    });

    it('should use cached credentials on network error', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockRejectedValue(
        new Error('Network request failed')
      );
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: null,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockFieldUser);
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[AuthProvider] Network timeout, using cached credentials:',
        expect.any(Error)
      );
    });
  });

  describe('Shift Loading - Error Handling', () => {
    it('should handle 404 error when worker has no active shift', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockFieldUser,
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue({
        response: { status: 404 },
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockFieldUser);
      });

      expect(store.getState().shift.currentShift).toBeNull();
      expect(locationTracker.initialize).not.toHaveBeenCalled();
    });

    it('should log warning on shift API error (non-404)', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockFieldUser,
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockRejectedValue(
        new Error('API Error')
      );

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockFieldUser);
      });

      expect(mockConsoleWarn).toHaveBeenCalledWith(
        '[AuthProvider] Failed to load current shift:',
        'API Error'
      );
    });
  });

  describe('Critical Error Handling', () => {
    it('should clear storage and logout on critical error', async () => {
      (secureStorage.getToken as jest.Mock).mockRejectedValue(
        new Error('Storage corrupted')
      );

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(secureStorage.clearAll).toHaveBeenCalled();
      });

      expect(store.getState().auth.user).toBeNull();
      expect(mockConsoleError).toHaveBeenCalledWith(
        '[AuthProvider] Failed to restore session:',
        expect.any(Error)
      );
    });

    it('should handle missing token gracefully', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue(null);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.isRestoring).toBe(false);
      });

      expect(store.getState().auth.user).toBeNull();
      expect(authApi.getMe).not.toHaveBeenCalled();
    });

    it('should handle missing user gracefully', async () => {
      (secureStorage.getToken as jest.Mock).mockResolvedValue('token');
      (secureStorage.getUser as jest.Mock).mockResolvedValue(null);

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.isRestoring).toBe(false);
      });

      expect(store.getState().auth.user).toBeNull();
      expect(authApi.getMe).not.toHaveBeenCalled();
    });
  });

  describe('Location Tracking Initialization', () => {
    it('should start location tracking only for workers with active shifts', async () => {
      const mockToken = 'valid-token';
      const shiftWithId = { ...mockShift, id: 456 };

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockFieldUser,
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: shiftWithId,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(locationTracker.initialize).toHaveBeenCalledWith('456');
      });

      expect(mockConsoleDebug).toHaveBeenCalledWith(
        '[AuthProvider] Active shift found and permissions granted, starting location tracking'
      );
    });

    it('should not start location tracking when shift has no id', async () => {
      const mockToken = 'valid-token';
      const shiftWithoutId = { ...mockShift, id: null };

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockFieldUser,
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: shiftWithoutId,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().shift.currentShift).toEqual(shiftWithoutId);
      });

      expect(locationTracker.initialize).not.toHaveBeenCalled();
    });

    it('should not start location tracking when permissions are denied', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockFieldUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockFieldUser,
      });
      (shiftsApi.getCurrentShift as jest.Mock).mockResolvedValue({
        data: mockShift,
      });

      // Mock permissions as denied
      (permissionManager.hasCompletedOnboarding as jest.Mock).mockResolvedValue(false);
      (permissionManager.checkLocationPermission as jest.Mock).mockResolvedValue(false);

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().shift.currentShift).toEqual(mockShift);
      });

      expect(locationTracker.initialize).not.toHaveBeenCalled();
    });
  });

  describe('Edge Cases', () => {
    it('should handle multiple rapid remounts correctly', async () => {
      const mockToken = 'valid-token';

      (secureStorage.getToken as jest.Mock).mockResolvedValue(mockToken);
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockMonitoringUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockMonitoringUser,
      });

      const { rerender, unmount } = render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>Content 1</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      // Remount multiple times
      for (let i = 0; i < 3; i++) {
        rerender(
          <Provider store={store}>
            <AuthProvider>
              <View testID="app-content">
                <Text>Content {i + 2}</Text>
              </View>
            </AuthProvider>
          </Provider>
        );
      }

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockMonitoringUser);
      });

      unmount();

      // Should call getMe only once despite remounts
      expect(authApi.getMe).toHaveBeenCalledTimes(1);
    });

    it('should handle admin user correctly (no shift loading)', async () => {
      const mockAdminUser = {
        id: 3,
        username: 'admin',
        name: 'Admin User',
        role: 'admin_system',
        phone: '081234567892',
      };

      (secureStorage.getToken as jest.Mock).mockResolvedValue('valid-token');
      (secureStorage.getUser as jest.Mock).mockResolvedValue(mockAdminUser);
      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: mockAdminUser,
      });

      render(
        <Provider store={store}>
          <AuthProvider>
            <View testID="app-content">
              <Text>App Content</Text>
            </View>
          </AuthProvider>
        </Provider>
      );

      await waitFor(() => {
        expect(store.getState().auth.user).toEqual(mockAdminUser);
      });

      expect(shiftsApi.getCurrentShift).not.toHaveBeenCalled();
      expect(locationTracker.initialize).not.toHaveBeenCalled();
    });
  });
});
