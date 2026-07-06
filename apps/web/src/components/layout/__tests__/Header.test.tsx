/**
 * Unit Tests: Header
 * Tests dashboard header component
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { Header } from '../Header';
import { useAuth } from '@/lib/auth/hooks';

jest.mock('@/lib/auth/hooks', () => ({
  useAuth: jest.fn(),
}));

jest.mock('next/navigation', () => ({
  useRouter: () => ({ push: jest.fn() }),
  usePathname: () => '/dashboard',
}));

jest.mock('@/stores/ui', () => ({
  useUIStore: jest.fn(() => ({
    toggleSidebar: jest.fn(),
    toggleMobileMenu: jest.fn(),
    sidebarOpen: true,
    mobileMenuOpen: false,
  })),
}));

// The notification bell now reads real query hooks; mock them so the Header
// renders without a QueryClientProvider.
jest.mock('@/lib/api/notifications', () => ({
  useUnreadCount: () => ({ data: 3 }),
  useNotifications: () => ({ data: [], isLoading: false }),
  useMarkNotificationRead: () => ({ mutate: jest.fn() }),
}));

describe('Header', () => {
  const mockUser = {
    id: '1',
    full_name: 'Admin User',
    name: 'Admin User',
    email: 'admin@example.com',
    role: 'admin' as const,
    status: 'active' as const,
    created_at: '2026-01-01',
  };

  const mockLogout = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      logout: mockLogout,
      loading: false,
      error: null,
    });
  });

  it('should render user name', () => {
    render(<Header />);

    expect(screen.getByText('Admin User')).toBeInTheDocument();
  });

  it('should render user role', () => {
    render(<Header />);

    expect(screen.getByText(/admin/i)).toBeInTheDocument();
  });

  it('should render menu trigger button', () => {
    render(<Header />);

    const menuButton = screen.getByRole('button', { name: /buka menu navigasi/i });
    expect(menuButton).toBeInTheDocument();
  });

  it('should open user menu when clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    const menuButton = screen.getByRole('button', { name: /menu pengguna/i });
    await user.click(menuButton);

    // Wait for dropdown to appear (label is Indonesian: "Profil")
    await screen.findByText(/profil/i);
    expect(screen.getByText(/profil/i)).toBeInTheDocument();
  });

  it('should show logout confirmation dialog when logout clicked', async () => {
    const user = userEvent.setup();
    render(<Header />);

    // Click user menu
    await user.click(screen.getByRole('button', { name: /menu pengguna/i }));

    // Click logout in dropdown (Indonesian: "Keluar")
    const dropdownLogout = await screen.findByText('Keluar');
    await user.click(dropdownLogout);

    // Dialog appears with confirmation text
    expect(await screen.findByText(/konfirmasi keluar/i)).toBeInTheDocument();
    expect(screen.getByText(/apakah anda yakin/i)).toBeInTheDocument();
  });

  it('should render notifications button', () => {
    render(<Header />);

    const notifButton = screen.getByRole('button', { name: /notifikasi/i });
    expect(notifButton).toBeInTheDocument();
  });

  it('should show notification badge with the unread count', () => {
    render(<Header />);

    // Bell badge reflects the mocked unread count (3).
    expect(screen.getByText('3')).toBeInTheDocument();
  });
});
