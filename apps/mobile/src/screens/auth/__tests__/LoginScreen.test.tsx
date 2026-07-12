/**
 * LoginScreen Tests — Phase 4 M3 (AS-1…AS-3)
 * Inputs/button queried by testID (stable across the v2.1 revamp). Validation is
 * blur-triggered + submit-gated; server auth failures surface as a generic toast.
 */

import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import LoginScreen from '../LoginScreen';
import authReducer from '../../../store/slices/authSlice';
import * as authApi from '../../../services/api/authApi';
import * as secureStorage from '../../../services/storage/secureStorage';
import { loadAndSyncCurrentShift } from '../../../services/shift';

jest.mock('../../../services/api/authApi');
jest.mock('../../../services/storage/secureStorage');

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn(), goBack: jest.fn(), canGoBack: () => true }),
}));
jest.mock('../../../services/shift', () => ({
  loadAndSyncCurrentShift: jest.fn().mockResolvedValue(undefined),
}));

// Mock NBBackgroundPattern to avoid SVG rendering issues in tests
jest.mock('../../../components/nb/NBBackgroundPattern', () => ({
  NBBackgroundPattern: ({ children }: { children: React.ReactNode }) => children,
}));

const mockNBToastShow = jest.fn();
jest.mock('../../../components/nb/NBToast', () => ({
  NBToast: { show: (...args: any[]) => mockNBToastShow(...args), hide: jest.fn() },
  NBToastProvider: () => null,
  nbToastConfig: {},
}));

const createTestStore = (initialState?: Partial<ReturnType<typeof authReducer>>) =>
  configureStore({
    reducer: { auth: authReducer },
    preloadedState: {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- legacy test preloadedState
      auth: {
        user: null,
        assignedArea: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
        ...initialState,
      } as any,
    },
  });

const renderLoginScreen = (store = createTestStore()) =>
  render(
    <Provider store={store}>
      <LoginScreen />
    </Provider>,
  );

// Fill valid credentials (≥3-char identifier, ≥6-char password) so the gated
// submit button is enabled.
const fillValid = (q: ReturnType<typeof renderLoginScreen>, id = 'worker1', pw = 'worker123') => {
  fireEvent.changeText(q.getByTestId('username-input'), id);
  fireEvent.changeText(q.getByTestId('password-input'), pw);
};

