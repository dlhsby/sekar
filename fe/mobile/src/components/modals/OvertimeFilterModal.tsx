/**
 * OvertimeFilterModal Component
 * Phase 2C: Status, Rentang Tanggal, Rayon (role-gated), Area, Petugas
 * Mirrors ActivityFilterModal pattern for consistency.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';

import { NBSelect, NBDatePicker, NBModal } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
} from '../../constants/nbTokens';
import type { OvertimeFilter } from '../../types/api.types';
import type { Area, Rayon, User, UserRole } from '../../types/models.types';
import { getAreas, getAreasByRayonId, getRayons, getUsers } from '../../services/api';
import { FILTER_SUBORDINATE_ROLES } from '../../constants/roles';
import { parseFilterDate, toFilterDateString, toTitleCase } from '../../utils/filterHelpers';

// ─── Props ────────────────────────────────────────────────────────────────────

interface OvertimeFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: OvertimeFilter;
  onApplyFilters: (filters: OvertimeFilter) => void;
  onResetFilters: () => void;
  userRole?: UserRole;
  userRayonId?: string;
  userAreaId?: string;
  userId?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function OvertimeFilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  userRole,
  userRayonId,
  userAreaId,
  userId,
}: OvertimeFilterModalProps): React.JSX.Element {
  // Role-based visibility/locking (mirrors ActivityFilterModal)
  const isFieldWorker = useMemo(
    () => userRole === 'satgas' || userRole === 'linmas',
    [userRole],
  );
  const isAreaFixed = useMemo(
    () => (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userAreaId,
    [userRole, userAreaId],
  );
  const showRayon = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_data' ||
          userRole === 'top_management' || userRole === 'admin_system' || userRole === 'superadmin',
    [userRole],
  );
  const isRayonFixed = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_data',
    [userRole],
  );
  const canSelectRayon = useMemo(
    () => userRole === 'top_management' || userRole === 'admin_system' || userRole === 'superadmin',
    [userRole],
  );
  const hasSubordinates = useMemo(
    () => userRole ? (FILTER_SUBORDINATE_ROLES[userRole]?.length ?? 0) > 0 : false,
    [userRole],
  );

  // Local filter state
  const [localStatus, setLocalStatus] = useState(filters.status ?? '');
  const [localDateFrom, setLocalDateFrom] = useState(filters.from_date ?? '');
  const [localDateTo, setLocalDateTo] = useState(filters.to_date ?? '');
  const [localRayonId, setLocalRayonId] = useState(filters.rayon_id ?? '');
  const [localAreaId, setLocalAreaId] = useState(
    isAreaFixed ? (userAreaId ?? '') : (filters.area_id ?? ''),
  );
  const [localUserId, setLocalUserId] = useState(filters.user_id ?? '');

  // Cascading data
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalDateFrom(filters.from_date ?? '');
      setLocalDateTo(filters.to_date ?? '');
      setLocalRayonId(filters.rayon_id ?? '');
      setLocalAreaId(isAreaFixed ? (userAreaId ?? '') : (filters.area_id ?? ''));
      setLocalUserId(filters.user_id ?? '');
    }
  }, [visible, filters, isAreaFixed, userAreaId]);

  // Load rayons when modal opens (if user can see rayon selector)
  useEffect(() => {
    if (!visible) { return; }
    if (showRayon && (canSelectRayon || isRayonFixed)) { loadRayons(); }
    if (isAreaFixed) { return; }
    if (userRayonId) {
      loadAreasByRayon(userRayonId);
    } else {
      loadAllAreas();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isAreaFixed, userRayonId, showRayon, canSelectRayon, isRayonFixed]);

  // Load users when area changes (unless field worker)
  useEffect(() => {
    if (!visible || isFieldWorker) { return; }
    loadUsers(localAreaId || null);
  }, [visible, localAreaId, isFieldWorker]);

  const loadRayons = useCallback(async () => {
    setLoadingRayons(true);
    try {
      const response = await getRayons();
      if (response.data) { setRayons(response.data); }
    } catch { /* non-critical */ } finally {
      setLoadingRayons(false);
    }
  }, []);

  const loadAllAreas = useCallback(async () => {
    setLoadingAreas(true);
    try {
      const response = await getAreas();
      if (response.data) { setAreas(response.data); }
    } catch { /* non-critical */ } finally {
      setLoadingAreas(false);
    }
  }, []);

  const loadAreasByRayon = useCallback(async (rayonId: string) => {
    setLoadingAreas(true);
    try {
      const response = await getAreasByRayonId(rayonId);
      if (response.data) { setAreas(response.data); }
    } catch { /* non-critical */ } finally {
      setLoadingAreas(false);
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
    } catch { /* non-critical */ } finally {
      setLoadingUsers(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, userRole]);

  const handleApply = useCallback(() => {
    const applied: OvertimeFilter = {};
    if (localStatus) { applied.status = localStatus as OvertimeFilter['status']; }
    if (localDateFrom) { applied.from_date = localDateFrom; }
    if (localDateTo) { applied.to_date = localDateTo; }
    if (localRayonId) { applied.rayon_id = localRayonId; }
    if (localAreaId) { applied.area_id = localAreaId; }
    if (localUserId && localUserId !== 'all_subordinates') { applied.user_id = localUserId; }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localDateFrom, localDateTo, localRayonId, localAreaId, localUserId, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalRayonId('');
    setLocalAreaId(isAreaFixed ? (userAreaId ?? '') : '');
    setLocalUserId('');
    onResetFilters();
    onClose();
  }, [isAreaFixed, userAreaId, onResetFilters, onClose]);

  const dateFromParsed = parseFilterDate(localDateFrom);
  const dateToParsed = parseFilterDate(localDateTo);

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Filter Lembur"
      size="lg"
      scrollable
      footer={
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
      }
    >
      {/* 1. Status */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status</Text>
        <NBSelect
          value={localStatus || 'all'}
          onValueChange={(v) => setLocalStatus(v === 'all' ? '' : String(v))}
          options={[
            { label: 'Semua Status', value: 'all' },
            { label: 'Menunggu', value: 'pending' },
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
              onValueChange={(v) => {
                setLocalRayonId(v === 'all' ? '' : String(v));
                setLocalAreaId('');
              }}
              options={[
                { label: 'Semua Rayon', value: 'all' },
                ...rayons.map((r) => ({ label: r.name, value: r.id })),
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
            onValueChange={(v) => {
              setLocalAreaId(v === 'all' ? '' : String(v));
              setLocalUserId('');
            }}
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
    </NBModal>
  );
}

const styles = StyleSheet.create({
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
