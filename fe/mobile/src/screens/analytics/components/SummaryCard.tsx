/**
 * Summary Card
 * Single stat card for team overview
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBCard, NBText } from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';

interface SummaryCardProps {
  label: string;
  value: number | string;
  subtitle: string;
}

export function SummaryCard({
  label,
  value,
  subtitle,
}: SummaryCardProps): React.JSX.Element {
  return (
    <NBCard style={styles.container}>
      <View style={styles.content}>
        <NBText variant="body-sm" color="gray600">
          {label}
        </NBText>
        <NBText variant="h2" color="primary" style={styles.value}>
          {value}
        </NBText>
        <NBText variant="body-sm" color="gray600">
          {subtitle}
        </NBText>
      </View>
    </NBCard>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: nbSpacing.md,
  },
  content: {
    justifyContent: 'center',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  value: {
    marginVertical: nbSpacing.xs,
  },
});
