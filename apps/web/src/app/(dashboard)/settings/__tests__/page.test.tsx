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
let mockSection: string | null = null;
jest.mock('next/navigation', () => ({
  redirect: (...args: unknown[]) => mockRedirect(...args),
  usePathname: () => '/settings',
  useSearchParams: () => ({ get: (k: string) => (k === 'section' ? mockSection : null) }),
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

// self-service profile hooks (Account & Security editable form)
jest.mock('@/lib/api/profile', () => ({
  useUpdateMyProfile: () => ({ mutateAsync: jest.fn().mockResolvedValue({}), isPending: false }),
  useUploadProfilePicture: () => ({ mutateAsync: jest.fn().mockResolvedValue({}), isPending: false }),
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
  mockSection = null;
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

describe('SettingsPage — Personal tab (master/detail)', () => {
  it('Account & Security has an editable profile form; password change opens a modal', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    await user.click(screen.getByRole('button', { name: /akun & keamanan/i }));
    // Editable identity fields, pre-filled from the current user.
    expect(screen.getByLabelText(/nama lengkap/i)).toHaveValue('Admin User');
    expect(screen.getByLabelText(/username/i)).toHaveValue('admin');
    // Password change is a separate modal — not inline.
    expect(screen.queryByLabelText(/kata sandi saat ini/i)).not.toBeInTheDocument();
    await user.click(screen.getByRole('button', { name: /ubah kata sandi/i }));
    // Modal opened → current-password field is required.
    expect(await screen.findByLabelText(/kata sandi saat ini/i)).toBeInTheDocument();
  });

  it('deep-links to Account & Security via ?section=account (no rail click needed)', () => {
    mockSection = 'account';
    render(<SettingsPage />);
    // The profile form is shown immediately (Account & Security is pre-selected).
    expect(screen.getByLabelText(/nama lengkap/i)).toHaveValue('Admin User');
  });

  it('stages the theme in the Appearance group and applies it on Save', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    // Navigate to the Appearance (Tampilan) group in the master rail.
    await user.click(screen.getByRole('button', { name: /tampilan/i }));
    const darkOption = screen.getByRole('radio', { name: /gelap/i });
    await user.click(darkOption);
    // Theme is staged (not applied yet) → the Save bar becomes enabled.
    const save = screen.getByRole('button', { name: /simpan perubahan/i });
    await waitFor(() => expect(save).toBeEnabled());
    await user.click(save);
    await waitFor(() => expect(document.documentElement).toHaveClass('dark'));
    document.documentElement.classList.remove('dark');
  });

  it('lists notification types and saves staged toggle changes', async () => {
    const user = userEvent.setup();
    render(<SettingsPage />);
    // Notifications live in their own group.
    await user.click(screen.getByRole('button', { name: /notifikasi/i }));

    expect(screen.getByText(/tugas baru ditugaskan/i)).toBeInTheDocument();
    expect(screen.getByText(/lembur disetujui/i)).toBeInTheDocument();

    const save = screen.getByRole('button', { name: /simpan perubahan/i });
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
