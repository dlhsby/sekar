/**
 * AttendanceCard Component
 * Displays individual worker attendance status
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  nbColors,
  nbSpacing,
  nbBorderRadius,
  nbTypography,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import { NBBadge } from '../nb/NBBadge';

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
              <NBBadge
                text="Terlambat"
                variant="warning"
                size="sm"
              />
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
    backgroundColor: nbColors.surface,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.sm,
    ...nbShadows.sm,
  },
  lateCard: {
    backgroundColor: nbColors.warningLight,
    borderColor: nbColors.warning,
    borderWidth: nbBorders.thick,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: nbBorderRadius.full,
    borderWidth: nbBorders.base,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: nbSpacing.md,
  },
  avatarClockedIn: {
    backgroundColor: nbColors.successLight,
    borderColor: nbColors.successDark,
  },
  avatarNotClockedIn: {
    backgroundColor: nbColors.dangerLight,
    borderColor: nbColors.dangerDark,
  },
  avatarText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  infoSection: {
    flex: 1,
  },
  workerName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
    marginBottom: nbSpacing.xs,
  },
  detailText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    marginTop: 2,
  },
  absentText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray['600'],
    fontStyle: 'italic',
  },
  areaText: {
    fontSize: nbTypography.fontSize.xs,
    color: nbColors.gray['500'],
    marginTop: nbSpacing.xs,
  },
  statusSection: {
    alignItems: 'center',
    marginLeft: nbSpacing.sm,
  },
  statusIconPresent: {
    fontSize: 28,
    color: nbColors.successDark,
    fontWeight: nbTypography.fontWeight.bold,
  },
  statusIconAbsent: {
    fontSize: 28,
    color: nbColors.dangerDark,
    fontWeight: nbTypography.fontWeight.bold,
  },
});
