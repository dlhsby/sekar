/**
 * NBCard - Neo Brutalism Card Component
 *
 * Card component with bold borders and hard-edge shadows.
 * Can be static or interactive with press animations.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  AccessibilityProps,
  Platform,
} from 'react-native';
import ReactNativeHapticFeedback from 'react-native-haptic-feedback';
import {
  nbColors,
  nbShadows,
  nbSpacing,
  nbBorders,
} from '../../constants/nbTokens';

export interface NBCardProps extends AccessibilityProps {
  /** Card content */
  children: React.ReactNode;
  /** Enable interactive (pressable) behavior */
  interactive?: boolean;
  /** Press handler (required if interactive) */
  onPress?: () => void;
  /** Custom container style */
  style?: ViewStyle;
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
 */
export const NBCard: React.FC<NBCardProps> = ({
  children,
  interactive = false,
  onPress,
  style,
  testID,
  ...accessibilityProps
}) => {
  const [isPressed, setIsPressed] = useState(false);

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

  // Calculate shadow and transform for pressed state
  const currentShadow = isPressed ? nbShadows.active : nbShadows.sm;
  const pressTransform = isPressed
    ? [{ translateX: 2 }, { translateY: 2 }]
    : [{ translateX: 0 }, { translateY: 0 }];

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
          interactive ? nbShadows.md : nbShadows.sm,
          isPressed && {
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
      style={[styles.card, nbShadows.sm, style]}
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
  style?: ViewStyle;
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
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
  },
  header: {
    padding: nbSpacing.md,
    borderBottomWidth: nbBorders.thin,
    borderBottomColor: nbColors.black,
  },
  content: {
    padding: nbSpacing.md,
  },
  footer: {
    padding: nbSpacing.md,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.black,
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
});

export default NBCard;
