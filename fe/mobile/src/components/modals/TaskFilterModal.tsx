/**
 * TaskFilterModal Component
 * Bottom sheet modal for filtering tasks with role-based access controls
 * Includes: Status, Date Range (native date picker), Rayon, Area, Tipe filters
 * Phase 2C: Uses NBDatePicker for date selection
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
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBSelect, NBDatePicker } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbShadows,
} from '../../constants/nbTokens';
import type { TaskStatus, UserRole, Rayon, Area, User } from '../../types/models.types';
import { getRayons, getAreasByRayonId, getAreas, getUsers } from '../../services/api';
import { FILTER_SUBORDINATE_ROLES } from '../../constants/roles';
import { parseFilterDate, toFilterDateString, toTitleCase } from '../../utils/filterHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface TaskFilterModalProps {
  visible: boolean;
  onClose: () => void;
  taskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me';
  statusFilter: TaskStatus | 'all';
  dateFrom: string; // YYYY-MM-DD (deadline from)
  dateTo: string; // YYYY-MM-DD (deadline to)
  createdFrom: string; // YYYY-MM-DD (created_at from)
  createdTo: string; // YYYY-MM-DD (created_at to)
  rayonFilter: string | null;
  areaFilter: string | null;
  petugasFilter: string | null;
  onApplyFilters: (filters: {
    taskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me';
    statusFilter: TaskStatus | 'all';
    dateFrom: string;
    dateTo: string;
    createdFrom: string;
    createdTo: string;
    rayonFilter: string | null;
    areaFilter: string | null;
    petugasFilter: string | null;
  }) => void;
  onResetFilters: () => void;
  userRole: UserRole;
  userRayonId?: string;
  userAreaId?: string;
  userId?: string;
}

// Decode incoming taskFilter + petugasFilter props to unified assignee sentinel
function toAssigneeFilter(tf: string, pf: string | null): string {
  if (pf) { return pf; } // specific UUID takes precedence
  if (tf === 'assigned' || tf === 'tagged' || tf === 'created_by_me') { return tf; }
  return 'all';
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TaskFilterModal({
  visible,
  onClose,
  taskFilter,
  statusFilter,
  dateFrom,
  dateTo,
  createdFrom,
  createdTo,
  rayonFilter,
  areaFilter,
  petugasFilter,
  onApplyFilters,
  onResetFilters,
  userRole,
  userRayonId,
  userAreaId,
  userId,
}: TaskFilterModalProps): React.JSX.Element {
  // satgas, linmas, korlap: area is fixed to their assigned area
  const isAreaFixed = useMemo(() =>
    (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userAreaId
  , [userRole, userAreaId]);

  const showRayon = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_data' ||
    userRole === 'top_management' || userRole === 'admin_system' || userRole === 'superadmin'
  , [userRole]);

  const isRayonFixed = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_data'
  , [userRole]);

  const canFilterRayon = useMemo(() =>
    userRole === 'top_management' || userRole === 'admin_system' || userRole === 'superadmin'
  , [userRole]);

  const hasSubordinates = useMemo(
    () => (FILTER_SUBORDINATE_ROLES[userRole]?.length ?? 0) > 0,
    [userRole],
  );

  // Roles that can create tasks (and thus see "Dibuat oleh Saya")
  const canCreateTask = useMemo(
    () => userRole !== 'satgas' && userRole !== 'linmas' && userRole !== 'admin_data',
    [userRole],
  );

  const [localAssigneeFilter, setLocalAssigneeFilter] = useState(() => toAssigneeFilter(taskFilter, petugasFilter));
  const [localStatusFilter, setLocalStatusFilter] = useState(statusFilter);
  const [localDateFrom, setLocalDateFrom] = useState(dateFrom);
  const [localDateTo, setLocalDateTo] = useState(dateTo);
  const [localCreatedFrom, setLocalCreatedFrom] = useState(createdFrom);
  const [localCreatedTo, setLocalCreatedTo] = useState(createdTo);
  const [localRayonFilter, setLocalRayonFilter] = useState(rayonFilter);
  const [localAreaFilter, setLocalAreaFilter] = useState(areaFilter);

  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible && (canFilterRayon || isRayonFixed)) loadRayons();
  }, [visible, canFilterRayon, isRayonFixed]);

  useEffect(() => {
    if (!visible) return;
    if (isAreaFixed) return;
    const effectiveRayon = localRayonFilter ?? (isRayonFixed ? userRayonId : null) ?? userRayonId;
    if (effectiveRayon) {
      loadAreasByRayon(effectiveRayon);
    } else if (canFilterRayon) {
      loadAllAreas();
    }
  }, [visible, localRayonFilter, canFilterRayon, isAreaFixed, isRayonFixed, userRayonId]);

  useEffect(() => {
    if (!visible) { return; }
    loadUsers(localAreaFilter);
  }, [visible, localAreaFilter]);

  useEffect(() => {
    if (visible) {
      setLocalAssigneeFilter(toAssigneeFilter(taskFilter, petugasFilter));
      setLocalStatusFilter(statusFilter);
      setLocalDateFrom(dateFrom);
      setLocalDateTo(dateTo);
      setLocalCreatedFrom(createdFrom);
      setLocalCreatedTo(createdTo);
      setLocalRayonFilter(rayonFilter);
      setLocalAreaFilter(isAreaFixed ? (userAreaId ?? null) : areaFilter);
    }
  }, [visible, taskFilter, statusFilter, dateFrom, dateTo, createdFrom, createdTo, rayonFilter, areaFilter, petugasFilter, isAreaFixed, userAreaId]);

  const loadRayons = useCallback(async () => {
    setLoadingRayons(true);
    try {
      const response = await getRayons();
      if (response.data) setRayons(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading rayons:', error); }
    } finally {
      setLoadingRayons(false);
    }
  }, []);

  const loadUsers = useCallback(async (areaId: string | null) => {
    setLoadingUsers(true);
    try {
      const response = await getUsers(100);
      const allUsers: User[] = response.data ?? [];
      const subordinateRoles = FILTER_SUBORDINATE_ROLES[userRole] ?? [];
      let filtered = allUsers.filter((u) => u.id !== userId);
      if (subordinateRoles.length > 0) {
        filtered = filtered.filter((u) => subordinateRoles.includes(u.role));
      }
      if (areaId) {
        filtered = filtered.filter((u) => (u as any).area_id === areaId);
      }
      setUsers(filtered);
    } catch {
      // non-critical
    } finally {
      setLoadingUsers(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole]);

  const loadAllAreas = useCallback(async () => {
    setLoadingAreas(true);
    try {
      const response = await getAreas();
      if (response.data) setAreas(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading areas:', error); }
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  const loadAreasByRayon = useCallback(async (rayonId: string) => {
    setLoadingAreas(true);
    try {
      const response = await getAreasByRayonId(rayonId);
      if (response.data) setAreas(response.data);
    } catch (error) {
      if (__DEV__) { console.error('[TaskFilterModal] Error loading areas by rayon:', error); }
      setAreas([]);
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  const handleApply = useCallback(() => {
    let derivedTaskFilter: 'all' | 'assigned' | 'tagged' | 'created_by_me' = 'all';
    let derivedPetugasFilter: string | null = null;
    if (localAssigneeFilter === 'assigned') {
      derivedTaskFilter = 'assigned';
    } else if (localAssigneeFilter === 'tagged') {
      derivedTaskFilter = 'tagged';
    } else if (localAssigneeFilter === 'created_by_me') {
      derivedTaskFilter = 'created_by_me';
    } else if (localAssigneeFilter !== 'all' && localAssigneeFilter !== 'all_subordinates') {
      // specific subordinate UUID
      derivedTaskFilter = 'all';
      derivedPetugasFilter = localAssigneeFilter;
    }
    onApplyFilters({
      taskFilter: derivedTaskFilter,
      statusFilter: localStatusFilter,
      dateFrom: localDateFrom,
      dateTo: localDateTo,
      createdFrom: localCreatedFrom,
      createdTo: localCreatedTo,
      rayonFilter: localRayonFilter,
      areaFilter: localAreaFilter,
      petugasFilter: derivedPetugasFilter,
    });
    onClose();
  }, [localAssigneeFilter, localStatusFilter, localDateFrom, localDateTo, localCreatedFrom, localCreatedTo, localRayonFilter, localAreaFilter, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalAssigneeFilter('all');
    setLocalStatusFilter('all');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalCreatedFrom('');
    setLocalCreatedTo('');
    setLocalRayonFilter(null);
    setLocalAreaFilter(isAreaFixed ? (userAreaId ?? null) : null);
    onResetFilters();
    onClose();
  }, [isAreaFixed, userAreaId, onResetFilters, onClose]);

  const handleRayonChange = useCallback((rayonId: string | number) => {
    const newRayonId = rayonId === 'all' ? null : String(rayonId);
    setLocalRayonFilter(newRayonId);
    setLocalAreaFilter(null);
    setAreas([]);
    if (newRayonId) loadAreasByRayon(newRayonId);
    else loadAllAreas();
  }, [loadAreasByRayon, loadAllAreas]);

  const handleAreaChange = useCallback((areaId: string | number) => {
    const newAreaId = areaId === 'all' ? null : String(areaId);
    setLocalAreaFilter(newAreaId);
    setLocalAssigneeFilter('all');
  }, []);

  // Date picker min/max constraints
  const dateFromParsed = parseFilterDate(localDateFrom);
  const dateToParsed = parseFilterDate(localDateTo);
  const createdFromParsed = parseFilterDate(localCreatedFrom);
  const createdToParsed = parseFilterDate(localCreatedTo);

  return (
    <Modal visible={visible} animationType="slide" transparent={true} onRequestClose={onClose}>
      <Pressable style={styles.overlay} onPress={onClose}>
        <View
          style={styles.modalContent}
          onStartShouldSetResponder={() => true}
          onMoveShouldSetResponder={() => false}
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
              <MaterialCommunityIcons name="close" size={22} color={nbColors.black} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* 1. Status */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Status</Text>
              <NBSelect
                value={localStatusFilter}
                onValueChange={(v) => setLocalStatusFilter(v as TaskStatus | 'all')}
                options={[
                  { label: 'Semua Status', value: 'all' },
                  { label: 'Menunggu', value: 'pending' },
                  { label: 'Ditugaskan', value: 'assigned' },
                  { label: 'Diterima', value: 'accepted' },
                  { label: 'Ditolak', value: 'declined' },
                  { label: 'Dikerjakan', value: 'in_progress' },
                  { label: 'Menunggu Verifikasi', value: 'completed' },
                  { label: 'Terverifikasi', value: 'verified' },
                  { label: 'Perlu Revisi', value: 'revision_needed' },
                ]}
                searchable
              />
            </View>

            {/* 2. Tanggal Dibuat */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Tanggal Dibuat</Text>
              <View style={styles.dateRangeRow}>
                <View style={styles.dateButtonHalf}>
                  <NBDatePicker
                    value={createdFromParsed}
                    onChange={(date) => setLocalCreatedFrom(toFilterDateString(date))}
                    label="Dari"
                    maximumDate={createdToParsed ?? undefined}
                  />
                </View>

                <Text style={styles.dateSeparator}>→</Text>

                <View style={styles.dateButtonHalf}>
                  <NBDatePicker
                    value={createdToParsed}
                    onChange={(date) => setLocalCreatedTo(toFilterDateString(date))}
                    label="Sampai"
                    minimumDate={createdFromParsed ?? undefined}
                  />
                </View>
              </View>
            </View>

            {/* 3. Deadline */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Deadline</Text>
              <View style={styles.dateRangeRow}>
                <View style={styles.dateButtonHalf}>
                  <NBDatePicker
                    value={dateFromParsed}
                    onChange={(date) => setLocalDateFrom(toFilterDateString(date))}
                    label="Dari"
                    maximumDate={dateToParsed ?? undefined}
                  />
                </View>

                <Text style={styles.dateSeparator}>→</Text>

                <View style={styles.dateButtonHalf}>
                  <NBDatePicker
                    value={dateToParsed}
                    onChange={(date) => setLocalDateTo(toFilterDateString(date))}
                    label="Sampai"
                    minimumDate={dateFromParsed ?? undefined}
                  />
                </View>
              </View>
            </View>

            {/* 4. Rayon — role-gated */}
            {showRayon && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Rayon</Text>
                {isRayonFixed ? (
                  <NBSelect
                    value={userRayonId ?? 'all'}
                    onValueChange={() => {}}
                    options={[{ label: userRayonId ? 'Rayon Saya' : 'Semua Rayon', value: userRayonId ?? 'all' }]}
                    disabled={true}
                  />
                ) : (
                  <NBSelect
                    value={localRayonFilter || 'all'}
                    onValueChange={handleRayonChange}
                    options={[
                      { label: 'Semua Rayon', value: 'all' },
                      ...rayons.map(r => ({ label: r.name, value: r.id })),
                    ]}
                    disabled={loadingRayons}
                    searchable
                  />
                )}
              </View>
            )}

            {/* 5. Area */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Area</Text>
              {isAreaFixed ? (
                <NBSelect
                  value={userAreaId ?? 'all'}
                  onValueChange={() => {}}
                  options={[{ label: userAreaId ? 'Area Saya' : 'Semua Area', value: userAreaId ?? 'all' }]}
                  disabled={true}
                />
              ) : canFilterRayon || isRayonFixed || userRayonId ? (
                <NBSelect
                  value={localAreaFilter || 'all'}
                  onValueChange={handleAreaChange}
                  options={[
                    { label: 'Semua Area', value: 'all' },
                    ...areas.map(a => ({ label: a.name, value: a.id })),
                  ]}
                  disabled={loadingAreas}
                  searchable
                />
              ) : null}
            </View>

            {/* 6. Penugasan */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Penugasan</Text>
              <NBSelect
                value={localAssigneeFilter}
                onValueChange={(v) => setLocalAssigneeFilter(String(v))}
                options={[
                  { label: 'Semua Petugas (Termasuk Saya)', value: 'all' },
                  { label: 'Ditugaskan Kepada Saya', value: 'assigned' },
                  ...(canCreateTask ? [{ label: 'Dibuat oleh Saya', value: 'created_by_me' }] : []),
                  ...(hasSubordinates ? [{ label: 'Semua Bawahan', value: 'all_subordinates' }] : []),
                  { label: 'Tag Saya', value: 'tagged' },
                  ...users.map((u) => ({
                    label: `${toTitleCase(u.role)} - ${u.full_name}`,
                    value: u.id,
                  })),
                ]}
                disabled={loadingUsers}
                searchable
              />
            </View>
          </ScrollView>

          {/* Fixed action buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[styles.actionButton, styles.resetButton]}
              onPress={handleReset}
              accessibilityRole="button"
            >
              <Text style={styles.resetButtonText}>Reset</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionButton, styles.applyButton]}
              onPress={handleApply}
              accessibilityRole="button"
            >
              <Text style={styles.applyButtonText}>Terapkan</Text>
            </TouchableOpacity>
          </View>
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
    borderTopWidth: nbBorders.base,
    borderLeftWidth: nbBorders.base,
    borderRightWidth: nbBorders.base,
    borderColor: nbColors.black,
    maxHeight: '85%',
    flexShrink: 1,
    ...nbShadows.lg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm + 4,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  title: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    letterSpacing: 0.3,
    flex: 1,
  },
  closeButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {},
  scrollContent: {
    padding: nbSpacing.md,
    paddingBottom: nbSpacing.sm,
  },
  filterSection: {
    marginBottom: nbSpacing.md + 4,
  },
  filterLabel: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.gray['600'],
    marginBottom: nbSpacing.xs + 2,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  dateRangeRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: nbSpacing.xs,
  },
  dateButtonHalf: {
    flex: 1,
  },
  dateSeparator: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['500'],
    alignSelf: 'center',
    paddingHorizontal: 2,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.sm + 2,
    borderTopWidth: nbBorders.base,
    borderTopColor: nbColors.black,
  },
  actionButton: {
    flex: 1,
    paddingVertical: nbSpacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    minHeight: 46,
  },
  resetButton: {
    backgroundColor: nbColors.white,
  },
  resetButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
    letterSpacing: 0.3,
  },
  applyButton: {
    backgroundColor: nbColors.primary,
  },
  applyButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
    letterSpacing: 0.3,
  },
});
