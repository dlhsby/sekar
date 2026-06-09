/**
 * SkeletonLoader Component
 * Provides shimmer loading animation for better perceived performance
 * Use instead of basic spinners to reduce perceived load time by 20-30%
 *
 * @deprecated Use NBSkeleton from components/nb instead.
 * This Material Design component will be removed in a future version.
 * Migration: import { NBSkeleton } from '../../components/nb'
 */

import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ViewStyle,
} from 'react-native';
import { theme } from '../../constants/theme';

interface SkeletonLoaderProps {
  width?: number | string;
  height?: number;
  borderRadius?: number;
  style?: ViewStyle;
}

interface SkeletonCardProps {
  style?: ViewStyle;
}

interface SkeletonListProps {
  count?: number;
  itemHeight?: number;
  style?: ViewStyle;
}

/**
 * Base skeleton element with shimmer animation
 */
export function SkeletonLoader({
  width = '100%',
  height = 20,
  borderRadius = theme.borderRadius.sm,
  style,
}: SkeletonLoaderProps): React.ReactElement {
  const shimmerAnimation = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const shimmer = Animated.loop(
      Animated.timing(shimmerAnimation, {
        toValue: 1,
        duration: 1500,
        useNativeDriver: true,
      })
    );
    shimmer.start();

    return () => {
      shimmer.stop();
      shimmerAnimation.stopAnimation();
    };
  }, [shimmerAnimation]);

  // Optimize animation range - using ±200 instead of full screen width
  // Reduces GPU load without visible difference
  const translateX = shimmerAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200],
  });

  return (
    <View
      style={[
        styles.skeleton,
        {
          width: typeof width === 'number' ? width : (width as any),
          height,
          borderRadius,
        },
        style,
      ] as ViewStyle[]}
      accessibilityRole="progressbar"
      accessibilityLabel="Memuat konten"
    >
      <Animated.View
        style={[
          styles.shimmer,
          {
            transform: [{ translateX }],
          },
        ]}
      />
    </View>
  );
}

/**
 * Skeleton card layout for card-style content
 */
export function SkeletonCard({ style }: SkeletonCardProps): React.JSX.Element {
  return (
    <View style={[styles.card, style]}>
      <SkeletonLoader width="60%" height={24} style={styles.cardTitle} />
      <SkeletonLoader width="100%" height={16} style={styles.cardLine} />
      <SkeletonLoader width="80%" height={16} style={styles.cardLine} />
      <View style={styles.cardRow}>
        <SkeletonLoader width={100} height={40} borderRadius={theme.borderRadius.md} />
        <SkeletonLoader width={100} height={40} borderRadius={theme.borderRadius.md} />
      </View>
    </View>
  );
}

/**
 * Skeleton list for list-style content
 */
export function SkeletonList({
  count = 3,
  style,
}: SkeletonListProps): React.JSX.Element {
  return (
    <View style={style}>
      {Array.from({ length: count }).map((_, index) => (
        <View key={`skeleton-item-${index}`} style={styles.listItem}>
          <SkeletonLoader
            width={48}
            height={48}
            borderRadius={24}
            style={styles.listAvatar}
          />
          <View style={styles.listContent}>
            <SkeletonLoader width="70%" height={18} style={styles.listTitle} />
            <SkeletonLoader width="50%" height={14} />
          </View>
        </View>
      ))}
    </View>
  );
}

/**
 * Skeleton for report/shift history items
 */
export function SkeletonReportItem(): React.JSX.Element {
  return (
    <View style={styles.reportItem}>
      <View style={styles.reportHeader}>
        <SkeletonLoader width={80} height={20} />
        <SkeletonLoader width={60} height={16} />
      </View>
      <SkeletonLoader width="90%" height={16} style={styles.reportLine} />
      <SkeletonLoader width="60%" height={16} />
    </View>
  );
}

/**
 * Skeleton for home screen summary cards
 */
export function SkeletonSummaryCard(): React.JSX.Element {
  return (
    <View style={styles.summaryCard}>
      <SkeletonLoader width="50%" height={20} style={styles.summaryTitle} />
      <View style={styles.summaryRow}>
        <View style={styles.summaryItem}>
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <SkeletonLoader width={40} height={14} style={styles.summaryLabel} />
        </View>
        <View style={styles.summaryDivider} />
        <View style={styles.summaryItem}>
          <SkeletonLoader width={48} height={48} borderRadius={24} />
          <SkeletonLoader width={40} height={14} style={styles.summaryLabel} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: theme.colors.gray200,
    overflow: 'hidden',
  },
  shimmer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: theme.colors.gray100,
    opacity: 0.5,
    width: 100,
  },
  card: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    marginBottom: theme.spacing.md,
  },
  cardTitle: {
    marginBottom: theme.spacing.md,
  },
  cardLine: {
    marginBottom: theme.spacing.sm,
  },
  cardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: theme.spacing.md,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  listAvatar: {
    marginRight: theme.spacing.md,
  },
  listContent: {
    flex: 1,
  },
  listTitle: {
    marginBottom: theme.spacing.xs,
  },
  reportItem: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.md,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    ...theme.shadows.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.sm,
  },
  reportLine: {
    marginBottom: theme.spacing.xs,
  },
  summaryCard: {
    backgroundColor: theme.colors.white,
    borderRadius: theme.borderRadius.lg,
    padding: theme.spacing.md,
    ...theme.shadows.md,
    marginBottom: theme.spacing.md,
  },
  summaryTitle: {
    marginBottom: theme.spacing.md,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
  },
  summaryItem: {
    alignItems: 'center',
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 60,
    backgroundColor: theme.colors.border,
  },
  summaryLabel: {
    marginTop: theme.spacing.sm,
  },
});

export default SkeletonLoader;
