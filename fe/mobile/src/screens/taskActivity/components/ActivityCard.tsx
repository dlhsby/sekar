/**
 * ActivityCard
 * Extracted from TasksActivityScreen — renders a single activity item in the list.
 */

import React from 'react';
import { TouchableOpacity, View, Text, StyleSheet } from 'react-native';
import { NBCard, NBBadge } from '../../../components/nb';
import { nbColors, nbSpacing, nbTypography } from '../../../constants/nbTokens';
import type { Activity } from '../../../types/models.types';
import { formatDate, formatTime } from '../../../utils/statusHelpers';

interface ActivityCardProps {
  activity: Activity;
  onPress: () => void;
}

export function ActivityCard({ activity, onPress }: ActivityCardProps): React.JSX.Element {
  return (
    <TouchableOpacity style={styles.itemCard} onPress={onPress}>
      <NBCard variant="elevated" style={styles.cardInner}>
        {/* Header: activity type + created time | status badge */}
        <View style={styles.itemHeader}>
          <View style={styles.itemHeaderLeft}>
            <Text style={styles.itemPrimary} numberOfLines={1}>
              {activity.activityType?.name || 'Aktivitas'}
            </Text>
            <Text style={styles.itemTimestamp}>
              {formatDate(activity.created_at)} · {formatTime(activity.created_at)}
            </Text>
          </View>
          <View style={styles.itemHeaderRight}>
            {activity.status && (
              <NBBadge
                text={
                  activity.status === 'approved' ? 'Disetujui' :
                  activity.status === 'rejected' ? 'Ditolak' : 'Menunggu Persetujuan'
                }
                color={
                  activity.status === 'approved' ? 'success' :
                  activity.status === 'rejected' ? 'danger' : 'gray'
                }
              />
            )}
          </View>
        </View>
        {/* Description */}
        {activity.description ? (
          <Text style={styles.itemDescription} numberOfLines={2}>
            {activity.description}
          </Text>
        ) : null}
        {/* Meta row */}
        <View style={styles.itemMeta}>
          {activity.area && (
            <Text style={styles.itemMetaChip}>📍 {activity.area.name}</Text>
          )}
          {activity.photo_urls && activity.photo_urls.length > 0 && (
            <Text style={styles.itemMetaChip}>📸 {activity.photo_urls.length} foto</Text>
          )}
        </View>
        {/* Creator row */}
        {activity.user && (
          <Text style={styles.itemCreator}>
            👤 {activity.user.role} - {activity.user.full_name}
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
    color: nbColors.gray['500'],
    marginTop: nbSpacing.xs,
  },
});
