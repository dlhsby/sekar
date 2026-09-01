import React from 'react';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChangePasswordScreen } from '../ChangePasswordScreen';
import authReducer from '../../../store/slices/authSlice';

const mockChangePassword = jest.fn();
jest.mock('../../../services/api/authApi', () => ({
  changePasswordAndRotate: (...args: unknown[]) => mockChangePassword(...args),
}));

const mockSetToken = jest.fn().mockResolvedValue(undefined);
const mockSetRefreshToken = jest.fn().mockResolvedValue(undefined);
const mockSetUserStorage = jest.fn().mockResolvedValue(undefined);
const mockClearAll = jest.fn().mockResolvedValue(undefined);
jest.mock('../../../services/storage/secureStorage', () => ({
  setToken: (...a: unknown[]) => mockSetToken(...a),
  setRefreshToken: (...a: unknown[]) => mockSetRefreshToken(...a),
  setUser: (...a: unknown[]) => mockSetUserStorage(...a),
  clearAll: (...a: unknown[]) => mockClearAll(...a),
}));

const mockToast = jest.fn();
jest.mock('../../../components/nb/NBToast', () => ({
  NBToast: { show: (...a: unknown[]) => mockToast(...a), hide: jest.fn() },
  NBToastProvider: () => null,
  nbToastConfig: {},
}));

const renderWithStore = () => {
  const store = configureStore({ reducer: { auth: authReducer } });
  return render(
    <Provider store={store}>
      <ChangePasswordScreen />
    </Provider>,
  );
};

describe('ChangePasswordScreen', () => {
  beforeEach(() => {
    mockChangePassword.mockReset();
    mockSetToken.mockClear();
    mockSetRefreshToken.mockClear();
    mockSetUserStorage.mockClear();
    mockToast.mockClear();
  });

  it('renders the live requirement checklist (no temporary-password field)', () => {
    const { getByText, queryByTestId } = renderWithStore();
    expect(getByText('Minimal 6 karakter')).toBeTruthy();
    expect(getByText('Konfirmasi cocok')).toBeTruthy();
    // Temporary-password field is gone — the user already authenticated with it.
    expect(queryByTestId('change-password-old')).toBeNull();
  });

  it('gates submit while the new password is too short', () => {
    const { getByTestId } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-new'), 'short');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'short');
    fireEvent.press(getByTestId('change-password-submit'));
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('gates submit while confirmation does not match', () => {
    const { getByTestId } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-new'), 'newpass12');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'different9');
    fireEvent.press(getByTestId('change-password-submit'));
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('on success: submits the new password, stores tokens, shows confirmation', async () => {
    mockChangePassword.mockResolvedValue({
      data: {
        access_token: 'new.access',
        refresh_token: 'new.refresh',
        user: { id: 'u-1', password_must_change: false, role: 'satgas' },
      },
    });
    const { getByTestId } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-new'), 'newpass12');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'newpass12');
    fireEvent.press(getByTestId('change-password-submit'));

    await waitFor(() => expect(mockChangePassword).toHaveBeenCalledWith('newpass12'));
    expect(mockSetToken).toHaveBeenCalledWith('new.access');
    expect(mockSetRefreshToken).toHaveBeenCalledWith('new.refresh');
    expect(mockSetUserStorage).toHaveBeenCalled();
    await waitFor(() => expect(getByTestId('change-password-success')).toBeTruthy());
  });

  it('on reused temporary password: surfaces a toast', async () => {
    mockChangePassword.mockRejectedValue(new Error('AUTH_INVALID_CREDENTIALS'));
    const { getByTestId } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-new'), 'newpass12');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'newpass12');
    fireEvent.press(getByTestId('change-password-submit'));
    await waitFor(() =>
      expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
          level: 'danger',
          body: 'Sandi baru tidak boleh sama dengan sandi sementara.',
        }),
      ),
    );
  });
});
