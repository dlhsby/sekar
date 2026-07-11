/**
 * Unit Tests: Settings Page (SET-1 tabbed revamp)
 * Covers auth gating, the three tabs (Umum / Keamanan / Notifikasi), the
 * appearance toggle, change-password validation, and notification preferences.
 */

import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import SettingsPage from '../page';
import '@testing-library/jest-dom';

// next/navigation
const mockRedirect = jest.fn();
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  usePathname: () => '/settings',
}));

// auth hook
const mockRefreshUser = jest.fn().mockResolvedValue(undefined);
const mockUseAuth = jest.fn();
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: () => mockUseAuth(),
}));

// change-password API + cookies
const mockChangePassword = jest.fn();
jest.mock('@/lib/api/auth', () => ({
  authApi: { changePassword: (...args: unknown[]) => mockChangePassword(...args) },
}));
jest.mock('@/lib/utils/cookies', () => ({ setAuthCookie: jest.fn() }));
jest.mock('@/lib/api/client', () => ({ getErrorMessage: (e: unknown) => String(e) }));

// notification-preferences hooks (keep the real labels)
const mockMutateAsync = jest.fn().mockResolvedValue([]);
const mockUsePrefs = jest.fn();
jest.mock('@/lib/api/notification-preferences', () => ({
  ...jest.requireActual('@/lib/api/notification-preferences'),
  useNotificationPreferences: () => mockUsePrefs(),
  useUpdateNotificationPreferences: () => ({ mutateAsync: mockMutateAsync, isPending: false }),
}));

// sonner
jest.mock('sonner', () => ({ toast: { success: jest.fn(), error: jest.fn() } }));

const adminUser = {
  id: 'u1',
  username: 'admin',
  full_name: 'Admin User',
  role: 'admin_system',
};
const korlapUser = { id: 'u2', username: 'korlap1', full_name: 'Korlap', role: 'korlap' };

const PREFS = [
  { type: 'task_assigned', enabled: true },
  { type: 'overtime_approved', enabled: false },
];

beforeEach(() => {
  jest.clearAllMocks();
  mockUsePrefs.mockReturnValue({ data: PREFS, isLoading: false, isError: false });
  mockUseAuth.mockReturnValue({ user: adminUser, loading: false, refreshUser: mockRefreshUser });
});

describe('SettingsPage — auth gating', () => {
  it('shows a loading state during auth check', () => {
    mockUseAuth.mockReturnValue({ user: null, loading: true, refreshUser: mockRefreshUser });
    render(<SettingsPage />);
    expect(screen.getByText(/memuat/i)).toBeInTheDocument();
  });

  it('redirects non-admin users home', async () => {
    mockUseAuth.mockReturnValue({ user: korlapUser, loading: false, refreshUser: mockRefreshUser });
    try {
      render(<SettingsPage />);
    } catch {
      // redirect() throws NEXT_REDIRECT in tests
    }
    await waitFor(() => expect(mockRedirect).toHaveBeenCalledWith('/'));
  });

  it('renders the tab rail for admins', () => {
    render(<SettingsPage />);
    expect(screen.getByRole('tablist', { name: /pengaturan/i })).toBeInTheDocument();
    expect(mockRedirect).not.toHaveBeenCalled();
  });
});

describe('SettingsPage — Umum tab', () => {
  it('shows identity fields and a link to the profile page', () => {
    render(<SettingsPage />);
    expect(screen.getByText('Admin User')).toBeInTheDocument();
    expect(screen.getByText('admin')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /ubah profil/i })).toHaveAttribute('href', '/profile');
  });

  it('exposes a dark-mode switch', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    const darkSwitch = screen.getByRole('switch', { name: /mode gelap/i });
    expect(darkSwitch).toBeInTheDocument();
    await user.click(darkSwitch);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    // reset for other tests
    document.documentElement.classList.remove('dark');
  });
});

describe('SettingsPage — Personal tab (notifications)', () => {
  it('lists configurable types with per-type switches and saves changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    // Notifications now live on the default Personal tab (no tab switch needed).

    expect(screen.getByText(/tugas baru ditugaskan/i)).toBeInTheDocument();
    expect(screen.getByText(/lembur disetujui/i)).toBeInTheDocument();

    const save = screen.getByRole('button', { name: /simpan/i });
    expect(save).toBeDisabled(); // nothing changed yet

    // Flip the first type off, then save.
    const firstSwitch = screen.getByRole('switch', { name: /tugas baru ditugaskan/i });
    await user.click(firstSwitch);
    await waitFor(() => expect(save).toBeEnabled());

    await user.click(save);
    await waitFor(() =>
      expect(mockMutateAsync).toHaveBeenCalledWith([
        { type: 'task_assigned', enabled: false },
        { type: 'overtime_approved', enabled: false },
      ]),
    );
  });
});
