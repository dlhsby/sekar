/**
 * TodayActivitiesModal — v2.1 bottom sheet listing today's activities.
 * Opened from the Home "Aktivitas" Ringkasan tile. Rebuilt on `NBModal` +
 * `NBText` + design tokens (Phase 4 M3 Checkpoint 7).
 */

import React from 'react';
import { View, StyleSheet } from 'react-native';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import { ListItemCard, type ListItemMeta } from '../common';
import { nbSpacing } from '../../constants/nbTokens';
import { formatDate } from '../../utils/dateUtils';
import { activityPill, formatDate as formatDateShort, formatTime } from '../../utils/statusHelpers';
import type { Activity } from '../../types/models.types';

interface TodayActivitiesModalProps {
  visible: boolean;
  onClose: () => void;
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
}

export function TodayActivitiesModal({
  visible,
  onClose,
  activities,
  onActivityPress,
}: TodayActivitiesModalProps): React.JSX.Element {
  const todayDate = formatDate(new Date());

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={`Aktivitas Hari Ini (${activities.length})`}
      type="sheet"
      testID="today-activities-modal"
    >
      <NBText variant="mono-sm" color="gray600" style={styles.dateLine}>
        {todayDate}
      </NBText>

      {activities.length === 0 ? (
        <View style={styles.empty}>
          <NBText variant="h3" color="gray600" align="center">
            Belum ada aktivitas hari ini
          </NBText>
          <NBText variant="body-sm" color="gray500" align="center" style={styles.emptySub}>
            Aktivitas yang Anda buat akan muncul di sini
          </NBText>
        </View>
      ) : (
        <View style={styles.list}>
          {activities.map((activity) => {
            const p = activityPill(activity.status);
            const meta: ListItemMeta[] = [];
            if (activity.area?.name) { meta.push({ icon: 'map-marker', label: activity.area.name }); }
            if (activity.photo_urls && activity.photo_urls.length > 0) {
              meta.push({ icon: 'camera', label: `${activity.photo_urls.length} foto` });
            }
            return (
              <ListItemCard
                key={activity.id}
                statusTone={p.tone}
                statusLabel={p.label}
                rightText={`${formatDateShort(activity.created_at)} · ${formatTime(activity.created_at)}`}
                title={activity.activityType?.name ?? 'Aktivitas'}
                description={activity.description || undefined}
                meta={meta}
                onPress={() => onActivityPress?.(activity)}
                accessibilityLabel={`Lihat detail aktivitas ${activity.activityType?.name ?? ''}`}
                testID={`today-activity-${activity.id}`}
              />
            );
          })}
        </View>
      )}
    </NBModal>
  );
}

const styles = StyleSheet.create({
  dateLine: { marginBottom: nbSpacing.sm, letterSpacing: 0.4 },
  list: { gap: nbSpacing.sm },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: nbSpacing.xl },
  emptySub: { marginTop: nbSpacing.xs },
});
