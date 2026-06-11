/**
 * DetailRow — reusable label-above-value info row
 * Used across detail cards for consistent styling and spacing
 */

import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { NBText } from '../nb';
import { nbColors, nbSpacing } from '../../constants/nbTokens';

export type NBTextColor = 'black' | 'gray50' | 'gray100' | 'gray200' | 'gray300' | 'gray400' | 'gray500' | 'gray600' | 'gray700' | 'gray800' | 'primary' | 'success' | 'warning' | 'danger' | 'navy';

export interface DetailRowProps {
  label: string;
  value: string | React.ReactNode;
  variant?: 'default' | 'mono' | 'description';
  labelColor?: NBTextColor;
  valueColor?: NBTextColor;
  compact?: boolean;
  isLast?: boolean;
  testID?: string;
}

const styles = StyleSheet.create({
  container: {
    marginBottom: nbSpacing.md,
  },
  containerCompact: {
    marginBottom: nbSpacing.sm,
  },
  containerLast: {
    marginBottom: 0,
  },
  label: {
    color: nbColors.gray700,
    marginBottom: nbSpacing.xs,
  },
  value: {
    color: nbColors.black,
  },
  valueMono: {
    color: nbColors.black,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    letterSpacing: 0.5,
  },
  valueDescription: {
    color: nbColors.black,
    lineHeight: 24,
  },
});

export function DetailRow({
  label,
  value,
  variant = 'default',
  labelColor = 'gray700',
  valueColor = 'black',
  compact = false,
  isLast = false,
  testID,
}: DetailRowProps): React.JSX.Element {
  const containerStyle = [
    styles.container,
    compact && styles.containerCompact,
    isLast && styles.containerLast,
  ];

  const valueStyle =
    variant === 'mono'
      ? styles.valueMono
      : variant === 'description'
        ? styles.valueDescription
        : styles.value;

  return (
    <View style={containerStyle} testID={testID}>
      <NBText variant="body-sm" color={labelColor} style={styles.label}>
        {label}
      </NBText>
      {typeof value === 'string' ? (
        <NBText variant="body" color={valueColor} style={valueStyle}>
          {value}
        </NBText>
      ) : (
        value
      )}
    </View>
  );
}
