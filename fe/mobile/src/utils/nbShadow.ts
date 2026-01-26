/**
 * Neo Brutalism Shadow Utilities
 *
 * Utilities for creating hard-edge, offset shadows characteristic of Neo Brutalism.
 * These shadows have no blur and create a distinctive bold appearance.
 */

import React from 'react';
import { View, ViewStyle, StyleSheet } from 'react-native';
import { nbShadows, NBShadowSize } from '../constants/nbTokens';

/**
 * Get shadow style for a given size
 *
 * @param size Shadow size: 'sm' | 'md' | 'lg' | 'hover' | 'active' | 'none'
 * @returns ViewStyle object with shadow properties
 *
 * @example
 * const cardStyle = {
 *   ...getNBShadow('md'),
 *   backgroundColor: '#FFFFFF',
 * };
 */
export const getNBShadow = (size: NBShadowSize): ViewStyle => {
  return nbShadows[size];
};

/**
 * Get animated shadow styles for press states
 *
 * @param isPressed Whether the element is currently pressed
 * @returns Shadow style and transform for the current state
 *
 * @example
 * const [pressed, setPressed] = useState(false);
 * const { shadow, transform } = getInteractiveShadow(pressed);
 */
export const getInteractiveShadow = (
  isPressed: boolean,
): { shadow: ViewStyle; transform: ViewStyle['transform'] } => {
  if (isPressed) {
    return {
      shadow: nbShadows.active,
      transform: [{ translateX: 2 }, { translateY: 2 }],
    };
  }
  return {
    shadow: nbShadows.md,
    transform: [{ translateX: 0 }, { translateY: 0 }],
  };
};

/**
 * Get shadow styles for hover state (web-like behavior on long press)
 *
 * @param isHovered Whether the element is being hovered/long-pressed
 * @returns Shadow style for hover state
 */
export const getHoverShadow = (isHovered: boolean): ViewStyle => {
  return isHovered ? nbShadows.hover : nbShadows.md;
};

/**
 * NBShadowWrapper component for layered shadow effect on Android
 *
 * React Native's elevation on Android doesn't perfectly replicate hard-edge shadows.
 * This wrapper creates a true Neo Brutalism effect using a layered view approach.
 *
 * @example
 * <NBShadowWrapper size="md">
 *   <View style={styles.card}>
 *     <Text>Card content</Text>
 *   </View>
 * </NBShadowWrapper>
 */
interface NBShadowWrapperProps {
  size: NBShadowSize;
  children: React.ReactNode;
  style?: ViewStyle;
  isPressed?: boolean;
}

export const NBShadowWrapper: React.FC<NBShadowWrapperProps> = ({
  size,
  children,
  style,
  isPressed = false,
}) => {
  const shadow = nbShadows[size];
  const offsetX = isPressed ? 2 : shadow.shadowOffset.width;
  const offsetY = isPressed ? 2 : shadow.shadowOffset.height;

  return React.createElement(
    View,
    { style: [styles.wrapper, style] },
    // Shadow layer (rendered behind content)
    React.createElement(View, {
      style: [
        styles.shadowLayer,
        {
          backgroundColor: shadow.shadowColor,
          top: offsetY,
          left: offsetX,
        },
      ],
    }),
    // Content layer
    React.createElement(View, { style: styles.contentLayer }, children),
  );
};

const styles = StyleSheet.create({
  wrapper: {
    position: 'relative',
  },
  shadowLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 0,
  },
  contentLayer: {
    position: 'relative',
    zIndex: 1,
  },
});

/**
 * Calculate shadow offset for disabled state
 * Disabled elements typically have reduced or no shadow
 *
 * @param disabled Whether the element is disabled
 * @param baseSize The base shadow size
 * @returns Shadow style adjusted for disabled state
 */
export const getDisabledShadow = (
  disabled: boolean,
  baseSize: NBShadowSize = 'md',
): ViewStyle => {
  if (disabled) {
    return {
      ...nbShadows.none,
      opacity: 0.5,
    };
  }
  return nbShadows[baseSize];
};

/**
 * Combine shadow with optional disabled state
 *
 * @param size Shadow size
 * @param disabled Whether the element is disabled
 * @returns Combined shadow style
 */
export const getShadowWithDisabled = (
  size: NBShadowSize,
  disabled: boolean,
): ViewStyle => {
  return disabled ? nbShadows.none : nbShadows[size];
};

export default {
  getNBShadow,
  getInteractiveShadow,
  getHoverShadow,
  getDisabledShadow,
  getShadowWithDisabled,
  NBShadowWrapper,
};
