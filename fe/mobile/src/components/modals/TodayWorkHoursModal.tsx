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
  // Calculate total duration from all shifts (active shift uses current time)
  const totalDuration = shifts.reduce((acc, shift) => {
    const endTime = shift.clock_out_time
      ? new Date(shift.clock_out_time)
      : new Date();
    const duration = calculateDuration(new Date(shift.clock_in_time), endTime);
    return acc + duration.totalMinutes;
  }, 0);

  const totalHours = Math.floor(totalDuration / 60);
  const totalMinutes = totalDuration % 60;
  const todayDate = formatDate(new Date());

  // Show total in title only when shifts exist
  const titleSuffix = shifts.length > 0 ? ` (${totalHours}j ${totalMinutes}m)` : '';

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        {/* View instead of Pressable: onStartShouldSetResponder blocks overlay tap
            propagation. onMoveShouldSetResponder=false releases the responder during
            moves so ScrollView can claim scroll gestures cleanly (same as
            TouchableOpacity gives to ScrollView in TodayActivitiesModal). */}
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title} numberOfLines={1} adjustsFontSizeToFit>
                Jam Kerja Hari Ini{titleSuffix}
              </Text>
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

          {/* Scrollable body — shift list or empty state */}
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
              shifts.map((shift, index) => (
                <ShiftCard
                  key={shift.id}
                  shift={shift}
                  shiftNumber={index + 1}
                />
              ))
            )}
          </ScrollView>
        </View>
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
    // flexShrink: 1 ensures the container participates in bounded flex layout,
    // giving ScrollView a constrained parent height so scrolling engages.
    flexShrink: 1,
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
