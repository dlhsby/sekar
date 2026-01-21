/**
 * Report Card Component
 * Display individual report in the list
 */

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';
import { getRelativeTime } from '../../utils/dateUtils';

// Report types mapping
const REPORT_TYPE_LABELS: Record<string, string> = {
  task_completion: 'Penyelesaian Tugas',
  incident: 'Insiden',
  maintenance_request: 'Permintaan Pemeliharaan',
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  task_completion: '#22C55E', // green
  incident: '#EF4444', // red
  maintenance_request: '#F59E0B', // yellow
};

export interface ReportCardData {
  id: number;
  worker_name: string;
  area_name: string;
  report_type: 'task_completion' | 'incident' | 'maintenance_request';
  created_at: string;
  thumbnail_url?: string;
  reviewed?: boolean;
}

interface ReportCardProps {
  report: ReportCardData;
  onPress: () => void;
  testID?: string;
}

/**
 * Report Card Component
 * Shows worker name, area, type badge, time, and thumbnail
 */
export function ReportCard({ report, onPress, testID }: ReportCardProps): JSX.Element {
  const getInitials = (name: string): string => {
    const parts = name.split(' ');
    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return name.substring(0, 2).toUpperCase();
  };

  const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;
  const reportTypeColor = REPORT_TYPE_COLORS[report.report_type] || colors.gray500;
  const relativeTime = getRelativeTime(report.created_at);
  const initials = getInitials(report.worker_name);

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      testID={testID}>
      <View style={styles.leftSection}>
        {/* Avatar with initials */}
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          <Text style={styles.workerName} numberOfLines={1}>
            {report.worker_name}
          </Text>
          <Text style={styles.areaName} numberOfLines={1}>
            {report.area_name}
          </Text>
          <View style={styles.metaRow}>
            <View style={[styles.badge, { backgroundColor: reportTypeColor }]}>
              <Text style={styles.badgeText} numberOfLines={1}>
                {reportTypeLabel}
              </Text>
            </View>
          </View>
          <Text style={styles.timeText}>{relativeTime}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Thumbnail if exists */}
        {report.thumbnail_url && (
          <Image
            source={{ uri: report.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        )}

        {/* Chevron icon */}
        <Text style={styles.chevron}>›</Text>
      </View>

      {/* Reviewed indicator */}
      {report.reviewed && (
        <View style={styles.reviewedBadge}>
          <Text style={styles.reviewedText}>✓</Text>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginVertical: spacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...shadows.md,
  },
  leftSection: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarText: {
    color: colors.white,
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  workerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  areaName: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  badge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
    maxWidth: 180,
  },
  badgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
  timeText: {
    fontSize: typography.fontSize.xs,
    color: colors.textHint,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    backgroundColor: colors.gray200,
  },
  chevron: {
    fontSize: 28,
    color: colors.gray400,
    fontWeight: '300',
  },
  reviewedBadge: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewedText: {
    color: colors.white,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ReportCard;
