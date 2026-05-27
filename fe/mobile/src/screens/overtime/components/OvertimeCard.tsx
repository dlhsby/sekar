/**
 * OvertimeCard
 * Extracted from OvertimeListScreen — renders a single overtime item in the list.
 */

import React from 'react';
import { TouchableOpacity, View, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBCard, NBBadge, NBText } from '../../../components/nb';
import {
  nbColors,
  nbSpacing,
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
  const durationStr = formatDurationHours(overtime.start_datetime ?? '', overtime.end_datetime ?? '');
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
            <NBText variant="body" color="black" numberOfLines={1} style={{ marginBottom: 2 }}>
              {overtime.activityType?.name ?? 'Lembur'}
            </NBText>
            <NBText variant="caption" color="gray500">
              {createdDate} · {createdTime}
            </NBText>
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
          <NBText variant="body-sm" color="gray600" numberOfLines={2} style={{ marginBottom: nbSpacing.xs }}>
            {overtime.description}
          </NBText>
        ) : null}

        {/* Meta row: duration, area, photos */}
        <View style={styles.itemMeta}>
          <View style={styles.metaChip}>
            <MaterialCommunityIcons name="clock-outline" size={12} color={nbColors.gray500} style={{ marginRight: 3 }} />
            <NBText variant="caption" color="gray500">{durationStr}</NBText>
          </View>
          {overtime.area && (
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="map-marker-outline" size={12} color={nbColors.gray500} style={{ marginRight: 3 }} />
              <NBText variant="caption" color="gray500">{overtime.area.name}</NBText>
            </View>
          )}
          {overtime.photo_urls && overtime.photo_urls.length > 0 && (
            <View style={styles.metaChip}>
              <MaterialCommunityIcons name="camera-outline" size={12} color={nbColors.gray500} style={{ marginRight: 3 }} />
              <NBText variant="caption" color="gray500">{overtime.photo_urls.length} foto</NBText>
            </View>
          )}
        </View>

        {/* Creator row */}
        {overtime.user && (
          <View style={styles.creatorRow}>
            <MaterialCommunityIcons name="account-outline" size={12} color={nbColors.gray500} style={{ marginRight: 3 }} />
            <NBText variant="caption" color="gray500">
              {overtime.user.role} - {overtime.user.full_name}
            </NBText>
          </View>
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
  itemMeta: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: nbSpacing.xs,
    marginTop: 2,
  },
  metaChip: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  creatorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.xs,
  },
});
