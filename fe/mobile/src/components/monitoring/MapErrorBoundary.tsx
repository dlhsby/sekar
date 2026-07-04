/**
 * MapErrorBoundary Component
 * Error boundary for map components to prevent full app crashes
 * Provides graceful fallback UI when map operations fail
 */

import React, { Component, ErrorInfo, ReactNode } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import i18n from '../../i18n/config';
import {
  nbColors,
  nbType,
  nbSpacing,
  nbRadius,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import { captureException } from '../../services/crashReporting/sentry';

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

  componentDidCatch(error: Error, _errorInfo: ErrorInfo): void {
    // Report to Sentry (no-op until Sentry is initialized with a DSN).
    captureException(error, { screen: 'monitoring-map' });
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

            <Text style={styles.title}>{i18n.t('monitoring:mapError.title')}</Text>

            <Text style={styles.description}>
              {i18n.t('monitoring:mapError.message')}
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
              accessibilityLabel={i18n.t('monitoring:mapError.retryLabel')}
            >
              <MaterialCommunityIcons
                name="refresh"
                size={20}
                color={nbColors.bgSurface}
                style={styles.retryIcon}
              />
              <Text style={styles.retryButtonText}>{i18n.t('monitoring:mapError.retry')}</Text>
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
    backgroundColor: nbColors.bgCanvas,
    padding: nbSpacing.lg,
  },
  errorCard: {
    backgroundColor: nbColors.bgSurface,
    borderRadius: nbRadius.lg,
    borderWidth: nbBorders.widthBase,
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
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.dangerDark,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: nbSpacing.lg,
  },
  title: {
    fontSize: nbType.h2.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    textAlign: 'center',
    marginBottom: nbSpacing.sm,
  },
  description: {
    fontSize: nbType.body.fontSize,
    color: nbColors.gray600,
    textAlign: 'center',
    lineHeight: nbType.body.fontSize * 1.5,
    marginBottom: nbSpacing.lg,
  },
  errorDetails: {
    backgroundColor: nbColors.gray100,
    borderRadius: nbRadius.sm,
    borderWidth: 1,
    borderColor: nbColors.gray300,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.lg,
    width: '100%',
  },
  errorText: {
    fontSize: nbType.bodySm.fontSize,
    fontFamily: 'monospace',
    color: nbColors.dangerDark,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.primary,
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.lg,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    minHeight: 48,
    ...nbShadows.sm,
  },
  retryIcon: {
    marginRight: nbSpacing.sm,
  },
  retryButtonText: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.bgSurface,
  },
});

export default MapErrorBoundary;
