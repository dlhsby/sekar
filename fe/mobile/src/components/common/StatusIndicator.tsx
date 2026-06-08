/**
 * StatusIndicator Component
 * Large circular status display with color-coded states
 * Neo Brutalism 2.0 compliant with WCAG 2.1 AA accessibility
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
} from '../../constants/nbTokens';

type StatusType = 'success' | 'error' | 'loading';

interface StatusIndicatorProps {
  status: StatusType;
  title: string;
  subtitle?: string;
  metadata?: string;
  size?: number;
}

const statusConfig = {
  success: {
    color: nbColors.success,
    darkColor: nbColors.successDark,
    icon: 'check-circle' as const,
    iconColor: nbColors.successDark,
  },
  error: {
    color: nbColors.danger,
    darkColor: nbColors.dangerDark,
    icon: 'close-circle' as const,
    iconColor: nbColors.dangerDark,
  },
  loading: {
    color: nbColors.gray300,
    darkColor: nbColors.gray400,
    icon: 'dots-horizontal-circle' as const,
    iconColor: nbColors.gray400,
  },
};

export function StatusIndicator({
  status,
  title,
  subtitle,
  metadata,
  size = 100,
}: StatusIndicatorProps): React.ReactElement {
  const config = statusConfig[status];

  return (
    <View style={styles.container}>
      {/* Circular Status Indicator */}
      <View
        style={[
          styles.circle,
          {
            width: size,
            height: size,
            backgroundColor: config.color,
            borderRadius: size / 2,
          },
        ]}
        accessibilityRole="image"
        accessibilityLabel={`Status: ${title}`}
      >
        <MaterialCommunityIcons
          name={config.icon}
          size={size * 0.5}
          color={config.iconColor}
        />
      </View>

      {/* Title */}
      <Text style={styles.title}>{title}</Text>

      {/* Subtitle */}
      {subtitle && (
        <Text style={styles.subtitle}>{subtitle}</Text>
      )}

      {/* Metadata */}
      {metadata && (
        <Text style={styles.metadata}>{metadata}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    padding: nbSpacing.md,
  },
  circle: {
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
  },
  title: {
    fontSize: nbType.h2.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    textAlign: 'center',
    marginBottom: nbSpacing.xs,
  },
  subtitle: {
    fontSize: nbType.body.fontSize,
    fontWeight: nbType.bodyLg.fontWeight,
    color: nbColors.gray700,
    textAlign: 'center',
    marginBottom: nbSpacing.xs,
  },
  metadata: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.body.fontWeight,
    color: nbColors.gray600,
    textAlign: 'center',
  },
});
