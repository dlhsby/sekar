/**
 * NBSkeleton - Neo Brutalism Skeleton Loader Component
 *
 * Loading placeholder with bold Neo Brutalism styling.
 * Shows shimmer animation with hard-edge rectangles and borders.
 *
 * @see specs/ui-ux/neo-brutalism.md
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
  Easing,
} from 'react-native';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';

export type NBSkeletonVariant = 'text' | 'card' | 'avatar' | 'list' | 'button';

export interface NBSkeletonProps {
  /** Visual variant */
  variant?: NBSkeletonVariant;
  /** Number of skeleton items to render */
  count?: number;
  /** Custom width (number or string percentage) */
  width?: number | string;
  /** Custom height (number in pixels) */
  height?: number;
  /** Custom container style */
  style?: StyleProp<ViewStyle>;
  /** Test ID for testing */
  testID?: string;
}

/**
 * Neo Brutalism styled skeleton loader
 *
 * @example
 * // Text skeleton
 * <NBSkeleton variant="text" count={3} />
 *
 * @example
 * // Card skeleton
 * <NBSkeleton variant="card" height={200} />
 *
 * @example
 * // Custom size
 * <NBSkeleton width={120} height={40} />
 *
 * @example
 * // List of skeletons
 * <NBSkeleton variant="list" count={5} />
 */
export const NBSkeleton: React.FC<NBSkeletonProps> = ({
  variant = 'text',
  count = 1,
  width,
  height,
  style,
  testID,
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1200,
          easing: Easing.linear,
          useNativeDriver: true,
        }),
      ]),
    );
    shimmer.start();

    return () => shimmer.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.7],
  });

  const getSkeletonStyle = (): ViewStyle => {
    const styles: Record<string, ViewStyle> = {
      text: {
        width: (width || '80%') as ViewStyle['width'],
        height: height || 16,
      },
      card: {
        width: (width || '100%') as ViewStyle['width'],
        height: height || 120,
      },
      avatar: {
        width: (width || 48) as ViewStyle['width'],
        height: height || 48,
      },
      list: {
        width: (width || '100%') as ViewStyle['width'],
        height: height || 60,
      },
      button: {
        width: (width || 100) as ViewStyle['width'],
        height: height || 48,
      },
    };
    return styles[variant] || { width: '100%', height: 16 };
  };

  const skeletonStyle = getSkeletonStyle() as ViewStyle;
  const spacing = variant === 'text' ? nbSpacing.sm : nbSpacing.md;

  const items = Array.from({ length: count }, (_, index) => (
    <View
      key={index}
      style={[
        styles.skeleton,
        skeletonStyle,
        index < count - 1 && { marginBottom: spacing },
      ]}
      testID={testID ? `${testID}-${index}` : undefined}
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            opacity: shimmerOpacity,
          },
        ]}
      />
    </View>
  ));

  return (
    <View
      style={[styles.container, style]}
      testID={testID}
      accessibilityRole="progressbar"
      accessibilityState={{ busy: true }}
      accessibilityLabel="Loading content"
    >
      {items}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  skeleton: {
    backgroundColor: nbColors.gray200,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm, // 4px - NB 2.0 skeleton radius
    overflow: 'hidden',
    position: 'relative',
  },
  shimmer: {
    ...StyleSheet.absoluteFill,
    backgroundColor: nbColors.gray300,
  },
});

export default NBSkeleton;
