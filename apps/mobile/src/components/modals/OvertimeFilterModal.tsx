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
import type { Area, District, User, UserRole } from '../../types/models.types';
import { getAreas, getAreasByDistrictId, getDistricts, getUsers } from '../../services/api';
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
  userDistrictId?: string;
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
  userDistrictId,
  userAreaId,
  userId,
}: OvertimeFilterModalProps): React.JSX.Element {
  const { t } = useTranslation('overtime');

  // Role-based visibility/locking (mirrors ActivityFilterModal)
  const isFieldWorker = useMemo(
    () => userRole === 'satgas' || userRole === 'linmas',
    [userRole],
  );
  const isAreaFixed = useMemo(
    () => (userRole === 'satgas' || userRole === 'linmas' || userRole === 'korlap') && !!userAreaId,
    [userRole, userAreaId],
  );
  const showDistrict = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_rayon' ||
          userRole === 'management' || userRole === 'admin_system' || userRole === 'superadmin',
    [userRole],
  );
  const isDistrictFixed = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_rayon',
    [userRole],
  );
  const canSelectDistrict = useMemo(
    () => userRole === 'management' || userRole === 'admin_system' || userRole === 'superadmin',
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
  const [localDistrictId, setLocalDistrictId] = useState(filters.district_id ?? '');
  const [localAreaId, setLocalAreaId] = useState(
    isAreaFixed ? (userAreaId ?? '') : (filters.location_id ?? ''),
  );
  const [localUserId, setLocalUserId] = useState(filters.user_id ?? '');

  // Cascading data
  const [districts, setDistricts] = useState<District[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);
  const [loadingAreas, setLoadingAreas] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalDateFrom(filters.from_date ?? '');
      setLocalDateTo(filters.to_date ?? '');
      setLocalDistrictId(filters.district_id ?? '');
      setLocalAreaId(isAreaFixed ? (userAreaId ?? '') : (filters.location_id ?? ''));
      setLocalUserId(filters.user_id ?? '');
    }
  }, [visible, filters, isAreaFixed, userAreaId]);

  // Load districts when modal opens (if user can see district selector)
  useEffect(() => {
    if (!visible) { return; }
    if (showDistrict && (canSelectDistrict || isDistrictFixed)) { loadDistricts(); }
    if (isAreaFixed) { return; }
    if (userDistrictId) {
      loadAreasByDistrict(userDistrictId);
    } else {
      loadAllAreas();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, isAreaFixed, userDistrictId, showDistrict, canSelectDistrict, isDistrictFixed]);

  // Load users when area changes (unless field worker)
  useEffect(() => {
    if (!visible || isFieldWorker) { return; }
    loadUsers(localAreaId || null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, localAreaId, isFieldWorker]);

  const loadDistricts = useCallback(async () => {
    setLoadingDistricts(true);
    try {
      const response = await getDistricts();
      if (response.data) { setDistricts(response.data); }
    } catch { /* non-critical */ } finally {
      setLoadingDistricts(false);
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

  const loadAreasByDistrict = useCallback(async (districtId: string) => {
    setLoadingAreas(true);
    try {
      const response = await getAreasByDistrictId(districtId);
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
    if (localDistrictId) { applied.district_id = localDistrictId; }
    if (localAreaId) { applied.location_id = localAreaId; }
    if (localUserId && localUserId !== 'all_subordinates') { applied.user_id = localUserId; }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localDateFrom, localDateTo, localDistrictId, localAreaId, localUserId, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalDateFrom('');
    setLocalDateTo('');
    setLocalDistrictId('');
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
      {showDistrict && (
        <View style={styles.filterSection}>
          <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.district')}</NBText>
          {isDistrictFixed ? (
            <NBSelect
              value={userDistrictId ?? 'all'}
              onValueChange={() => {}}
              options={[{ label: userDistrictId ? t('filter.districtOptions.mine') : t('filter.districtOptions.all'), value: userDistrictId ?? 'all' }]}
              disabled={true}
            />
          ) : (
            <NBSelect
              value={localDistrictId || 'all'}
              onValueChange={(v) => {
                setLocalDistrictId(v === 'all' ? '' : String(v));
                setLocalAreaId('');
              }}
              options={[
                { label: t('filter.districtOptions.all'), value: 'all' },
                ...districts.map((r) => ({ label: r.name, value: r.id })),
              ]}
              disabled={loadingDistricts}
              searchable
            />
          )}
        </View>
      )}

      {/* 4. Area */}
      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.area')}</NBText>
        {isAreaFixed ? (
          <NBSelect
            value={userAreaId ?? 'all'}
            onValueChange={() => {}}
            options={[{ label: userAreaId ? t('filter.areaOptions.mine') : t('filter.areaOptions.all'), value: userAreaId ?? 'all' }]}
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
              { label: t('filter.areaOptions.all'), value: 'all' },
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
