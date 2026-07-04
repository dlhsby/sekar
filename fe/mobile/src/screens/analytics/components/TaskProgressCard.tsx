/**
 * Task Progress Card
 * Shows task completion progress
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBCard, NBText } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';

interface TaskProgressCardProps {
  completed: number;
  total: number;
  rate: number; // percentage
}

export function TaskProgressCard({
  completed,
  total,
  rate,
}: TaskProgressCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const percentage = Math.round(rate * 10) / 10;

  return (
    <NBCard style={styles.container}>
      <View style={styles.header}>
        <NBText variant="h3">{t('analytics:tasks.title')}</NBText>
      </View>

      <View style={styles.stats}>
        <NBText variant="body" color="gray700">
          {t('analytics:tasks.completed')}: {completed} / {total} ({percentage}%)
        </NBText>
      </View>

      {/* Progress Bar */}
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            {
              width: `${Math.min(percentage, 100)}%`,
            },
          ]}
        />
      </View>

      {/* Status Indicator */}
      <View style={styles.statusContainer}>
        <View
          style={[
            styles.statusDot,
            {
              backgroundColor:
                percentage >= 80
                  ? nbColors.success
                  : percentage >= 60
                    ? nbColors.warning
                    : nbColors.warningLight,
            },
          ]}
        />
        <NBText variant="body-sm" color="gray600">
          {percentage >= 80
            ? t('analytics:tasks.targetMet')
            : percentage >= 60
              ? t('analytics:tasks.almostMet')
              : t('analytics:tasks.needsImprovement')}
        </NBText>
      </View>
    </NBCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: nbSpacing.md,
    gap: nbSpacing.md,
  },
  header: {
    gap: nbSpacing.xs,
  },
  stats: {
    gap: nbSpacing.sm,
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: nbColors.gray200,
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: nbColors.primary,
    borderRadius: 6,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
});
