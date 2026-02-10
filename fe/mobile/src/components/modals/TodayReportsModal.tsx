/**
 * TodayReportsModal Component
 * Shows list of today's reports with Neo Brutalism badge colors
 * Cards are fully tappable with proper onPress handling
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
import type { WorkReport } from '../../types/models.types';

interface TodayReportsModalProps {
  visible: boolean;
  onClose: () => void;
  reports: WorkReport[];
  onReportPress?: (report: WorkReport) => void;
}

const reportTypeBadgeColors: Record<string, { bg: string; border: string; text: string }> = {
  cleaning: {
    bg: nbColors.successLight,
    border: nbColors.success,
    text: 'Pembersihan',
  },
  maintenance: {
    bg: nbColors.warningLight,
    border: nbColors.warning,
    text: 'Pemeliharaan',
  },
  incident: {
    bg: nbColors.dangerLight,
    border: nbColors.danger,
    text: 'Insiden',
  },
  routine: {
    bg: nbColors.infoLight,
    border: nbColors.info,
    text: 'Rutin',
  },
  default: {
    bg: nbColors.gray['100'],
    border: nbColors.gray['400'],
    text: 'Laporan',
  },
};

export function TodayReportsModal({
  visible,
  onClose,
  reports,
  onReportPress,
}: TodayReportsModalProps): JSX.Element {
  const getBadgeInfo = (reportType?: string) => {
    if (!reportType) return reportTypeBadgeColors.default;
    const key = reportType.toLowerCase();
    return reportTypeBadgeColors[key] || reportTypeBadgeColors.default;
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
              <Text style={styles.title}>Laporan Hari Ini ({reports.length})</Text>
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
            {reports.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📝</Text>
                <Text style={styles.emptyText}>Belum ada laporan hari ini</Text>
                <Text style={styles.emptySubtext}>
                  Laporan yang Anda buat akan muncul di sini
                </Text>
              </View>
            ) : (
              reports.map((report, index) => {
                const badgeInfo = getBadgeInfo(report.report_type);
                return (
                  <TouchableOpacity
                    key={report.id}
                    style={[
                      styles.reportCard,
                      index % 2 === 0 && styles.reportCardEven,
                    ]}
                    onPress={() => onReportPress?.(report)}
                    activeOpacity={0.7}
                    accessibilityRole="button"
                    accessibilityLabel={`Lihat detail laporan ${badgeInfo.text}`}
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
                      <Text style={styles.time}>{formatDateTime(report.created_at)}</Text>
                    </View>

                    {/* Description */}
                    {report.description && (
                      <Text style={styles.description} numberOfLines={2}>
                        {report.description}
                      </Text>
                    )}

                    {/* Location */}
                    {report.area?.name && (
                      <View style={styles.locationRow}>
                        <MaterialCommunityIcons
                          name="map-marker"
                          size={14}
                          color={nbColors.gray['600']}
                        />
                        <Text style={styles.locationText}>{report.area.name}</Text>
                      </View>
                    )}

                    {/* Photo count */}
                    {report.photo_urls && report.photo_urls.length > 0 && (
                      <View style={styles.photoRow}>
                        <MaterialCommunityIcons
                          name="camera"
                          size={14}
                          color={nbColors.gray['600']}
                        />
                        <Text style={styles.photoText}>
                          {report.photo_urls.length} foto
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
