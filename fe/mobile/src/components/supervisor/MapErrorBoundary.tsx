/**
 * MapErrorBoundary Component
 * Error boundary for map components to prevent full app crashes
 * Provides graceful fallback UI when map operations fail
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbBorderRadius,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';

interface Props {
  children: ReactNode;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

/**
 * Error boundary specifically for map-related components
 * Catches errors in WorkerMarker, MapView operations, and clustering
 */
export class MapErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
    };
  }

  static getDerivedStateFromError(error: Error): State {
    // Update state so next render shows fallback UI
    return {
      hasError: true,
      error,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log error details for debugging
    console.error('Map Error Boundary caught error:', error, errorInfo);

    // In production, you would send this to error reporting service
    // Example: Sentry.captureException(error, { extra: errorInfo });
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
    });

    // Call optional reset handler from parent
    if (this.props.onReset) {
      this.props.onReset();
    }
  };

  render(): ReactNode {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <View style={styles.errorCard}>
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name="map-marker-alert-outline"
                size={48}
                color={nbColors.dangerDark}
              />
            </View>

            <Text style={styles.title}>Gagal Memuat Peta</Text>

            <Text style={styles.description}>
              Terjadi kesalahan saat memuat peta. Silakan coba lagi atau hubungi
              administrator jika masalah berlanjut.
            </Text>

            {__DEV__ && this.state.error && (
              <View style={styles.errorDetails}>
                <Text style={styles.errorText}>
                  {this.state.error.toString()}
                </Text>
              </View>
            )}

            <TouchableOpacity
              style={styles.retryButton}
              onPress={this.handleReset}
              accessibilityRole="button"
              accessibilityLabel="Coba lagi memuat peta"
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={nbColors.surface}
                style={styles.retryIcon}
              />
              <Text style={styles.retryButtonText}>Coba Lagi</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.background,
    padding: nbSpacing.lg,
  },
  errorCard: {
    backgroundColor: nbColors.surface,
    borderRadius: nbBorderRadius.lg,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    padding: nbSpacing.xl,
    alignItems: 'center',
    maxWidth: 400,
    width: '100%',
    ...nbShadows.lg,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: nbColors.dangerLight,
    borderWidth: nbBorders.base,
    borderColor: nbColors.dangerDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nbSpacing.lg,
  },
  title: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
  description: {
    fontSize: nbTypography.fontSize.md,
    color: nbColors.gray['600'],
    textAlign: 'center',
    lineHeight: nbTypography.fontSize.md * 1.5,
    marginBottom: nbSpacing.lg,
  },
  errorDetails: {
    backgroundColor: nbColors.gray['100'],
    borderRadius: nbBorderRadius.sm,
    borderWidth: 1,
    borderColor: nbColors.gray['300'],
    padding: nbSpacing.md,
    marginBottom: nbSpacing.lg,
    width: '100%',
  },
  errorText: {
    fontSize: nbTypography.fontSize.sm,
    fontFamily: 'monospace',
    color: nbColors.dangerDark,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.primary,
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.lg,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    minHeight: 48,
    ...nbShadows.sm,
  },
  retryIcon: {
    marginRight: nbSpacing.sm,
  },
  retryButtonText: {
    fontSize: nbTypography.fontSize.md,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.surface,
  },
});

export default MapErrorBoundary;
