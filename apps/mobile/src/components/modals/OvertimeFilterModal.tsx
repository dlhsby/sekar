/**
 * OvertimeFilterModal Component
 * Phase 2C: Status, Rentang Tanggal, Rayon (role-gated), Area, Petugas
 * Mirrors ActivityFilterModal pattern for consistency.
 */

import React, { useState, useCallback, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { NBSelect, NBDatePicker, NBModal, NBText } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
} from '../../constants/nbTokens';
import type { OvertimeFilter } from '../../types/api.types';
import type { Location, Rayon, User, UserRole } from '../../types/models.types';
import { getLocations, getLocationsByRayonId, getRayons, getUsers } from '../../services/api';
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
  userLocationId?: string;
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
  userLocationId,
  userId,
}: OvertimeFilterModalProps): React.JSX.Element {
  const { t } = useTranslation('overtime');

  // Role-based visibility/locking (mirrors ActivityFilterModal)
  const isFieldWorker = useMemo(
    () => userRole === 'satgas' || userRole === 'linmas',
    [userRole],
  );
  const isLocationFixed = useMemo(
    () => (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userLocationId,
    [userRole, userLocationId],
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
  const [localLocationId, setLocalLocationId] = useState(
    isLocationFixed ? (userLocationId ?? '') : (filters.location_id ?? ''),
  );
  const [localUserId, setLocalUserId] = useState(filters.user_id ?? '');

  // Cascading data
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalDateFrom(filters.from_date ?? '');
      setLocalDateTo(filters.to_date ?? '');
      setLocalRayonId(filters.rayon_id ?? '');
      setLocalLocationId(isLocationFixed ? (userLocationId ?? '') : (filters.location_id ?? ''));
      setLocalUserId(filters.user_id ?? '');
    }
  }, [visible, filters, isLocationFixed, userLocationId]);

  // Load rayons when modal opens (if user can see rayon selector)
  useEffect(() => {
    if (!visible) { return; }
    if (showRayon && (canSelectRayon || isRayonFixed)) { loadRayons(); }
    if (isLocationFixed) { return; }
    if (userRayonId) {
      loadLocationsByRayon(userRayonId);
    } else {
      loadAllLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isLocationFixed, userRayonId, showRayon, canSelectRayon, isRayonFixed]);

  // Load users when area changes (unless field worker)
  useEffect(() => {
    if (!visible || isFieldWorker) { return; }
    loadUsers(localLocationId || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, localLocationId, isFieldWorker]);

  const loadRayons = useCallback(async () => {
    setLoadingRayons(true);
    try {
      const response = await getRayons();
      if (response.data) { setRayons(response.data); }
    } catch { /* non-critical */ } finally {
      setLoadingRayons(false);
    }
  }, []);

  const loadAllLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const response = await getLocations();
      if (response.data) { setLocations(response.data); }
    } catch { /* non-critical */ } finally {
      setLoadingLocations(false);
    }
  }, []);

  const loadLocationsByRayon = useCallback(async (rayonId: string) => {
    setLoadingLocations(true);
    try {
      const response = await getLocationsByRayonId(rayonId);
      if (response.data) { setLocations(response.data); }
    } catch { /* non-critical */ } finally {
      setLoadingLocations(false);
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
        filtered = filtered.filter((u) => (u as any).location_id === areaId);
      }
      setUsers(filtered);
    } catch { /* non-critical */ } finally {
      setLoadingUsers(false);
    }
  }, [userId, userRole]);

  const handleApply = useCallback(() => {
    const applied: OvertimeFilter = {};
    if (localStatus) { applied.status = localStatus as OvertimeFilter['status']; }
    if (localDateFrom) { applied.from_date = localDateFrom; }
    if (localDateTo) { applied.to_date = localDateTo; }
    if (localRayonId) { applied.rayon_id = localRayonId; }
    if (localLocationId) { applied.location_id = localLocationId; }
    if (localUserId && localUserId !== 'all_subordinates') { applied.user_id = localUserId; }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localDateFrom, localDateTo, localRayonId, localLocationId, localUserId, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalRayonId('');
    setLocalLocationId(isLocationFixed ? (userLocationId ?? '') : '');
    setLocalUserId('');
    onResetFilters();
    onClose();
  }, [isLocationFixed, userLocationId, onResetFilters, onClose]);

  const dateFromParsed = parseFilterDate(localDateFrom);
  const dateToParsed = parseFilterDate(localDateTo);

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title={t('filter.title')}
      footer={
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={handleReset}
            accessibilityRole="button"
          >
            <NBText variant="body-sm" color="black" style={styles.actionButtonText}>{t('filter.reset')}</NBText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.applyButton]}
            onPress={handleApply}
            accessibilityRole="button"
          >
            <NBText variant="body-sm" color="white" style={styles.actionButtonText}>{t('filter.apply')}</NBText>
          </TouchableOpacity>
        </View>
      }
    >
      {/* 1. Status */}
      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.status')}</NBText>
        <NBSelect
          value={localStatus || 'all'}
          onValueChange={(v) => setLocalStatus(v === 'all' ? '' : String(v))}
          options={[
            { label: t('filter.statusOptions.all'), value: 'all' },
            { label: t('filter.statusOptions.pending'), value: 'pending' },
            { label: t('filter.statusOptions.approved'), value: 'approved' },
            { label: t('filter.statusOptions.rejected'), value: 'rejected' },
          ]}
          searchable
        />
      </View>

      {/* 2. Rentang Tanggal */}
      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.dateRange')}</NBText>
        <View style={styles.dateRangeRow}>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateFromParsed}
              onChange={(date) => setLocalDateFrom(toFilterDateString(date))}
              label={t('filter.dateFrom')}
              maximumDate={dateToParsed ?? undefined}
            />
          </View>
          <NBText variant="body" color="gray500" style={styles.dateSeparator}>→</NBText>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateToParsed}
              onChange={(date) => setLocalDateTo(toFilterDateString(date))}
              label={t('filter.dateTo')}
              minimumDate={dateFromParsed ?? undefined}
            />
          </View>
        </View>
      </View>

      {/* 3. Rayon — role-gated */}
      {showRayon && (
        <View style={styles.filterSection}>
          <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.rayon')}</NBText>
          {isRayonFixed ? (
            <NBSelect
              value={userRayonId ?? 'all'}
              onValueChange={() => {}}
              options={[{ label: userRayonId ? t('filter.rayonOptions.mine') : t('filter.rayonOptions.all'), value: userRayonId ?? 'all' }]}
              disabled={true}
            />
          ) : (
            <NBSelect
              value={localRayonId || 'all'}
              onValueChange={(v) => {
                setLocalRayonId(v === 'all' ? '' : String(v));
                setLocalLocationId('');
              }}
              options={[
                { label: t('filter.rayonOptions.all'), value: 'all' },
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
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.location')}</NBText>
        {isLocationFixed ? (
          <NBSelect
            value={userLocationId ?? 'all'}
            onValueChange={() => {}}
            options={[{ label: userLocationId ? t('filter.areaOptions.mine') : t('filter.areaOptions.all'), value: userLocationId ?? 'all' }]}
            disabled={true}
          />
        ) : (
          <NBSelect
            value={localLocationId || 'all'}
            onValueChange={(v) => {
              setLocalLocationId(v === 'all' ? '' : String(v));
              setLocalUserId('');
            }}
            options={[
              { label: t('filter.areaOptions.all'), value: 'all' },
              ...locations.map((a) => ({ label: a.name, value: a.id })),
            ]}
            disabled={loadingLocations}
            searchable
          />
        )}
      </View>

      {/* 5. Dibuat Oleh — hidden for satgas/linmas */}
      {!isFieldWorker && (
        <View style={styles.filterSection}>
          <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.createdBy')}</NBText>
          <NBSelect
            value={localUserId || 'all'}
            onValueChange={(v) => setLocalUserId(v === 'all' ? '' : String(v))}
            options={[
              { label: t('filter.createdByOptions.all'), value: 'all' },
              ...(hasSubordinates ? [{ label: t('filter.createdByOptions.subordinates'), value: 'all_subordinates' }] : []),
              ...(userId ? [{ label: t('filter.createdByOptions.mine'), value: userId }] : []),
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
    marginBottom: nbSpacing.md,
  },
  filterLabel: {
    marginBottom: nbSpacing.xs,
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
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    minHeight: 46,
  },
  actionButtonText: {
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  resetButton: {
    backgroundColor: nbColors.white,
  },
  applyButton: {
    backgroundColor: nbColors.primary,
  },
});
