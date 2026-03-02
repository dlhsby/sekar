/**
 * OvertimeCard
 * Extracted from OvertimeListScreen — renders a single overtime item in the list.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { NBCard, NBBadge } from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
} from '../../../constants/nbTokens';
import {
  getOvertimeStatusColor,
  getOvertimeStatusLabel,
  formatDateIndonesian,
  formatDurationHours,
} from '../../../utils/statusHelpers';
import type { Overtime } from '../../../types/models.types';

interface OvertimeCardProps {
  overtime: Overtime;
  onPress: () => void;
}

export function OvertimeCard({ overtime, onPress }: OvertimeCardProps): React.JSX.Element {
  const durationStr = formatDurationHours(overtime.start_datetime, overtime.end_datetime);
  const createdDate = formatDateIndonesian(overtime.created_at);
  const createdTime = new Date(overtime.created_at).toLocaleTimeString('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Jakarta',
  });

  return (
    <TouchableOpacity
      style={styles.itemCard}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Detail lembur ${overtime.activityType?.name ?? 'Lembur'}`}
    >
      <NBCard variant="elevated" style={styles.cardInner}>
        {/* Header: activity type + created time | status badge */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemPrimary} numberOfLines={1}>
              {overtime.activityType?.name ?? 'Lembur'}
            </Text>
            <Text style={styles.itemTimestamp}>
              {createdDate} · {createdTime}
            </Text>
          </View>
          <View style={styles.itemHeaderRight}>
            <NBBadge
              text={getOvertimeStatusLabel(overtime.status)}
              color={getOvertimeStatusColor(overtime.status)}
            />
          </View>
        </View>

        {/* Description */}
        {overtime.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {overtime.description}
          </Text>
        ) : null}

        {/* Meta row: duration, area, photos */}
        <View style={styles.itemMeta}>
          <Text style={styles.itemMetaChip}>🕐 {durationStr}</Text>
          {overtime.area && (
            <Text style={styles.itemMetaChip}>📍 {overtime.area.name}</Text>
          )}
          {overtime.photo_urls && overtime.photo_urls.length > 0 && (
            <Text style={styles.itemMetaChip}>📸 {overtime.photo_urls.length} foto</Text>
          )}
        </View>

        {/* Creator row */}
        {overtime.user && (
          <Text style={styles.itemCreator}>
            👤 {overtime.user.role} - {overtime.user.full_name}
          </Text>
        )}
      </NBCard>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  itemCard: {
    marginBottom: nbSpacing.sm,
  },
  cardInner: {
    padding: nbSpacing.md,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: nbSpacing.xs,
  },
  itemHeaderLeft: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  itemHeaderRight: {
    alignItems: 'flex-end',
  },
  itemPrimary: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: 2,
  },
  itemTimestamp: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
  },
  itemDescription: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[600],
    marginBottom: nbSpacing.xs,
    lineHeight: 18,
  },
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.xs,
    marginTop: 2,
  },
  itemMetaChip: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
  },
  itemCreator: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray[500],
    marginTop: nbSpacing.xs,
  },
});
