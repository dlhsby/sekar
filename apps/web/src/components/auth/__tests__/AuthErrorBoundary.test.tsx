/**
 * Unit Tests: AuthErrorBoundary
 * Tests error boundary for authentication errors
 */

import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AuthErrorBoundary } from '../AuthErrorBoundary';

// Component that throws an error
const ThrowError = ({ shouldThrow }: { shouldThrow?: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>Content</div>;
};

describe('AuthErrorBoundary', () => {
  // Suppress console.error for tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });

  afterAll(() => {
    console.error = originalError;
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render children when no error', () => {
    render(
      <AuthErrorBoundary>
        <div>App Content</div>
      </AuthErrorBoundary>
    );

    expect(screen.getByText('App Content')).toBeInTheDocument();
  });

  it('should display error UI when error occurs', () => {
    render(
      <AuthErrorBoundary>
        <ThrowError shouldThrow />
      </AuthErrorBoundary>
    );

    expect(screen.queryByText('Content')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /terjadi kesalahan/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /coba lagi/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /keluar/i })).toBeInTheDocument();
  });

  it('should show error message', () => {
    render(
      <AuthErrorBoundary>
        <ThrowError shouldThrow />
      </AuthErrorBoundary>
    );

    expect(screen.getByText(/terjadi kesalahan saat memproses autentikasi/i)).toBeInTheDocument();
  });

  it('should have retry button', () => {
    render(
      <AuthErrorBoundary>
        <ThrowError shouldThrow />
      </AuthErrorBoundary>
    );

    const retryButton = screen.getByRole('button', { name: /coba lagi/i });
    expect(retryButton).toBeInTheDocument();
  });

  it('should have logout button', () => {
    render(
      <AuthErrorBoundary>
        <ThrowError shouldThrow />
      </AuthErrorBoundary>
    );

    const logoutButton = screen.getByRole('button', { name: /keluar/i });
    expect(logoutButton).toBeInTheDocument();
  });
});
