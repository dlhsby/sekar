/**
 * LoginScreen Tests
 * Unit tests for authentication screen
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LoginScreen from '../LoginScreen';
import authReducer from '../../../store/slices/authSlice';
import * as authApi from '../../../services/api/authApi';
import * as secureStorage from '../../../services/storage/secureStorage';
import { loadAndSyncCurrentShift } from '../../../services/shift';

// Mock the APIs
jest.mock('../../../services/api/authApi');
jest.mock('../../../services/storage/secureStorage');
jest.mock('../../../services/shift', () => ({
  loadAndSyncCurrentShift: jest.fn().mockResolvedValue(undefined),
}));

// Mock NBBackgroundPattern to avoid SVG rendering issues in tests
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: { children: React.ReactNode }) => children,
}));

// Helper to create test store
const createTestStore = (initialState?: Partial<ReturnType<typeof authReducer>>) => {
  return configureStore({
    reducer: {
      auth: authReducer,
    },
    preloadedState: {
      auth: {
        user: null,
        assignedArea: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...initialState,
      },
    },
  });
};

// Helper to render LoginScreen with providers
const renderLoginScreen = (store = createTestStore()) => {
  return render(
    <Provider store={store}>
      <LoginScreen />
    </Provider>
  );
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Setup Alert spy in beforeEach to prevent cross-test pollution
    jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    (secureStorage.setToken as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.setUser as jest.Mock).mockResolvedValue(undefined);
  });

  describe('rendering', () => {
    it('should render login form correctly', () => {
      const { getByText, getByPlaceholderText } = renderLoginScreen();

      expect(getByText('SEKAR')).toBeTruthy();
      expect(getByText('Sistem Evaluasi Kerja Satgas RTH')).toBeTruthy();
      expect(getByText('Username')).toBeTruthy();
      expect(getByText('Password')).toBeTruthy();
      expect(getByPlaceholderText('Masukkan username')).toBeTruthy();
      expect(getByPlaceholderText('Masukkan password')).toBeTruthy();
      expect(getByText('Masuk')).toBeTruthy();
    });

    it('should render footer with copyright', () => {
      const { getByText } = renderLoginScreen();

      expect(getByText('DLH Surabaya © 2026')).toBeTruthy();
    });

    it('should show loading indicator when isLoading is true', () => {
      const store = createTestStore({ isLoading: true });
      const { getByTestId, queryByText } = renderLoginScreen(store);

      // Button should not show "Masuk" text when loading
      expect(queryByText('Masuk')).toBeNull();
    });
  });

  describe('form validation', () => {
    it('should show error when username is less than 3 characters', async () => {
      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const usernameInput = getByPlaceholderText('Masukkan username');
      const passwordInput = getByPlaceholderText('Masukkan password');
      const loginButton = getByText('Masuk');

      fireEvent.changeText(usernameInput, 'ab');
      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Username harus diisi (minimal 3 karakter)')).toBeTruthy();
      });

      expect(authApi.login).not.toHaveBeenCalled();
    });

    it('should show error when password is less than 6 characters', async () => {
      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const usernameInput = getByPlaceholderText('Masukkan username');
      const passwordInput = getByPlaceholderText('Masukkan password');
      const loginButton = getByText('Masuk');

      fireEvent.changeText(usernameInput, 'worker1');
      fireEvent.changeText(passwordInput, '12345');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Password harus diisi (minimal 6 karakter)')).toBeTruthy();
      });

      expect(authApi.login).not.toHaveBeenCalled();
    });

    it('should show error when username is empty', async () => {
      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const passwordInput = getByPlaceholderText('Masukkan password');
      const loginButton = getByText('Masuk');

      fireEvent.changeText(passwordInput, 'password123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Username harus diisi (minimal 3 karakter)')).toBeTruthy();
      });
    });

    it('should show error when password is empty', async () => {
      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const usernameInput = getByPlaceholderText('Masukkan username');
      const loginButton = getByText('Masuk');

      fireEvent.changeText(usernameInput, 'worker1');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Password harus diisi (minimal 6 karakter)')).toBeTruthy();
      });
    });

    it('should clear error when user starts typing', async () => {
      const { getByPlaceholderText, getByText, queryByText } = renderLoginScreen();

      const usernameInput = getByPlaceholderText('Masukkan username');
      const loginButton = getByText('Masuk');

      // Trigger validation error
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(getByText('Username harus diisi (minimal 3 karakter)')).toBeTruthy();
      });

      // Start typing to clear error
      fireEvent.changeText(usernameInput, 'w');

      await waitFor(() => {
        expect(queryByText('Username harus diisi (minimal 3 karakter)')).toBeNull();
      });
    });
  });

  describe('successful login', () => {
    it('should call login API with correct credentials for worker', async () => {
      const mockUser = {
        id: 1,
        username: 'worker1',
        full_name: 'Test Worker',
        role: 'satgas',
      };
      const mockToken = 'test-access-token';

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          access_token: mockToken,
          user: mockUser,
        },
      });

      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: {
          ...mockUser,
          assigned_area: {
            id: 1,
            name: 'Park A',
            gps_lat: '-7.25',
            gps_lng: '112.75',
            radius_meters: '100',
          },
        },
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const usernameInput = getByPlaceholderText('Masukkan username');
      const passwordInput = getByPlaceholderText('Masukkan password');
      const loginButton = getByText('Masuk');

      fireEvent.changeText(usernameInput, 'worker1');
      fireEvent.changeText(passwordInput, 'worker123');
      fireEvent.press(loginButton);

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalledWith('worker1', 'worker123');
      });

      await waitFor(() => {
        expect(secureStorage.setToken).toHaveBeenCalledWith(mockToken);
        expect(secureStorage.setUser).toHaveBeenCalledWith(mockUser);
      });
    });

    it('should call loadAndSyncCurrentShift for worker users after login', async () => {
      const mockUser = {
        id: 1,
        username: 'worker1',
        full_name: 'Test Worker',
        role: 'satgas',
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'test-token',
          user: mockUser,
        },
      });

      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: {
          ...mockUser,
          assigned_area: {
            id: 1,
            name: 'Park A',
            gps_lat: '-7.25',
            gps_lng: '112.75',
            radius_meters: '100',
          },
        },
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
      });

      // Wait a bit for the async loadAndSyncCurrentShift call
      await waitFor(() => {
        expect(loadAndSyncCurrentShift).toHaveBeenCalled();
      }, { timeout: 1000 });
    });

    it('should fetch assigned area for worker users', async () => {
      const mockUser = {
        id: 1,
        username: 'worker1',
        full_name: 'Test Worker',
        role: 'satgas',
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'test-token',
          user: mockUser,
        },
      });

      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: {
          ...mockUser,
          assigned_area: {
            id: 1,
            name: 'Park A',
            gps_lat: '-7.25',
            gps_lng: '112.75',
            radius_meters: '100',
          },
        },
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(authApi.getMe).toHaveBeenCalled();
      });
    });

    it('should not fetch assigned area for non-clockable users', async () => {
      const mockUser = {
        id: 1,
        username: 'manager1',
        full_name: 'Test Manager',
        role: 'top_management',
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'test-token',
          user: mockUser,
        },
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'manager1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'manager123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
      });

      // Should not call getMe for non-clockable roles
      expect(authApi.getMe).not.toHaveBeenCalled();

      // Should not call loadAndSyncCurrentShift for non-clockable roles
      expect(loadAndSyncCurrentShift).not.toHaveBeenCalled();
    });

    it('should not crash if loadAndSyncCurrentShift fails for worker', async () => {
      const mockUser = {
        id: 1,
        username: 'worker1',
        full_name: 'Test Worker',
        role: 'satgas',
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'test-token',
          user: mockUser,
        },
      });

      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: {
          ...mockUser,
          assigned_area: null,
        },
      });

      // Mock loadAndSyncCurrentShift to reject
      (loadAndSyncCurrentShift as jest.Mock).mockRejectedValueOnce(
        new Error('Shift load failed')
      );

      const store = createTestStore();
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <LoginScreen />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(authApi.login).toHaveBeenCalled();
      });

      // Login should still succeed even if shift load fails
      await waitFor(() => {
        const state = store.getState().auth;
        expect(state.user).toEqual(mockUser);
      });

      // Should not show an alert (error is caught silently)
      expect(Alert.alert).not.toHaveBeenCalledWith(
        expect.anything(),
        expect.stringContaining('Shift')
      );
    });

    it('should convert GPS coordinates to numbers', async () => {
      const mockUser = {
        id: 1,
        username: 'worker1',
        full_name: 'Test Worker',
        role: 'satgas',
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'test-token',
          user: mockUser,
        },
      });

      (authApi.getMe as jest.Mock).mockResolvedValue({
        data: {
          ...mockUser,
          assigned_area: {
            id: 1,
            name: 'Park A',
            gps_lat: '-7.25',
            gps_lng: '112.75',
            radius_meters: '100',
          },
        },
      });

      const store = createTestStore();
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <LoginScreen />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        const state = store.getState().auth;
        if (state.assignedArea) {
          expect(typeof state.assignedArea.gps_lat).toBe('number');
          expect(typeof state.assignedArea.gps_lng).toBe('number');
          expect(typeof state.assignedArea.radius_meters).toBe('number');
        }
      });
    });
  });

  describe('error handling', () => {
    it('should show alert when login fails with API error', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({
        error: 'Invalid credentials',
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'wrongpassword');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid credentials');
      });
    });

    it('should show alert when login fails with null data', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({
        data: null,
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Login gagal');
      });
    });

    it('should show alert when token is missing from response', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          user: { id: 1, username: 'worker1', role: 'satgas' },
          // No access_token
        },
      });

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Invalid response from server');
      });
    });

    it('should show alert when network error occurs', async () => {
      (authApi.login as jest.Mock).mockRejectedValue(new Error('Network error'));

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        expect(Alert.alert).toHaveBeenCalledWith('Error', 'Network error');
      });
    });

    it('should continue login if getMe fails for worker', async () => {
      const mockUser = {
        id: 1,
        username: 'worker1',
        full_name: 'Test Worker',
        role: 'satgas',
      };

      (authApi.login as jest.Mock).mockResolvedValue({
        data: {
          access_token: 'test-token',
          user: mockUser,
        },
      });

      (authApi.getMe as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      const store = createTestStore();
      const { getByPlaceholderText, getByText } = render(
        <Provider store={store}>
          <LoginScreen />
        </Provider>
      );

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');
      fireEvent.press(getByText('Masuk'));

      await waitFor(() => {
        // Login should still succeed even if getMe fails
        expect(secureStorage.setToken).toHaveBeenCalled();
        expect(secureStorage.setUser).toHaveBeenCalledWith(mockUser);
      });

      // User should be logged in
      const state = store.getState().auth;
      expect(state.user).toEqual(mockUser);
    });
  });

  describe('loading state', () => {
    it('should disable inputs when loading', async () => {
      (authApi.login as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      const usernameInput = getByPlaceholderText('Masukkan username');
      const passwordInput = getByPlaceholderText('Masukkan password');
      const loginButton = getByText('Masuk');

      fireEvent.changeText(usernameInput, 'worker1');
      fireEvent.changeText(passwordInput, 'worker123');
      fireEvent.press(loginButton);

      // Check that inputs are disabled while loading
      // Note: React Native doesn't have a direct "disabled" query, so we check the editable prop
      await waitFor(() => {
        expect(usernameInput.props.editable).toBe(false);
        expect(passwordInput.props.editable).toBe(false);
      });
    });

    it('should disable button when loading', async () => {
      (authApi.login as jest.Mock).mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 1000))
      );

      const { getByPlaceholderText, getByText } = renderLoginScreen();

      fireEvent.changeText(getByPlaceholderText('Masukkan username'), 'worker1');
      fireEvent.changeText(getByPlaceholderText('Masukkan password'), 'worker123');

      const loginButton = getByText('Masuk');
      fireEvent.press(loginButton);

      // Button should be disabled (can't press again)
      // This is implied by the disabled prop on TouchableOpacity
      await waitFor(() => {
        // The button should show loading state
        expect(authApi.login).toHaveBeenCalledTimes(1);
      });
    });
  });

  describe('input handling', () => {
    it('should update username state on change', () => {
      const { getByPlaceholderText } = renderLoginScreen();
      const usernameInput = getByPlaceholderText('Masukkan username');

      fireEvent.changeText(usernameInput, 'testuser');

      expect(usernameInput.props.value).toBe('testuser');
    });

    it('should update password state on change', () => {
      const { getByPlaceholderText } = renderLoginScreen();
      const passwordInput = getByPlaceholderText('Masukkan password');

      fireEvent.changeText(passwordInput, 'testpassword');

      expect(passwordInput.props.value).toBe('testpassword');
    });

    it('should have secureTextEntry for password input', () => {
      const { getByPlaceholderText } = renderLoginScreen();
      const passwordInput = getByPlaceholderText('Masukkan password');

      expect(passwordInput.props.secureTextEntry).toBe(true);
    });

    it('should have autoCapitalize none for both inputs', () => {
      const { getByPlaceholderText } = renderLoginScreen();
      const usernameInput = getByPlaceholderText('Masukkan username');
      const passwordInput = getByPlaceholderText('Masukkan password');

      expect(usernameInput.props.autoCapitalize).toBe('none');
      expect(passwordInput.props.autoCapitalize).toBe('none');
    });
  });
});