describe('LoginScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (secureStorage.setToken as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.setUser as jest.Mock).mockResolvedValue(undefined);
  });

  afterEach(async () => {
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  });

  describe('rendering', () => {
    it('renders the AS-1 layout (heading, fields, CTA, version)', () => {
      const { getByText, getByTestId, getByPlaceholderText } = renderLoginScreen();
      expect(getByText('Selamat datang.')).toBeTruthy();
      expect(getByText('Masuk menggunakan No. HP atau username Anda')).toBeTruthy();
      expect(getByText('No. Handphone / Username')).toBeTruthy();
      expect(getByText('Kata Sandi')).toBeTruthy();
      expect(getByPlaceholderText('081234567890')).toBeTruthy();
      expect(getByTestId('login-logo')).toBeTruthy();
      expect(getByText('Masuk')).toBeTruthy();
      expect(getByText('v1.0.0')).toBeTruthy();
    });

    it('shows the loading state instead of the "Masuk" label', () => {
      const { queryByText } = renderLoginScreen(createTestStore({ isLoading: true }));
      expect(queryByText('Masuk')).toBeNull();
    });
  });

  describe('form validation (AS-2, blur-triggered + submit-gated)', () => {
    it('flags a too-short identifier on blur and does not call login', async () => {
      const q = renderLoginScreen();
      fireEvent.changeText(q.getByTestId('username-input'), 'ab');
      fireEvent(q.getByTestId('username-input'), 'blur');
      await waitFor(() => expect(q.getByText('Minimal 3 karakter')).toBeTruthy());
      expect(authApi.login).not.toHaveBeenCalled();
    });

    it('flags an empty identifier on blur', async () => {
      const q = renderLoginScreen();
      fireEvent(q.getByTestId('username-input'), 'blur');
      await waitFor(() => expect(q.getByText('No. HP / Username wajib diisi')).toBeTruthy());
    });

    it('flags a too-short password on blur', async () => {
      const q = renderLoginScreen();
      fireEvent.changeText(q.getByTestId('password-input'), '12345');
      fireEvent(q.getByTestId('password-input'), 'blur');
      await waitFor(() => expect(q.getByText('Kata Sandi minimal 6 karakter')).toBeTruthy());
    });

    it('flags an empty password on blur', async () => {
      const q = renderLoginScreen();
      fireEvent(q.getByTestId('password-input'), 'blur');
      await waitFor(() => expect(q.getByText('Kata Sandi wajib diisi')).toBeTruthy());
    });

    it('clears the identifier error once it becomes valid', async () => {
      const q = renderLoginScreen();
      fireEvent(q.getByTestId('username-input'), 'blur');
      await waitFor(() => expect(q.getByText('No. HP / Username wajib diisi')).toBeTruthy());
      fireEvent.changeText(q.getByTestId('username-input'), 'worker1');
      await waitFor(() => expect(q.queryByText('No. HP / Username wajib diisi')).toBeNull());
    });
  });

  describe('successful login', () => {
    const satgasUser = { id: 1, username: 'worker1', full_name: 'Test Worker', role: 'satgas' };
    const withArea = {
      ...satgasUser,
      assigned_area: { id: 1, name: 'Park A', gps_lat: '-7.25', gps_lng: '112.75', radius_meters: '100' },
    };

    it('calls login with the entered credentials and stores the token/user', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ data: { access_token: 'tok', user: satgasUser } });
      (authApi.getMe as jest.Mock).mockResolvedValue({ data: withArea });

      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));

      await waitFor(() => expect(authApi.login).toHaveBeenCalledWith('worker1', 'worker123'));
      await waitFor(() => {
        expect(secureStorage.setToken).toHaveBeenCalledWith('tok');
        expect(secureStorage.setUser).toHaveBeenCalledWith(satgasUser);
      });
    });

    it('loads the current shift for clockable users', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ data: { access_token: 'tok', user: satgasUser } });
      (authApi.getMe as jest.Mock).mockResolvedValue({ data: withArea });

      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));

      await waitFor(() => expect(loadAndSyncCurrentShift).toHaveBeenCalled(), { timeout: 1000 });
    });

    it('fetches the assigned area for clockable users', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ data: { access_token: 'tok', user: satgasUser } });
      (authApi.getMe as jest.Mock).mockResolvedValue({ data: withArea });

      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));

      await waitFor(() => expect(authApi.getMe).toHaveBeenCalled());
    });

    it('does not fetch area / shift for non-clockable users', async () => {
      const manager = { id: 1, username: 'manager1', full_name: 'Mgr', role: 'management' };
      (authApi.login as jest.Mock).mockResolvedValue({ data: { access_token: 'tok', user: manager } });

      const q = renderLoginScreen();
      fillValid(q, 'manager1', 'manager123');
      fireEvent.press(q.getByTestId('login-button'));

      await waitFor(() => expect(authApi.login).toHaveBeenCalled());
      expect(authApi.getMe).not.toHaveBeenCalled();
      expect(loadAndSyncCurrentShift).not.toHaveBeenCalled();
    });

    it('converts assigned-area GPS strings to numbers', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ data: { access_token: 'tok', user: satgasUser } });
      (authApi.getMe as jest.Mock).mockResolvedValue({ data: withArea });

      const store = createTestStore();
      const q = render(
        <Provider store={store}>
          <LoginScreen />
        </Provider>,
      );
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));

      await waitFor(() => {
        const state = store.getState().auth;
        if (state.assignedArea) {
          expect(typeof state.assignedArea.gps_lat).toBe('number');
          expect(typeof state.assignedArea.gps_lng).toBe('number');
          expect(typeof state.assignedArea.radius_meters).toBe('number');
        }
      });
    });

    it('continues login even if getMe fails', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ data: { access_token: 'tok', user: satgasUser } });
      (authApi.getMe as jest.Mock).mockRejectedValue(new Error('Failed to fetch'));

      const store = createTestStore();
      const q = render(
        <Provider store={store}>
          <LoginScreen />
        </Provider>,
      );
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));

      await waitFor(() => {
        expect(secureStorage.setToken).toHaveBeenCalled();
        expect(secureStorage.setUser).toHaveBeenCalledWith(satgasUser);
      });
      expect(store.getState().auth.user).toEqual(satgasUser);
    });
  });

  describe('error handling (AS-3, generic toast)', () => {
    it('shows a generic auth-fail toast on API error', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ error: 'Invalid credentials' });
      const q = renderLoginScreen();
      fillValid(q, 'worker1', 'wrongpass');
      fireEvent.press(q.getByTestId('login-button'));
      await waitFor(() =>
        expect(mockNBToastShow).toHaveBeenCalledWith(
          expect.objectContaining({ level: 'danger', body: 'No. HP atau Kata Sandi salah. Coba lagi.' }),
        ),
      );
    });

    it('shows the generic toast on null data', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ data: null });
      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));
      await waitFor(() =>
        expect(mockNBToastShow).toHaveBeenCalledWith(
          expect.objectContaining({ body: 'No. HP atau Kata Sandi salah. Coba lagi.' }),
        ),
      );
    });

    it('shows a server-error toast when the token is missing', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({ data: { user: { id: 1, username: 'w', role: 'satgas' } } });
      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));
      await waitFor(() =>
        expect(mockNBToastShow).toHaveBeenCalledWith(
          expect.objectContaining({ body: 'Server bermasalah, coba lagi sebentar lagi.' }),
        ),
      );
    });

    it('shows a connection toast on a thrown error', async () => {
      (authApi.login as jest.Mock).mockRejectedValue(new Error('Network error'));
      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));
      await waitFor(() =>
        expect(mockNBToastShow).toHaveBeenCalledWith(
          expect.objectContaining({ level: 'danger', body: 'Tidak bisa terhubung. Coba lagi.' }),
        ),
      );
    });

    it('shows the connection toast even for a non-Error throw', async () => {
      (authApi.login as jest.Mock).mockRejectedValue('string-error');
      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));
      await waitFor(() =>
        expect(mockNBToastShow).toHaveBeenCalledWith(
          expect.objectContaining({ body: 'Tidak bisa terhubung. Coba lagi.' }),
        ),
      );
    });
  });

  describe('loading state', () => {
    it('disables inputs while logging in', async () => {
      (authApi.login as jest.Mock).mockImplementation(() => new Promise(() => {}));
      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));
      await waitFor(() => {
        // Props live on the inner TextInput (NBTextInput's testID is on the wrapper).
        expect(q.getByPlaceholderText('081234567890').props.editable).toBe(false);
        expect(q.getByPlaceholderText('Masukkan kata sandi').props.editable).toBe(false);
      });
    });

    it('calls login exactly once per press', async () => {
      (authApi.login as jest.Mock).mockResolvedValue({
        data: { access_token: 'tok', user: { id: 1, username: 'm', full_name: 'M', role: 'management' } },
      });
      const q = renderLoginScreen();
      fillValid(q);
      fireEvent.press(q.getByTestId('login-button'));
      await waitFor(() => expect(authApi.login).toHaveBeenCalledTimes(1));
    });
  });

  describe('input handling', () => {
    it('updates identifier + password values on change', () => {
      const q = renderLoginScreen();
      fireEvent.changeText(q.getByPlaceholderText('081234567890'), 'testuser');
      fireEvent.changeText(q.getByPlaceholderText('Masukkan kata sandi'), 'testpassword');
      expect(q.getByPlaceholderText('081234567890').props.value).toBe('testuser');
      expect(q.getByPlaceholderText('Masukkan kata sandi').props.value).toBe('testpassword');
    });

    it('uses secureTextEntry + autoCapitalize=none', () => {
      const q = renderLoginScreen();
      expect(q.getByPlaceholderText('Masukkan kata sandi').props.secureTextEntry).toBe(true);
      expect(q.getByPlaceholderText('081234567890').props.autoCapitalize).toBe('none');
      expect(q.getByPlaceholderText('Masukkan kata sandi').props.autoCapitalize).toBe('none');
    });
  });

  describe('production logging is quiet (__DEV__ = false)', () => {
    it('does not emit FCM console output in production', async () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});

      const user = { id: 1, username: 'worker1', full_name: 'Worker', role: 'satgas' };
      (authApi.login as jest.Mock).mockResolvedValue({ data: { access_token: 'tok', user } });
      (authApi.getMe as jest.Mock).mockResolvedValue({ data: { ...user, assigned_area: null } });

      const q = render(
        <Provider store={createTestStore()}>
          <LoginScreen />
        </Provider>,
      );
      fillValid(q);
      await act(async () => {
        fireEvent.press(q.getByTestId('login-button'));
        await new Promise((resolve) => setTimeout(resolve, 50));
      });

      expect(consoleSpy.mock.calls.filter((a) => String(a[0]).includes('FCM'))).toHaveLength(0);
      expect(warnSpy.mock.calls.filter((a) => String(a[0]).includes('FCM'))).toHaveLength(0);

      consoleSpy.mockRestore();
      warnSpy.mockRestore();
      (global as any).__DEV__ = originalDev;
    });
  });
});
