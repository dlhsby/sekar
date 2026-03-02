/**
 * ActivityFilterModal Component
 * Bottom sheet modal for filtering activities by status, date range, area, and type
 * Phase 2C: Uses NBDatePicker for date selection, wires date_to to onApplyFilters
 * Section order: Status → Rentang Tanggal → Area → Tipe Aktivitas
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
import type { ActivitiesFilter } from '../../types/api.types';
import type { Area, Rayon, User, UserRole } from '../../types/models.types';
import { getAreas, getAreasByRayonId, getRayons, getUsers } from '../../services/api';
import { FILTER_SUBORDINATE_ROLES } from '../../constants/roles';
import { parseFilterDate, toFilterDateString, toTitleCase } from '../../utils/filterHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface ActivityFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: ActivitiesFilter;
  onApplyFilters: (filters: ActivitiesFilter) => void;
  onResetFilters: () => void;
  userRole?: UserRole;
  userRayonId?: string;
  userAreaId?: string;
  userId?: string; // current user's id for "Dibuat oleh Saya" default
}

// ─── Component ────────────────────────────────────────────────────────────────

export function ActivityFilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  userRole,
  userRayonId,
  userAreaId,
  userId,
}: ActivityFilterModalProps): React.JSX.Element {
  // satgas, linmas, korlap: area is fixed to their assigned area
  const isAreaFixed = useMemo(() =>
    (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userAreaId
  , [userRole, userAreaId]);

  const isFieldWorker = useMemo(() =>
    userRole === 'satgas' || userRole === 'linmas'
  , [userRole]);

  const showRayon = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_data' ||
    userRole === 'top_management' || userRole === 'admin_system' || userRole === 'superadmin'
  , [userRole]);

  const isRayonFixed = useMemo(() =>
    userRole === 'kepala_rayon' || userRole === 'admin_data'
  , [userRole]);

  const canSelectRayon = useMemo(() =>
    userRole === 'top_management' || userRole === 'admin_system' || userRole === 'superadmin'
  , [userRole]);

  const hasSubordinates = useMemo(
    () => userRole ? (FILTER_SUBORDINATE_ROLES[userRole]?.length ?? 0) > 0 : false,
    [userRole],
  );

  const [localStatus, setLocalStatus] = useState(filters.status ?? '');
  const [localDateFrom, setLocalDateFrom] = useState(filters.from_date ?? '');
  const [localDateTo, setLocalDateTo] = useState(filters.to_date ?? '');
  const [localAreaId, setLocalAreaId] = useState(isAreaFixed ? (userAreaId ?? '') : (filters.area_id ?? ''));
  const [localRayonId, setLocalRayonId] = useState(filters.rayon_id ?? '');
  const [localUserId, setLocalUserId] = useState(filters.user_id ?? '');

  const [areas, setAreas] = useState<Area[]>([]);
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalDateFrom(filters.from_date ?? '');
      setLocalDateTo(filters.to_date ?? '');
      setLocalAreaId(isAreaFixed ? (userAreaId ?? '') : (filters.area_id ?? ''));
      setLocalRayonId(filters.rayon_id ?? '');
      setLocalUserId(filters.user_id ?? '');
    }
  }, [visible, filters, isAreaFixed, userAreaId]);

  useEffect(() => {
    if (!visible) return;
    if (showRayon && (canSelectRayon || isRayonFixed)) loadRayons();
    if (isAreaFixed) return;
    if (userRayonId) {
      loadAreasByRayon(userRayonId);
    } else {
      loadAllAreas();
    }
  }, [visible, isAreaFixed, userRayonId, showRayon, canSelectRayon, isRayonFixed]);

  useEffect(() => {
    if (!visible || isFieldWorker) return;
    loadUsers(localAreaId || null);
  }, [visible, localAreaId, isFieldWorker]);

  const loadRayons = useCallback(async () => {
    setLoadingRayons(true);
    try {
      const response = await getRayons();
      if (response.data) setRayons(response.data);
    } catch {
      // non-critical
    } finally {
      setLoadingRayons(false);
    }
  }, []);

  const loadUsers = useCallback(async (areaId: string | null) => {
    setLoadingUsers(true);
    try {
      const response = await getUsers(100);
      const allUsers: User[] = response.data ?? [];
      const subordinateRoles = userRole ? (FILTER_SUBORDINATE_ROLES[userRole] ?? []) : [];
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
    } catch {
      // non-critical
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  const loadAreasByRayon = useCallback(async (rayonId: string) => {
    setLoadingAreas(true);
    try {
      const response = await getAreasByRayonId(rayonId);
      if (response.data) setAreas(response.data);
    } catch {
      // non-critical
    } finally {
      setLoadingAreas(false);
    }
  }, []);

  const handleApply = useCallback(() => {
    const applied: ActivitiesFilter = {};
    if (localStatus) applied.status = localStatus as ActivitiesFilter['status'];
    if (localDateFrom) applied.from_date = localDateFrom;
    if (localDateTo) applied.to_date = localDateTo;
    if (localAreaId) applied.area_id = localAreaId;
    if (localRayonId) applied.rayon_id = localRayonId;
    if (localUserId && localUserId !== 'all_subordinates') { applied.user_id = localUserId; }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localDateFrom, localDateTo, localAreaId, localRayonId, localUserId, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalAreaId(isAreaFixed ? (userAreaId ?? '') : '');
    setLocalRayonId('');
    setLocalUserId('');
    onResetFilters();
    onClose();
  }, [isAreaFixed, userAreaId, onResetFilters, onClose]);

  // Date picker min/max constraints
  const dateFromParsed = parseFilterDate(localDateFrom);
  const dateToParsed = parseFilterDate(localDateTo);

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
            <Text style={styles.title}>Filter Aktivitas</Text>
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
                value={localStatus || 'all'}
                onValueChange={(v) => setLocalStatus(v === 'all' ? '' : String(v))}
                options={[
                  { label: 'Semua Status', value: 'all' },
                  { label: 'Menunggu Persetujuan', value: 'pending' },
                  { label: 'Disetujui', value: 'approved' },
                  { label: 'Ditolak', value: 'rejected' },
                ]}
                searchable
              />
            </View>

            {/* 2. Rentang Tanggal */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Rentang Tanggal</Text>
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

            {/* 3. Rayon — role-gated */}
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
                    value={localRayonId || 'all'}
                    onValueChange={(v) => { setLocalRayonId(v === 'all' ? '' : String(v)); setLocalAreaId(''); }}
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

            {/* 4. Area */}
            <View style={styles.filterSection}>
              <Text style={styles.filterLabel}>Area</Text>
              {isAreaFixed ? (
                <NBSelect
                  value={userAreaId ?? 'all'}
                  onValueChange={() => {}}
                  options={[{ label: userAreaId ? 'Area Saya' : 'Semua Area', value: userAreaId ?? 'all' }]}
                  disabled={true}
                />
              ) : (
                <NBSelect
                  value={localAreaId || 'all'}
                  onValueChange={(v) => { setLocalAreaId(v === 'all' ? '' : String(v)); setLocalUserId(''); }}
                  options={[
                    { label: 'Semua Area', value: 'all' },
                    ...areas.map((a) => ({ label: a.name, value: a.id })),
                  ]}
                  disabled={loadingAreas}
                  searchable
                />
              )}
            </View>

            {/* 5. Dibuat Oleh — hidden for satgas/linmas */}
            {!isFieldWorker && (
              <View style={styles.filterSection}>
                <Text style={styles.filterLabel}>Dibuat Oleh</Text>
                <NBSelect
                  value={localUserId || 'all'}
                  onValueChange={(v) => setLocalUserId(v === 'all' ? '' : String(v))}
                  options={[
                    { label: 'Semua Petugas (Termasuk Saya)', value: 'all' },
                    ...(hasSubordinates ? [{ label: 'Semua Bawahan', value: 'all_subordinates' }] : []),
                    ...(userId ? [{ label: 'Dibuat oleh Saya', value: userId }] : []),
                    ...users.map((u) => ({
                      label: `${toTitleCase(u.role)} - ${u.full_name}`,
                      value: u.id,
                    })),
                  ]}
                  disabled={loadingUsers}
                  searchable
                />
              </View>
            )}

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
