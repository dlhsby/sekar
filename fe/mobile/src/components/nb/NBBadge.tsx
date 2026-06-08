/**
 * NBBadge - Neo Brutalism Badge Component
 *
 * Bold badge/tag component with solid colors and thin borders.
 * Used for status indicators, labels, and category tags.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React from 'react';
import { View, Text, StyleSheet, StyleProp, ViewStyle, TextStyle } from 'react-native';
import {
  nbColors,
  nbBorders,
  nbRadius,
  nbSpacing,
  nbType,
} from '../../constants/nbTokens';

export type NBBadgeColor =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'gray'
  | 'navy';
export type NBBadgeSize = 'sm' | 'md' | 'lg';

export interface NBBadgeProps {
  /** Badge text */
  text: string;
  /** Color variant */
  color?: NBBadgeColor;
  /** Size preset */
  size?: NBBadgeSize;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Custom text style */
  textStyle?: StyleProp<TextStyle>;
  /** Test ID for testing */
  testID?: string;
  /** Accessibility label override */
  accessibilityLabel?: string;
}

// Color mappings
const colorStyles: Record<
  NBBadgeColor,
  { bg: string; text: string; border: string }
> = {
  primary: {
    bg: nbColors.primary,
    text: nbColors.white,
    border: nbColors.black,
  },
  success: {
    bg: nbColors.success,
    text: nbColors.white,
    border: nbColors.black,
  },
  warning: {
    bg: nbColors.warning,
    text: nbColors.white,
    border: nbColors.black,
  },
  danger: { bg: nbColors.danger, text: nbColors.white, border: nbColors.black },
  gray: {
    bg: nbColors.gray200,
    text: nbColors.black,
    border: nbColors.black,
  },
  navy: { bg: nbColors.navy, text: nbColors.white, border: nbColors.black },
};

// Size presets
const sizeStyles: Record<
  NBBadgeSize,
  { paddingHorizontal: number; paddingVertical: number; fontSize: number }
> = {
  sm: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: 2,
    fontSize: nbType.caption.fontSize,
  },
  md: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    fontSize: nbType.caption.fontSize,
  },
  lg: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    fontSize: nbType.bodySm.fontSize,
  },
};

/**
 * Neo Brutalism styled badge/tag component
 *
 * @example
 * <NBBadge text="URGENT" color="danger" />
 * <NBBadge text="PENDING" color="warning" size="sm" />
 * <NBBadge text="COMPLETED" color="success" />
 */
export const NBBadge: React.FC<NBBadgeProps> = ({
  text,
  color = 'primary',
  size = 'md',
  style,
  textStyle,
  testID,
  accessibilityLabel,
}) => {
  const colorStyle = colorStyles[color];
  const sizeStyle = sizeStyles[size];

  return (
    <View
      testID={testID}
      accessibilityRole="text"
      accessibilityLabel={accessibilityLabel || `${color} badge: ${text}`}
      style={[
        styles.badge,
        {
          backgroundColor: colorStyle.bg,
          borderColor: colorStyle.border,
          paddingHorizontal: sizeStyle.paddingHorizontal,
          paddingVertical: sizeStyle.paddingVertical,
        },
        style,
      ]}
    >
      <Text
        style={[
          styles.text,
          {
            color: colorStyle.text,
            fontSize: sizeStyle.fontSize,
          },
          textStyle,
        ]}
      >
        {(text ?? '').toString().toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: nbBorders.widthThin,
    borderRadius: nbRadius.sm, // 4px - NB 2.0 badge radius
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: nbType.h1.fontWeight,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default NBBadge;
