/**
 * TaskFilterModal Component
 * Bottom sheet modal for filtering tasks with role-based access controls
 * Includes: Assignment, Status, Date Range, Rayon, Area filters
 * Replaces inline accordion filter UI (Phase 2C UX improvement)
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  ScrollView,
  Pressable,
  TouchableOpacity,
  Platform,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

// Lazy require prevents crash if native module not yet linked (requires app rebuild)
// eslint-disable-next-line @typescript-eslint/no-require-imports
let DateTimePicker: React.ComponentType<{
  value: Date;
  mode: 'date' | 'time';
  display: string;
  onChange: (event: { type: string }, date?: Date) => void;
}> | null = null;
try {
  DateTimePicker = require('@react-native-community/datetimepicker').default;
} catch (_e) {
  // Native module not yet linked - rebuild Android to enable date picker
}
import { NBButton, NBSelect } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbShadows,
  withAlpha,
} from '../../constants/nbTokens';
import type { TaskStatus, UserRole, Rayon, Area } from '../../types/models.types';
import { getRayons, getAreasByRayonId, getAreas } from '../../services/api';

interface TaskFilterModalProps {
  visible: boolean;
  onClose: () => void;
  // Current filter values
  taskFilter: 'assigned' | 'tagged';
  statusFilter: TaskStatus | 'all';
  dateFrom: string; // YYYY-MM-DD
  dateTo: string; // YYYY-MM-DD
  rayonFilter: string | null; // Rayon ID
  areaFilter: string | null; // Area ID
  // Callbacks
  onApplyFilters: (filters: {
    taskFilter: 'assigned' | 'tagged';
    statusFilter: TaskStatus | 'all';
    dateFrom: string;
    dateTo: string;
    rayonFilter: string | null;
    areaFilter: string | null;
  }) => void;
  onResetFilters: () => void;
  // User context for role-based filtering
  userRole: UserRole;
  userRayonId?: string;
  userAreaId?: string;
}

/**
 * TaskFilterModal Component
 */
