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
jest.mock('../../../services/storage/secureStorage', () => ({
  setToken: (...a: unknown[]) => mockSetToken(...a),
  setRefreshToken: (...a: unknown[]) => mockSetRefreshToken(...a),
  setUser: (...a: unknown[]) => mockSetUserStorage(...a),
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
  });

  it('validates new password length', async () => {
    const { getByTestId, getByText } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-old'), 'oldpass1');
    fireEvent.changeText(getByTestId('change-password-new'), 'short');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'short');
    fireEvent.press(getByTestId('change-password-submit'));
    await waitFor(() => {
      expect(getByText(/minimal 8 karakter/i)).toBeTruthy();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('validates confirm password mismatch', async () => {
    const { getByTestId, getByText } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-old'), 'oldpass1');
    fireEvent.changeText(getByTestId('change-password-new'), 'newpassword');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'different1');
    fireEvent.press(getByTestId('change-password-submit'));
    await waitFor(() => {
      expect(getByText(/tidak cocok/i)).toBeTruthy();
    });
    expect(mockChangePassword).not.toHaveBeenCalled();
  });

  it('rejects when new password matches old', async () => {
    const { getByTestId, getByText } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-old'), 'samepass1');
    fireEvent.changeText(getByTestId('change-password-new'), 'samepass1');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'samepass1');
    fireEvent.press(getByTestId('change-password-submit'));
    await waitFor(() => {
      expect(getByText(/harus berbeda/i)).toBeTruthy();
    });
  });

  it('on success: stores rotated tokens + dispatches setUser', async () => {
    mockChangePassword.mockResolvedValue({
      data: {
        access_token: 'new.access',
        refresh_token: 'new.refresh',
        user: { id: 'u-1', password_must_change: false, role: 'satgas' },
      },
    });
    const { getByTestId } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-old'), 'oldpass1');
    fireEvent.changeText(getByTestId('change-password-new'), 'newpassword');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'newpassword');
    fireEvent.press(getByTestId('change-password-submit'));

    await waitFor(() => {
      expect(mockChangePassword).toHaveBeenCalledWith('oldpass1', 'newpassword');
    });
    expect(mockSetToken).toHaveBeenCalledWith('new.access');
    expect(mockSetRefreshToken).toHaveBeenCalledWith('new.refresh');
    expect(mockSetUserStorage).toHaveBeenCalled();
  });

  it('on wrong old password: surfaces inline error', async () => {
    mockChangePassword.mockRejectedValue(new Error('AUTH_INVALID_CREDENTIALS'));
    const { getByTestId, getByText } = renderWithStore();
    fireEvent.changeText(getByTestId('change-password-old'), 'wrongpass');
    fireEvent.changeText(getByTestId('change-password-new'), 'newpassword');
    fireEvent.changeText(getByTestId('change-password-confirm'), 'newpassword');
    fireEvent.press(getByTestId('change-password-submit'));
    await waitFor(() => {
      expect(getByText(/sandi lama tidak benar/i)).toBeTruthy();
    });
  });
});
