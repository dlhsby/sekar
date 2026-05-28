/**
 * TodayActivitiesModal — v2.1 bottom sheet listing today's activities.
 * Opened from the Home "Aktivitas" Ringkasan tile. Rebuilt on `NBModal` +
 * `NBText` + design tokens (Phase 4 M3 Checkpoint 7).
 */

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBModal } from '../nb/NBModal';
import { NBText } from '../nb/NBText';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
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
            const typeName = activity.activityType?.name ?? 'Aktivitas';
            return (
              <TouchableOpacity
                key={activity.id}
                style={styles.card}
                onPress={() => onActivityPress?.(activity)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={`Lihat detail aktivitas ${typeName}`}
              >
                <View style={styles.accentBar} />
                <View style={styles.cardBody}>
                  <View style={styles.cardHeader}>
                    <View style={styles.typeChip}>
                      <NBText variant="mono-sm" color="successDark" uppercase style={styles.typeChipText}>
                        {typeName}
                      </NBText>
                    </View>
                    <NBText variant="caption" color="gray600">
                      {formatDateTime(activity.created_at)}
                    </NBText>
                  </View>

                  {activity.description ? (
                    <NBText variant="body-sm" color="gray700" numberOfLines={2} style={styles.description}>
                      {activity.description}
                    </NBText>
                  ) : null}

                  {activity.area?.name ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="map-marker" size={14} color={nbColors.gray600} />
                      <NBText variant="caption" color="gray600" style={styles.metaText}>
                        {activity.area.name}
                      </NBText>
                    </View>
                  ) : null}

                  {activity.photo_urls && activity.photo_urls.length > 0 ? (
                    <View style={styles.metaRow}>
                      <MaterialCommunityIcons name="camera" size={14} color={nbColors.gray600} />
                      <NBText variant="caption" color="gray600" style={styles.metaText}>
                        {activity.photo_urls.length} foto
                      </NBText>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
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
  card: {
    flexDirection: 'row',
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.md,
    overflow: 'hidden',
    ...nbShadows.sm,
  },
  accentBar: { width: 5, backgroundColor: nbColors.success },
  cardBody: { flex: 1, padding: nbSpacing.sm },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
    gap: nbSpacing.sm,
  },
  typeChip: {
    backgroundColor: withAlpha(nbColors.success, 0.14),
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.success,
    borderRadius: nbRadius.sm,
    paddingHorizontal: nbSpacing.xs,
    paddingVertical: 2,
  },
  typeChipText: { letterSpacing: 0.4 },
  description: { marginBottom: nbSpacing.xs },
  metaRow: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  metaText: { marginLeft: 4 },
  empty: { alignItems: 'center', justifyContent: 'center', paddingVertical: nbSpacing.xl },
  emptySub: { marginTop: nbSpacing.xs },
});