export function TaskFilterModal({
  visible,
  onClose,
  taskFilter,
  statusFilter,
  dateFrom,
  dateTo,
  rayonFilter,
  areaFilter,
  onApplyFilters,
  onResetFilters,
  userRole,
  userRayonId,
  userAreaId,
}: TaskFilterModalProps): JSX.Element {
  // Local filter state (modified before applying)
  const [localTaskFilter, setLocalTaskFilter] = useState(taskFilter);
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [localRayonFilter, setLocalRayonFilter] = useState(rayonFilter);
  const [localAreaFilter, setLocalAreaFilter] = useState(areaFilter);

  // Date picker visibility
  const [showDateFromPicker, setShowDateFromPicker] = useState(false);
  const [showDateToPicker, setShowDateToPicker] = useState(false);

  // Rayon/Area data
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);

  // Role-based access control
  const canFilterRayon = useMemo(() => {
    return userRole === 'kepala_rayon' || userRole === 'top_management' ||
           userRole === 'admin_system' || userRole === 'superadmin';
  }, [userRole]);

  const canFilterArea = useMemo(() => {
    return userRole === 'kepala_rayon' || userRole === 'korlap' ||
           userRole === 'top_management' || userRole === 'admin_system' ||
           userRole === 'superadmin';
  }, [userRole]);

  // Load rayons on mount (if user can filter by rayon)
  useEffect(() => {
    if (visible && canFilterRayon) {
      loadRayons();
    }
  }, [visible, canFilterRayon]);

  // Load areas when rayon changes or on mount for korlap
  useEffect(() => {
    if (visible && canFilterArea) {
      if (userRole === 'korlap' && userRayonId) {
        // Korlap: Load areas from their rayon
        loadAreasByRayon(userRayonId);
      } else if (localRayonFilter) {
        // Kepala Rayon/Admin: Load areas from selected rayon
        loadAreasByRayon(localRayonFilter);
      }
    }
  }, [visible, localRayonFilter, canFilterArea, userRole, userRayonId]);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalTaskFilter(taskFilter);
      setLocalStatusFilter(statusFilter);
      setLocalDateFrom(dateFrom);
      setLocalDateTo(dateTo);
      setLocalRayonFilter(rayonFilter);
      setLocalAreaFilter(areaFilter);
    }
  }, [visible, taskFilter, statusFilter, dateFrom, dateTo, rayonFilter, areaFilter]);

  const loadRayons = useCallback(async () => {
    setLoadingRayons(true);
    try {
      const response = await getRayons();
      if (response.data) {
        setRayons(response.data);
      }
    } catch (error) {
      console.error('[TaskFilterModal] Error loading rayons:', error);
    } finally {
      setLoadingRayons(false);
    }
  }, []);

  const loadAreasByRayon = useCallback(async (rayonId: string) => {
    setLoadingAreas(true);
    try {
      const response = await getAreasByRayonId(rayonId);
      if (response.data) {
        setAreas(response.data);
      }
    } catch (error) {
      console.error('[TaskFilterModal] Error loading areas:', error);
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  const handleApply = useCallback(() => {
    onApplyFilters({
      taskFilter: localTaskFilter,
      statusFilter: localStatusFilter,
      dateFrom: localDateFrom,
      dateTo: localDateTo,
      rayonFilter: localRayonFilter,
      areaFilter: localAreaFilter,
    });
    onClose();
  }, [
    localTaskFilter,
    localStatusFilter,
    localDateFrom,
    localDateTo,
    localRayonFilter,
    localAreaFilter,
    onApplyFilters,
    onClose,
  ]);

  const handleReset = useCallback(() => {
    setLocalTaskFilter('assigned');
    setLocalStatusFilter('all');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalRayonFilter(null);
    setLocalAreaFilter(null);
    onResetFilters();
    onClose();
  }, [onResetFilters, onClose]);

  const handleDateFromChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDateFromPicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setLocalDateFrom(dateStr);
    }
  }, []);

  const handleDateToChange = useCallback((event: any, selectedDate?: Date) => {
    setShowDateToPicker(false);
    if (selectedDate) {
      const dateStr = selectedDate.toISOString().split('T')[0];
      setLocalDateTo(dateStr);
    }
  }, []);

  const handleRayonChange = useCallback((rayonId: string | number) => {
    const newRayonId = rayonId === 'all' ? null : String(rayonId);
    setLocalRayonFilter(newRayonId);
    // Reset area filter when rayon changes
    setLocalAreaFilter(null);
    setAreas([]);
  }, []);

  const handleAreaChange = useCallback((areaId: string | number) => {
    const newAreaId = areaId === 'all' ? null : String(areaId);
    setLocalAreaFilter(newAreaId);
  }, []);

  // Format date for display
  const formatDateDisplay = useCallback((dateStr: string) => {
    if (!dateStr) return 'Pilih tanggal';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('id-ID', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  }, []);

  // Get rayon/area names for display
  const getRayonName = useCallback(() => {
    if (!canFilterRayon && userRayonId) {
      const rayon = rayons.find(r => r.id === userRayonId);
      return rayon?.name || 'Loading...';
    }
    if (!localRayonFilter) return 'Semua Rayon';
    const rayon = rayons.find(r => r.id === localRayonFilter);
    return rayon?.name || 'Pilih Rayon';
  }, [canFilterRayon, userRayonId, localRayonFilter, rayons]);

  const getAreaName = useCallback(() => {
    if (!canFilterArea && userAreaId) {
      const area = areas.find(a => a.id === userAreaId);
      return area?.name || 'Loading...';
    }
    if (!localAreaFilter) return 'Semua Area';
    const area = areas.find(a => a.id === localAreaFilter);
    return area?.name || 'Pilih Area';
  }, [canFilterArea, userAreaId, localAreaFilter, areas]);

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
            <Text style={styles.title}>Filter Tugas</Text>
            <TouchableOpacity
              onPress={onClose}
              style={styles.closeButton}
              accessibilityRole="button"
              accessibilityLabel="Tutup modal filter"
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
            {/* Assignment Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tipe Tugas</Text>
              <NBSelect
                value={localTaskFilter}
                onValueChange={(value) => setLocalTaskFilter(value as 'assigned' | 'tagged')}
                options={[
                  { label: 'Ditugaskan ke Saya', value: 'assigned' },
                  { label: 'Tag Saya', value: 'tagged' },
                ]}
                style={styles.select}
              />
            </View>

            {/* Status Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <NBSelect
                value={localStatusFilter}
                onValueChange={(value) => setLocalStatusFilter(value as TaskStatus | 'all')}
                options={[
                  { label: 'Semua Status', value: 'all' },
                  { label: 'Menunggu', value: 'pending' },
                  { label: 'Ditugaskan', value: 'assigned' },
                  { label: 'Dikerjakan', value: 'in_progress' },
                  { label: 'Selesai', value: 'completed' },
                ]}
                style={styles.select}
              />
            </View>

            {/* Rayon Filter (kepala_rayon, top_management, admin can change) */}
            {(canFilterRayon || userRayonId) && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>
                  Rayon {!canFilterRayon && '(Tetap)'}
                </Text>
                {canFilterRayon ? (
                  <NBSelect
                    value={localRayonFilter || 'all'}
                    onValueChange={handleRayonChange}
                    options={[
                      { label: 'Semua Rayon', value: 'all' },
                      ...rayons.map(r => ({ label: r.name, value: r.id })),
                    ]}
                    style={styles.select}
                    disabled={loadingRayons}
                  />
                ) : (
                  <View style={[styles.fixedValue, styles.fixedValueDisabled]}>
                    <MaterialCommunityIcons
                      name="lock"
                      size={18}
                      color={nbColors.gray['500']}
                      style={styles.lockIcon}
                    />
                    <Text style={styles.fixedValueText}>{getRayonName()}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Area Filter (kepala_rayon, korlap, admin can change) */}
            {(canFilterArea || userAreaId) && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>
                  Area {!canFilterArea && '(Tetap)'}
                </Text>
                {canFilterArea ? (
                  <NBSelect
                    value={localAreaFilter || 'all'}
                    onValueChange={handleAreaChange}
                    options={[
                      { label: 'Semua Area', value: 'all' },
                      ...areas.map(a => ({ label: a.name, value: a.id })),
                    ]}
                    style={styles.select}
                    disabled={loadingAreas || areas.length === 0}
                  />
                ) : (
                  <View style={[styles.fixedValue, styles.fixedValueDisabled]}>
                    <MaterialCommunityIcons
                      name="lock"
                      size={18}
                      color={nbColors.gray['500']}
                      style={styles.lockIcon}
                    />
                    <Text style={styles.fixedValueText}>{getAreaName()}</Text>
                  </View>
                )}
              </View>
            )}

            {/* Date Range Filter */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Rentang Tanggal</Text>

              {/* From Date */}
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDateFromPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Pilih tanggal mulai"
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={nbColors.primary}
                  style={styles.dateIcon}
                />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateLabel}>Dari</Text>
                  <Text style={styles.dateValue}>{formatDateDisplay(localDateFrom)}</Text>
                </View>
              </TouchableOpacity>

              {/* To Date */}
              <TouchableOpacity
                style={styles.dateButton}
                onPress={() => setShowDateToPicker(true)}
                accessibilityRole="button"
                accessibilityLabel="Pilih tanggal akhir"
              >
                <MaterialCommunityIcons
                  name="calendar"
                  size={20}
                  color={nbColors.primary}
                  style={styles.dateIcon}
                />
                <View style={styles.dateTextContainer}>
                  <Text style={styles.dateLabel}>Sampai</Text>
                  <Text style={styles.dateValue}>{formatDateDisplay(localDateTo)}</Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <NBButton
                title="Reset"
                onPress={handleReset}
                variant="secondary"
                size="md"
                style={styles.resetButton}
              />
              <NBButton
                title="Terapkan"
                onPress={handleApply}
                variant="primary"
                size="md"
                style={styles.applyButton}
              />
            </View>
          </ScrollView>

          {/* Date Pickers (iOS shows as modal, Android shows inline) */}
          {showDateFromPicker && DateTimePicker && (
            <DateTimePicker
              value={localDateFrom ? new Date(localDateFrom) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateFromChange}
            />
          )}
          {showDateToPicker && DateTimePicker && (
            <DateTimePicker
              value={localDateTo ? new Date(localDateTo) : new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleDateToChange}
            />
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: withAlpha(nbColors.black, 0.5),
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: nbColors.white,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderWidth: nbBorders.thick,
    borderBottomWidth: 0,
    borderColor: nbColors.black,
    maxHeight: '80%',
    ...nbShadows.xl,
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
  title: {
    fontSize: nbTypography.fontSize.xl,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    flex: 1,
  },
  closeButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.xl + nbSpacing.lg,
  },
  filterSection: {
    marginBottom: nbSpacing.lg,
  },
  filterLabel: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    marginBottom: nbSpacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  select: {
    marginTop: nbSpacing.xs,
  },
  fixedValue: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.sm,
    borderWidth: nbBorders.base,
    borderColor: nbColors.gray['300'],
    backgroundColor: nbColors.gray['50'],
    borderRadius: 0,
  },
  fixedValueDisabled: {
    opacity: 0.7,
  },
  lockIcon: {
    marginRight: nbSpacing.sm,
  },
  fixedValueText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: nbSpacing.md,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    marginBottom: nbSpacing.sm,
    minHeight: 56,
  },
  dateIcon: {
    marginRight: nbSpacing.sm,
  },
  dateTextContainer: {
    flex: 1,
  },
  dateLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.gray['600'],
    marginBottom: 2,
  },
  dateValue: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  resetButton: {
    flex: 1,
  },
  applyButton: {
    flex: 1,
  },
});
