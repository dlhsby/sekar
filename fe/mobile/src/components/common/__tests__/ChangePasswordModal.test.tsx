/**
 * ChangePasswordModal tests — validation, the /auth/change-password success flow
 * (token rotation + toast), and error mapping.
 */
import React from 'react';
import { render, fireEvent, waitFor, act } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ChangePasswordModal } from '../ChangePasswordModal';
import authReducer from '../../../store/slices/authSlice';
import * as authApi from '../../../services/api/authApi';
import * as secureStorage from '../../../services/storage/secureStorage';
import { NBToast } from '../../nb';

jest.mock('../../../services/api/authApi');
jest.mock('../../../services/storage/secureStorage');

const rotate = authApi.changePasswordAndRotate as jest.Mock;

function renderModal(props: Partial<React.ComponentProps<typeof ChangePasswordModal>> = {}) {
  const onClose = jest.fn();
  const store = configureStore({ reducer: { auth: authReducer } });
  const utils = render(
    <Provider store={store}>
      <ChangePasswordModal visible onClose={onClose} {...props} />
    </Provider>,
  );
  return { ...utils, onClose };
}

const fillValid = (u: ReturnType<typeof renderModal>) => {
  fireEvent.changeText(u.getByTestId('change-password-current-input'), 'oldpass12');
  fireEvent.changeText(u.getByTestId('change-password-new-input'), 'newpass12');
  fireEvent.changeText(u.getByTestId('change-password-confirm-input'), 'newpass12');
};

