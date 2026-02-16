/**
 * MonitoringStatsCard Component
 * Displays supervisor/monitoring statistics for non-clockable roles
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { nbColors, nbTypography, nbSpacing, nbBorderRadius, nbBorders, nbShadows } from '../../constants/nbTokens';
import { NBCard } from '../nb';
import type { MonitoringStats } from '../../hooks/useProfileData';

interface MonitoringStatsCardProps {
  stats: MonitoringStats;
  testID?: string;
}

const STAT_ROWS = [
  { key: 'users', icon: 'account-group', label: 'Pekerja aktif', field: 'totalUsersManaged' },
  { key: 'areas', icon: 'map-marker', label: 'Area dikelola', field: 'totalAreasMonitored' },
  { key: 'activities', icon: 'file-document-outline', label: 'Aktivitas bulan ini', field: 'activitiesReviewedThisMonth' },
] as const;

export const MonitoringStatsCard: React.FC<MonitoringStatsCardProps> = ({
  stats,
  testID = 'monitoring-stats-card',
}) => {
  return (
    <NBCard variant="elevated" style={styles.card} testID={testID}>
      <Text style={styles.cardTitle}>Ringkasan</Text>
      {STAT_ROWS.map((row, index) => (
        <React.Fragment key={row.key}>
          <View style={styles.statsRow}>
            <MaterialCommunityIcons
              name={row.icon}
              size={22}
              color={nbColors.primary}
              style={styles.statsIcon}
            />
            <Text style={styles.statsLabel}>{row.label}</Text>
            <Text style={styles.statsValue}>{stats[row.field]}</Text>
          </View>
          {index < STAT_ROWS.length - 1 && <View style={styles.statDivider} />}
        </React.Fragment>
      ))}
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
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: nbSpacing.sm,
  },
  statsIcon: {
    marginRight: nbSpacing.sm,
    width: 28,
  },
  statsLabel: {
    flex: 1,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.black,
  },
  statsValue: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.primary,
  },
  statDivider: {
    height: nbBorders.thin,
    backgroundColor: nbColors.black,
    marginLeft: nbSpacing.sm + 28,
  },
});
