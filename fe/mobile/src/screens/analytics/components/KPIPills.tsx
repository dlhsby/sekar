/**
 * KPI Pills
 * Four performance metric indicators
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBText, NBCard } from '../../../components/nb';
import { nbSpacing } from '../../../constants/nbTokens';

interface KPIPillsProps {
  attendance: number; // 0-100
  punctuality: number; // 0-100
  taskCompletion: number; // 0-100
  areaCompliance: number; // 0-100
}

interface PillProps {
  value: number;
  label: string;
}

function KPIPill({ value, label }: PillProps): React.JSX.Element {
  const percentage = Math.round(value * 10) / 10;
  return (
    <NBCard style={styles.pill}>
      <View style={styles.pillContent}>
        <NBText variant="h3" color="primary" style={styles.value}>
          {percentage}%
        </NBText>
        <NBText variant="body-sm" color="gray700" style={styles.label}>
          {label}
        </NBText>
      </View>
    </NBCard>
  );
}

export function KPIPills({
  attendance,
  punctuality,
  taskCompletion,
  areaCompliance,
}: KPIPillsProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <KPIPill value={attendance} label={t('analytics:kpi.attendance')} />
        <KPIPill value={punctuality} label={t('analytics:kpi.punctuality')} />
      </View>
      <View style={styles.row}>
        <KPIPill value={taskCompletion} label={t('analytics:kpi.taskCompletion')} />
        <KPIPill value={areaCompliance} label={t('analytics:kpi.areaCompliance')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: nbSpacing.md,
  },
  row: {
    flexDirection: 'row',
    gap: nbSpacing.md,
  },
  pill: {
    flex: 1,
    padding: nbSpacing.md,
    minHeight: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillContent: {
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  value: {
    fontSize: 24,
  },
  label: {
    textAlign: 'center',
  },
});
