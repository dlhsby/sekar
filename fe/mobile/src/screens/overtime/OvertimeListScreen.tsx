/**
 * Overtime List Screen
 * Phase 2C: Single list with filter bar + sort + FAB pattern
 * Title/filter bar/card style matches TasksActivityScreen standard.
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { NBBackgroundPattern, NBButton, NBEmptyState, NBText } from '../../components/nb';
import { SortModal, OvertimeFilterModal } from '../../components/modals';
import { OvertimeCard } from './components/OvertimeCard';
import { getOvertimeStatusLabel } from '../../utils/statusHelpers';
import { getMyOvertimes, getOvertimes } from '../../services/api/overtimeApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useAppSelector } from '../../store/hooks';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import type { OvertimeFilter } from '../../types/api.types';
import type { Overtime } from '../../types/models.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const OVERTIME_PAGE_LIMIT = 10;

const SORT_OPTIONS = [
  { key: 'start_desc', label: 'Tanggal Terbaru' },
  { key: 'start_asc', label: 'Tanggal Terlama' },
  { key: 'created_at_desc', label: 'Dibuat Terbaru' },
  { key: 'created_at_asc', label: 'Dibuat Terlama' },
];

type SortKey = 'start_desc' | 'start_asc' | 'created_at_desc' | 'created_at_asc';

function sortToParams(sort: SortKey): Pick<OvertimeFilter, 'sort_by' | 'sort_dir'> {
  switch (sort) {
    case 'start_asc': return { sort_by: 'start_datetime', sort_dir: 'asc' };
    case 'created_at_desc': return { sort_by: 'created_at', sort_dir: 'desc' };
    case 'created_at_asc': return { sort_by: 'created_at', sort_dir: 'asc' };
    default: return { sort_by: 'start_datetime', sort_dir: 'desc' };
  }
}

// ─── Screen ───────────────────────────────────────────────────────────────────

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Overtime'>;
  route: RouteProp<MainTabParamList, 'Overtime'>;
};

export function OvertimeListScreen({ navigation }: Props): React.JSX.Element {
  const { canSubmitOvertime, canApproveOvertime } = useRoleAccess();
  const user = useAppSelector((state) => state.auth.user);
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  // List state
  const [allOvertimes, setAllOvertimes] = useState<Overtime[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filter & sort state
  const [filters, setFilters] = useState<OvertimeFilter>({});
  const [sort, setSort] = useState<SortKey>('start_desc');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  // Dedup in-flight requests
  const isFetching = useRef(false);
  const pendingFetch = useRef<{ page: number; reset: boolean } | null>(null);

  // Active filter count (status, date range, rayon, area, user each count as 1)
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) { count++; }
    if (filters.from_date || filters.to_date) { count++; }
    if (filters.rayon_id) { count++; }
    if (filters.area_id) { count++; }
    if (filters.user_id) { count++; }
    return count;
  }, [filters]);

  // Filter chips — colored like TasksActivityScreen
  const filterChips = useMemo(() => {
    const chips: { text: string; chipStyle: 'status' | 'date' | 'location' | 'assignment' }[] = [];
    if (filters.status) {
      chips.push({ text: getOvertimeStatusLabel(filters.status), chipStyle: 'status' });
    }
    if (filters.from_date || filters.to_date) {
      const f = filters.from_date;
      const t = filters.to_date;
      chips.push({ text: f && t ? `${f.slice(5)} — ${t.slice(5)}` : 'Tanggal', chipStyle: 'date' });
    }
    if (filters.rayon_id) { chips.push({ text: 'Rayon', chipStyle: 'location' }); }
    if (filters.area_id) { chips.push({ text: 'Area', chipStyle: 'location' }); }
    if (filters.user_id) { chips.push({ text: 'Petugas', chipStyle: 'assignment' }); }
    return chips;
  }, [filters]);

  const buildParams = useCallback((p: number): OvertimeFilter => ({
    ...filters,
    ...sortToParams(sort),
    page: p,
    limit: OVERTIME_PAGE_LIMIT,
  }), [filters, sort]);

  const fetchOvertimes = useCallback(async (p: number, reset: boolean) => {
    if (isFetching.current) {
      pendingFetch.current = { page: p, reset };
      return;
    }
    isFetching.current = true;

    try {
      if (reset) {
        setLoading(true);
        setError(null);
      } else {
        setIsLoadingMore(true);
      }

      const params = buildParams(p);
      const response = canApproveOvertime
        ? await getOvertimes(params)
        : await getMyOvertimes(params);

      if (response.error) {
        setError(response.error);
        return;
      }

      const data = response.data?.data ?? [];
      const total = response.data?.meta.total ?? 0;

      setAllOvertimes((prev) => {
        if (reset) { return data; }
        const existingIds = new Set(prev.map((o) => o.id));
        return [...prev, ...data.filter((o: Overtime) => !existingIds.has(o.id))];
      });
      setPage(p);
      setHasMore(p * OVERTIME_PAGE_LIMIT < total);
    } catch {
      setError('Gagal memuat data lembur');
    } finally {
      isFetching.current = false;
      setLoading(false);
      setIsLoadingMore(false);
      if (pendingFetch.current) {
        const { page: pendingPage, reset: pendingReset } = pendingFetch.current;
        pendingFetch.current = null;
        fetchOvertimes(pendingPage, pendingReset);
      }
    }
  }, [buildParams, canApproveOvertime]);

  useFocusEffect(
    useCallback(() => { fetchOvertimes(1, true); }, [fetchOvertimes]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try { await fetchOvertimes(1, true); } finally { setRefreshing(false); }
  }, [fetchOvertimes]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetching.current || isLoadingMore) { return; }
    fetchOvertimes(page + 1, false);
  }, [hasMore, isLoadingMore, page, fetchOvertimes]);

  const handleOvertimePress = useCallback(
    (overtimeId: string) => navigation.navigate('OvertimeDetail', { overtimeId }),
    [navigation],
  );

  // Detect active overtime from list (status in_progress = clock-in already done)
  const activeOvertime = useMemo(
    () => allOvertimes.find((o) => o.status === 'in_progress') ?? null,
    [allOvertimes],
  );

  // Active regular (non-overtime) shift — user must clock out before starting overtime
  const hasActiveRegularShift = !!(currentShift && !currentShift.is_overtime);

  const handleSubmit = useCallback(() => navigation.navigate('OvertimeSubmit'), [navigation]);

  const handleApplyFilters = useCallback((newFilters: OvertimeFilter) => {
    setFilters(newFilters);
  }, []);

  const handleResetFilters = useCallback(() => setFilters({}), []);

  const handleSortSelect = useCallback((key: string) => setSort(key as SortKey), []);

  const renderItem = useCallback(
    ({ item }: { item: Overtime }) => (
      <OvertimeCard overtime={item} onPress={() => handleOvertimePress(item.id)} />
    ),
    [handleOvertimePress],
  );

  const keyExtractor = useCallback((item: Overtime) => item.id, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) { return null; }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={nbColors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const activeSortLabel = useMemo(
    () => SORT_OPTIONS.find((o) => o.key === sort)?.label ?? 'Tanggal Terbaru',
    [sort],
  );

  const isSortActive = sort !== 'start_desc';

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>

        {/* Page Title — same style as Tugas & Aktivitas */}
        <View style={styles.headerContainer}>
          <NBText variant="h3" style={styles.pageTitle}>Lembur</NBText>
        </View>

        {/* Filter Bar — indented with outer margin, matching TAT */}
        <View style={[styles.filterBarCollapsed, activeFilterCount > 0 && styles.filterBarActive]}>
          <View style={styles.filterBarLeft}>
            {filterChips.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.miniChipsContent}
              >
                {filterChips.map((chip, i) => (
                  <View
                    key={i}
                    style={[
                      styles.miniChip,
                      chip.chipStyle === 'status' && styles.miniChipStatus,
                      chip.chipStyle === 'date' && styles.miniChipDate,
                      chip.chipStyle === 'location' && styles.miniChipLocation,
                      chip.chipStyle === 'assignment' && styles.miniChipAssignment,
                    ]}
                  >
                    <NBText variant="caption" color="black" style={styles.miniChipText}>{chip.text}</NBText>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <NBText variant="body-sm" color="gray400" style={styles.filterBarPlaceholder}>Semua Lembur</NBText>
            )}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.filterClearButton}
                onPress={handleResetFilters}
                accessibilityRole="button"
                accessibilityLabel="Reset filter lembur"
              >
                <MaterialCommunityIcons name="close-circle" size={18} color={nbColors.danger} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.filterBarRight}>
            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={() => setIsSortModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Urutan: ${activeSortLabel}`}
            >
              <MaterialCommunityIcons
                name="sort"
                size={22}
                color={isSortActive ? nbColors.primary : nbColors.black}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.filterIconButton}
              onPress={() => setIsFilterModalOpen(true)}
              accessibilityRole="button"
              accessibilityLabel={`Filter lembur${activeFilterCount > 0 ? `, ${activeFilterCount} filter aktif` : ''}`}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={22}
                color={activeFilterCount > 0 ? nbColors.primary : nbColors.black}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <NBText variant="caption" color="white" style={styles.filterBadgeText}>{activeFilterCount}</NBText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* List — wrapped so it ends above the FAB (mirrors TAT contentWrapper paddingBottom pattern) */}
        <View style={[styles.listWrapper, canSubmitOvertime && styles.listWrapperWithFab]}>
        <FlatList
          style={styles.list}
          data={allOvertimes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={
            loading ? null : (
              <NBEmptyState
                variant="noData"
                title="Tidak ada data lembur"
                description={
                  activeFilterCount > 0
                    ? 'Tidak ada lembur yang sesuai filter'
                    : 'Belum ada pengajuan lembur'
                }
              />
            )
          }
        />
        </View>

        {/* FAB */}
        {canSubmitOvertime && (
          <View style={styles.fab}>
            {activeOvertime ? (
              // Active overtime in progress — go to end-overtime form
              <NBButton
                title="Clock Out Lembur"
                onPress={handleSubmit}
                variant="danger"
                size="lg"
                fullWidth
              />
            ) : hasActiveRegularShift ? (
              // Regular shift still open — block new overtime
              <>
                <NBText variant="body-sm" color="warning" style={styles.fabBlockedHint}>
                  Selesaikan Clock Out shift biasa terlebih dahulu
                </NBText>
                <NBButton
                  title="+ Ajukan Lembur"
                  onPress={() => {}}
                  variant="primary"
                  size="lg"
                  fullWidth
                  disabled
                />
              </>
            ) : (
              <NBButton
                title="+ Ajukan Lembur"
                onPress={handleSubmit}
                variant="primary"
                size="lg"
                fullWidth
              />
            )}
          </View>
        )}

        {/* Sort Modal */}
        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title="Urutkan Lembur"
          options={SORT_OPTIONS}
          selectedOption={sort}
          onSelect={handleSortSelect}
        />

        {/* Filter Modal */}
        <OvertimeFilterModal
          visible={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          userRole={user?.role}
          userRayonId={user?.rayon_id}
          userAreaId={user?.area_id}
          userId={user?.id}
        />
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  // Page title — matches Tugas & Aktivitas headerContainer pattern
  headerContainer: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.xs,
  },
  pageTitle: {
    marginBottom: 0,
  },
  // Filter bar — marginHorizontal matches TAT contentWrapper padding
  filterBarCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.extra,
    borderBottomColor: nbColors.gray[300],
    ...nbShadows.md,
    marginHorizontal: nbSpacing.md,
    marginBottom: nbSpacing.sm,
    minHeight: 48,
  },
  filterBarActive: {
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
    // Color handled by NBText color="gray400"
  },
  miniChipsContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.xs,
  },
  miniChip: {
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    height: 32,
    justifyContent: 'center',
  },
  miniChipStatus: { backgroundColor: nbColors.info },
  miniChipDate: { backgroundColor: nbColors.warning },
  miniChipLocation: { backgroundColor: nbColors.infoLight },
  miniChipAssignment: { backgroundColor: nbColors.primary },
  miniChipText: {
    // Typography handled by NBText variant="caption"
  },
  filterClearButton: {
    padding: 4,
    marginLeft: 4,
  },
  filterIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 2,
  },
  filterBadge: {
    position: 'absolute',
    top: -8,
    right: -8,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: nbColors.danger,
    borderWidth: nbBorders.base,
    borderColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    // Typography handled by NBText variant="caption"
  },
  // List — wrapper shrinks the frame above FAB, mirrors TAT contentWrapper pattern
  listWrapper: {
    flex: 1,
  },
  listWrapperWithFab: {
    paddingBottom: 80,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
    flexGrow: 1,
  },
  // FAB
  fab: {
    position: 'absolute',
    bottom: nbSpacing.md,
    left: nbSpacing.md,
    right: nbSpacing.md,
    zIndex: 10,
  },
  fabBlockedHint: {
    // Typography (fontSize, fontWeight, color) handled by NBText variant="body-sm" color="warning"
    textAlign: 'center',
    marginBottom: nbSpacing.xs,
    backgroundColor: nbColors.white,
    borderWidth: 1,
    borderColor: nbColors.warning,
    borderRadius: nbBorderRadius.sm,
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
  },
  footerLoader: {
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
});
