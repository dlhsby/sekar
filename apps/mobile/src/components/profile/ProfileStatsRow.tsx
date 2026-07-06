/**
 * ProfileStatsRow — PRF-1 stats grid: 3 HomeStatTiles tinted to match the hi-fi.
 * Field roles show shift/activity/hour counts; monitoring roles show team/area/activity
 * counts. Renders "—" for any 0/missing value.
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
  const tiles =
    props.mode === 'field'
      ? [
          { label: t('profile:stats.field.present'), value: display(props.stats.daysWorked), detail: t('profile:stats.field.period'), variant: 'info' as const },
          { label: t('profile:stats.field.tasks'), value: display(props.stats.activitiesCount), detail: t('profile:stats.field.period'), variant: 'yellow' as const },
          { label: t('profile:stats.field.hours'), value: display(props.stats.totalHours), detail: t('profile:stats.field.period'), variant: 'ok' as const },
        ]
      : [
          { label: t('profile:stats.monitoring.team'), value: display(props.stats.totalUsersManaged), detail: t('profile:stats.monitoring.managed'), variant: 'info' as const },
          { label: t('profile:stats.monitoring.areas'), value: display(props.stats.totalAreasMonitored), detail: t('profile:stats.monitoring.monitored'), variant: 'yellow' as const },
          { label: t('profile:stats.monitoring.activities'), value: display(props.stats.activitiesReviewedThisMonth), detail: t('profile:stats.monitoring.period'), variant: 'ok' as const },
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
