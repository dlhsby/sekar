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
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useTranslation } from 'react-i18next';

import { NBSelect, NBDatePicker, NBModal } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbType,
  nbBorders,
} from '../../constants/nbTokens';
import type { ActivitiesFilter } from '../../types/api.types';
import type { Location, Rayon, User, UserRole } from '../../types/models.types';
import { getLocations, getLocationsByRayonId, getRayons, getUsers } from '../../services/api';
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
  userLocationId?: string;
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
  userLocationId,
  userId,
}: ActivityFilterModalProps): React.JSX.Element {
  const { t } = useTranslation('activities');

  // satgas, linmas, korlap: area is fixed to their assigned area
  const isLocationFixed = useMemo(() =>
    (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userLocationId
  , [userRole, userLocationId]);

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
  const [localLocationId, setLocalLocationId] = useState(isLocationFixed ? (userLocationId ?? '') : (filters.location_id ?? ''));
  const [localRayonId, setLocalRayonId] = useState(filters.rayon_id ?? '');
  const [localUserId, setLocalUserId] = useState(filters.user_id ?? '');

  const [locations, setLocations] = useState<Location[]>([]);
  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [loadingRayons, setLoadingRayons] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalDateFrom(filters.from_date ?? '');
      setLocalDateTo(filters.to_date ?? '');
      setLocalLocationId(isLocationFixed ? (userLocationId ?? '') : (filters.location_id ?? ''));
      setLocalRayonId(filters.rayon_id ?? '');
      setLocalUserId(filters.user_id ?? '');
    }
  }, [visible, filters, isLocationFixed, userLocationId]);

  useEffect(() => {
    if (!visible) return;
    if (showRayon && (canSelectRayon || isRayonFixed)) loadRayons();
    if (isLocationFixed) return;
    if (userRayonId) {
      loadLocationsByRayon(userRayonId);
    } else {
      loadAllLocations();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isLocationFixed, userRayonId, showRayon, canSelectRayon, isRayonFixed]);

  useEffect(() => {
    if (!visible || isFieldWorker) return;
    loadUsers(localLocationId || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, localLocationId, isFieldWorker]);

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
        filtered = filtered.filter((u) => (u as any).location_id === areaId);
      }
      setUsers(filtered);
    } catch {
      // non-critical
    } finally {
      setLoadingUsers(false);
    }
  }, [userId, userRole]);

  const loadAllLocations = useCallback(async () => {
    setLoadingLocations(true);
    try {
      const response = await getLocations();
      if (response.data) setLocations(response.data);
    } catch {
      // non-critical
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const loadLocationsByRayon = useCallback(async (rayonId: string) => {
    setLoadingLocations(true);
    try {
      const response = await getLocationsByRayonId(rayonId);
      if (response.data) setLocations(response.data);
    } catch {
      // non-critical
    } finally {
      setLoadingLocations(false);
    }
  }, []);

  const handleApply = useCallback(() => {
    const applied: ActivitiesFilter = {};
    if (localStatus) applied.status = localStatus as ActivitiesFilter['status'];
    if (localDateFrom) applied.from_date = localDateFrom;
    if (localDateTo) applied.to_date = localDateTo;
    if (localLocationId) applied.location_id = localLocationId;
    if (localRayonId) applied.rayon_id = localRayonId;
    if (localUserId && localUserId !== 'all_subordinates') { applied.user_id = localUserId; }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localDateFrom, localDateTo, localLocationId, localRayonId, localUserId, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalLocationId(isLocationFixed ? (userLocationId ?? '') : '');
    setLocalRayonId('');
    setLocalUserId('');
    onResetFilters();
    onClose();
  }, [isLocationFixed, userLocationId, onResetFilters, onClose]);

  // Date picker min/max constraints
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
            <Text style={styles.resetButtonText}>{t('filter.reset')}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.applyButton]}
            onPress={handleApply}
            accessibilityRole="button"
          >
            <Text style={styles.applyButtonText}>{t('filter.apply')}</Text>
          </TouchableOpacity>
        </View>
      }
    >
      {/* 1. Status */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>{t('filter.status')}</Text>
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
        <Text style={styles.filterLabel}>{t('filter.dateRange')}</Text>
        <View style={styles.dateRangeRow}>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateFromParsed}
              onChange={(date) => setLocalDateFrom(toFilterDateString(date))}
              label={t('filter.dateFrom')}
              maximumDate={dateToParsed ?? undefined}
            />
          </View>

          <Text style={styles.dateSeparator}>→</Text>

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
          <Text style={styles.filterLabel}>{t('filter.rayon')}</Text>
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
              onValueChange={(v) => { setLocalRayonId(v === 'all' ? '' : String(v)); setLocalLocationId(''); }}
              options={[
                { label: t('filter.rayonOptions.all'), value: 'all' },
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
        <Text style={styles.filterLabel}>{t('filter.location')}</Text>
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
            onValueChange={(v) => { setLocalLocationId(v === 'all' ? '' : String(v)); setLocalUserId(''); }}
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
          <Text style={styles.filterLabel}>{t('filter.createdBy')}</Text>
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
    marginBottom: nbSpacing.md + 4,
  },
  filterLabel: {
    fontSize: nbType.caption.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.gray600,
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
    fontSize: nbType.body.fontSize,
    color: nbColors.gray500,
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
  resetButton: {
    backgroundColor: nbColors.white,
  },
  resetButtonText: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.black,
    letterSpacing: 0.3,
  },
  applyButton: {
    backgroundColor: nbColors.primary,
  },
  applyButtonText: {
    fontSize: nbType.bodySm.fontSize,
    fontWeight: nbType.h1.fontWeight,
    color: nbColors.white,
    letterSpacing: 0.3,
  },
});
