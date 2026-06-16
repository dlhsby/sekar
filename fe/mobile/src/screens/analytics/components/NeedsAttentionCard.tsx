/**
 * Needs Attention Card
 * Shows workers with low performance scores
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBCard, NBText, NBBadge } from '../../../components/nb';
import { nbColors, nbSpacing } from '../../../constants/nbTokens';
import type { WorkerAnalytics } from '../../../types/analytics.types';

interface NeedsAttentionCardProps {
  workers: WorkerAnalytics[];
}

export function NeedsAttentionCard({
  workers,
}: NeedsAttentionCardProps): React.JSX.Element {
  return (
    <NBCard style={styles.container}>
      <NBText variant="h3" style={styles.title} color="gray900">
        Perlu Perhatian
      </NBText>

      <View style={styles.list}>
        {workers.map((worker, idx) => (
          <View key={worker.id} style={styles.row}>
            <View style={styles.rank}>
              <NBText variant="h3" color="gray900">
                {idx + 1}
              </NBText>
            </View>
            <View style={styles.info}>
              <NBText variant="body" style={styles.name}>
                {worker.full_name}
              </NBText>
              <NBText variant="body-sm" color="gray600">
                Skor: {Math.round(worker.performance_score * 10) / 10}
              </NBText>
            </View>
            <NBBadge
              text={worker.grade}
              color="warning"
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
    borderColor: nbColors.warning + '33',
    borderWidth: 1,
  },
  title: {
    marginBottom: nbSpacing.sm,
    color: nbColors.warning,
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
    backgroundColor: nbColors.warning + '15',
  },
  info: {
    flex: 1,
    gap: nbSpacing.xs,
  },
  name: {
    fontWeight: '600',
  },
});