describe('ChangePasswordModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(NBToast, 'show').mockImplementation(() => {});
    (secureStorage.setToken as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.setRefreshToken as jest.Mock).mockResolvedValue(undefined);
    (secureStorage.setUser as jest.Mock).mockResolvedValue(undefined);
  });

  it('renders fields when visible', () => {
    const u = renderModal();
    expect(u.getByPlaceholderText('Password saat ini')).toBeTruthy();
    expect(u.getByPlaceholderText('Min. 8 karakter')).toBeTruthy();
    expect(u.getByPlaceholderText('Ketik ulang password baru')).toBeTruthy();
  });

  it('does not render the form when visible is false (auto-open regression guard)', () => {
    const onClose = jest.fn();
    const store = configureStore({ reducer: { auth: authReducer } });
    const { queryByText } = render(
      <Provider store={store}>
        <ChangePasswordModal visible={false} onClose={onClose} />
      </Provider>,
    );
    expect(queryByText('Password Saat Ini')).toBeNull();
  });

  it('shows validation errors and does not call the API on empty submit', () => {
    const u = renderModal();
    fireEvent.press(u.getByTestId('change-password-submit'));
    expect(u.getByText('Password saat ini wajib diisi')).toBeTruthy();
    expect(rotate).not.toHaveBeenCalled();
  });

  it('rejects a too-short new password', () => {
    const u = renderModal();
    fireEvent.changeText(u.getByTestId('change-password-current-input'), 'oldpass12');
    fireEvent.changeText(u.getByTestId('change-password-new-input'), 'ab1');
    fireEvent.changeText(u.getByTestId('change-password-confirm-input'), 'ab1');
    fireEvent.press(u.getByTestId('change-password-submit'));
    expect(u.getByText('Password baru minimal 8 karakter')).toBeTruthy();
    expect(rotate).not.toHaveBeenCalled();
  });

  it('requires letters and digits in the new password', () => {
    const u = renderModal();
    fireEvent.changeText(u.getByTestId('change-password-current-input'), 'oldpass12');
    fireEvent.changeText(u.getByTestId('change-password-new-input'), 'abcdefgh');
    fireEvent.changeText(u.getByTestId('change-password-confirm-input'), 'abcdefgh');
    fireEvent.press(u.getByTestId('change-password-submit'));
    expect(u.getByText('Password baru harus berisi huruf dan angka')).toBeTruthy();
  });

  it('rejects a new password equal to the current one', () => {
    const u = renderModal();
    fireEvent.changeText(u.getByTestId('change-password-current-input'), 'samepass1');
    fireEvent.changeText(u.getByTestId('change-password-new-input'), 'samepass1');
    fireEvent.changeText(u.getByTestId('change-password-confirm-input'), 'samepass1');
    fireEvent.press(u.getByTestId('change-password-submit'));
    expect(u.getByText('Password baru harus berbeda dari password lama')).toBeTruthy();
    expect(rotate).not.toHaveBeenCalled();
  });

  it('resets the form and calls onClose when Batal is pressed', () => {
    const u = renderModal();
    fillValid(u);
    fireEvent.press(u.getByLabelText('Batal'));
    expect(u.onClose).toHaveBeenCalledTimes(1);
    // re-renders with cleared state — the inputs are empty again
    expect(u.getByTestId('change-password-current-input').props.value).toBe('');
  });

  it('flags a confirmation mismatch', () => {
    const u = renderModal();
    fireEvent.changeText(u.getByTestId('change-password-current-input'), 'oldpass12');
    fireEvent.changeText(u.getByTestId('change-password-new-input'), 'newpass12');
    fireEvent.changeText(u.getByTestId('change-password-confirm-input'), 'different9');
    fireEvent.press(u.getByTestId('change-password-submit'));
    expect(u.getByText('Konfirmasi password tidak cocok')).toBeTruthy();
  });

  it('persists rotated tokens and toasts on success', async () => {
    rotate.mockResolvedValue({
      data: { access_token: 'AT', refresh_token: 'RT', user: { id: 'u1' } },
    });
    const u = renderModal();
    fillValid(u);
    fireEvent.press(u.getByTestId('change-password-submit'));

    await waitFor(() => {
      expect(rotate).toHaveBeenCalledWith('newpass12', 'oldpass12');
    });
    expect(secureStorage.setToken).toHaveBeenCalledWith('AT');
    expect(secureStorage.setRefreshToken).toHaveBeenCalledWith('RT');
    expect(NBToast.show).toHaveBeenCalledWith(
      expect.objectContaining({ level: 'success' }),
    );
  });

  it('maps a wrong-current-password code to the current-password field', async () => {
    rotate.mockResolvedValue({ error: 'Old password is incorrect', code: 'AUTH_INVALID_CREDENTIALS' });
    const u = renderModal();
    fillValid(u);
    fireEvent.press(u.getByTestId('change-password-submit'));
    await waitFor(() => expect(u.getByText('Password saat ini salah')).toBeTruthy());
    expect(NBToast.show).not.toHaveBeenCalled();
  });

  it('toasts a generic submit error', async () => {
    rotate.mockResolvedValue({ error: 'Server meledak', code: 'SERVER_ERROR' });
    const u = renderModal();
    fillValid(u);
    fireEvent.press(u.getByTestId('change-password-submit'));
    await waitFor(() =>
      expect(NBToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'danger', body: 'Server meledak' }),
      ),
    );
  });

  it('maps a must-differ backend message to the new-password field', async () => {
    rotate.mockResolvedValue({ error: 'New password must be different from old', code: 'BAD_REQUEST' });
    const u = renderModal();
    fillValid(u);
    fireEvent.press(u.getByTestId('change-password-submit'));
    await waitFor(() =>
      expect(u.getByText('Password baru harus berbeda dari password lama')).toBeTruthy(),
    );
    expect(NBToast.show).not.toHaveBeenCalled();
  });

  it('toasts when the request itself rejects', async () => {
    rotate.mockRejectedValue(new Error('Jaringan putus'));
    const u = renderModal();
    fillValid(u);
    fireEvent.press(u.getByTestId('change-password-submit'));
    await waitFor(() =>
      expect(NBToast.show).toHaveBeenCalledWith(
        expect.objectContaining({ level: 'danger', body: 'Jaringan putus' }),
      ),
    );
  });

  it('closes the modal after the success delay (token pair without refresh)', async () => {
    jest.useFakeTimers();
    try {
      rotate.mockResolvedValue({ data: { access_token: 'AT', user: { id: 'u1' } } });
      const u = renderModal();
      fillValid(u);
      fireEvent.press(u.getByTestId('change-password-submit'));
      // flush the async submit chain (validate → API → storage writes)
      await act(async () => {
        await Promise.resolve();
      });
      await act(async () => {
        await Promise.resolve();
      });
      act(() => {
        jest.advanceTimersByTime(1500);
      });
      expect(u.onClose).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });
});
