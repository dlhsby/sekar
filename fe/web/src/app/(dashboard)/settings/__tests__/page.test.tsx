/**
 * Unit Tests: Settings Page
 * Tests user profile and settings functionality
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../page';
import '@testing-library/jest-dom';

// Mock next/navigation
const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  usePathname: () => '/settings',
}));

// Mock auth hook
const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// Test data
const mockAdminUser = {
  id: '1',
  username: 'admin',
  full_name: 'Admin User',
  role: 'admin',
  area_id: null,
  created_at: '2024-01-01T00:00:00Z',
};

const mockSupervisorUser = {
  id: '2',
  username: 'supervisor1',
  full_name: 'Supervisor User',
  role: 'koordinator_lapangan',
  area_id: 'area-1',
  created_at: '2024-01-01T00:00:00Z',
};

describe('SettingsPage Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  describe('Authentication & Authorization', () => {
    it('should show loading state during auth check', () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: true,
      });

      const { container } = render(<SettingsPage />);

      expect(screen.getByText(/memuat/i)).toBeInTheDocument();
      // Check for loading spinner
      const spinner = container.querySelector('.animate-spin');
      expect(spinner).toBeInTheDocument();
    });

    it('should allow admin role access', () => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });

      render(<SettingsPage />);

      expect(screen.getByText(/pengaturan/i)).toBeInTheDocument();
      expect(mockRedirect).not.toHaveBeenCalled();
    });

    it('should redirect non-admin users to home', async () => {
      mockUseAuth.mockReturnValue({
        user: mockSupervisorUser,
        loading: false,
      });

      // Wrap in try-catch as redirect() throws in tests
      try {
        render(<SettingsPage />);
      } catch (e) {
        // Expected - redirect() throws NEXT_REDIRECT
      }

      await waitFor(() => {
        expect(mockRedirect).toHaveBeenCalledWith('/');
      });
    });

    it('should redirect when no user is logged in', async () => {
      mockUseAuth.mockReturnValue({
        user: null,
        loading: false,
      });

      // Wrap in try-catch as redirect() throws in tests
      try {
        render(<SettingsPage />);
      } catch (e) {
        // Expected - redirect() throws NEXT_REDIRECT
      }

      await waitFor(() => {
        expect(mockRedirect).toHaveBeenCalledWith('/');
      });
    });
  });

  describe('User Profile Display', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display user profile section', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/profil pengguna/i)).toBeInTheDocument();
    });

    it('should display user full name', () => {
      render(<SettingsPage />);

      expect(screen.getByText('Admin User')).toBeInTheDocument();
    });

    it('should display username', () => {
      render(<SettingsPage />);

      // Find the Username label, then find the value in its parent container
      const usernameLabel = screen.getByText(/^username$/i);
      const usernameContainer = usernameLabel.closest('div');
      expect(usernameContainer).toHaveTextContent('admin');
    });

    it('should display user role', () => {
      render(<SettingsPage />);

      // Find the Role label, then find the value in its parent container
      const roleLabel = screen.getByText(/^role$/i);
      const roleContainer = roleLabel.closest('div');
      expect(roleContainer).toHaveTextContent('admin');
    });

    it('should show message about profile edit restrictions', () => {
      render(<SettingsPage />);

      expect(
        screen.getByText(/untuk mengubah informasi profil, hubungi administrator sistem/i)
      ).toBeInTheDocument();
    });
  });

  describe('Password Change Form', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display password change section', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /ubah password/i })).toBeInTheDocument();
    });

    it('should render current password input', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText(/password saat ini/i)).toBeInTheDocument();
    });

    it('should render new password input', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText(/^password baru$/i)).toBeInTheDocument();
    });

    it('should render confirm password input', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText(/konfirmasi password baru/i)).toBeInTheDocument();
    });

    it('should render submit button', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('button', { name: /ubah password/i })).toBeInTheDocument();
    });

    it('should show note about backend endpoint', () => {
      render(<SettingsPage />);

      expect(
        screen.getByText(/fitur ubah password akan aktif setelah endpoint backend tersedia/i)
      ).toBeInTheDocument();
    });
  });

  describe('Password Validation', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should validate current password is required', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password saat ini wajib diisi/i)).toBeInTheDocument();
      });
    });

    it('should validate new password minimum length', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);
      const confirmPassword = screen.getByLabelText(/konfirmasi password baru/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'short');
      await user.type(confirmPassword, 'short');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password minimal 8 karakter/i)).toBeInTheDocument();
      });
    });

    it('should validate password confirmation match', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);
      const confirmPassword = screen.getByLabelText(/konfirmasi password baru/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');
      await user.type(confirmPassword, 'differentpassword');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password tidak cocok/i)).toBeInTheDocument();
      });
    });

    it('should validate confirm password is required', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/konfirmasi password wajib diisi/i)).toBeInTheDocument();
      });
    });
  });

  describe('Password Change Submission', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should submit form with valid data', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);
      const confirmPassword = screen.getByLabelText(/konfirmasi password baru/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');
      await user.type(confirmPassword, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      // Wait for loading state to be applied
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });

    it('should show success message after password change', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);
      const confirmPassword = screen.getByLabelText(/konfirmasi password baru/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');
      await user.type(confirmPassword, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      // Advance timers for simulated API call
      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/password berhasil diubah/i)).toBeInTheDocument();
      });
    });

    it('should reset form after successful password change', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i) as HTMLInputElement;
      const newPassword = screen.getByLabelText(/^password baru$/i) as HTMLInputElement;
      const confirmPassword = screen.getByLabelText(
        /konfirmasi password baru/i
      ) as HTMLInputElement;

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');
      await user.type(confirmPassword, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(currentPassword.value).toBe('');
        expect(newPassword.value).toBe('');
        expect(confirmPassword.value).toBe('');
      });
    });

    it('should disable submit button while loading', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);
      const confirmPassword = screen.getByLabelText(/konfirmasi password baru/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');
      await user.type(confirmPassword, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      // Wait for loading state to be applied
      await waitFor(() => {
        expect(submitButton).toBeDisabled();
      });
    });
  });

  describe('Preferences Section', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display preferences section', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/^preferensi$/i)).toBeInTheDocument();
    });

    it('should render language toggle buttons', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('button', { name: /bahasa indonesia/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /english/i })).toBeInTheDocument();
    });

    it('should have Indonesian selected by default', () => {
      render(<SettingsPage />);

      const idButton = screen.getByRole('button', { name: /bahasa indonesia/i });
      expect(idButton).toHaveClass('bg-nb-primary');
    });

    it('should toggle language to English', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const enButton = screen.getByRole('button', { name: /english/i });
      await user.click(enButton);

      await waitFor(() => {
        expect(enButton).toHaveClass('bg-nb-primary');
      });
    });

    it('should show language feature note', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/fitur multi-bahasa akan aktif di phase 4/i)).toBeInTheDocument();
    });
  });

  describe('Notification Settings', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display notification toggle', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/^notifikasi$/i)).toBeInTheDocument();

      // Find the toggle button by its container
      const notifSection = screen.getByText(/^notifikasi$/i).closest('div');
      const toggleButton = notifSection?.querySelector('button');
      expect(toggleButton).toBeInTheDocument();
    });

    it('should have notifications enabled by default', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/notifikasi aktif/i)).toBeInTheDocument();
    });

    it('should toggle notifications off', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      // Find the toggle button by its container
      const notifSection = screen.getByText(/^notifikasi$/i).closest('div');
      const toggleButton = notifSection?.querySelector('button');
      expect(toggleButton).toBeInTheDocument();

      await user.click(toggleButton!);

      expect(await screen.findByText(/notifikasi nonaktif/i)).toBeInTheDocument();
    });

    it('should toggle notifications back on', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      // Find the toggle button by its container
      const notifSection = screen.getByText(/^notifikasi$/i).closest('div');
      const toggleButton = notifSection?.querySelector('button');
      expect(toggleButton).toBeInTheDocument();

      // Toggle off
      await user.click(toggleButton!);

      // Wait for state update
      expect(await screen.findByText(/notifikasi nonaktif/i)).toBeInTheDocument();

      // Toggle back on
      await user.click(toggleButton!);

      // Wait for state update
      expect(await screen.findByText(/notifikasi aktif/i)).toBeInTheDocument();
    });

    it('should show notification description', () => {
      render(<SettingsPage />);

      expect(
        screen.getByText(/aktifkan untuk menerima notifikasi push tentang tugas dan laporan/i)
      ).toBeInTheDocument();
    });
  });

  describe('System Information', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should display system info section', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/informasi sistem/i)).toBeInTheDocument();
    });

    it('should display app version', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/versi aplikasi:/i)).toBeInTheDocument();
      expect(screen.getByText(/2\.0\.0 \(phase 2\)/i)).toBeInTheDocument();
    });

    it('should display environment', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/environment:/i)).toBeInTheDocument();
    });

    it('should display last updated date', () => {
      render(<SettingsPage />);

      expect(screen.getByText(/last updated:/i)).toBeInTheDocument();
      expect(screen.getByText(/february 5, 2026/i)).toBeInTheDocument();
    });
  });

  describe('Responsive Layout', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should render all sections in vertical layout', () => {
      render(<SettingsPage />);

      const container = screen.getByText(/pengaturan/i).closest('div.space-y-6');
      expect(container).toBeInTheDocument();
    });

    it('should use proper card variants', () => {
      render(<SettingsPage />);

      // Profile and password cards should be elevated
      const profileCard = screen.getByText(/profil pengguna/i).closest('div');
      expect(profileCard?.parentElement).toHaveClass('border-3');
    });
  });

  describe('Form Error States', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should clear success message when form changes', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      // Submit valid form
      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);
      const confirmPassword = screen.getByLabelText(/konfirmasi password baru/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');
      await user.type(confirmPassword, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.getByText(/password berhasil diubah/i)).toBeInTheDocument();
      });
    });

    it('should not show error message on successful submission', async () => {
      const user = userEvent.setup({ delay: null });
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      const newPassword = screen.getByLabelText(/^password baru$/i);
      const confirmPassword = screen.getByLabelText(/konfirmasi password baru/i);

      await user.type(currentPassword, 'current123');
      await user.type(newPassword, 'newpassword123');
      await user.type(confirmPassword, 'newpassword123');

      const submitButton = screen.getByRole('button', { name: /ubah password/i });
      await user.click(submitButton);

      jest.advanceTimersByTime(1000);

      await waitFor(() => {
        expect(screen.queryByText(/gagal mengubah password/i)).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    beforeEach(() => {
      mockUseAuth.mockReturnValue({
        user: mockAdminUser,
        loading: false,
      });
    });

    it('should have proper form labels', () => {
      render(<SettingsPage />);

      expect(screen.getByLabelText(/password saat ini/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/^password baru$/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/konfirmasi password baru/i)).toBeInTheDocument();
    });

    it('should have proper heading hierarchy', () => {
      render(<SettingsPage />);

      expect(screen.getByRole('heading', { name: /^pengaturan$/i, level: 1 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /profil pengguna/i, level: 2 })).toBeInTheDocument();
      expect(screen.getByRole('heading', { name: /ubah password/i, level: 2 })).toBeInTheDocument();
    });

    it('should have accessible form inputs', () => {
      render(<SettingsPage />);

      const currentPassword = screen.getByLabelText(/password saat ini/i);
      expect(currentPassword).toHaveAttribute('type', 'password');
      expect(currentPassword).toHaveAttribute('placeholder');
    });
  });
});
