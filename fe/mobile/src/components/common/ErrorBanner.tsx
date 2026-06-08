/**
 * @deprecated Use NBAlert from components/nb instead.
 * This Material Design component will be removed in a future version.
 * Migration: import { NBAlert } from '../../components/nb'
 */

import React from 'react';
import { View, TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import { NBText } from '../nb/NBText';
import { nbColors, nbSpacing, nbRadius } from '../../constants/nbTokens';

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

const VARIANT_BG: Record<BannerVariant, string> = {
  error: nbColors.danger,
  warning: nbColors.warning,
  info: nbColors.info,
};

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
}: ErrorBannerProps): React.ReactElement {
  const isWarning = variant === 'warning';
  const containerStyle = [styles.container, { backgroundColor: VARIANT_BG[variant] }, style];
  const textColor = isWarning ? 'black' : 'white';

  return (
    <View
      style={containerStyle}
      accessibilityLiveRegion="assertive"
      accessibilityRole="alert"
    >
      <NBText variant="body-sm" color={textColor} style={styles.message}>{message}</NBText>
      {actionText && onAction ? (
        <TouchableOpacity
          onPress={onAction}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel={actionText}
        >
          <NBText variant="body-sm" color={textColor} style={styles.actionDecoration}>{actionText}</NBText>
        </TouchableOpacity>
      ) : onDismiss ? (
        <TouchableOpacity
          onPress={onDismiss}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityRole="button"
          accessibilityLabel="Tutup pesan kesalahan"
          accessibilityHint="Ketuk untuk menutup pesan kesalahan ini"
        >
          <NBText variant="body-lg" color={textColor}>✕</NBText>
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
    padding: nbSpacing.md,
    borderRadius: nbRadius.md,
    marginBottom: nbSpacing.md,
  },
  message: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  actionDecoration: {
    textDecorationLine: 'underline',
  },
});

export default ErrorBanner;
