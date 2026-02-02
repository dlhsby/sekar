/**
 * ChangePasswordModal Component Tests
 */

import React from 'react';
import { render, fireEvent, waitFor } from '@testing-library/react-native';
import { Alert } from 'react-native';
import { ChangePasswordModal } from '../ChangePasswordModal';
import * as usersApi from '../../../services/api/usersApi';

// Mock the API
jest.mock('../../../services/api/usersApi');

// Mock Alert
jest.spyOn(Alert, 'alert');

describe('ChangePasswordModal', () => {
  const mockOnClose = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render modal when visible is true', () => {
      const { getAllByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      expect(getAllByText('Ubah Password').length).toBeGreaterThan(0);
      expect(getByPlaceholderText('Masukkan password saat ini')).toBeTruthy();
      expect(getByPlaceholderText('Masukkan password baru (min. 6 karakter)')).toBeTruthy();
      expect(getByPlaceholderText('Ketik ulang password baru')).toBeTruthy();
    });

    it('should not render modal when visible is false', () => {
      const { queryByText } = render(
        <ChangePasswordModal visible={false} onClose={mockOnClose} />
      );

      expect(queryByText('Password Saat Ini')).toBeNull();
    });

    it('should render all form fields', () => {
      const { getByText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      expect(getByText('Password Saat Ini')).toBeTruthy();
      expect(getByText('Password Baru')).toBeTruthy();
      expect(getByText('Konfirmasi Password Baru')).toBeTruthy();
    });

    it('should render action buttons', () => {
      const { getAllByText, getByText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      expect(getAllByText('Ubah Password').length).toBe(2); // Title + Button
      expect(getByText('Batal')).toBeTruthy();
    });

    it('should render close button', () => {
      const { getByLabelText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      expect(getByLabelText('Tutup modal')).toBeTruthy();
    });
  });

  describe('Form Validation', () => {
    it('should show error when current password is empty', async () => {
      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Password saat ini wajib diisi')).toBeTruthy();
      });
    });

    it('should show error when new password is empty', async () => {
      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Password baru wajib diisi')).toBeTruthy();
      });
    });

    it('should show error when new password is too short', async () => {
      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, '12345');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Password baru minimal 6 karakter')).toBeTruthy();
      });
    });

    it('should show error when new password is same as current password', async () => {
      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'samePassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'samePassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Password baru harus berbeda dari password lama')).toBeTruthy();
      });
    });

    it('should show error when confirm password does not match', async () => {
      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'differentPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Konfirmasi password tidak cocok')).toBeTruthy();
      });
    });

    it('should show error when confirm password is empty', async () => {
      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Konfirmasi password wajib diisi')).toBeTruthy();
      });
    });
  });

  describe('Password Visibility Toggle', () => {
    it('should toggle current password visibility', () => {
      const { getByLabelText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      const toggleButton = getByLabelText('Tampilkan password saat ini');

      // Initially hidden
      expect(currentPasswordInput.props.secureTextEntry).toBe(true);

      // Toggle to show
      fireEvent.press(toggleButton);
      expect(currentPasswordInput.props.secureTextEntry).toBe(false);

      // Toggle back to hide
      const hideButton = getByLabelText('Sembunyikan password saat ini');
      fireEvent.press(hideButton);
      expect(currentPasswordInput.props.secureTextEntry).toBe(true);
    });

    it('should toggle new password visibility', () => {
      const { getByLabelText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      const toggleButton = getByLabelText('Tampilkan password baru');

      // Initially hidden
      expect(newPasswordInput.props.secureTextEntry).toBe(true);

      // Toggle to show
      fireEvent.press(toggleButton);
      expect(newPasswordInput.props.secureTextEntry).toBe(false);
    });

    it('should toggle confirm password visibility', () => {
      const { getByLabelText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      const toggleButton = getByLabelText('Tampilkan konfirmasi password');

      // Initially hidden
      expect(confirmPasswordInput.props.secureTextEntry).toBe(true);

      // Toggle to show
      fireEvent.press(toggleButton);
      expect(confirmPasswordInput.props.secureTextEntry).toBe(false);
    });
  });

  describe('Form Submission', () => {
    it('should submit form with valid data', async () => {
      const mockChangePassword = jest.spyOn(usersApi, 'changePassword').mockResolvedValue({
        data: undefined,
      });

      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(mockChangePassword).toHaveBeenCalledWith('oldPassword123', 'newPassword123');
      });
    });

    it('should show success message on successful password change', async () => {
      jest.spyOn(usersApi, 'changePassword').mockResolvedValue({
        data: undefined,
      });

      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Password berhasil diubah!')).toBeTruthy();
      });
    });

    it('should auto-close modal after successful password change', async () => {
      jest.spyOn(usersApi, 'changePassword').mockResolvedValue({
        data: undefined,
      });

      jest.useFakeTimers();

      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(
        () => {
          expect(getByText('Password berhasil diubah!')).toBeTruthy();
        },
        { timeout: 10000 }
      );

      // Fast-forward time by 1.5 seconds
      jest.advanceTimersByTime(1500);

      await waitFor(
        () => {
          expect(mockOnClose).toHaveBeenCalled();
        },
        { timeout: 10000 }
      );

      jest.useRealTimers();
    },
    25000
  );

    it('should show error message on API failure', async () => {
      jest.spyOn(usersApi, 'changePassword').mockResolvedValue({
        error: 'Password saat ini salah',
      });

      const { getAllByText, getByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'wrongPassword');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByText('Password saat ini salah')).toBeTruthy();
      });
    });
  });

  describe('Button States', () => {
    it('should show loading spinner during API call', async () => {
      jest.spyOn(usersApi, 'changePassword').mockImplementation(
        () => new Promise((resolve) => setTimeout(resolve, 100))
      );

      const { getAllByText, getByPlaceholderText, getByTestId } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      await waitFor(() => {
        expect(getByTestId('change-password-submit-spinner')).toBeTruthy();
      });
    });

    it('should not allow submit during loading', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<{ data: undefined }>((resolve) => {
        resolvePromise = () => resolve({ data: undefined });
      });

      jest.spyOn(usersApi, 'changePassword').mockReturnValue(promise);

      const { getAllByText, getByPlaceholderText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1];
      fireEvent.press(submitButton);

      // Press again while loading
      fireEvent.press(submitButton);

      // Should only be called once (second press is ignored)
      expect(usersApi.changePassword).toHaveBeenCalledTimes(1);

      // Resolve the promise to finish the test
      resolvePromise!();
    });
  });

  describe('Modal Close', () => {
    it('should close modal when close button is pressed', () => {
      const { getByLabelText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const closeButton = getByLabelText('Tutup modal');
      fireEvent.press(closeButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should close modal when cancel button is pressed', () => {
      const { getByText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const cancelButton = getByText('Batal');
      fireEvent.press(cancelButton);

      expect(mockOnClose).toHaveBeenCalled();
    });

    it('should reset form when modal is closed', () => {
      const { getByText, getByPlaceholderText, rerender } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'test123');

      const cancelButton = getByText('Batal');
      fireEvent.press(cancelButton);

      // Re-render with modal visible again
      rerender(<ChangePasswordModal visible={true} onClose={mockOnClose} />);

      expect(currentPasswordInput.props.value).toBe('');
    });

    it('should not close modal during loading', async () => {
      let resolvePromise: () => void;
      const promise = new Promise<{ data: undefined }>((resolve) => {
        resolvePromise = () => resolve({ data: undefined });
      });

      jest.spyOn(usersApi, 'changePassword').mockReturnValue(promise);

      const { getAllByText, getByPlaceholderText, getByLabelText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      const currentPasswordInput = getByPlaceholderText('Masukkan password saat ini');
      fireEvent.changeText(currentPasswordInput, 'oldPassword123');

      const newPasswordInput = getByPlaceholderText('Masukkan password baru (min. 6 karakter)');
      fireEvent.changeText(newPasswordInput, 'newPassword123');

      const confirmPasswordInput = getByPlaceholderText('Ketik ulang password baru');
      fireEvent.changeText(confirmPasswordInput, 'newPassword123');

      const submitButton = getAllByText('Ubah Password')[1]; // Get button, not title
      fireEvent.press(submitButton);

      const closeButton = getByLabelText('Tutup modal');
      fireEvent.press(closeButton);

      // Should not be called because loading is true
      expect(mockOnClose).not.toHaveBeenCalled();

      // Resolve the promise to finish the test
      resolvePromise!();
    });
  });

  describe('Accessibility', () => {
    it('should have accessibility labels for all interactive elements', () => {
      const { getByLabelText } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      expect(getByLabelText('Tutup modal')).toBeTruthy();
      expect(getByLabelText('Tampilkan password saat ini')).toBeTruthy();
      expect(getByLabelText('Tampilkan password baru')).toBeTruthy();
      expect(getByLabelText('Tampilkan konfirmasi password')).toBeTruthy();
    });

    it('should have accessibility hints for form fields', () => {
      const { getByA11yHint } = render(
        <ChangePasswordModal visible={true} onClose={mockOnClose} />
      );

      expect(getByA11yHint('Masukkan password Anda saat ini')).toBeTruthy();
      expect(getByA11yHint('Masukkan password baru minimal 6 karakter')).toBeTruthy();
      expect(getByA11yHint('Ketik ulang password baru untuk konfirmasi')).toBeTruthy();
    });
  });
});
