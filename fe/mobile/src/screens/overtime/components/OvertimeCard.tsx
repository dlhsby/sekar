/**
 * OvertimeCard — a single overtime row in the Lembur list, on the shared
 * ListItemCard so it reads identically to Tugas / Aktivitas.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { ListItemCard, type ListItemMeta } from '../../../components/common';
import { nbSpacing } from '../../../constants/nbTokens';
import {
  overtimePill,
  formatDate,
  formatTime,
  formatDurationHours,
} from '../../../utils/statusHelpers';
import type { Overtime } from '../../../types/models.types';

interface OvertimeCardProps {
  overtime: Overtime;
  onPress: () => void;
}

function buildMeta(overtime: Overtime): ListItemMeta[] {
  const meta: ListItemMeta[] = [];
  const duration = formatDurationHours(overtime.start_datetime ?? '', overtime.end_datetime ?? '');
  if (duration && duration !== '-') { meta.push({ icon: 'clock-outline', label: duration }); }
  if (overtime.area) { meta.push({ icon: 'map-marker-outline', label: overtime.area.name }); }
  if (overtime.photo_urls && overtime.photo_urls.length > 0) {
    meta.push({ icon: 'camera-outline', label: `${overtime.photo_urls.length} foto` });
  }
  return meta;
}

export const OvertimeCard = React.memo(function OvertimeCard({ overtime, onPress }: OvertimeCardProps): React.JSX.Element {
  const pill = overtimePill(overtime.status);
  return (
    <ListItemCard
      statusTone={pill.tone}
      statusLabel={pill.label}
      rightText={`${formatDate(overtime.created_at)} · ${formatTime(overtime.created_at)}`}
      title={overtime.activityType?.name ?? 'Lembur'}
      description={overtime.description || undefined}
      meta={buildMeta(overtime)}
      creatorText={overtime.user ? `${overtime.user.role} · ${overtime.user.full_name}` : undefined}
      onPress={onPress}
      style={styles.spacing}
      accessibilityLabel={`Detail lembur ${overtime.activityType?.name ?? 'Lembur'}`}
      testID="overtime-card"
    />
  );
});

const styles = StyleSheet.create({
  spacing: {
    marginBottom: nbSpacing.sm,
  },
});
