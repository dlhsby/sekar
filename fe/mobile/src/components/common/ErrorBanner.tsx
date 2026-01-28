/**
 * @deprecated Use NBAlert from components/nb instead.
 * This Material Design component will be removed in a future version.
 * Migration: import { NBAlert } from '../../components/nb'
 */

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

type BannerVariant = 'error' | 'warning' | 'info';

interface ErrorBannerProps {
  message: string;
  /** Visual variant: 'error' (red), 'warning' (orange), 'info' (blue) */
  variant?: BannerVariant;
  onDismiss?: () => void;
  /** Text for action button (if provided, shows action button instead of dismiss) */
  actionText?: string;
  /** Callback when action button is pressed */
  onAction?: () => void;
  /** Additional container style */
  style?: ViewStyle;
}

/**
 * Error/warning/info message banner with optional dismiss or action button
 */
export function ErrorBanner({
  message,
  variant = 'error',
  onDismiss,
  actionText,
  onAction,
  style,
}: ErrorBannerProps): JSX.Element {
  const containerStyle = [
    styles.container,
    variant === 'warning' && styles.containerWarning,
    variant === 'info' && styles.containerInfo,
    style,
  ];

  const textStyle = [
    styles.message,
    variant === 'warning' && styles.messageWarning,
  ];

  const buttonTextStyle = [
    styles.actionButton,
    variant === 'warning' && styles.actionButtonWarning,
  ];

  return (
    <View
      style={containerStyle}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
    >
      <Text style={textStyle}>{message}</Text>
      {actionText && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={actionText}
        >
          <Text style={buttonTextStyle}>{actionText}</Text>
        </TouchableOpacity>
      ) : onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Tutup pesan kesalahan"
          accessibilityHint="Ketuk untuk menutup pesan kesalahan ini"
        >
          <Text style={styles.dismissButton}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.error,
    padding: theme.spacing.md,
    borderRadius: theme.borderRadius.md,
    marginBottom: theme.spacing.md,
  },
  containerWarning: {
    backgroundColor: theme.colors.warning,
  },
  containerInfo: {
    backgroundColor: theme.colors.info || '#2196F3',
  },
  message: {
    flex: 1,
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
    marginRight: theme.spacing.sm,
  },
  messageWarning: {
    color: theme.colors.textPrimary, // Dark text for better contrast on warning background
  },
  dismissButton: {
    fontSize: theme.typography.fontSize.lg,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.bold,
  },
  actionButton: {
    fontSize: theme.typography.fontSize.sm,
    color: theme.colors.white,
    fontWeight: theme.typography.fontWeight.bold,
    textDecorationLine: 'underline',
  },
  actionButtonWarning: {
    color: theme.colors.textPrimary,
  },
});

export default ErrorBanner;
