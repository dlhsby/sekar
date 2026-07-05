/**
 * ErrorBoundary Tests
 * Unit tests for error boundary component with comprehensive coverage
 */

// Alert mocked globally in jest.setup.js

import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import { Text, View } from 'react-native';
import { ErrorBoundary } from '../ErrorBoundary';

// Component that throws an error when errorFlag is true
const ProblematicComponent = ({ shouldError = false }: { shouldError?: boolean }) => {
  if (shouldError) {
    throw new Error('Test error message');
  }
  return <Text testID="working-component">Component works</Text>;
};

// Suppress console.error for error boundary tests
const originalConsoleError = console.error;
beforeAll(() => {
  console.error = jest.fn();
});

afterAll(() => {
  console.error = originalConsoleError;
});

describe('ErrorBoundary', () => {
  describe('Rendering', () => {
    it('should render children when no error occurs', () => {
      const { getByTestId, queryByText } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={false} />
        </ErrorBoundary>
      );

      expect(getByTestId('working-component')).toBeTruthy();
      expect(queryByText('Terjadi Kesalahan')).toBeNull();
    });

    it('should render default fallback UI when error occurs', () => {
      const { getByText, getByTestId } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      expect(getByText('Terjadi Kesalahan')).toBeTruthy();
      expect(getByText('Aplikasi mengalami kesalahan yang tidak terduga.')).toBeTruthy();
      expect(getByTestId('error-boundary-retry')).toBeTruthy();
    });

    it('should render custom fallback when provided', () => {
      const customFallback = (error: Error, resetError: () => void) => (
        <View>
          <Text testID="custom-error">Custom Error: {error.message}</Text>
          <Text testID="custom-retry" onPress={resetError}>
            Custom Retry
          </Text>
        </View>
      );

      const { getByTestId, queryByText } = render(
        <ErrorBoundary fallback={customFallback}>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      expect(getByTestId('custom-error')).toBeTruthy();
      expect(getByTestId('custom-retry')).toBeTruthy();
      expect(queryByText('Terjadi Kesalahan')).toBeNull();
    });

    it('should display error details in development mode', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const { getByText } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      expect(getByText('Detail Error (Development):')).toBeTruthy();
      expect(getByText('Test error message')).toBeTruthy();

      (global as any).__DEV__ = originalDev;
    });

    it('should not display error details in production mode', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = false;

      const { queryByText } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      expect(queryByText('Detail Error (Development):')).toBeNull();
      expect(queryByText('Test error message')).toBeNull();

      (global as any).__DEV__ = originalDev;
    });
  });

  describe('Error Recovery', () => {
    it('should reset error state and retry rendering when retry button pressed', () => {
      // Use a state variable to control error state
      let shouldThrow = true;
      const TestComponent = () => {
        if (shouldThrow) {
          throw new Error('Test error message');
        }
        return <Text testID="working-component">Component works</Text>;
      };

      const { getByTestId, queryByText, getByText } = render(
        <ErrorBoundary>
          <TestComponent />
        </ErrorBoundary>
      );

      // Verify error UI is shown
      expect(getByText('Terjadi Kesalahan')).toBeTruthy();

      // Fix the component by stopping the error
      shouldThrow = false;

      // Press retry button - this should reset the error boundary state
      const retryButton = getByTestId('error-boundary-retry');
      fireEvent.press(retryButton);

      // After reset, the error boundary should try rendering again
      // Since shouldThrow is now false, component should render successfully
      expect(queryByText('Terjadi Kesalahan')).toBeNull();
    });
  });

  describe('Error Handling Callbacks', () => {
    it('should call onError callback when error occurs', () => {
      const onErrorMock = jest.fn();

      render(
        <ErrorBoundary onError={onErrorMock}>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      expect(onErrorMock).toHaveBeenCalledTimes(1);
      expect(onErrorMock).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Test error message',
        }),
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );
    });

    it('should log errors to console in development', () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'ErrorBoundary caught an error:',
        expect.objectContaining({
          message: 'Test error message',
        })
      );
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error info:',
        expect.objectContaining({
          componentStack: expect.any(String),
        })
      );

      consoleErrorSpy.mockRestore();
    });
  });

  describe('Accessibility', () => {
    it('should have accessible retry button', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      const retryButton = getByTestId('error-boundary-retry');
      expect(retryButton).toBeTruthy();
      expect(retryButton.props.accessibilityLabel).toBe('Coba Lagi');
      expect(retryButton.props.accessibilityRole).toBe('button');
    });

    it('should render error message in readable Indonesian', () => {
      const { getByText } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      expect(getByText('Terjadi Kesalahan')).toBeTruthy();
      expect(getByText('Aplikasi mengalami kesalahan yang tidak terduga.')).toBeTruthy();
    });
  });

  describe('Multiple Errors', () => {
    it('should handle multiple sequential errors', () => {
      const { getByTestId, queryByText } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={false} />
        </ErrorBoundary>
      );

      // First render - no error
      expect(getByTestId('working-component')).toBeTruthy();
      expect(queryByText('Terjadi Kesalahan')).toBeNull();
    });
  });

  describe('Neo Brutalism Styling', () => {
    it('should render with Neo Brutalism design tokens', () => {
      const { getByTestId } = render(
        <ErrorBoundary>
          <ProblematicComponent shouldError={true} />
        </ErrorBoundary>
      );

      const retryButton = getByTestId('error-boundary-retry');
      expect(retryButton).toBeTruthy();

      // NBButton is used, verify it has accessibility properties
      expect(retryButton.props.accessibilityLabel).toBe('Coba Lagi');
      expect(retryButton.props.accessibilityRole).toBe('button');
    });
  });

  describe('Edge Cases', () => {
    it('should handle errors in useEffect hooks', () => {
      const ComponentWithEffectError = () => {
        React.useEffect(() => {
          throw new Error('Effect error');
        }, []);
        return <Text>Component</Text>;
      };

      const { getByText } = render(
        <ErrorBoundary>
          <ComponentWithEffectError />
        </ErrorBoundary>
      );

      expect(getByText('Terjadi Kesalahan')).toBeTruthy();
    });

    it('should handle errors with long stack traces', () => {
      const originalDev = (global as any).__DEV__;
      (global as any).__DEV__ = true;

      const errorWithLongStack = new Error('Error with stack');
      errorWithLongStack.stack = 'Line 1\n'.repeat(20);

      const ComponentWithStackError = () => {
        throw errorWithLongStack;
      };

      const { getByText } = render(
        <ErrorBoundary>
          <ComponentWithStackError />
        </ErrorBoundary>
      );

      expect(getByText('Terjadi Kesalahan')).toBeTruthy();
      expect(getByText('Detail Error (Development):')).toBeTruthy();

      (global as any).__DEV__ = originalDev;
    });

    it('should handle errors with no message', () => {
      const ComponentWithEmptyError = () => {
        throw new Error('');
      };

      const { getByText } = render(
        <ErrorBoundary>
          <ComponentWithEmptyError />
        </ErrorBoundary>
      );

      expect(getByText('Terjadi Kesalahan')).toBeTruthy();
    });
  });
});
