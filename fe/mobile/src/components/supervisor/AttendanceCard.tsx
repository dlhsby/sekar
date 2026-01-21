/**
 * AttendanceCard Component
 * Displays individual worker attendance status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography, shadows } from '../../constants/theme';

interface AttendanceCardProps {
  workerName: string;
  status: 'clocked_in' | 'not_clocked_in';
  clockInTime?: string;
  hoursWorked?: number;
  isLate?: boolean;
  areaName?: string;
}

/**
 * Get worker initials from full name
 */
function getInitials(name: string): string {
  const parts = name.split(' ');
  if (parts.length === 1) {
    return parts[0].substring(0, 2).toUpperCase();
  }
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format time from ISO string to HH:MM
 */
function formatTime(isoString: string): string {
  const date = new Date(isoString);
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Format duration in hours
 */
function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (m === 0) {
    return `${h} jam`;
  }
  return `${h} jam ${m} menit`;
}

export default function AttendanceCard({
  workerName,
  status,
  clockInTime,
  hoursWorked,
  isLate = false,
  areaName,
}: AttendanceCardProps) {
  const initials = getInitials(workerName);
  const isClockedIn = status === 'clocked_in';

  return (
    <View style={[styles.card, isLate && styles.lateCard]}>
      <View style={styles.leftSection}>
        {/* Avatar with initials */}
        <View
          style={[
            styles.avatar,
            isClockedIn ? styles.avatarClockedIn : styles.avatarNotClockedIn,
          ]}>
          <Text style={styles.avatarText}>{initials}</Text>
        </View>

        {/* Worker info */}
        <View style={styles.infoSection}>
          <Text style={styles.workerName}>{workerName}</Text>

          {isClockedIn && clockInTime && (
            <>
              <Text style={styles.detailText}>
                Masuk: {formatTime(clockInTime)}
              </Text>
              {hoursWorked !== undefined && (
                <Text style={styles.detailText}>
                  Durasi: {formatDuration(hoursWorked)}
                </Text>
              )}
              {areaName && (
                <Text style={styles.areaText}>{areaName}</Text>
              )}
            </>
          )}

          {!isClockedIn && (
            <>
              <Text style={styles.absentText}>Belum absen hari ini</Text>
              {areaName && (
                <Text style={styles.areaText}>Area: {areaName}</Text>
              )}
            </>
          )}
        </View>
      </View>

      {/* Status indicator */}
      <View style={styles.statusSection}>
        {isClockedIn ? (
          <>
            <Text style={styles.statusIconPresent}>✓</Text>
            {isLate && (
              <View style={styles.lateBadge}>
                <Text style={styles.lateBadgeText}>Terlambat</Text>
              </View>
            )}
          </>
        ) : (
          <Text style={styles.statusIconAbsent}>✕</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  lateCard: {
    backgroundColor: '#FFF9E6', // Light yellow background for late workers
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  avatarClockedIn: {
    backgroundColor: '#E8F5E9', // Light green
  },
  avatarNotClockedIn: {
    backgroundColor: '#FFEBEE', // Light red
  },
  avatarText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.bold,
    color: colors.textPrimary,
  },
  infoSection: {
    flex: 1,
  },
  workerName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  detailText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  absentText: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  areaText: {
    fontSize: typography.fontSize.xs,
    color: colors.textHint,
    marginTop: spacing.xs,
  },
  statusSection: {
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  statusIconPresent: {
    fontSize: 28,
    color: colors.success,
    fontWeight: typography.fontWeight.bold,
  },
  statusIconAbsent: {
    fontSize: 28,
    color: colors.error,
    fontWeight: typography.fontWeight.bold,
  },
  lateBadge: {
    backgroundColor: colors.warning,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: borderRadius.sm,
    marginTop: spacing.xs,
  },
  lateBadgeText: {
    fontSize: typography.fontSize.xs,
    color: colors.white,
    fontWeight: typography.fontWeight.medium,
  },
});
