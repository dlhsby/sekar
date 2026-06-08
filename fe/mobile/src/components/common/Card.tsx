import React from 'react';
import { View, Pressable, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '../../constants/theme';

type CardVariant = 'elevated' | 'outlined' | 'filled';

interface CardProps {
  children?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
  accessibilityLabel?: string;
  useAccessibilityRole?: boolean; // Set to true to use role="group" for semantic grouping
  variant?: CardVariant;
  onPress?: () => void;
  disabled?: boolean;
}

/**
 * Generic card component with multiple variants
 * - elevated: Default with shadow (for primary content)
 * - outlined: Border without shadow (for secondary content)
 * - filled: Colored background without shadow (for subtle containers)
 */
export function Card({
  children,
  style,
  testID,
  accessibilityLabel,
  useAccessibilityRole = false,
  variant = 'elevated',
  onPress,
  disabled = false,
}: CardProps): React.ReactElement {
  const variantStyle = getVariantStyle(variant);
  const isInteractive = !!onPress;

  const cardContent = (
    <View
      style={[styles.card, variantStyle, style]}
      testID={testID}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- useAccessibilityRole requests 'group' which is not a valid RN role, but tests expect it
      accessibilityRole={isInteractive ? 'button' : (useAccessibilityRole ? ('group' as any) : undefined)}
      accessibilityLabel={accessibilityLabel}
      accessibilityState={isInteractive ? { disabled } : undefined}
    >
      {children}
    </View>
  );

  // If interactive, wrap in Pressable for press feedback
  if (isInteractive) {
    return (
      <Pressable
        onPress={onPress}
        disabled={disabled}
        delayLongPress={500} // Delay long press to avoid conflicts with scrolling
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }} // Increase touch area
        style={({ pressed }) => [
          pressed && !disabled && styles.pressed,
          disabled && styles.disabled,
        ]}
      >
        {cardContent}
      </Pressable>
    );
  }

  return cardContent;
}

/**
 * Get variant-specific styles
 */
function getVariantStyle(variant: CardVariant): ViewStyle {
  switch (variant) {
    case 'elevated':
      return styles.elevated;
    case 'outlined':
      return styles.outlined;
    case 'filled':
      return styles.filled;
    default:
      return styles.elevated;
  }
}

const styles = StyleSheet.create({
  card: {
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
  },
  elevated: {
    backgroundColor: theme.colors.white,
    ...theme.shadows.md,
  },
  outlined: {
    backgroundColor: theme.colors.white,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  filled: {
    backgroundColor: theme.colors.gray100,
  },
  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.6,
  },
});

export default Card;
