/**
 * TodayWorkHoursModal Component
 * Shows clock-in/out times with date+time format, GPS, duration, validation
 * Supports multiple shifts for today with total duration calculation
 * Redesigned with Neo Brutalism principles (sharp corners, bold styling)
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
import { formatDate, calculateDuration } from '../../utils/dateUtils';
import { ShiftCard } from '../common';
import type { Shift } from '../../types/models.types';

interface TodayWorkHoursModalProps {
  visible: boolean;
  onClose: () => void;
  shifts: Shift[];
}

export function TodayWorkHoursModal({
  visible,
  onClose,
  shifts,
}: TodayWorkHoursModalProps): JSX.Element {
  // Calculate total duration from all shifts (including active shift with current time)
  const totalDuration = shifts.reduce((acc, shift) => {
    const endTime = shift.clock_out_time
      ? new Date(shift.clock_out_time)
      : new Date(); // Use current time for active shift

    const duration = calculateDuration(
      new Date(shift.clock_in_time),
      endTime
    );
    return acc + duration.totalMinutes;
  }, 0);

  const totalHours = Math.floor(totalDuration / 60);
  const totalMinutes = totalDuration % 60;

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
              <Text style={styles.title}>Jam Kerja Hari Ini</Text>
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
            {shifts.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>⏰</Text>
                <Text style={styles.emptyText}>Belum ada shift hari ini</Text>
                <Text style={styles.emptySubtext}>
                  Clock in terlebih dahulu untuk memulai shift
                </Text>
              </View>
            ) : (
              <>
                {/* Total Duration Section - Table Style (First) */}
                <View style={styles.totalSection}>
                  <View style={styles.tableRow}>
                    <Text style={styles.tableLabel}>Total Jam Kerja Hari Ini</Text>
                    <Text style={styles.totalValue}>
                      {totalHours}j {totalMinutes}m
                    </Text>
                  </View>
                </View>

                {/* List Header */}
                <Text style={styles.sectionTitle}>Riwayat Shift Hari Ini</Text>

                {/* Shift Cards */}
                {shifts.map((shift, index) => (
                  <ShiftCard
                    key={shift.id}
                    shift={shift}
                    shiftNumber={index + 1}
                  />
                ))}
              </>
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
    borderTopLeftRadius: 0,
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
    borderRadius: 0,
    marginLeft: nbSpacing.sm,
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.xl + nbSpacing.lg,
  },
  totalSection: {
    marginBottom: nbSpacing.md,
    backgroundColor: nbColors.background,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: 0,
    padding: nbSpacing.sm,
  },
  tableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  tableLabel: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  totalValue: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.primary,
  },
  sectionTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: nbSpacing['2xl'],
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
