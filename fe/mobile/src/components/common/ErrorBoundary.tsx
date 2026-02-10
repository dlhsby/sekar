/**
 * Error Boundary Component
 *
 * ARCHITECTURAL DECISION:
 * This is the PRIMARY error boundary for the mobile app. It wraps the entire
 * application root in App.tsx to catch all unhandled errors.
 *
 * MapErrorBoundary.tsx is a SPECIALIZED error boundary for map-specific errors
 * with custom retry logic for map component failures. It uses this ErrorBoundary
 * as a base but adds map-specific error recovery.
 *
 * Usage:
 * - App.tsx: Wraps entire app with this ErrorBoundary
 * - MapDashboardScreen: Uses MapErrorBoundary for map-specific handling
 *
 * DO NOT create additional error boundaries without architectural review.
 * Use this component with custom fallback props for specific error handling needs.
 *
 * Catches JavaScript errors in component tree and displays fallback UI.
 * Prevents app crashes by gracefully handling rendering errors.
 *
 * @see https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
 */

import React, { Component, type ErrorInfo, type ReactNode } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NBButton } from '../nb';
import { nbColors, nbSpacing, nbTypography, nbBorders, nbShadows } from '../../constants/nbTokens';

interface ErrorBoundaryProps {
  /** Child components to wrap */
  children: ReactNode;
  /** Optional custom fallback UI */
  fallback?: (error: Error, resetError: () => void) => ReactNode;
  /** Optional error handler callback */
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error Boundary to catch and handle React component errors
 *
 * @example
 * // Basic usage
 * <ErrorBoundary>
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With custom fallback
 * <ErrorBoundary
 *   fallback={(error, reset) => (
 *     <View>
 *       <Text>Custom error message: {error.message}</Text>
 *       <Button title="Reset" onPress={reset} />
 *     </View>
 *   )}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 *
 * @example
 * // With error logging
 * <ErrorBoundary
 *   onError={(error, errorInfo) => {
 *     console.error('Error caught:', error, errorInfo);
 *     // Send to error tracking service
 *   }}
 * >
 *   <MyComponent />
 * </ErrorBoundary>
 */
export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  /**
   * Static method called when error occurs
   * Updates state to trigger fallback UI
   */
  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      error,
    };
  }

  /**
   * Called after error is caught
   * Logs error and calls optional error handler
   */
  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details
    console.error('ErrorBoundary caught an error:', error);
    console.error('Error info:', errorInfo);

    // Call optional error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }
  }

  /**
   * Reset error state and retry rendering
   */
  resetError = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });
  };

  render(): ReactNode {
    const { hasError, error } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      // Use custom fallback if provided
      if (fallback) {
        return fallback(error, this.resetError);
      }

      // Default fallback UI
      return (
        <View style={styles.container}>
          <View style={styles.card}>
            <Text style={styles.icon}>⚠️</Text>
            <Text style={styles.title}>Terjadi Kesalahan</Text>
            <Text style={styles.message}>
              Aplikasi mengalami kesalahan yang tidak terduga.
            </Text>

            {/* Show error details in development */}
            {__DEV__ && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorTitle}>Detail Error (Development):</Text>
                <Text style={styles.errorText}>{error.message}</Text>
                {error.stack && (
                  <Text style={styles.errorStack} numberOfLines={10}>
                    {error.stack}
                  </Text>
                )}
              </View>
            )}

            <NBButton
              title="Coba Lagi"
              onPress={this.resetError}
              variant="primary"
              fullWidth
              testID="error-boundary-retry"
            />
          </View>
        </View>
      );
    }

    return children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: nbSpacing.lg,
  },
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: 0,
    padding: nbSpacing.xl,
    width: '100%',
    maxWidth: 400,
    ...nbShadows.lg,
  },
  icon: {
    fontSize: 64,
    textAlign: 'center',
    marginBottom: nbSpacing.md,
  },
  title: {
    fontSize: nbTypography.fontSize['2xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
  message: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
    textAlign: 'center',
    marginBottom: nbSpacing.lg,
    lineHeight: nbTypography.fontSize.base * nbTypography.lineHeight.relaxed,
  },
  errorDetails: {
    marginBottom: nbSpacing.lg,
    padding: nbSpacing.md,
    backgroundColor: nbColors.dangerLight,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.danger,
    borderRadius: 0,
  },
  errorTitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.danger,
    marginBottom: nbSpacing.xs,
  },
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.danger,
    marginBottom: nbSpacing.xs,
    fontFamily: 'monospace',
  },
  errorStack: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['700'],
    fontFamily: 'monospace',
    marginTop: nbSpacing.xs,
  },
});

export default ErrorBoundary;
