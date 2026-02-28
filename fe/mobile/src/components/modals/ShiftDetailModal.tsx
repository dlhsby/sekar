/**
 * ShiftDetailModal Component
 * Shows detailed shift info with improved location status indicator
 * Redesigned with Neo Brutalism principles (sharp corners, bold borders)
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
import { formatDateTime } from '../../utils/dateUtils';
import { calculateDistance } from '../../utils/gpsUtils';
import type { Shift } from '../../types/models.types';

interface ShiftDetailModalProps {
  visible: boolean;
  onClose: () => void;
  shift: Shift | null;
}

export function ShiftDetailModal({
  visible,
  onClose,
  shift,
}: ShiftDetailModalProps): JSX.Element {
  // Calculate location validation
  const calculateLocationStatus = () => {
    // Check if area and valid GPS coordinates exist
    if (
      !shift?.area?.gps_lat ||
      !shift?.area?.gps_lng ||
      shift.clock_in_gps_lat == null ||
      shift.clock_in_gps_lng == null
    ) {
      return { isInside: false, distance: 0 };
    }

    const distance = calculateDistance(
      shift.clock_in_gps_lat,
      shift.clock_in_gps_lng,
      shift.area.gps_lat,
      shift.area.gps_lng
    );

    const radiusMeters = shift.area.radius_meters ?? 100;
    const isInside = distance <= radiusMeters;

    return { isInside, distance };
  };

  const { isInside, distance } = shift ? calculateLocationStatus() : { isInside: false, distance: 0 };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => false}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={styles.title}>Detail Shift</Text>
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
            {!shift ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyIcon}>📋</Text>
                <Text style={styles.emptyText}>Tidak ada shift aktif</Text>
              </View>
            ) : (
              <>
                {/* Table-style rows with alternating backgrounds and icons */}

                {/* Area Name */}
                <View style={[styles.tableRow, styles.tableRowEven]}>
                  <MaterialCommunityIcons
                    name="map-marker"
                    size={20}
                    color={nbColors.gray['700']}
                    style={styles.rowIcon}
                  />
                  <Text style={styles.tableLabel}>Area</Text>
                  <View style={styles.tableValueContainer}>
                    <Text style={styles.tableValue}>
                      {shift.area?.name || 'Tidak diketahui'}
                    </Text>
                    {shift.area?.address && (
                      <Text style={styles.tableSubtext}>{shift.area.address}</Text>
                    )}
                    {shift.area?.gps_lat && shift.area?.gps_lng && (
                      <Text style={styles.tableSubtext}>
                        Pusat: {Number(shift.area.gps_lat).toFixed(6)}, {Number(shift.area.gps_lng).toFixed(6)}
                      </Text>
                    )}
                  </View>
                </View>

                {/* Area Type */}
                {shift.area?.area_type?.name && (
                  <View style={styles.tableRow}>
                    <MaterialCommunityIcons
                      name="office-building"
                      size={20}
                      color={nbColors.gray['700']}
                      style={styles.rowIcon}
                    />
                    <Text style={styles.tableLabel}>Tipe Area</Text>
                    <Text style={styles.tableValue}>{shift.area.area_type.name}</Text>
                  </View>
                )}

                {/* Clock In Time */}
                <View style={[styles.tableRow, styles.tableRowEven]}>
                  <MaterialCommunityIcons
                    name="clock-outline"
                    size={20}
                    color={nbColors.gray['700']}
                    style={styles.rowIcon}
                  />
                  <Text style={styles.tableLabel}>Clock In</Text>
                  <Text style={styles.tableValue}>
                    {formatDateTime(shift.clock_in_time)}
                  </Text>
                </View>

                {/* Clock In GPS */}
                <View style={styles.tableRow}>
                  <MaterialCommunityIcons
                    name="crosshairs-gps"
                    size={20}
                    color={nbColors.gray['700']}
                    style={styles.rowIcon}
                  />
                  <Text style={styles.tableLabel}>GPS Clock In</Text>
                  <Text style={styles.tableValueMono}>
                    {shift.clock_in_gps_lat != null && shift.clock_in_gps_lng != null
                      ? `${Number(shift.clock_in_gps_lat).toFixed(6)}, ${Number(shift.clock_in_gps_lng).toFixed(6)}`
                      : 'N/A'}
                  </Text>
                </View>

                {/* Colored Validation Section */}
                <View style={[
                  styles.validationSection,
                  isInside ? styles.validationSuccess : styles.validationError
                ]}>
                  <View style={[
                    styles.accentBar,
                    { backgroundColor: isInside ? nbColors.successDark : nbColors.dangerDark }
                  ]} />

                  <View style={styles.validationContent}>
                    <View style={styles.validationHeader}>
                      <View style={[
                        styles.iconContainer,
                        { backgroundColor: isInside ? nbColors.successLight : nbColors.dangerLight }
                      ]}>
                        <MaterialCommunityIcons
                          name={isInside ? 'check-circle' : 'alert-circle'}
                          size={24}
                          color={isInside ? nbColors.successDark : nbColors.dangerDark}
                        />
                      </View>
                      <Text style={styles.validationTitle}>Validasi Lokasi Clock In</Text>
                      <View style={[
                        styles.validationBadge,
                        { backgroundColor: isInside ? nbColors.successDark : nbColors.dangerDark }
                      ]}>
                        <Text style={styles.badgeText}>
                          {isInside ? 'Di Dalam Area' : 'Di Luar Area'}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.metricsGrid}>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Jarak</Text>
                        <Text style={styles.metricValue}>{Math.round(distance)}m</Text>
                      </View>
                      <View style={styles.metricCard}>
                        <Text style={styles.metricLabel}>Radius</Text>
                        <Text style={styles.metricValue}>{shift.area?.radius_meters || 100}m</Text>
                      </View>
                    </View>
                  </View>
                </View>

              </>
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
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0, // Sharp corners
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.xl + nbSpacing.lg, // 24px + 32px bottom padding
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: nbColors.gray['200'],
    alignItems: 'flex-start',
  },
  tableRowEven: {
    backgroundColor: nbColors.gray['50'],
  },
  rowIcon: {
    marginRight: nbSpacing.sm,
    marginTop: 2,
  },
  tableLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['600'],
    width: 110,
    flexShrink: 0,
  },
  tableValueContainer: {
    flex: 1,
  },
  tableValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
    flex: 1,
  },
  tableValueMono: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
    fontFamily: nbTypography.fontFamily.mono,
    flex: 1,
  },
  tableSubtext: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.regular,
    color: nbColors.gray['600'],
    marginTop: 4,
  },
  validationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  validationSection: {
    marginTop: nbSpacing.md,
    marginBottom: nbSpacing.md,
    borderWidth: nbBorders.thick,
    borderRadius: 0,
    overflow: 'hidden',
    flexDirection: 'row',
  },
  validationSuccess: {
    backgroundColor: nbColors.infoLight,
    borderColor: nbColors.successDark,
  },
  validationError: {
    backgroundColor: nbColors.dangerLight,
    borderColor: nbColors.dangerDark,
  },
  accentBar: {
    width: 4,
  },
  validationContent: {
    flex: 1,
    padding: nbSpacing.md,
  },
  validationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: nbSpacing.md,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 0,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  validationTitle: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    flex: 1,
    marginLeft: nbSpacing.sm,
  },
  validationBadge: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  badgeText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
    letterSpacing: 0.5,
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  metricCard: {
    flex: 1,
    backgroundColor: nbColors.white,
    padding: nbSpacing.sm,
    borderRadius: 0,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray['600'],
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  metricValue: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
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
  },
});
