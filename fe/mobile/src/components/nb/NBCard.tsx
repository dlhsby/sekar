/**
 * NBCard - Neo Brutalism Card Component
 *
 * Card component with bold borders and hard-edge shadows.
 * Can be static or interactive with press animations.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  StyleProp,
  AccessibilityProps,
  Platform,
  AccessibilityInfo,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';

export type NBCardVariant = 'default' | 'elevated';

export interface NBCardProps extends AccessibilityProps {
  /** Card content */
  children: React.ReactNode;
  /** Visual variant (default uses sm shadow, elevated uses lg shadow) */
  variant?: NBCardVariant;
  /** Enable interactive (pressable) behavior */
  interactive?: boolean;
  /** Press handler (required if interactive) */
  onPress?: () => void;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Neo Brutalism styled card with optional press interaction
 *
 * @example
 * // Static card
 * <NBCard>
 *   <Text>Card content</Text>
 * </NBCard>
 *
 * @example
 * // Interactive card
 * <NBCard interactive onPress={() => navigate('Detail')}>
 *   <NBCardHeader>
 *     <Text>Title</Text>
 *   </NBCardHeader>
 *   <NBCardContent>
 *     <Text>Content</Text>
 *   </NBCardContent>
 * </NBCard>
 *
 * @example
 * // Elevated card for emphasis
 * <NBCard variant="elevated">
 *   <NBCardContent>
 *     <Text>Important content with larger shadow</Text>
 *   </NBCardContent>
 * </NBCard>
 */
export const NBCard: React.FC<NBCardProps> = ({
  children,
  variant = 'default',
  interactive = false,
  onPress,
  style,
  testID,
  ...accessibilityProps
}) => {
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

  const handlePressIn = useCallback(() => {
    if (interactive) {
      setIsPressed(true);
      if (Platform.OS !== 'web') {
        ReactNativeHapticFeedback.trigger('impactLight', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
    }
  }, [interactive]);

  const handlePressOut = useCallback(() => {
    setIsPressed(false);
  }, []);

  const handlePress = useCallback(() => {
    if (interactive && onPress) {
      if (Platform.OS !== 'web') {
        ReactNativeHapticFeedback.trigger('impactMedium', {
          enableVibrateFallback: true,
          ignoreAndroidSystemSettings: false,
        });
      }
      onPress();
    }
  }, [interactive, onPress]);

  // Calculate shadow based on variant and state
  // Elevated variant uses larger shadow for emphasis
  // Disable transform animation if reduce motion is enabled
  const defaultShadow = variant === 'elevated' ? nbShadows.lg : nbShadows.sm;
  const interactiveShadow = variant === 'elevated' ? nbShadows.lg : nbShadows.md;
  const currentShadow = isPressed ? nbShadows.active : defaultShadow;
  const pressTransform =
    reduceMotionEnabled || !isPressed
      ? [{ translateX: 0 }, { translateY: 0 }]
      : [{ translateX: 2 }, { translateY: 2 }];

  if (interactive && onPress) {
    return (
      <TouchableOpacity
        activeOpacity={1}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        testID={testID}
        accessible
        accessibilityRole="button"
        {...accessibilityProps}
        style={[
          styles.card,
          interactive ? interactiveShadow : defaultShadow,
          isPressed &&
            !reduceMotionEnabled && {
              ...nbShadows.active,
              transform: [{ translateX: 2 }, { translateY: 2 }],
            },
          style,
        ]}
      >
        {children}
      </TouchableOpacity>
    );
  }

  return (
    <View
      testID={testID}
      accessible
      {...accessibilityProps}
      style={[styles.card, defaultShadow, style]}
    >
      {children}
    </View>
  );
};

/**
 * Card header section with bottom border
 */
export interface NBCardSectionProps {
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
}

export const NBCardHeader: React.FC<NBCardSectionProps> = ({
  children,
  style,
}) => <View style={[styles.header, style]}>{children}</View>;

/**
 * Card content section with padding
 */
export const NBCardContent: React.FC<NBCardSectionProps> = ({
  children,
  style,
}) => <View style={[styles.content, style]}>{children}</View>;

/**
 * Card footer section with top border
 */
export const NBCardFooter: React.FC<NBCardSectionProps> = ({
  children,
  style,
}) => <View style={[styles.footer, style]}>{children}</View>;

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base, // from design token (v2.1.1: 10px)
  },
  header: {
    padding: nbSpacing.sm, // Reduced from md (16px) to sm (8px) for less vertical padding
    paddingHorizontal: nbSpacing.md, // Keep horizontal padding at 16px
    borderBottomWidth: nbBorders.widthThin,
    borderBottomColor: nbColors.black,
  },
  content: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
  },
  footer: {
    padding: nbSpacing.md,
    borderTopWidth: nbBorders.widthThin,
    borderTopColor: nbColors.black,
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
});

export default NBCard;
