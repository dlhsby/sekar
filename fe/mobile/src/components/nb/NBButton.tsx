/**
 * NBButton - Neo Brutalism Button Component
 *
 * Bold button with hard-edge shadow that responds to press with
 * transform animation and haptic feedback.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  View,
  StyleSheet,
  ActivityIndicator,
  StyleProp,
  ViewStyle,
  TextStyle,
  AccessibilityProps,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbTypography,
  nbTouchTarget,
  nbAnimation,
} from '../../constants/nbTokens';

export type NBButtonVariant =
  | 'primary'
  | 'secondary'
  | 'outline'
  | 'info'
  | 'success'
  | 'danger'
  | 'ghost';
export type NBButtonSize = 'sm' | 'md' | 'lg';

export interface NBButtonProps extends AccessibilityProps {
  /** Button text. Either `title` or `label` may be provided; both are accepted as equivalents. Children may also be passed as a fallback. */
  title?: string;
  /** Alias for `title`. */
  label?: string;
  /** Optional fallback when neither `title` nor `label` is set (e.g. nested elements). */
  children?: React.ReactNode;
  /** Optional MaterialCommunityIcons name rendered before the label. */
  leftIcon?: string;
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
  style?: StyleProp<ViewStyle>;
  /** Custom text style */
  textStyle?: StyleProp<TextStyle>;
  /** Test ID for testing */
  testID?: string;
}

// Lazy-initialize variant styles to support testing with mocked tokens
const getVariantStyles = () => {
  return {
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
    // `outline` is visually identical to `secondary` (white bg + black border) but
    // expresses intent — used for cancel / back buttons next to a primary CTA.
    outline: {
      bg: nbColors.white,
      text: nbColors.black,
      border: nbColors.black,
    },
    info: {
      bg: nbColors.accentSky, // Sky blue - for secondary actions
      text: nbColors.white,
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
  } as Record<NBButtonVariant, { bg: string; text: string; border: string }>;
};

// Size presets - these don't depend on runtime token changes
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
  label,
  children,
  leftIcon,
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
  const resolvedTitle = title ?? label;
  const [isPressed, setIsPressed] = useState(false);
  const [reduceMotionEnabled, setReduceMotionEnabled] = useState(false);

  // Check for reduce motion preference
  useEffect(() => {
    const checkReduceMotion = async () => {
      if (Platform.OS !== 'web') {
        const enabled = await AccessibilityInfo.isReduceMotionEnabled();
        setReduceMotionEnabled(enabled);
      }
    };
    checkReduceMotion();

    // Listen for changes
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReduceMotionEnabled,
    );

    return () => {
      subscription?.remove();
    };
  }, []);

  const variantStylesMap = getVariantStyles();
  const variantStyle = variantStylesMap[variant] ?? variantStylesMap.primary;
  if (__DEV__ && !variantStylesMap[variant]) {
    console.warn(
      `[NBButton] Unknown variant "${variant}" — falling back to "primary". Allowed: ${Object.keys(variantStylesMap).join(', ')}`,
    );
  }
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
  // Disable transform animation if reduce motion is enabled
  const currentShadow = isPressed ? nbShadows.active : nbShadows.md;
  const pressTransform =
    reduceMotionEnabled || !isPressed
      ? [{ translateX: 0 }, { translateY: 0 }]
      : [{ translateX: 2 }, { translateY: 2 }];

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
      accessibilityLabel={resolvedTitle ?? (typeof children === 'string' ? children : undefined)}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      {...accessibilityProps}
      style={[
        styles.button,
        {
          backgroundColor: variantStyle.bg,
          height: sizeStyle.height,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          borderWidth: isGhost ? 0 : nbBorders.base,
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
        <View style={styles.contentRow}>
          {leftIcon ? (
            <MaterialCommunityIcons
              name={leftIcon}
              size={sizeStyle.fontSize + 2}
              color={variantStyle.text}
              style={styles.leftIcon}
            />
          ) : null}
          {resolvedTitle !== undefined ? (
            <Text
              // numberOfLines=1 + ellipsizeMode keep a long label like
              // "Tugaskan" from wrapping in narrow half-row footer slots
              // where the size="lg" `paddingHorizontal: 32` eats space.
              numberOfLines={1}
              ellipsizeMode="tail"
              style={[
                styles.text,
                {
                  color: variantStyle.text,
                  fontSize: sizeStyle.fontSize,
                },
                textStyle,
              ]}
            >
              {resolvedTitle}
            </Text>
          ) : typeof children === 'string' || typeof children === 'number' ? (
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
              {children}
            </Text>
          ) : (
            children
          )}
        </View>
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
    borderRadius: nbBorderRadius.base, // 2px - softened NB
  },
  text: {
    fontWeight: nbTypography.fontWeight.semibold,
    textAlign: 'center',
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  leftIcon: {
    marginRight: nbSpacing.xs,
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
