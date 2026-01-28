/**
 * NBBadge - Neo Brutalism Badge Component
 *
 * Bold badge/tag component with solid colors and thin borders.
 * Used for status indicators, labels, and category tags.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle, TextStyle } from 'react-native';
import {
  nbColors,
  nbBorders,
  nbBorderRadius,
  nbSpacing,
  nbTypography,
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
  style?: ViewStyle;
  /** Custom text style */
  textStyle?: TextStyle;
  /** Test ID for testing */
  testID?: string;
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
    bg: nbColors.gray[200],
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
    fontSize: nbTypography.fontSize.xs,
  },
  md: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    fontSize: nbTypography.fontSize.xs,
  },
  lg: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm,
    fontSize: nbTypography.fontSize.sm,
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
}) => {
  const colorStyle = colorStyles[color];
  const sizeStyle = sizeStyles[size];

  return (
    <View
      testID={testID}
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
        {text.toUpperCase()}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    borderWidth: nbBorders.thin,
    borderRadius: nbBorderRadius.minimal, // 2px - softened NB
    alignSelf: 'flex-start',
  },
  text: {
    fontWeight: nbTypography.fontWeight.bold,
    letterSpacing: 0.5,
    textAlign: 'center',
  },
});

export default NBBadge;
