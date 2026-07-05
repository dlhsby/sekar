/**
 * Top Performers Card
 * Shows top 3 performing workers
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
import { NBCard, NBText, NBBadge } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import type { WorkerAnalytics } from '../../../types/analytics.types';

interface TopPerformersCardProps {
  workers: WorkerAnalytics[];
}

export function TopPerformersCard({
  workers,
}: TopPerformersCardProps): React.JSX.Element {
  const { t } = useTranslation();

  return (
    <NBCard style={styles.container}>
      <NBText variant="h3" style={styles.title}>
        {t('analytics:cards.topPerformers')}
      </NBText>

      <View style={styles.list}>
        {workers.map((worker, idx) => (
          <View key={worker.id} style={styles.row}>
            <View style={styles.rank}>
              <NBText variant="h3" color="primary">
                {idx + 1}
              </NBText>
            </View>
            <View style={styles.info}>
              <NBText variant="body" style={styles.name}>
                {worker.full_name}
              </NBText>
              <NBText variant="body-sm" color="gray600">
                {t('analytics:cards.score')}: {Math.round(worker.performance_score * 10) / 10}
              </NBText>
            </View>
            <NBBadge
              text={worker.grade}
              color={worker.grade === 'A' ? 'success' : 'primary'}
            />
          </View>
        ))}
      </View>
    </NBCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: nbSpacing.md,
    gap: nbSpacing.md,
  },
  title: {
    marginBottom: nbSpacing.sm,
  },
  list: {
    gap: nbSpacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.md,
  },
  rank: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    backgroundColor: nbColors.primary + '15',
  },
  info: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  name: {
    fontWeight: '600',
  },
});
