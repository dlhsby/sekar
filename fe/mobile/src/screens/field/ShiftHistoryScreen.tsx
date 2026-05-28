import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { NBEmptyState, NBBackgroundPattern, NBText, NBDatePicker, NBModal } from '../../components/nb';
import { ShiftDetailModal } from '../../components/modals/ShiftDetailModal';
import { getMyShifts } from '../../services/api/shiftsApi';
import { formatTime } from '../../utils/dateUtils';
import {
  nbColors,
  nbSpacing,
  nbRadius,
  nbShadows,
  nbBorders,
} from '../../constants/nbTokens';
import type { CurrentShiftResponse } from '../../types/api.types';
import type { Shift } from '../../types/models.types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function calculateDuration(
  startTime: string,
  endTime: string | null | undefined,
): { hours: number; minutes: number; formatted: string } {
  if (!endTime) {
    return { hours: 0, minutes: 0, formatted: '—' };
  }
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const diffMs = end - start;
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  if (hours > 0) {
    return { hours, minutes, formatted: `${hours}j ${minutes}m` };
  }
  return { hours, minutes, formatted: `${minutes}m` };
}

const MONTH_NAMES_ID = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const MONTH_NAMES_ID_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

function formatShortDate(d: Date): string {
  return `${d.getDate()} ${MONTH_NAMES_ID_SHORT[d.getMonth()]}`;
}

function getThisWeekRange(): { start: Date; end: Date } {
  const now = new Date();
  const dayOfWeek = now.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - daysFromMonday);
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return { start, end };
}

function monthKey(dateString: string): string {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split('-');
  return `${MONTH_NAMES_ID[parseInt(month, 10) - 1]} ${year}`;
}

function groupShiftsByMonth(
  shifts: CurrentShiftResponse[],
): { monthKey: string; shifts: CurrentShiftResponse[] }[] {
  const grouped: { [key: string]: CurrentShiftResponse[] } = {};
  shifts.forEach((shift) => {
    const key = monthKey(shift.clock_in_time);
    if (!grouped[key]) { grouped[key] = []; }
    grouped[key].push(shift);
  });
  return Object.keys(grouped)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => ({ monthKey: key, shifts: grouped[key] }));
}

// ─── ShiftFilterModal ─────────────────────────────────────────────────────────

interface DateRange { from: Date | null; to: Date | null }

function ShiftFilterModal({
  visible,
  onClose,
  value,
  onApply,
}: {
  visible: boolean;
  onClose: () => void;
  value: DateRange;
  onApply: (range: DateRange) => void;
}): React.JSX.Element {
  const [localFrom, setLocalFrom] = useState<Date | null>(value.from);
  const [localTo, setLocalTo] = useState<Date | null>(value.to);

  useEffect(() => {
    if (visible) {
      setLocalFrom(value.from);
      setLocalTo(value.to);
    }
  }, [visible, value.from, value.to]);

  const handleApply = useCallback(() => {
    onApply({ from: localFrom, to: localTo });
    onClose();
  }, [localFrom, localTo, onApply, onClose]);

  const handleReset = useCallback(() => {
    const { start, end } = getThisWeekRange();
    onApply({ from: start, to: end });
    onClose();
  }, [onApply, onClose]);

  return (
    <NBModal
      visible={visible}
      onClose={onClose}
      title="Filter Riwayat Shift"
      autoSize
      footer={
        <View style={modalStyles.footer}>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.resetBtn]}
            onPress={handleReset}
            accessibilityRole="button"
          >
            <NBText variant="body-sm" color="black" style={modalStyles.footerBtnText}>Minggu ini</NBText>
          </TouchableOpacity>
          <TouchableOpacity
            style={[modalStyles.footerBtn, modalStyles.applyBtn]}
            onPress={handleApply}
            accessibilityRole="button"
          >
            <NBText variant="body-sm" color="white" style={modalStyles.footerBtnText}>Terapkan</NBText>
          </TouchableOpacity>
        </View>
      }
    >
      <View style={modalStyles.section}>
        <NBText variant="mono-sm" color="gray700" uppercase style={modalStyles.sectionLabel}>Rentang Tanggal</NBText>
        <View style={modalStyles.dateRow}>
          <View style={modalStyles.datePart}>
            <NBDatePicker
              value={localFrom}
              onChange={setLocalFrom}
              label="Dari"
              maximumDate={localTo ?? new Date()}
            />
          </View>
          <NBText variant="body" color="gray500" style={modalStyles.dateSep}>→</NBText>
          <View style={modalStyles.datePart}>
            <NBDatePicker
              value={localTo}
              onChange={setLocalTo}
              label="Sampai"
              minimumDate={localFrom ?? undefined}
              maximumDate={new Date()}
            />
          </View>
        </View>
      </View>
    </NBModal>
  );
}

