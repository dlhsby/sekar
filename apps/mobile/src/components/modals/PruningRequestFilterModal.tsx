/**
 * PruningRequestFilterModal
 * Status / Rentang Tanggal / Rayon (admin-only) filter modal for the
 * Perantingan list screen. Mirrors OvertimeFilterModal's structure so the
 * filter UX is consistent across all four list screens (lembur, tugas,
 * aktivitas, perantingan).
 *
 * The local list filter shape is kept lightweight here — the screen
 * translates these into the API params (`mine` + `status` + date strings).
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';

import { NBSelect, NBDatePicker, NBModal, NBTextInput, NBText } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbBorders,
} from '../../constants/nbTokens';
import { getDistricts } from '../../services/api';
import type { PruningRequestStatus, District, UserRole } from '../../types/models.types';
import { parseFilterDate, toFilterDateString } from '../../utils/filterHelpers';

export interface PruningRequestFilterValue {
  status?: PruningRequestStatus | '';
  fromDate?: string; // ISO YYYY-MM-DD
  toDate?: string;
  districtId?: string;
  // May 2026 — admin filter UX
  referenceCode?: string;
  requesterName?: string;
}

interface PruningRequestFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: PruningRequestFilterValue;
  onApplyFilters: (filters: PruningRequestFilterValue) => void;
  onResetFilters: () => void;
  userRole?: UserRole;
  userDistrictId?: string;
}

export function PruningRequestFilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  userRole,
  userDistrictId,
}: PruningRequestFilterModalProps): React.JSX.Element {
  const { t } = useTranslation('pruning');

  const STATUS_OPTIONS: Array<{ label: string; value: PruningRequestStatus | 'all' }> = useMemo(
    () => [
      { label: t('filter.statusOptions.all'), value: 'all' },
      { label: t('filter.statusOptions.submitted'), value: 'submitted' },
      { label: t('filter.statusOptions.under_review'), value: 'under_review' },
      { label: t('filter.statusOptions.approved'), value: 'approved' },
      { label: t('filter.statusOptions.rejected'), value: 'rejected' },
      { label: t('filter.statusOptions.assigned'), value: 'assigned' },
      { label: t('filter.statusOptions.in_progress'), value: 'in_progress' },
      { label: t('filter.statusOptions.done'), value: 'done' },
      { label: t('filter.statusOptions.cancelled'), value: 'cancelled' },
    ],
    [t],
  );

  // staff_kecamatan only sees their own submissions, so district picker is hidden.
  // admin_rayon is district-locked to their own district (backend forces it anyway).
  // management / admin_system / superadmin can pick any district.
  const showDistrict = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_rayon' ||
          userRole === 'management' || userRole === 'admin_system' ||
          userRole === 'superadmin',
    [userRole],
  );
  const isDistrictFixed = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_rayon',
    [userRole],
  );
  const canSelectDistrict = useMemo(
    () => userRole === 'management' || userRole === 'admin_system' ||
          userRole === 'superadmin',
    [userRole],
  );

  const [localStatus, setLocalStatus] = useState<string>(filters.status ?? '');
  const [localFromDate, setLocalFromDate] = useState<string>(filters.fromDate ?? '');
  const [localToDate, setLocalToDate] = useState<string>(filters.toDate ?? '');
  const [localDistrictId, setLocalDistrictId] = useState<string>(filters.districtId ?? '');
  const [localReferenceCode, setLocalReferenceCode] = useState<string>(filters.referenceCode ?? '');
  const [localRequesterName, setLocalRequesterName] = useState<string>(filters.requesterName ?? '');

  const [districts, setDistricts] = useState<District[]>([]);
  const [loadingDistricts, setLoadingDistricts] = useState(false);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalFromDate(filters.fromDate ?? '');
      setLocalToDate(filters.toDate ?? '');
      setLocalDistrictId(filters.districtId ?? '');
      setLocalReferenceCode(filters.referenceCode ?? '');
      setLocalRequesterName(filters.requesterName ?? '');
    }
  }, [visible, filters]);

  // Load districts for users who can select them
  useEffect(() => {
    if (!visible || !canSelectDistrict) { return; }
    let cancelled = false;
    setLoadingDistricts(true);
    getDistricts()
      .then((res) => { if (!cancelled && res.data) { setDistricts(res.data); } })
      .catch(() => { /* non-critical */ })
      .finally(() => { if (!cancelled) { setLoadingDistricts(false); } });
    return () => { cancelled = true; };
  }, [visible, canSelectDistrict]);

  const handleApply = useCallback(() => {
    const applied: PruningRequestFilterValue = {};
    if (localStatus) { applied.status = localStatus as PruningRequestStatus; }
    if (localFromDate) { applied.fromDate = localFromDate; }
    if (localToDate) { applied.toDate = localToDate; }
    if (localDistrictId) { applied.districtId = localDistrictId; }
    if (localReferenceCode.trim()) { applied.referenceCode = localReferenceCode.trim(); }
    if (localRequesterName.trim()) { applied.requesterName = localRequesterName.trim(); }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localFromDate, localToDate, localDistrictId, localReferenceCode, localRequesterName, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalFromDate('');
    setLocalToDate('');
    setLocalDistrictId('');
    setLocalReferenceCode('');
    setLocalRequesterName('');
    onResetFilters();
    onClose();
  }, [onResetFilters, onClose]);

  const dateFromParsed = parseFilterDate(localFromDate);
  const dateToParsed = parseFilterDate(localToDate);

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
      {/* 0. Pencarian */}
      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.referenceCodeLabel')}</NBText>
        <NBTextInput
          placeholder={t('filter.requestCodePlaceholder')}
          value={localReferenceCode}
          onChangeText={setLocalReferenceCode}
          autoCapitalize="characters"
        />
      </View>
      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.requesterNameLabel')}</NBText>
        <NBTextInput
          placeholder={t('filter.requesterNamePlaceholder')}
          value={localRequesterName}
          onChangeText={setLocalRequesterName}
        />
      </View>

      {/* 1. Status */}
      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.status')}</NBText>
        <NBSelect
          value={localStatus || 'all'}
          onValueChange={(v) => setLocalStatus(v === 'all' ? '' : String(v))}
          options={STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
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
              onChange={(date) => setLocalFromDate(toFilterDateString(date))}
              label={t('filter.dateFrom')}
              maximumDate={dateToParsed ?? undefined}
            />
          </View>
          <NBText variant="body" color="gray500" style={styles.dateSeparator}>→</NBText>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateToParsed}
              onChange={(date) => setLocalToDate(toFilterDateString(date))}
              label={t('filter.dateTo')}
              minimumDate={dateFromParsed ?? undefined}
            />
          </View>
        </View>
      </View>

      {/* 3. Rayon — admin roles only */}
      {showDistrict && (
        <View style={styles.filterSection}>
          <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>{t('filter.district')}</NBText>
          {isDistrictFixed ? (
            <NBSelect
              value={userDistrictId ?? 'all'}
              onValueChange={() => {}}
              options={[
                { label: userDistrictId ? t('filter.districtMine') : t('filter.districtAll'), value: userDistrictId ?? 'all' },
              ]}
              disabled
            />
          ) : (
            <NBSelect
              value={localDistrictId || 'all'}
              onValueChange={(v) => setLocalDistrictId(v === 'all' ? '' : String(v))}
              options={[
                { label: t('filter.districtAll'), value: 'all' },
                ...districts.map((r) => ({ label: r.name, value: r.id })),
              ]}
              disabled={loadingDistricts}
              searchable
            />
          )}
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
    marginBottom: nbSpacing.xs + 2,
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
