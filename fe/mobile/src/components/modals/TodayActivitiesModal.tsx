/**
 * TodayActivitiesModal Component
 * Shows list of today's activities with Neo Brutalism badge colors
 * Phase 2C: Renamed from TodayReportsModal (ADR-010)
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import { formatDateTime, formatDate } from '../../utils/dateUtils';
import type { Activity } from '../../types/models.types';

interface TodayActivitiesModalProps {
  visible: boolean;
  onClose: () => void;
  activities: Activity[];
  onActivityPress?: (activity: Activity) => void;
}

const activityTypeBadgeColors: Record<string, { bg: string; border: string; text: string }> = {
  default: {
    bg: nbColors.gray['100'],
    border: nbColors.gray['400'],
    text: 'Aktivitas',
  },
};

export function TodayActivitiesModal({
  visible,
  onClose,
  activities,
  onActivityPress,
}: TodayActivitiesModalProps): JSX.Element {
  const getBadgeInfo = (activityTypeName?: string) => {
    if (!activityTypeName) return activityTypeBadgeColors.default;
    return {
      bg: nbColors.successLight,
      border: nbColors.success,
      text: activityTypeName,
    };
  };

  const todayDate = formatDate(new Date());

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={styles.modalContent}
          onPress={(e) => e?.stopPropagation?.()}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Aktivitas Hari Ini ({activities.length})</Text>
              <Text style={styles.subtitle}>{todayDate}</Text>
            </View>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal"
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={nbColors.black}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activities.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>Belum ada aktivitas hari ini</Text>
                <Text style={styles.emptySubtext}>
                  Aktivitas yang Anda buat akan muncul di sini
                </Text>
              </View>
            ) : (
              activities.map((activity, index) => {
                const badgeInfo = getBadgeInfo(activity.activityType?.name);
                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={[
                      styles.reportCard,
                      index % 2 === 0 && styles.reportCardEven,
                    ]}
                    onPress={() => onActivityPress?.(activity)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Lihat detail aktivitas ${badgeInfo.text}`}
                  >
                    {/* Accent Bar */}
                    <View
                      style={[
                        styles.accentBar,
                        { backgroundColor: badgeInfo.border },
                      ]}
                    />

                    {/* Header Row */}
                    <View style={styles.reportContent}>
                    <View style={styles.reportHeader}>
                      <View
                        style={[
                          styles.typeBadge,
                          {
                            backgroundColor: badgeInfo.bg,
                            borderColor: badgeInfo.border,
                          },
                        ]}
                      >
                        <Text style={styles.typeText}>{badgeInfo.text}</Text>
                      </View>
                      <Text style={styles.time}>{formatDateTime(activity.created_at)}</Text>
                    </View>

                    {/* Description */}
                    {activity.description && (
                      <Text style={styles.description} numberOfLines={2}>
                        {activity.description}
                      </Text>
                    )}

                    {/* Location */}
                    {activity.area?.name && (
                      <View style={styles.locationRow}>
                        <MaterialCommunityIcons
                          name="map-marker"
                          size={14}
                          color={nbColors.gray['600']}
                        />
                        <Text style={styles.locationText}>{activity.area.name}</Text>
                      </View>
                    )}

                    {/* Photo count */}
                    {activity.photo_urls && activity.photo_urls.length > 0 && (
                      <View style={styles.photoRow}>
                        <MaterialCommunityIcons
                          name="camera"
                          size={14}
                          color={nbColors.gray['600']}
                        />
                        <Text style={styles.photoText}>
                          {activity.photo_urls.length} foto
                        </Text>
                      </View>
                    )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: nbColors.overlay,
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: nbColors.surface,
    borderTopLeftRadius: 0, // Sharp corners for Neo Brutalism
    borderTopRightRadius: 0,
    borderTopWidth: nbBorders.base,
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '80%',
    ...nbShadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0, // Sharp corners
    marginLeft: nbSpacing.sm,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.xl + nbSpacing.lg, // 24px + 32px bottom padding
  },
  reportCard: {
    backgroundColor: nbColors.surface,
    borderWidth: nbBorders.thick,
    borderColor: nbColors.black,
    borderRadius: 0,
    marginBottom: nbSpacing.md,
    ...nbShadows.sm,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  reportCardEven: {
    backgroundColor: nbColors.gray['50'],
  },
  accentBar: {
    width: 4,
  },
  reportContent: {
    flex: 1,
    padding: nbSpacing.sm,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  typeBadge: {
    borderWidth: nbBorders.base,
    borderRadius: 0, // Sharp corners
    paddingVertical: 4,
    paddingHorizontal: nbSpacing.xs,
  },
  typeText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  time: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
  },
  description: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray['700'],
    marginBottom: nbSpacing.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
    marginTop: nbSpacing.xs,
  },
  locationText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
    marginLeft: 4,
  },
  photoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.xs,
  },
  photoText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: nbSpacing['3xl'],
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: nbSpacing.md,
  },
  emptyText: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['600'],
    textAlign: 'center',
    marginBottom: nbSpacing.xs,
  },
  emptySubtext: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray['500'],
    textAlign: 'center',
  },
});
