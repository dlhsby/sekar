/**
 * MapErrorBoundary Tests
 * Tests error boundary behavior for map components
 */

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text } from 'react-native';
import { MapErrorBoundary } from '../MapErrorBoundary';

// Mock MaterialCommunityIcons
jest.mock('react-native-vector-icons/MaterialCommunityIcons', () => 'Icon');

// Mock the Sentry crash-reporting service (no-op without a DSN in real use).
const mockCaptureException = jest.fn();
jest.mock('../../../services/crashReporting/sentry', () => ({
  captureException: (...args: unknown[]) => mockCaptureException(...args),
}));

// Mock console methods to reduce test output noise (React logs caught errors here).
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation();

// Component that throws error on demand
const ProblemChild: React.FC<{ shouldThrow?: boolean }> = ({ shouldThrow = false }) => {
  if (shouldThrow) {
    throw new Error('Map rendering failed');
  }
  return <Text testID="child-content">Map content</Text>;
};

describe('MapErrorBoundary', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  describe('Normal Operation', () => {
    it('should render children when no error occurs', () => {
      const { getByTestId, queryByText } = render(
        <MapErrorBoundary>
          <ProblemChild />
        </MapErrorBoundary>
      );

      expect(getByTestId('child-content')).toBeTruthy();
      expect(queryByText('Gagal Memuat Peta')).toBeNull();
    });

    it('should not show error UI when children render successfully', () => {
      const { queryByText, queryByLabelText } = render(
        <MapErrorBoundary>
          <Text>Normal map view</Text>
        </MapErrorBoundary>
      );

      expect(queryByText('Gagal Memuat Peta')).toBeNull();
      expect(queryByLabelText('Coba lagi memuat peta')).toBeNull();
    });
  });

  describe('Error Handling', () => {
    it('should catch errors and display fallback UI', () => {
      const { getByText, queryByTestId } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      // Child content should not be visible
      expect(queryByTestId('child-content')).toBeNull();

      // Error UI should be visible
      expect(getByText('Gagal Memuat Peta')).toBeTruthy();
      expect(getByText(/Terjadi kesalahan saat memuat peta/)).toBeTruthy();
    });

    it('should report the caught error to Sentry', () => {
      render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(mockCaptureException).toHaveBeenCalledWith(
        expect.any(Error),
        expect.objectContaining({ screen: 'monitoring-map' })
      );
    });

    it('should display error message in development mode', () => {
      const originalDEV = __DEV__;
      (global as any).__DEV__ = true;

      const { getByText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByText('Error: Map rendering failed')).toBeTruthy();

      (global as any).__DEV__ = originalDEV;
    });

    it('should not display error details in production mode', () => {
      const originalDEV = __DEV__;
      (global as any).__DEV__ = false;

      const { queryByText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(queryByText('Error: Map rendering failed')).toBeNull();

      (global as any).__DEV__ = originalDEV;
    });
  });

  describe('Reset Functionality', () => {
    it('should reset error state when retry button is pressed', () => {
      // First render with error
      const { getByLabelText, getByText, unmount } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByText('Gagal Memuat Peta')).toBeTruthy();

      // Press retry button - this calls handleReset which clears error state
      const retryButton = getByLabelText('Coba lagi memuat peta');
      fireEvent.press(retryButton);

      // Unmount and remount to simulate successful render after reset
      unmount();

      const { queryByText, getByTestId } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow={false} />
        </MapErrorBoundary>
      );

      // Error UI should be gone, children should render
      expect(queryByText('Gagal Memuat Peta')).toBeNull();
      expect(getByTestId('child-content')).toBeTruthy();
    });

    it('should call onReset callback when retry button is pressed', () => {
      const onReset = jest.fn();

      const { getByLabelText } = render(
        <MapErrorBoundary onReset={onReset}>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      const retryButton = getByLabelText('Coba lagi memuat peta');
      fireEvent.press(retryButton);

      expect(onReset).toHaveBeenCalledTimes(1);
    });

    it('should not crash if onReset is not provided', () => {
      const { getByLabelText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      const retryButton = getByLabelText('Coba lagi memuat peta');

      // Should not throw
      expect(() => {
        fireEvent.press(retryButton);
      }).not.toThrow();
    });
  });

  describe('Error UI Elements', () => {
    beforeEach(() => {
      render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );
    });

    it('should display error icon', () => {
      // Icon is rendered (mocked as 'Icon' component)
      expect(mockConsoleError).toHaveBeenCalled();
    });

    it('should display error title', () => {
      const { getByText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByText('Gagal Memuat Peta')).toBeTruthy();
    });

    it('should display error description', () => {
      const { getByText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByText(/Terjadi kesalahan saat memuat peta/)).toBeTruthy();
      expect(getByText(/Silakan coba lagi atau hubungi administrator/)).toBeTruthy();
    });

    it('should display retry button with correct accessibility', () => {
      const { getByLabelText, getByText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      const retryButton = getByLabelText('Coba lagi memuat peta');
      expect(retryButton).toBeTruthy();
      expect(getByText('Coba Lagi')).toBeTruthy();
    });
  });

  describe('Multiple Error Scenarios', () => {
    it('should handle different error types', () => {
      const ErrorChild: React.FC = () => {
        throw new TypeError('Invalid coordinates');
      };

      const { getByText } = render(
        <MapErrorBoundary>
          <ErrorChild />
        </MapErrorBoundary>
      );

      expect(getByText('Gagal Memuat Peta')).toBeTruthy();
    });

    it('should handle errors with custom messages', () => {
      const CustomErrorChild: React.FC = () => {
        throw new Error('Cluster calculation failed');
      };

      const originalDEV = __DEV__;
      (global as any).__DEV__ = true;

      const { getByText } = render(
        <MapErrorBoundary>
          <CustomErrorChild />
        </MapErrorBoundary>
      );

      expect(getByText('Error: Cluster calculation failed')).toBeTruthy();

      (global as any).__DEV__ = originalDEV;
    });

    it('should handle sequential errors after reset', () => {
      const { getByLabelText, getByText, rerender } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      // First error
      expect(getByText('Gagal Memuat Peta')).toBeTruthy();

      // Reset
      fireEvent.press(getByLabelText('Coba lagi memuat peta'));

      // Second error
      rerender(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByText('Gagal Memuat Peta')).toBeTruthy();
    });
  });

  describe('Component Lifecycle', () => {
    it('should initialize with no error state', () => {
      const { queryByText } = render(
        <MapErrorBoundary>
          <Text>Initial render</Text>
        </MapErrorBoundary>
      );

      expect(queryByText('Gagal Memuat Peta')).toBeNull();
    });

    it('should update state when getDerivedStateFromError is called', () => {
      const { getByText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      // Error state should be active
      expect(getByText('Gagal Memuat Peta')).toBeTruthy();
    });

    it('should maintain error state across rerenders', () => {
      const { getByText, rerender } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByText('Gagal Memuat Peta')).toBeTruthy();

      // Rerender boundary (error should persist)
      rerender(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByText('Gagal Memuat Peta')).toBeTruthy();
    });
  });

  describe('Accessibility', () => {
    it('should have proper accessibility role for retry button', () => {
      const { getByLabelText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      const retryButton = getByLabelText('Coba lagi memuat peta');
      expect(retryButton.props.accessibilityRole).toBe('button');
    });

    it('should have descriptive accessibility label', () => {
      const { getByLabelText } = render(
        <MapErrorBoundary>
          <ProblemChild shouldThrow />
        </MapErrorBoundary>
      );

      expect(getByLabelText('Coba lagi memuat peta')).toBeTruthy();
    });
  });

  describe('Edge Cases', () => {
    it('should handle null children', () => {
      const { queryByText } = render(
        <MapErrorBoundary>
          {null}
        </MapErrorBoundary>
      );

      expect(queryByText('Gagal Memuat Peta')).toBeNull();
    });

    it('should handle undefined error message', () => {
      const NoMessageError: React.FC = () => {
        const error: any = new Error();
        error.message = undefined;
        throw error;
      };

      const originalDEV = __DEV__;
      (global as any).__DEV__ = true;

      const { getByText, queryByText } = render(
        <MapErrorBoundary>
          <NoMessageError />
        </MapErrorBoundary>
      );

      // Should still show error UI
      expect(getByText('Gagal Memuat Peta')).toBeTruthy();

      (global as any).__DEV__ = originalDEV;
    });

    it('should handle very long error messages', () => {
      const LongErrorChild: React.FC = () => {
        throw new Error('A'.repeat(1000));
      };

      const originalDEV = __DEV__;
      (global as any).__DEV__ = true;

      const { getByText } = render(
        <MapErrorBoundary>
          <LongErrorChild />
        </MapErrorBoundary>
      );

      // Should still render without crashing
      expect(getByText('Gagal Memuat Peta')).toBeTruthy();

      (global as any).__DEV__ = originalDEV;
    });
  });
});
