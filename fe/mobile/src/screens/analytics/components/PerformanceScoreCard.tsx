/**
 * Performance Score Card
 * Displays the main score with gauge
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBCard, NBText } from '../../../components/nb';
import { ScoreGauge } from '../../../components/charts/ScoreGauge';
import { nbSpacing } from '../../../constants/nbTokens';
import type { Grade } from '../../../types/analytics.types';

interface PerformanceScoreCardProps {
  score: number;
  grade: Grade;
}

export function PerformanceScoreCard({
  score,
  grade,
}: PerformanceScoreCardProps): React.JSX.Element {
  return (
    <NBCard style={styles.container}>
      <View style={styles.content}>
        <View style={styles.textSection}>
          <NBText variant="h2" color="gray900">
            Skor Kinerja
          </NBText>
          <NBText variant="body-sm" color="gray600" style={styles.subtitle}>
            Evaluasi performa keseluruhan
          </NBText>
        </View>
        <ScoreGauge score={score} grade={grade} size={140} showLabel={true} />
      </View>
    </NBCard>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: nbSpacing.md,
  },
  content: {
    gap: nbSpacing.md,
  },
  textSection: {
    gap: nbSpacing.xs,
  },
  subtitle: {
    marginTop: 4,
  },
});