const modalStyles = StyleSheet.create({
  section: {
    marginBottom: nbSpacing.md,
  },
  sectionLabel: {
    letterSpacing: 0.5,
    marginBottom: nbSpacing.sm,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  datePart: {
    flex: 1,
  },
  dateSep: {
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  footerBtn: {
    flex: 1,
    paddingVertical: nbSpacing.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 46,
  },
  resetBtn: {
    backgroundColor: nbColors.white,
  },
  applyBtn: {
    backgroundColor: nbColors.primary,
  },
  footerBtnText: {
    fontWeight: '600',
  },
});

// ─── MonthHeader ──────────────────────────────────────────────────────────────

function MonthHeader({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={styles.dateHeader}>
      <MaterialCommunityIcons
        name="calendar-month"
        size={16}
        color={nbColors.gray500}
        style={styles.dateIcon}
      />
      <NBText variant="h3" color="gray700">{label}</NBText>
    </View>
  );
}

// ─── ShiftRow ─────────────────────────────────────────────────────────────────

function ShiftRow({
  shift,
  onPress,
}: {
  shift: CurrentShiftResponse;
  onPress: () => void;
}): React.JSX.Element {
  const isActive = !shift.clock_out_time;
  const dur = calculateDuration(shift.clock_in_time, shift.clock_out_time);
  const clockInDate = formatShortDate(new Date(shift.clock_in_time));
  const clockOutDate = shift.clock_out_time
    ? formatShortDate(new Date(shift.clock_out_time))
    : null;

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      accessibilityRole="button"
      accessibilityLabel={`Detail shift ${shift.area?.name ?? ''}`}
      accessibilityHint="Ketuk untuk melihat detail shift"
    >
      <View style={styles.shiftRow}>
        <View style={styles.shiftRowHeader}>
          <View style={styles.shiftRowAreaInfo}>
            <NBText variant="body" color="gray700" style={styles.semibold} numberOfLines={1}>
              {shift.area?.name ?? 'Area tidak diketahui'}
            </NBText>
            {shift.area?.area_type?.name ? (
              <NBText variant="body-sm" color="gray500">
                {shift.area.area_type.name}
              </NBText>
            ) : null}
          </View>
          <View style={[styles.shiftStatusBadge, isActive ? styles.shiftStatusActive : styles.shiftStatusDone]}>
            <NBText
              variant="mono-sm"
              color={isActive ? 'white' : 'gray600'}
              uppercase
              style={styles.shiftStatusText}
            >
              {isActive ? 'AKTIF' : 'SELESAI'}
            </NBText>
          </View>
        </View>

        <View style={styles.shiftTimeGrid}>
          <View style={styles.shiftTimeCell}>
            <MaterialCommunityIcons
              name="login"
              size={16}
              color={nbColors.success}
              style={styles.shiftTimeIcon}
            />
            <NBText variant="mono-sm" color="gray600" style={styles.shiftTimeLabel}>CLOCK IN</NBText>
            <NBText variant="body-sm" color="gray500">{clockInDate}</NBText>
            <NBText variant="body-sm" color="gray700" style={styles.semibold}>
              {formatTime(shift.clock_in_time)}
            </NBText>
          </View>

          <View style={styles.shiftTimeDivider} />

          <View style={styles.shiftTimeCell}>
            <MaterialCommunityIcons
              name="logout"
              size={16}
              color={isActive ? nbColors.gray500 : nbColors.danger}
              style={styles.shiftTimeIcon}
            />
            <NBText variant="mono-sm" color="gray600" style={styles.shiftTimeLabel}>CLOCK OUT</NBText>
            <NBText variant="body-sm" color={clockOutDate ? 'gray500' : 'gray400'}>
              {clockOutDate ?? '—'}
            </NBText>
            <NBText
              variant="body-sm"
              color={isActive ? 'gray400' : 'gray700'}
              style={styles.semibold}
            >
              {shift.clock_out_time ? formatTime(shift.clock_out_time) : '--:--'}
            </NBText>
          </View>

          <View style={styles.shiftTimeDivider} />

          <View style={styles.shiftTimeCell}>
            <MaterialCommunityIcons
              name="timer-outline"
              size={16}
              color={nbColors.primary}
              style={styles.shiftTimeIcon}
            />
            <NBText variant="mono-sm" color="gray600" style={styles.shiftTimeLabel}>DURASI</NBText>
            <NBText variant="body-sm" color="gray400" style={styles.invisible}>·</NBText>
            <NBText variant="body-sm" color="successDark" style={styles.semibold}>
              {dur.formatted}
            </NBText>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ShiftHistoryScreen(): React.JSX.Element {
  const { start: initStart, end: initEnd } = getThisWeekRange();

  const [shifts, setShifts] = useState<CurrentShiftResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [dateFrom, setDateFrom] = useState<Date | null>(initStart);
  const [dateTo, setDateTo] = useState<Date | null>(initEnd);

  const filterRange: DateRange = useMemo(
    () => ({ from: dateFrom, to: dateTo }),
    [dateFrom, dateTo],
  );

  const filteredShifts = useMemo(() => {
    if (!dateFrom && !dateTo) { return shifts; }
    const fromTs = dateFrom
      ? new Date(dateFrom.getFullYear(), dateFrom.getMonth(), dateFrom.getDate()).getTime()
      : 0;
    const toTs = dateTo
      ? new Date(dateTo.getFullYear(), dateTo.getMonth(), dateTo.getDate(), 23, 59, 59, 999).getTime()
      : Infinity;
    return shifts.filter(s => {
      const t = new Date(s.clock_in_time).getTime();
      return t >= fromTs && t <= toTs;
    });
  }, [shifts, dateFrom, dateTo]);

  const groupedFilteredShifts = useMemo(
    () => groupShiftsByMonth(filteredShifts),
    [filteredShifts],
  );

  const totalHours = useMemo(
    () => filteredShifts.reduce((acc, shift) => {
      if (!shift.clock_out_time) { return acc; }
      const dur = calculateDuration(shift.clock_in_time, shift.clock_out_time);
      return acc + dur.hours + dur.minutes / 60;
    }, 0),
    [filteredShifts],
  );

  const filterLabel = useMemo(() => {
    if (!dateFrom && !dateTo) { return 'Semua Shift'; }
    const fromStr = dateFrom ? formatShortDate(dateFrom) : '…';
    const toStr = dateTo ? formatShortDate(dateTo) : '…';
    return `${fromStr} → ${toStr}`;
  }, [dateFrom, dateTo]);

  const isFiltered = dateFrom !== null || dateTo !== null;

  const handleApplyFilter = useCallback((range: DateRange) => {
    setDateFrom(range.from);
    setDateTo(range.to);
  }, []);

  const handleClearFilter = useCallback(() => {
    const { start, end } = getThisWeekRange();
    setDateFrom(start);
    setDateTo(end);
  }, []);

  const loadShifts = useCallback(async () => {
    try {
      setError(null);
      const response = await getMyShifts();
      if (response.error) {
        setError(response.error);
        return;
      }
      if (response.data) {
        const sortedShifts = [...response.data].sort(
          (a, b) =>
            new Date(b.clock_in_time).getTime() -
            new Date(a.clock_in_time).getTime(),
        );
        setShifts(sortedShifts);
      }
    } catch (err: any) {
      setError(err.message || 'Gagal memuat riwayat shift');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadShifts();
    setIsRefreshing(false);
  }, [loadShifts]);

  useEffect(() => {
    loadShifts();
  }, [loadShifts]);

  const renderItem = useCallback(({
    item,
  }: {
    item: { monthKey: string; shifts: CurrentShiftResponse[] };
  }) => (
    <View>
      <MonthHeader label={monthLabel(item.monthKey)} />
      {item.shifts.map((shift) => (
        <ShiftRow
          key={shift.id}
          shift={shift}
          onPress={() => setSelectedShift(shift)}
        />
      ))}
    </View>
  ), []);

  if (isLoading) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray600" style={styles.loadingText}>
            Memuat riwayat shift...
          </NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (error) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.container}>
          <NBEmptyState
            variant="error"
            title="Gagal Memuat Data"
            description={error}
            ctaLabel="Coba Lagi"
            onCTA={loadShifts}
            testID="shift-history-error"
          />
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        {/* Filter Bar */}
        <View style={[styles.filterBarCollapsed, isFiltered && styles.filterBarActive]}>
          <View style={styles.filterBarLeft}>
            {isFiltered ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.miniChipsContent}
              >
                <View style={[styles.miniChip, styles.miniChipDate]}>
                  <NBText variant="caption" color="black" style={styles.miniChipText}>{filterLabel}</NBText>
                </View>
              </ScrollView>
            ) : (
              <NBText variant="body-sm" color="gray400" style={styles.filterBarPlaceholder}>Semua Shift</NBText>
            )}
            {isFiltered && (
              <TouchableOpacity
                style={styles.filterClearButton}
                onPress={handleClearFilter}
                accessibilityRole="button"
                accessibilityLabel="Reset filter tanggal"
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.danger} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterBarRight}>
            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={() => setIsFilterOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Filter tanggal${isFiltered ? ', filter aktif' : ''}`}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={22}
                color={isFiltered ? nbColors.primary : nbColors.black}
              />
              {isFiltered && (
                <View style={styles.filterBadge}>
                  <NBText variant="caption" color="white" style={styles.filterBadgeText}>1</NBText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryItem}>
            <NBText variant="display" color="primary">{filteredShifts.length}</NBText>
            <NBText variant="caption" color="gray600" style={styles.summaryLabel}>TOTAL SHIFT</NBText>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <NBText variant="display" color="primary">{totalHours.toFixed(1)}</NBText>
            <NBText variant="caption" color="gray600" style={styles.summaryLabel}>TOTAL JAM</NBText>
          </View>
        </View>

        {/* Shift list */}
        <FlatList
          data={groupedFilteredShifts}
          renderItem={renderItem}
          keyExtractor={(item) => item.monthKey}
          contentContainerStyle={styles.listContent}
          removeClippedSubviews
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          windowSize={10}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              colors={[nbColors.primary]}
              tintColor={nbColors.primary}
            />
          }
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <NBEmptyState
              variant="noData"
              title={shifts.length === 0 ? 'Belum Ada Riwayat Shift' : 'Tidak Ada Shift'}
              description={
                shifts.length === 0
                  ? 'Riwayat shift Anda akan muncul di sini setelah Anda menyelesaikan shift'
                  : 'Tidak ada shift dalam rentang tanggal yang dipilih'
              }
              testID="shift-history-empty"
            />
          }
        />

        <ShiftFilterModal
          visible={isFilterOpen}
          onClose={() => setIsFilterOpen(false)}
          value={filterRange}
          onApply={handleApplyFilter}
        />

        <ShiftDetailModal
          visible={selectedShift !== null}
          onClose={() => setSelectedShift(null)}
          shift={selectedShift}
        />
      </View>
    </NBBackgroundPattern>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },

  // Filter bar (mirrors OvertimeListScreen filterBarCollapsed pattern)
  filterBarCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderTopWidth: nbBorders.widthBase,
    borderTopColor: nbColors.gray300,
    borderBottomWidth: nbBorders.widthBase,
    borderBottomColor: nbColors.gray300,
    minHeight: 48,
  },
  filterBarActive: {
    borderTopColor: nbColors.primary,
    borderBottomColor: nbColors.primary,
  },
  filterBarLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  filterBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: nbSpacing.xs,
  },
  filterBarPlaceholder: {
    fontStyle: 'italic',
  },
  miniChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  miniChip: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.sm,
    height: 32,
    justifyContent: 'center',
  },
  miniChipDate: { backgroundColor: nbColors.warning },
  miniChipText: {},
  filterClearButton: {
    padding: nbSpacing.xs,
    marginLeft: nbSpacing.xs,
  },
  filterIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: nbSpacing.xs,
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: nbColors.danger,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {},

  // Summary card
  summaryCard: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: nbColors.white,
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.sm,
    marginBottom: nbSpacing.xs,
    paddingVertical: nbSpacing.sm,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  summaryItem: {
    flex: 1,
    alignItems: 'center',
  },
  summaryDivider: {
    width: nbBorders.widthBase,
    height: 40,
    backgroundColor: nbColors.black,
  },
  summaryLabel: {
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // List
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.xl,
    flexGrow: 1,
  },

  // Month header
  dateHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: nbSpacing.sm,
    paddingBottom: nbSpacing.xs,
    paddingHorizontal: nbSpacing.xs,
  },
  dateIcon: {
    marginRight: nbSpacing.sm,
  },

  // ShiftRow
  shiftRow: {
    backgroundColor: nbColors.white,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    marginBottom: nbSpacing.sm,
    padding: nbSpacing.sm,
    ...nbShadows.sm,
  },
  shiftRowHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: nbSpacing.sm,
  },
  shiftRowAreaInfo: {
    flex: 1,
    marginRight: nbSpacing.sm,
  },
  semibold: {
    fontWeight: '600',
  },
  shiftStatusBadge: {
    width: 72,
    paddingVertical: 3,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    alignItems: 'center',
  },
  shiftStatusActive: {
    backgroundColor: nbColors.success,
  },
  shiftStatusDone: {
    backgroundColor: nbColors.gray200,
  },
  shiftStatusText: {
    letterSpacing: 0.5,
  },
  shiftTimeGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  shiftTimeCell: {
    flex: 1,
    gap: 1,
  },
  shiftTimeIcon: {
    marginBottom: 2,
  },
  shiftTimeLabel: {
    letterSpacing: 0.5,
  },
  shiftTimeDivider: {
    width: nbBorders.widthBase,
    height: 56,
    backgroundColor: nbColors.gray200,
    marginHorizontal: nbSpacing.sm,
  },
  invisible: {
    opacity: 0,
  },
});

export default ShiftHistoryScreen;
