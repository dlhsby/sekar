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
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

import { NBSelect, NBDatePicker, NBModal, NBTextInput } from '../nb';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
} from '../../constants/nbTokens';
import { getRayons } from '../../services/api';
import type { PruningRequestStatus, Rayon, UserRole } from '../../types/models.types';
import { parseFilterDate, toFilterDateString } from '../../utils/filterHelpers';

export interface PruningRequestFilterValue {
  status?: PruningRequestStatus | '';
  fromDate?: string; // ISO YYYY-MM-DD
  toDate?: string;
  rayonId?: string;
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
  userRayonId?: string;
}

const STATUS_OPTIONS: Array<{ label: string; value: PruningRequestStatus | 'all' }> = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Menunggu',    value: 'submitted' },
  { label: 'Direview',    value: 'under_review' },
  { label: 'Disetujui',   value: 'approved' },
  { label: 'Ditolak',     value: 'rejected' },
  { label: 'Ditugaskan',  value: 'assigned' },
  { label: 'Diproses',    value: 'in_progress' },
  { label: 'Selesai',     value: 'done' },
  { label: 'Dibatalkan',  value: 'cancelled' },
];

export function PruningRequestFilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
  userRole,
  userRayonId,
}: PruningRequestFilterModalProps): React.JSX.Element {
  // staff_kecamatan only sees their own submissions, so rayon picker is hidden.
  // admin_data is rayon-locked to their own rayon (backend forces it anyway).
  // top_management / admin_system / superadmin can pick any rayon.
  const showRayon = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_data' ||
          userRole === 'top_management' || userRole === 'admin_system' ||
          userRole === 'superadmin',
    [userRole],
  );
  const isRayonFixed = useMemo(
    () => userRole === 'kepala_rayon' || userRole === 'admin_data',
    [userRole],
  );
  const canSelectRayon = useMemo(
    () => userRole === 'top_management' || userRole === 'admin_system' ||
          userRole === 'superadmin',
    [userRole],
  );

  const [localStatus, setLocalStatus] = useState<string>(filters.status ?? '');
  const [localFromDate, setLocalFromDate] = useState<string>(filters.fromDate ?? '');
  const [localToDate, setLocalToDate] = useState<string>(filters.toDate ?? '');
  const [localRayonId, setLocalRayonId] = useState<string>(filters.rayonId ?? '');
  const [localReferenceCode, setLocalReferenceCode] = useState<string>(filters.referenceCode ?? '');
  const [localRequesterName, setLocalRequesterName] = useState<string>(filters.requesterName ?? '');

  const [rayons, setRayons] = useState<Rayon[]>([]);
  const [loadingRayons, setLoadingRayons] = useState(false);

  // Sync local state when modal opens
  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalFromDate(filters.fromDate ?? '');
      setLocalToDate(filters.toDate ?? '');
      setLocalRayonId(filters.rayonId ?? '');
      setLocalReferenceCode(filters.referenceCode ?? '');
      setLocalRequesterName(filters.requesterName ?? '');
    }
  }, [visible, filters]);

  // Load rayons for users who can select them
  useEffect(() => {
    if (!visible || !canSelectRayon) { return; }
    let cancelled = false;
    setLoadingRayons(true);
    getRayons()
      .then((res) => { if (!cancelled && res.data) { setRayons(res.data); } })
      .catch(() => { /* non-critical */ })
      .finally(() => { if (!cancelled) { setLoadingRayons(false); } });
    return () => { cancelled = true; };
  }, [visible, canSelectRayon]);

  const handleApply = useCallback(() => {
    const applied: PruningRequestFilterValue = {};
    if (localStatus) { applied.status = localStatus as PruningRequestStatus; }
    if (localFromDate) { applied.fromDate = localFromDate; }
    if (localToDate) { applied.toDate = localToDate; }
    if (localRayonId) { applied.rayonId = localRayonId; }
    if (localReferenceCode.trim()) { applied.referenceCode = localReferenceCode.trim(); }
    if (localRequesterName.trim()) { applied.requesterName = localRequesterName.trim(); }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localFromDate, localToDate, localRayonId, localReferenceCode, localRequesterName, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalFromDate('');
    setLocalToDate('');
    setLocalRayonId('');
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
      title="Filter Permohonan"
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
      {/* 0. Pencarian */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Nomor Permohonan</Text>
        <NBTextInput
          placeholder="Contoh: PR-2026-..."
          value={localReferenceCode}
          onChangeText={setLocalReferenceCode}
          autoCapitalize="characters"
        />
      </View>
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Nama Pemohon</Text>
        <NBTextInput
          placeholder="Contoh: Budi"
          value={localRequesterName}
          onChangeText={setLocalRequesterName}
        />
      </View>

      {/* 1. Status */}
      <View style={styles.filterSection}>
        <Text style={styles.filterLabel}>Status</Text>
        <NBSelect
          value={localStatus || 'all'}
          onValueChange={(v) => setLocalStatus(v === 'all' ? '' : String(v))}
          options={STATUS_OPTIONS.map((o) => ({ label: o.label, value: o.value }))}
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
              onChange={(date) => setLocalFromDate(toFilterDateString(date))}
              label="Dari"
              maximumDate={dateToParsed ?? undefined}
            />
          </View>
          <Text style={styles.dateSeparator}>→</Text>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateToParsed}
              onChange={(date) => setLocalToDate(toFilterDateString(date))}
              label="Sampai"
              minimumDate={dateFromParsed ?? undefined}
            />
          </View>
        </View>
      </View>

      {/* 3. Rayon — admin roles only */}
      {showRayon && (
        <View style={styles.filterSection}>
          <Text style={styles.filterLabel}>Rayon</Text>
          {isRayonFixed ? (
            <NBSelect
              value={userRayonId ?? 'all'}
              onValueChange={() => {}}
              options={[
                { label: userRayonId ? 'Rayon Saya' : 'Semua Rayon', value: userRayonId ?? 'all' },
              ]}
              disabled
            />
          ) : (
            <NBSelect
              value={localRayonId || 'all'}
              onValueChange={(v) => setLocalRayonId(v === 'all' ? '' : String(v))}
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
