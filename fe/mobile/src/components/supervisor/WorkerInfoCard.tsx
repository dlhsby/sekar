/**
 * WorkerInfoCard Component
 * Slide-up card showing detailed worker information
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { colors, typography, spacing, borderRadius, shadows } from '../../constants/theme';
import type { ActiveWorkerData } from '../../types/api.types';
import { formatTime, calculateDuration, getRelativeTime } from '../../utils/dateUtils';

interface WorkerInfoCardProps {
  worker: ActiveWorkerData | null;
  visible: boolean;
  onClose: () => void;
  onViewDetails?: () => void;
}

const CARD_HEIGHT = 240;

/**
 * WorkerInfoCard - Bottom sheet with worker details
 */
export function WorkerInfoCard({
  worker,
  visible,
  onClose,
  onViewDetails,
}: WorkerInfoCardProps): React.JSX.Element {
  const translateY = React.useRef(new Animated.Value(CARD_HEIGHT)).current;

  React.useEffect(() => {
    Animated.spring(translateY, {
      toValue: visible ? 0 : CARD_HEIGHT,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [visible, translateY]);

  if (!worker) {
    return <View />;
  }

  const clockInTime = new Date(worker.shift.clock_in_time);
  const duration = calculateDuration(clockInTime);
  const lastUpdate = worker.latest_location
    ? getRelativeTime(worker.latest_location.logged_at)
    : 'Tidak ada data lokasi';

  return (
    <>
      {/* Overlay backdrop */}
      {visible && (
        <TouchableOpacity
          testID="overlay"
          style={styles.overlay}
          activeOpacity={1}
          onPress={onClose}
        />
      )}

      {/* Sliding card */}
      <Animated.View
        style={[
          styles.card,
          {
            transform: [{ translateY }],
          },
        ]}
      >
        {/* Drag handle */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Card content */}
        <View style={styles.content}>
          {/* Worker info */}
          <View style={styles.headerSection}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {getInitials(worker.full_name)}
              </Text>
            </View>
            <View style={styles.headerText}>
              <Text style={styles.workerName}>{worker.full_name}</Text>
              <Text style={styles.workerUsername}>@{worker.username}</Text>
            </View>
          </View>

          {/* Area info */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Lokasi</Text>
            <Text style={styles.infoValue}>{worker.shift.area.name}</Text>
          </View>

          {/* Clock in time */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Masuk</Text>
            <Text style={styles.infoValue}>{formatTime(clockInTime)}</Text>
          </View>

          {/* Hours worked */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Durasi kerja</Text>
            <Text style={styles.infoValue}>{duration.formatted}</Text>
          </View>

          {/* Last location update */}
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Update lokasi</Text>
            <Text style={styles.infoValue}>{lastUpdate}</Text>
          </View>

          {/* Action button (future feature) */}
          {onViewDetails && (
            <TouchableOpacity
              style={styles.detailsButton}
              onPress={onViewDetails}
            >
              <Text style={styles.detailsButtonText}>Lihat Detail</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </>
  );
}

/**
 * Get worker initials from full name
 */
function getInitials(fullName: string): string {
  const names = fullName.trim().split(' ');
  if (names.length === 1) {
    return names[0].substring(0, 2).toUpperCase();
  }
  return (names[0][0] + names[names.length - 1][0]).toUpperCase();
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.overlayLight,
  },
  card: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: CARD_HEIGHT,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.xl,
    borderTopRightRadius: borderRadius.xl,
    ...shadows.lg,
  },
  handleContainer: {
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: colors.gray300,
    borderRadius: borderRadius.sm,
  },
  content: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.md,
  },
  headerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
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
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
  },
  headerText: {
    flex: 1,
  },
  workerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  workerUsername: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.gray200,
  },
  infoLabel: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  infoValue: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.medium,
    color: colors.textPrimary,
  },
  detailsButton: {
    marginTop: spacing.md,
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
  },
  detailsButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
});
