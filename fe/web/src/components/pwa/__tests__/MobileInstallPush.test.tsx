import { render, screen } from '@testing-library/react';
import { MobileInstallPush } from '../MobileInstallPush';

// Mock the useAuth hook
jest.mock('@/lib/auth/hooks', () => ({
  useAuth: jest.fn(),
}));

import { useAuth } from '@/lib/auth/hooks';

const mockUseAuth = useAuth as jest.Mock;

function makeUser(role: string) {
  return {
    id: '1',
    username: `user_${role}`,
    full_name: 'Test User',
    role,
  };
}

describe('MobileInstallPush', () => {
  beforeEach(() => {
    sessionStorage.clear();
    mockUseAuth.mockReturnValue({ user: null });
  });

  afterEach(() => {
    sessionStorage.clear();
    jest.clearAllMocks();
  });

  it('is hidden when user is null', () => {
    mockUseAuth.mockReturnValue({ user: null });
    render(<MobileInstallPush />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is hidden for admin_data role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('admin_data') });
    render(<MobileInstallPush />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is hidden for kepala_rayon role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('kepala_rayon') });
    render(<MobileInstallPush />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is hidden for top_management role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('top_management') });
    render(<MobileInstallPush />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is hidden for admin_system role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('admin_system') });
    render(<MobileInstallPush />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is hidden for superadmin role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('superadmin') });
    render(<MobileInstallPush />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('is visible for satgas role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('satgas') });
    render(<MobileInstallPush />);
    expect(screen.getByRole('complementary', { name: /unduh aplikasi sekar/i })).toBeInTheDocument();
  });

  it('is visible for linmas role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('linmas') });
    render(<MobileInstallPush />);
    expect(screen.getByRole('complementary', { name: /unduh aplikasi sekar/i })).toBeInTheDocument();
  });

  it('is visible for korlap role', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('korlap') });
    render(<MobileInstallPush />);
    expect(screen.getByRole('complementary', { name: /unduh aplikasi sekar/i })).toBeInTheDocument();
  });

  it('is hidden when already dismissed this session', () => {
    sessionStorage.setItem('sekar_mobile_push_dismissed', '1');
    mockUseAuth.mockReturnValue({ user: makeUser('satgas') });
    render(<MobileInstallPush />);
    expect(screen.queryByRole('complementary')).not.toBeInTheDocument();
  });

  it('shows Google Play and App Store links for satgas', () => {
    mockUseAuth.mockReturnValue({ user: makeUser('satgas') });
    render(<MobileInstallPush />);

    expect(screen.getByRole('link', { name: /google play/i })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /app store/i })).toBeInTheDocument();
  });
});
