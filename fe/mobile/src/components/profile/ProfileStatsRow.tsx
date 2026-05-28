/**
 * ProfileStatsRow — PRF-1 stats grid: 3 HomeStatTiles tinted to match the hi-fi.
 * Field roles show shift/activity/hour counts; monitoring roles show team/area/activity
 * counts. Renders "—" for any 0/missing value.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { HomeStatTile } from '../home/HomeStatTile';
import { nbSpacing } from '../../constants/nbTokens';
import type { FieldStats, MonitoringStats } from '../../hooks/useProfileData';

type ProfileStatsRowProps =
  | { mode: 'field'; stats: FieldStats }
  | { mode: 'monitoring'; stats: MonitoringStats };

function display(value: number): string {
  return value > 0 ? String(value) : '—';
}

export function ProfileStatsRow(props: ProfileStatsRowProps): React.JSX.Element {
  const tiles =
    props.mode === 'field'
      ? [
          { label: 'Hadir', value: display(props.stats.daysWorked), detail: 'bulan ini', variant: 'info' as const },
          { label: 'Tugas', value: display(props.stats.activitiesCount), detail: 'bulan ini', variant: 'yellow' as const },
          { label: 'Jam', value: display(props.stats.totalHours), detail: 'bulan ini', variant: 'ok' as const },
        ]
      : [
          { label: 'Tim', value: display(props.stats.totalUsersManaged), detail: 'dikelola', variant: 'info' as const },
          { label: 'Area', value: display(props.stats.totalAreasMonitored), detail: 'dipantau', variant: 'yellow' as const },
          { label: 'Aktivitas', value: display(props.stats.activitiesReviewedThisMonth), detail: 'bulan ini', variant: 'ok' as const },
        ];

  return (
    <View style={styles.row} testID="profile-stats-row">
      {tiles.map((tile) => (
        <HomeStatTile
          key={tile.label}
          label={tile.label}
          value={tile.value}
          detail={tile.detail}
          variant={tile.variant}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.md,
  },
});

export default ProfileStatsRow;
