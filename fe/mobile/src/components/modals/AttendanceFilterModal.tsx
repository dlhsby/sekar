/**
 * AttendanceFilterModal — status + date-range filter for the Kehadiran list.
 * The personal-list subset of OvertimeFilterModal (no rayon/area/user).
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';

import { NBSelect, NBDatePicker, NBModal, NBText } from '../nb';
import { nbColors, nbSpacing, nbBorders } from '../../constants/nbTokens';
import type { AttendanceFilter } from '../../types/api.types';
import { parseFilterDate, toFilterDateString } from '../../utils/filterHelpers';

/** The filter fields this modal owns (sort + pagination live on the screen). */
export type AttendanceFilterFields = Pick<AttendanceFilter, 'from_date' | 'to_date' | 'status'>;

interface AttendanceFilterModalProps {
  visible: boolean;
  onClose: () => void;
  filters: AttendanceFilterFields;
  onApplyFilters: (filters: AttendanceFilterFields) => void;
  onResetFilters: () => void;
}

const STATUS_OPTIONS = [
  { label: 'Semua Status', value: 'all' },
  { label: 'Terlambat', value: 'late' },
  { label: 'Tepat Waktu', value: 'on_time' },
  { label: 'Sedang Berlangsung', value: 'active' },
];

export function AttendanceFilterModal({
  visible,
  onClose,
  filters,
  onApplyFilters,
  onResetFilters,
}: AttendanceFilterModalProps): React.JSX.Element {
  const [localStatus, setLocalStatus] = useState<string>(filters.status ?? '');
  const [localDateFrom, setLocalDateFrom] = useState(filters.from_date ?? '');
  const [localDateTo, setLocalDateTo] = useState(filters.to_date ?? '');

  useEffect(() => {
    if (visible) {
      setLocalStatus(filters.status ?? '');
      setLocalDateFrom(filters.from_date ?? '');
      setLocalDateTo(filters.to_date ?? '');
    }
  }, [visible, filters]);

  const handleApply = useCallback(() => {
    const applied: AttendanceFilterFields = {};
    if (localStatus) { applied.status = localStatus as AttendanceFilterFields['status']; }
    if (localDateFrom) { applied.from_date = localDateFrom; }
    if (localDateTo) { applied.to_date = localDateTo; }
    onApplyFilters(applied);
    onClose();
  }, [localStatus, localDateFrom, localDateTo, onApplyFilters, onClose]);

  const handleReset = useCallback(() => {
    setLocalStatus('');
    setLocalDateFrom('');
    setLocalDateTo('');
    onResetFilters();
    onClose();
  }, [onResetFilters, onClose]);

  const dateFromParsed = parseFilterDate(localDateFrom);
  const dateToParsed = parseFilterDate(localDateTo);

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Filter Kehadiran"
      footer={
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.actionButton, styles.resetButton]}
            onPress={handleReset}
            accessibilityRole="button"
          >
            <NBText variant="body-sm" color="black" style={styles.actionButtonText}>Reset</NBText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.applyButton]}
            onPress={handleApply}
            accessibilityRole="button"
          >
            <NBText variant="body-sm" color="white" style={styles.actionButtonText}>Terapkan</NBText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>Status</NBText>
        <NBSelect
          value={localStatus || 'all'}
          onValueChange={(v) => setLocalStatus(v === 'all' ? '' : String(v))}
          options={STATUS_OPTIONS}
        />
      </View>

      <View style={styles.filterSection}>
        <NBText variant="mono-sm" color="gray700" uppercase style={styles.filterLabel}>Rentang Tanggal</NBText>
        <View style={styles.dateRangeRow}>
          <View style={styles.dateButtonHalf}>
            <NBDatePicker
              value={dateFromParsed}
              onChange={(date) => setLocalDateFrom(toFilterDateString(date))}
              label="Dari"
              maximumDate={dateToParsed ?? undefined}
            />
          </View>
          <NBText variant="body" color="gray500" style={styles.dateSeparator}>→</NBText>
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
