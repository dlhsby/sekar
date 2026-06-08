import React, { useState, useCallback } from 'react';
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  TextStyle,
  Vibration,
  Platform,
} from 'react-native';
import { theme } from '../../constants/theme';

interface ButtonProps {
  title: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary' | 'outline';
  disabled?: boolean;
  loading?: boolean;
  style?: ViewStyle;
  textStyle?: TextStyle;
  accessibilityHint?: string;
  isCritical?: boolean; // For critical buttons like Clock In/Out (72dp height)
  enableHaptic?: boolean; // Enable haptic feedback on press
}

// Haptic feedback duration in ms (short vibration)
const HAPTIC_DURATION = Platform.OS === 'android' ? 10 : 5;

/**
 * Reusable button component with multiple variants, states, and accessibility
 */
export function Button({
  title,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
  accessibilityHint,
  isCritical = false,
  enableHaptic = true,
}: ButtonProps): React.ReactElement {
  const [isFocused, setIsFocused] = useState(false);
  const isDisabled = disabled || loading;

  const handlePress = useCallback(() => {
    // Trigger haptic feedback for primary and critical buttons
    if (enableHaptic && (variant === 'primary' || isCritical)) {
      try {
        // Check if vibration is supported on the platform
        if (Vibration && typeof Vibration.vibrate === 'function') {
          Vibration.vibrate(HAPTIC_DURATION);
        }
      } catch (error) {
        // Silently fail if haptic feedback is not available
        console.debug('Haptic feedback not available:', error);
      }
    }
    onPress();
  }, [onPress, enableHaptic, variant, isCritical]);

  /* istanbul ignore next */
  const handleFocus = useCallback(() => setIsFocused(true), []);
  /* istanbul ignore next */
  const handleBlur = useCallback(() => setIsFocused(false), []);

  return (
    <Pressable
      style={({ pressed }) => [
        styles.button,
        isCritical && styles.criticalButton,
        variant === 'primary' && styles.primaryButton,
        variant === 'secondary' && styles.secondaryButton,
        variant === 'outline' && styles.outlineButton,
        isDisabled && styles.disabledButton,
        pressed && !isDisabled && styles.pressed,
        isFocused && styles.focused,
        style,
      ]}
      onPress={handlePress}
      disabled={isDisabled}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled }}
      accessibilityHint={accessibilityHint}
      onFocus={handleFocus}
      onBlur={handleBlur}
    >
      {loading ? (
        <ActivityIndicator
          testID="loading-spinner"
          color={variant === 'outline' ? theme.colors.primary : theme.colors.white}
        />
      ) : (
        <Text
          style={[
            styles.text,
            variant === 'primary' && styles.primaryText,
            variant === 'secondary' && styles.secondaryText,
            variant === 'outline' && styles.outlineText,
            isDisabled && styles.disabledText,
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    height: 56, // Increased from 50 to 56dp for better touch target
    borderRadius: theme.borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
  },
  criticalButton: {
    height: 72, // Critical buttons (Clock In/Out) get 72dp height
  },
  primaryButton: {
    backgroundColor: theme.colors.primary,
  },
  secondaryButton: {
    backgroundColor: theme.colors.secondary,
  },
  outlineButton: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
  },
  disabledButton: {
    backgroundColor: theme.colors.disabled,
    borderColor: theme.colors.disabled,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  focused: {
    // Visible focus indicator for keyboard/screen reader navigation
    borderWidth: 3,
    borderColor: theme.colors.secondary,
    // Offset to prevent layout shift
    margin: -1.5,
  },
  text: {
    fontSize: theme.typography.fontSize.md,
    fontWeight: theme.typography.fontWeight.bold,
  },
  primaryText: {
    color: theme.colors.white,
  },
  secondaryText: {
    color: theme.colors.white,
  },
  outlineText: {
    color: theme.colors.primary,
  },
  disabledText: {
    color: theme.colors.textSecondary,
  },
});

export default Button;
