/**
 * NBAlert - Neo Brutalism Alert/Banner Component
 *
 * Displays alert messages with bold Neo Brutalism styling.
 * Used for errors, warnings, success messages, and informational banners.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  StyleProp,
  ViewStyle,
  TextStyle,
  Platform,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbTypography,
} from '../../constants/nbTokens';
import { NBButton } from './NBButton';

export type NBAlertVariant = 'danger' | 'warning' | 'success' | 'info';

export interface NBAlertProps {
  /** Visual variant that determines colors */
  variant: NBAlertVariant;
  /** Optional alert title */
  title?: string;
  /** Alert message */
  message: string;
  /** Custom icon component (variant emoji used if not provided) */
  icon?: React.ReactNode;
  /** Enable dismiss button */
  dismissible?: boolean;
  /** Dismiss handler */
  onDismiss?: () => void;
  /** Optional action button label */
  actionLabel?: string;
  /** Action button handler */
  onAction?: () => void;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom title style */
  titleStyle?: StyleProp<TextStyle>;
  /** Custom message style */
  messageStyle?: StyleProp<TextStyle>;
  /** Test ID for testing */
  testID?: string;
}

// Variant color mappings
const variantStyles: Record<
  NBAlertVariant,
  { bg: string; border: string; text: string; icon: string }
> = {
  danger: {
    bg: nbColors.danger,
    border: nbColors.black,
    text: nbColors.white,
    icon: '❌',
  },
  warning: {
    bg: nbColors.warning,
    border: nbColors.black,
    text: nbColors.white,
    icon: '⚠️',
  },
  success: {
    bg: nbColors.success,
    border: nbColors.black,
    text: nbColors.white,
    icon: '✅',
  },
  info: {
    bg: nbColors.primary,
    border: nbColors.black,
    text: nbColors.white,
    icon: 'ℹ️',
  },
};

/**
 * Neo Brutalism styled alert/banner component
 *
 * @example
 * // Simple error alert
 * <NBAlert
 *   variant="danger"
 *   message="Gagal menyimpan data"
 * />
 *
 * @example
 * // Alert with title and dismiss
 * <NBAlert
 *   variant="warning"
 *   title="Peringatan"
 *   message="Koneksi tidak stabil"
 *   dismissible
 *   onDismiss={handleDismiss}
 * />
 *
 * @example
 * // Alert with action button
 * <NBAlert
 *   variant="error"
 *   title="Kesalahan"
 *   message="Gagal memuat data"
 *   actionLabel="Coba Lagi"
 *   onAction={handleRetry}
 *   dismissible
 *   onDismiss={handleDismiss}
 * />
 */
export const NBAlert: React.FC<NBAlertProps> = ({
  variant,
  title,
  message,
  icon,
  dismissible = false,
  onDismiss,
  actionLabel,
  onAction,
  style,
  titleStyle,
  messageStyle,
  testID,
}) => {
  const variantStyle = variantStyles[variant];
  const displayIcon = icon !== undefined ? icon : variantStyle.icon;

  const handleDismiss = () => {
    if (dismissible && onDismiss) {
      if (Platform.OS !== 'web') {
        ReactNativeHapticFeedback.trigger('impactLight', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      onDismiss();
    }
  };

  const handleAction = () => {
    if (onAction) {
      if (Platform.OS !== 'web') {
        ReactNativeHapticFeedback.trigger('impactMedium', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      onAction();
    }
  };

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: variantStyle.bg,
          borderColor: variantStyle.border,
        },
        style,
      ]}
      testID={testID}
      accessible
      accessibilityRole="alert"
      accessibilityLabel={`${variant} alert: ${title || message}`}
    >
      {/* Content */}
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer} testID={`${testID}-icon`}>
          {typeof displayIcon === 'string' ? (
            <Text style={styles.iconText}>{displayIcon}</Text>
          ) : (
            displayIcon
          )}
        </View>

        {/* Text Content */}
        <View style={styles.textContainer}>
          {title && (
            <Text
              style={[
                styles.title,
                { color: variantStyle.text },
                titleStyle,
              ]}
              testID={`${testID}-title`}
              accessibilityLiveRegion={
                variant === 'danger' || variant === 'warning'
                  ? 'assertive'
                  : 'polite'
              }
            >
              {title}
            </Text>
          )}
          <Text
            style={[
              styles.message,
              { color: variantStyle.text },
              title ? styles.messageWithTitle : undefined,
              messageStyle,
            ]}
            testID={`${testID}-message`}
            accessibilityLiveRegion={
              variant === 'danger' || variant === 'warning'
                ? 'assertive'
                : 'polite'
            }
          >
            {message}
          </Text>
        </View>
      </View>

      {/* Actions */}
      {((dismissible && onDismiss) || (actionLabel && onAction)) && (
        <View style={styles.actions}>
          {actionLabel && onAction && (
            <NBButton
              title={actionLabel}
              onPress={handleAction}
              variant="secondary"
              size="sm"
              style={styles.actionButton}
              testID={`${testID}-action`}
            />
          )}
          {dismissible && onDismiss && (
            <NBButton
              title="✕"
              onPress={handleDismiss}
              variant="secondary"
              size="sm"
              style={styles.dismissButton}
              textStyle={styles.dismissButtonText}
              testID={`${testID}-dismiss`}
              accessibilityLabel="Dismiss alert"
            />
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderWidth: nbBorders.base,
    borderRadius: nbBorderRadius.base, // 2px - softened NB
    paddingVertical: nbSpacing.md,
    paddingHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconContainer: {
    marginRight: nbSpacing.sm,
    paddingTop: 2, // Align with text
  },
  iconText: {
    fontSize: 20,
    lineHeight: 24,
  },
  textContainer: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  title: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    lineHeight: nbTypography.fontSize.base * 1.5,
    marginBottom: nbSpacing.xs,
  },
  message: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    lineHeight: nbTypography.fontSize.sm * 1.5,
  },
  messageWithTitle: {
    fontSize: nbTypography.fontSize.sm,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: nbSpacing.sm,
    gap: nbSpacing.sm,
  },
  actionButton: {
    minWidth: 80,
  },
  dismissButton: {
    width: 36,
    paddingHorizontal: 0,
  },
  dismissButtonText: {
    fontSize: nbTypography.fontSize.lg,
  },
});

export default NBAlert;
