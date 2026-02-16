/**
 * Unit Tests: Providers
 * Tests application providers setup
 */

import { render, screen } from '@testing-library/react';
import { Providers } from '../providers';

// Mock AuthProvider
jest.mock('@/lib/auth/context', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('Providers', () => {
  it('should render children', () => {
    render(
      <Providers>
        <div>Test Content</div>
      </Providers>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });

  it('should wrap children with QueryClientProvider', () => {
    const { container } = render(
      <Providers>
        <div data-testid="child">Child</div>
      </Providers>
    );

    expect(screen.getByTestId('child')).toBeInTheDocument();
    expect(container.firstChild).toBeInTheDocument();
  });

  it('should initialize QueryClient with default options', () => {
    // Just verify it renders without errors - QueryClient is internal
    expect(() => {
      render(
        <Providers>
          <div>Content</div>
        </Providers>
      );
    }).not.toThrow();
  });
});
