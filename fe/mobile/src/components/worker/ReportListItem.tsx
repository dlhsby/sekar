/**
 * Report List Item Component
 * Individual report card with sync status indicator
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { colors, spacing, typography, borderRadius, shadows } from '../../constants/theme';
import { formatDateTime } from '../../utils/dateUtils';
import type { QueueItemStatus } from '../../services/sync/offlineQueue';

/**
 * Report type labels in Indonesian
 */
const REPORT_TYPE_LABELS: Record<string, string> = {
  task_completion: 'Penyelesaian Tugas',
  incident: 'Insiden',
  maintenance_request: 'Permintaan Pemeliharaan',
};

/**
 * Report type badge colors
 */
const REPORT_TYPE_COLORS: Record<string, string> = {
  task_completion: colors.success,
  incident: colors.error,
  maintenance_request: colors.warning,
};

/**
 * Sync status configuration
 */
const SYNC_STATUS_CONFIG = {
  synced: {
    icon: '✅',
    label: 'Terkirim',
    color: colors.success,
  },
  pending: {
    icon: '🔄',
    label: 'Menunggu sinkron',
    color: colors.warning,
  },
  failed: {
    icon: '❌',
    label: 'Gagal kirim',
    color: colors.error,
  },
};

export interface ReportListItemProps {
  id: string | number;
  reportType: string;
  description?: string;
  areaName?: string;
  createdAt: string;
  syncStatus: 'synced' | 'pending' | 'failed';
  photoUrl?: string;
  queueId?: string;
  onRetry?: (queueId: string) => void;
  onPress?: () => void;
}

export function ReportListItem({
  id,
  reportType,
  description,
  areaName,
  createdAt,
  syncStatus,
  photoUrl,
  queueId,
  onRetry,
  onPress,
}: ReportListItemProps): React.JSX.Element {
  const statusConfig = SYNC_STATUS_CONFIG[syncStatus];
  const typeLabel = REPORT_TYPE_LABELS[reportType] || reportType;
  const typeColor = REPORT_TYPE_COLORS[reportType] || colors.gray500;

  const handleRetry = (): void => {
    if (queueId && onRetry) {
      onRetry(queueId);
    }
  };

  const content = (
    <View style={styles.container}>
      {/* Left side: Photo thumbnail (optional) */}
      {photoUrl && (
        <View style={styles.thumbnailContainer}>
          <Image
            testID="report-thumbnail"
            source={{ uri: photoUrl }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        </View>
      )}

      {/* Main content */}
      <View style={styles.contentContainer}>
        {/* Header row: Type badge + sync status */}
        <View style={styles.headerRow}>
          <View style={[styles.typeBadge, { backgroundColor: typeColor }]}>
            <Text style={styles.typeLabel}>{typeLabel}</Text>
          </View>
          <View style={styles.statusContainer}>
            <Text style={styles.statusIcon}>{statusConfig.icon}</Text>
            <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
              {statusConfig.label}
            </Text>
          </View>
        </View>

        {/* Description */}
        {description && (
          <Text style={styles.description} numberOfLines={2}>
            {description}
          </Text>
        )}

        {/* Area name */}
        {areaName && (
          <View style={styles.metaRow}>
            <Text style={styles.metaIcon}>📍</Text>
            <Text style={styles.metaText} numberOfLines={1}>
              {areaName}
            </Text>
          </View>
        )}

        {/* Date/time */}
        <View style={styles.metaRow}>
          <Text style={styles.metaIcon}>🕐</Text>
          <Text style={styles.metaText}>{formatDateTime(createdAt)}</Text>
        </View>

        {/* Retry button for failed reports */}
        {syncStatus === 'failed' && queueId && onRetry && (
          <TouchableOpacity
            style={styles.retryButton}
            onPress={handleRetry}
            activeOpacity={0.7}>
            <Text style={styles.retryButtonText}>Coba Lagi</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Wrap in TouchableOpacity if onPress provided
  if (onPress) {
    return (
      <TouchableOpacity
        testID="report-item"
        style={styles.wrapper}
        onPress={onPress}
        activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return <View style={styles.wrapper}>{content}</View>;
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: spacing.md,
  },
  container: {
    flexDirection: 'row',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    ...shadows.sm,
  },
  thumbnailContainer: {
    marginRight: spacing.md,
    width: 64,
    height: 64,
    borderRadius: borderRadius.sm,
    overflow: 'hidden',
    backgroundColor: colors.gray200,
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  contentContainer: {
    flex: 1,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  typeBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: borderRadius.sm,
  },
  typeLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusIcon: {
    fontSize: 12,
  },
  statusLabel: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
  },
  description: {
    fontSize: typography.fontSize.sm,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    lineHeight: typography.fontSize.sm * typography.lineHeight.normal,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 6,
  },
  metaIcon: {
    fontSize: 14,
  },
  metaText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    flex: 1,
  },
  retryButton: {
    marginTop: spacing.sm,
    backgroundColor: colors.error,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.sm,
    alignSelf: 'flex-start',
  },
  retryButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
