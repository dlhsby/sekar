/**
 * NBButton - Neo Brutalism Button Component
 *
 * Bold button with hard-edge shadow that responds to press with
 * transform animation and haptic feedback.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useState, useCallback } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  ViewStyle,
  TextStyle,
  AccessibilityProps,
  Platform,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbTypography,
  nbTouchTarget,
  nbAnimation,
} from '../../constants/nbTokens';

export type NBButtonVariant =
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'ghost';
export type NBButtonSize = 'sm' | 'md' | 'lg';

export interface NBButtonProps extends AccessibilityProps {
  /** Button text */
  title: string;
  /** Press handler */
  onPress: () => void;
  /** Visual variant */
  variant?: NBButtonVariant;
  /** Size preset */
  size?: NBButtonSize;
  /** Disabled state */
  disabled?: boolean;
  /** Loading state with spinner */
  loading?: boolean;
  /** Full width button */
  fullWidth?: boolean;
  /** Custom container style */
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
}

// Variant color mappings
const variantStyles: Record<
  NBButtonVariant,
  { bg: string; text: string; border: string }
> = {
  primary: {
    bg: nbColors.primary,
    text: nbColors.white,
    border: nbColors.black,
  },
  secondary: {
    bg: nbColors.white,
    text: nbColors.black,
    border: nbColors.black,
  },
  success: {
    bg: nbColors.success,
    text: nbColors.white,
    border: nbColors.black,
  },
  danger: { bg: nbColors.danger, text: nbColors.white, border: nbColors.black },
  ghost: {
    bg: 'transparent',
    text: nbColors.primary,
    border: 'transparent',
  },
};

// Size presets
const sizeStyles: Record<
  NBButtonSize,
  { height: number; paddingHorizontal: number; fontSize: number }
> = {
  sm: { height: 36, paddingHorizontal: 16, fontSize: nbTypography.fontSize.sm },
  md: {
    height: nbTouchTarget.minHeight,
    paddingHorizontal: 24,
    fontSize: nbTypography.fontSize.base,
  },
  lg: { height: 56, paddingHorizontal: 32, fontSize: nbTypography.fontSize.lg },
};

/**
 * Neo Brutalism styled button with press animations and haptic feedback
 *
 * @example
 * <NBButton
 *   title="Submit"
 *   onPress={handleSubmit}
 *   variant="primary"
 *   size="md"
 * />
 */
export const NBButton: React.FC<NBButtonProps> = ({
  title,
  onPress,
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  fullWidth = false,
  style,
  textStyle,
  testID,
  ...accessibilityProps
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const variantStyle = variantStyles[variant];
  const sizeStyle = sizeStyles[size];
  const isGhost = variant === 'ghost';
  const isDisabled = disabled || loading;

  const handlePressIn = useCallback(() => {
    if (!isDisabled) {
      setIsPressed(true);
      if (Platform.OS !== 'web') {
        ReactNativeHapticFeedback.trigger('impactLight', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
    }
  }, [isDisabled]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handlePress = useCallback(() => {
    if (!isDisabled) {
      if (Platform.OS !== 'web') {
        ReactNativeHapticFeedback.trigger('impactMedium', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      onPress();
    }
  }, [isDisabled, onPress]);

  // Calculate shadow and transform for pressed state
  const currentShadow = isPressed ? nbShadows.active : nbShadows.md;
  const pressTransform = isPressed
    ? [{ translateX: 2 }, { translateY: 2 }]
    : [{ translateX: 0 }, { translateY: 0 }];

  return (
    <TouchableOpacity
      activeOpacity={1}
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={isDisabled}
      testID={testID}
      accessible
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...accessibilityProps}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.bg,
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderWidth: isGhost ? 0 : nbBorders.default,
          borderColor: variantStyle.border,
          transform: pressTransform,
        },
        !isGhost && !isDisabled && currentShadow,
        fullWidth && styles.fullWidth,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={variantStyle.text}
          size="small"
          testID={`${testID}-spinner`}
        />
      ) : (
        <Text
          style={[
            styles.text,
            {
              color: variantStyle.text,
              fontSize: sizeStyle.fontSize,
            },
            textStyle,
          ]}
        >
          {title}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: nbTouchTarget.minWidth,
  },
  text: {
    fontWeight: nbTypography.fontWeight.semibold,
    textAlign: 'center',
  },
  fullWidth: {
    width: '100%',
  },
  disabled: {
    opacity: 0.5,
    ...nbShadows.none,
  },
});

export default NBButton;
