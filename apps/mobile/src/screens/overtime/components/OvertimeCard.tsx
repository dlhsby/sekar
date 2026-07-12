/**
 * OvertimeCard — a single overtime row in the Lembur list, on the shared
 * ListItemCard so it reads identically to Tugas / Aktivitas.
 */

import React from 'react';
import { StyleSheet } from 'react-native';
import { useTranslation } from 'react-i18next';
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

function buildMeta(overtime: Overtime, photoUnit: string): ListItemMeta[] {
  const meta: ListItemMeta[] = [];
  const duration = formatDurationHours(overtime.start_datetime ?? '', overtime.end_datetime ?? '');
  if (duration && duration !== '-') { meta.push({ icon: 'clock-outline', label: duration }); }
  if (overtime.location) { meta.push({ icon: 'map-marker-outline', label: overtime.location.name }); }
  if (overtime.photo_urls && overtime.photo_urls.length > 0) {
    meta.push({ icon: 'camera-outline', label: `${overtime.photo_urls.length} ${photoUnit}` });
  }
  return meta;
}

export const OvertimeCard = React.memo(function OvertimeCard({ overtime, onPress }: OvertimeCardProps): React.JSX.Element {
  const { t } = useTranslation();
  const pill = overtimePill(overtime.status);
  return (
    <ListItemCard
      statusTone={pill.tone}
      statusLabel={pill.label}
      rightText={`${formatDate(overtime.created_at)} · ${formatTime(overtime.created_at)}`}
      title={overtime.activityType?.name ?? t('overtime:list.defaultTitle')}
      description={overtime.description || undefined}
      meta={buildMeta(overtime, t('overtime:list.photoUnit'))}
      creatorText={overtime.user ? `${overtime.user.role} · ${overtime.user.full_name}` : undefined}
      onPress={onPress}
      style={styles.spacing}
      accessibilityLabel={`${t('overtime:list.cardAccessibilityLabelPrefix')} ${overtime.activityType?.name ?? t('overtime:list.defaultTitle')}`}
      testID="overtime-card"
    />
  );
});

const styles = StyleSheet.create({
  spacing: {
    marginBottom: nbSpacing.sm,
  },
});
