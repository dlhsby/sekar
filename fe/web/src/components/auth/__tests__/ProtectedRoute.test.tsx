/**
 * Unit Tests: ProtectedRoute
 * Tests protected route authorization and redirects
 */

import { render, screen } from '@testing-library/react';
import { ProtectedRoute } from '../ProtectedRoute';
import { useRequireAuth } from '@/lib/auth/hooks';

jest.mock('@/lib/auth/hooks', () => ({
  useRequireAuth: jest.fn(),
}));

describe('ProtectedRoute', () => {
  const mockUser = {
    id: '1',
    username: 'testuser',
    full_name: 'Test User',
    email: 'test@example.com',
    role: 'admin_system' as const,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when user is authenticated', () => {
    (useRequireAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Protected Content')).toBeInTheDocument();
  });

  it('should not render children when not authenticated', () => {
    (useRequireAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: false,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
  });

  it('should show loading state', () => {
    (useRequireAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <ProtectedRoute>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.queryByText('Protected Content')).not.toBeInTheDocument();
    expect(screen.getByText(/memeriksa autentikasi/i)).toBeInTheDocument();
  });

  it('should render custom loading fallback', () => {
    (useRequireAuth as jest.Mock).mockReturnValue({
      user: null,
      loading: true,
    });

    render(
      <ProtectedRoute loadingFallback={<div>Custom Loading</div>}>
        <div>Protected Content</div>
      </ProtectedRoute>
    );

    expect(screen.getByText('Custom Loading')).toBeInTheDocument();
  });

  it('should pass required roles to useRequireAuth', () => {
    (useRequireAuth as jest.Mock).mockReturnValue({
      user: mockUser,
      loading: false,
    });

    render(
      <ProtectedRoute requiredRoles={['admin_system', 'korlap']}>
        <div>Staff Content</div>
      </ProtectedRoute>
    );

    expect(useRequireAuth).toHaveBeenCalledWith(['admin_system', 'korlap']);
    expect(screen.getByText('Staff Content')).toBeInTheDocument();
  });
});
