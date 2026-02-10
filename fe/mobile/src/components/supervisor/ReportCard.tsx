/**
 * Report Card Component
 * Display individual report in the list
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  nbColors,
  nbSpacing,
  nbBorderRadius,
  nbTypography,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { NBBadge } from '../nb/NBBadge';
import { getRelativeTime } from '../../utils/dateUtils';

// Report types mapping
const REPORT_TYPE_LABELS: Record<string, string> = {
  task_completion: 'Penyelesaian Tugas',
  incident: 'Insiden',
  maintenance_request: 'Permintaan Pemeliharaan',
};

const REPORT_TYPE_COLORS: Record<string, string> = {
  task_completion: nbColors.success, // #90EE90 light green
  incident: nbColors.danger, // #FF6B6B coral red
  maintenance_request: nbColors.warning, // #E3A018 amber
};

export interface ReportCardData {
  id: number;
  worker_name?: string | null;
  area_name?: string | null;
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
  const [imageError, setImageError] = useState(false);

  const getInitials = (name?: string | null): string => {
    // Handle undefined, null, or empty string
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return '??';
    }

    const trimmedName = name.trim();
    const parts = trimmedName.split(' ');

    if (parts.length >= 2) {
      return (parts[0][0] + parts[1][0]).toUpperCase();
    }
    return trimmedName.substring(0, 2).toUpperCase();
  };

  const reportTypeLabel = REPORT_TYPE_LABELS[report.report_type] || report.report_type;
  const reportTypeColor = REPORT_TYPE_COLORS[report.report_type] || nbColors.gray['500'];
  const relativeTime = getRelativeTime(report.created_at);
  const initials = getInitials(report.worker_name);

  const getReportVariant = (type: string): 'success' | 'danger' | 'warning' | 'primary' => {
    switch (type) {
      case 'task_completion': return 'success';
      case 'incident': return 'danger';
      case 'maintenance_request': return 'warning';
      default: return 'primary';
    }
  };

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
            {report.worker_name?.trim() || 'Nama tidak tersedia'}
          </Text>
          <Text style={styles.areaName} numberOfLines={1}>
            {report.area_name?.trim() || 'Area tidak tersedia'}
          </Text>
          <View style={styles.metaRow}>
            <NBBadge
              text={reportTypeLabel}
              variant={getReportVariant(report.report_type)}
              size="sm"
            />
          </View>
          <Text style={styles.timeText}>{relativeTime}</Text>
        </View>
      </View>

      <View style={styles.rightSection}>
        {/* Thumbnail if exists */}
        {report.thumbnail_url && !imageError ? (
          <Image
            source={{ uri: report.thumbnail_url }}
            style={styles.thumbnail}
            resizeMode="cover"
            onError={() => setImageError(true)}
          />
        ) : report.thumbnail_url ? (
          <View style={[styles.thumbnail, styles.thumbnailPlaceholder]}>
            <Icon name="image-off-outline" size={24} color={nbColors.gray['400']} />
          </View>
        ) : null}

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
    backgroundColor: nbColors.surface,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    padding: nbSpacing.md,
    marginHorizontal: nbSpacing.md,
    marginVertical: nbSpacing.xs,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...nbShadows.md,
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
    backgroundColor: nbColors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.md,
  },
  avatarText: {
    color: nbColors.surface,
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
  },
  content: {
    flex: 1,
  },
  workerName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  areaName: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    marginBottom: nbSpacing.xs,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.xs,
  },
  timeText: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['500'],
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: nbSpacing.sm,
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: nbBorderRadius.sm,
    marginRight: nbSpacing.sm,
    backgroundColor: nbColors.gray['200'],
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.gray['100'],
    borderWidth: 1,
    borderColor: nbColors.gray['300'],
    borderStyle: 'dashed',
  },
  chevron: {
    fontSize: 28,
    color: nbColors.gray['400'],
    fontWeight: '300',
  },
  reviewedBadge: {
    position: 'absolute',
    top: nbSpacing.sm,
    right: nbSpacing.sm,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: nbColors.successDark,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reviewedText: {
    color: nbColors.surface,
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default ReportCard;
