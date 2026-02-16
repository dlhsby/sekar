/**
 * FieldStatsCard Component
 * Displays monthly shift statistics for clockable roles
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { nbColors, nbTypography, nbSpacing, nbBorderRadius, nbBorders, nbShadows } from '../../constants/nbTokens';
import { NBCard } from '../nb';
import type { FieldStats } from '../../hooks/useProfileData';

interface FieldStatsCardProps {
  stats: FieldStats;
  testID?: string;
}

export const FieldStatsCard: React.FC<FieldStatsCardProps> = ({
  stats,
  testID = 'field-stats-card',
}) => {
  return (
    <NBCard variant="elevated" style={styles.card} testID={testID}>
      <Text style={styles.cardTitle}>Statistik Bulan Ini</Text>
      <View style={styles.statsContainer}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.daysWorked}</Text>
          <Text style={styles.statLabel}>Hari Kerja</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{stats.totalHours}</Text>
          <Text style={styles.statLabel}>Jam Kerja</Text>
        </View>
      </View>
      <View style={styles.activitiesRow}>
        <Text style={styles.activitiesLabel}>Aktivitas:</Text>
        <Text style={styles.activitiesValue}>{stats.activitiesCount}</Text>
      </View>
    </NBCard>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
    padding: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  cardTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: nbSpacing.md,
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: nbBorders.base,
    height: 40,
    backgroundColor: nbColors.black,
  },
  statValue: {
    fontSize: nbTypography.fontSize['3xl'],
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
    marginBottom: nbSpacing.xs,
  },
  statLabel: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    textAlign: 'center',
  },
  activitiesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: nbSpacing.md,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
  },
  activitiesLabel: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['600'],
  },
  activitiesValue: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
});
