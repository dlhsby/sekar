/**
 * NBBackgroundPattern - Neo Brutalism Background Patterns
 *
 * Adds visual interest to plain backgrounds while maintaining NB aesthetics.
 * Uses geometric patterns with subtle transparency.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React from 'react';
import { View, StyleSheet, StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Line, Defs, Pattern as SvgPattern } from 'react-native-svg';
import { nbColors } from '../../constants/nbTokens';

export type PatternType = 'grid' | 'checkerboard' | 'dots' | 'stripes' | 'none';

interface NBBackgroundPatternProps {
  /** Pattern type to display */
  pattern?: PatternType;
  /** Base background color */
  backgroundColor?: string;
  /** Pattern color (will use with transparency) */
  patternColor?: string;
  /** Pattern opacity (0-1) */
  opacity?: number;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Children to render on top of pattern */
  children?: React.ReactNode;
}

/**
 * Neo Brutalism background pattern component
 *
 * Adds geometric patterns to backgrounds without breaking NB's flat color principle.
 * Patterns are subtle and don't interfere with content readability.
 *
 * @example
 * <NBBackgroundPattern pattern="grid" backgroundColor={nbColors.bgCanvas}>
 *   <LoginForm />
 * </NBBackgroundPattern>
 */
export const NBBackgroundPattern: React.FC<NBBackgroundPatternProps> = ({
  pattern = 'grid',
  backgroundColor = nbColors.bgCanvas,
  patternColor = nbColors.black,
  opacity = 0.03,
  style,
  children,
}) => {
  const renderPattern = () => {
    if (pattern === 'none') {
      return null;
    }

    const patternOpacity = Math.max(0, Math.min(1, opacity));

    switch (pattern) {
      case 'grid':
        return (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgPattern
                id="grid"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                {/* Vertical line */}
                <Line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="40"
                  stroke={patternColor}
                  strokeWidth="2"
                  opacity={patternOpacity}
                />
                {/* Horizontal line */}
                <Line
                  x1="0"
                  y1="0"
                  x2="40"
                  y2="0"
                  stroke={patternColor}
                  strokeWidth="2"
                  opacity={patternOpacity}
                />
              </SvgPattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#grid)" />
          </Svg>
        );

      case 'checkerboard':
        return (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgPattern
                id="checkerboard"
                x="0"
                y="0"
                width="40"
                height="40"
                patternUnits="userSpaceOnUse"
              >
                {/* Top-left square */}
                <Rect
                  x="0"
                  y="0"
                  width="20"
                  height="20"
                  fill={patternColor}
                  opacity={patternOpacity}
                />
                {/* Bottom-right square */}
                <Rect
                  x="20"
                  y="20"
                  width="20"
                  height="20"
                  fill={patternColor}
                  opacity={patternOpacity}
                />
              </SvgPattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#checkerboard)" />
          </Svg>
        );

      case 'dots':
        return (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgPattern
                id="dots"
                x="0"
                y="0"
                width="30"
                height="30"
                patternUnits="userSpaceOnUse"
              >
                <Circle
                  cx="15"
                  cy="15"
                  r="3"
                  fill={patternColor}
                  opacity={patternOpacity}
                />
              </SvgPattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#dots)" />
          </Svg>
        );

      case 'stripes':
        return (
          <Svg style={StyleSheet.absoluteFill}>
            <Defs>
              <SvgPattern
                id="stripes"
                x="0"
                y="0"
                width="20"
                height="20"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(45)"
              >
                <Line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="20"
                  stroke={patternColor}
                  strokeWidth="2"
                  opacity={patternOpacity}
                />
              </SvgPattern>
            </Defs>
            <Rect width="100%" height="100%" fill="url(#stripes)" />
          </Svg>
        );

      default:
        return null;
    }
  };

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {renderPattern()}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  content: {
    flex: 1,
    zIndex: 1,
  },
});

export default NBBackgroundPattern;
