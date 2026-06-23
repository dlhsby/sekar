/**
 * Attendance List Screen ("Kehadiran")
 * The user's regular attendance history, grouped by day — mirrors the Lembur
 * list (filter bar + sort/filter modals, server-side filtering + day pagination
 * with scroll-to-load-more). Tapping a day opens its detail; the bottom action
 * button opens the clock screen (or the overtime form when an overtime shift is
 * active).
 */

import React, { useState, useCallback, useMemo, useRef } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  NBBackgroundPattern,
  NBButton,
  NBEmptyState,
  NBFabBar,
  NB_FAB_BAR_HEIGHT,
  NBSkeleton,
} from '../../components/nb';
import { FilterBar, type FilterChip } from '../../components/common';
import { SortModal, AttendanceFilterModal, type AttendanceFilterFields } from '../../components/modals';
import { AttendanceDayCard } from './components/AttendanceDayCard';
import { getAttendanceDays } from '../../services/api/shiftsApi';
import { useRoleAccess } from '../../hooks/useRoleAccess';
import { useAppSelector } from '../../store/hooks';
import { nbColors, nbSpacing } from '../../constants/nbTokens';
import type { MainTabParamList } from '../../types/navigation.types';
import type { AttendanceFilter, AttendanceDaySummary } from '../../types/api.types';

const PAGE_LIMIT = 20;

const SORT_OPTIONS = [
  { key: 'date_desc', label: 'Tanggal Terbaru' },
  { key: 'date_asc', label: 'Tanggal Terlama' },
];
type SortKey = 'date_desc' | 'date_asc';

const STATUS_CHIP_LABEL: Record<NonNullable<AttendanceFilterFields['status']>, string> = {
  late: 'Terlambat',
  on_time: 'Tepat Waktu',
  active: 'Berlangsung',
};

type Props = {
  navigation: NativeStackNavigationProp<MainTabParamList, 'Attendance'>;
};

export function AttendanceListScreen({ navigation }: Props): React.JSX.Element {
  const { canClock } = useRoleAccess();
  const currentShift = useAppSelector((state) => state.shift.currentShift);

  const [days, setDays] = useState<AttendanceDaySummary[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [filters, setFilters] = useState<AttendanceFilterFields>({});
  const [sort, setSort] = useState<SortKey>('date_desc');
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);

  const isFetching = useRef(false);
  // Coalesce a refetch requested while one is in flight (e.g. a filter change
  // during a loadMore) so the latest params win and the list resets correctly.
  const pendingFetch = useRef<{ page: number; reset: boolean } | null>(null);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) { count++; }
    if (filters.from_date || filters.to_date) { count++; }
    return count;
  }, [filters]);

  const filterChips = useMemo(() => {
    const chips: FilterChip[] = [];
    if (filters.status) {
      chips.push({ text: STATUS_CHIP_LABEL[filters.status], tone: 'status' });
    }
    if (filters.from_date || filters.to_date) {
      const f = filters.from_date;
      const t = filters.to_date;
      chips.push({ text: f && t ? `${f.slice(5)} — ${t.slice(5)}` : 'Tanggal', tone: 'date' });
    }
    return chips;
  }, [filters]);

  const buildParams = useCallback(
    (p: number): AttendanceFilter => ({
      ...filters,
      sort_dir: sort === 'date_asc' ? 'asc' : 'desc',
      page: p,
      limit: PAGE_LIMIT,
    }),
    [filters, sort],
  );

  const fetchDays = useCallback(
    async (p: number, reset: boolean) => {
      if (isFetching.current) {
        // Remember the most recent request; run it once the in-flight one finishes.
        pendingFetch.current = { page: p, reset };
        return;
      }
      isFetching.current = true;
      if (reset) {
        setLoading(true);
      } else {
        setIsLoadingMore(true);
      }

      try {
        const response = await getAttendanceDays(buildParams(p));
        if (response.error || !response.data) {
          return;
        }
        const data = response.data.data ?? [];
        const total = response.data.meta?.total ?? 0;

        setDays((prev) => {
          if (reset) {
            return data;
          }
          const seen = new Set(prev.map((d) => d.date));
          return [...prev, ...data.filter((d) => !seen.has(d.date))];
        });
        setPage(p);
        setHasMore(p * PAGE_LIMIT < total);
      } finally {
        isFetching.current = false;
        setLoading(false);
        setIsLoadingMore(false);
        if (pendingFetch.current) {
          const { page: nextPage, reset: nextReset } = pendingFetch.current;
          pendingFetch.current = null;
          fetchDays(nextPage, nextReset);
        }
      }
    },
    [buildParams],
  );

  // Refetches on focus AND whenever filters/sort change (fetchDays identity
  // changes via buildParams), matching the Lembur list behaviour.
  useFocusEffect(
    useCallback(() => {
      fetchDays(1, true);
    }, [fetchDays]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await fetchDays(1, true);
    } finally {
      setRefreshing(false);
    }
  }, [fetchDays]);

  const loadMore = useCallback(() => {
    if (!hasMore || isFetching.current || isLoadingMore) {
      return;
    }
    fetchDays(page + 1, false);
  }, [hasMore, isLoadingMore, page, fetchDays]);

  const handleDayPress = useCallback(
    (date: string) => navigation.navigate('AttendanceDetail', { date }),
    [navigation],
  );

  // Same routing rule as the home FAB: overtime shift → overtime form, else clock screen.
  const handleClockAction = useCallback(() => {
    if (currentShift?.is_overtime) {
      navigation.navigate('OvertimeSubmit');
    } else {
      navigation.navigate('Absensi');
    }
  }, [currentShift, navigation]);

  const renderItem = useCallback(
    ({ item }: { item: AttendanceDaySummary }) => (
      <AttendanceDayCard summary={item} onPress={() => handleDayPress(item.date)} />
    ),
    [handleDayPress],
  );

  const keyExtractor = useCallback((item: AttendanceDaySummary) => item.date, []);

  const renderFooter = useCallback(() => {
    if (!isLoadingMore) {
      return null;
    }
    return (
      <View style={styles.footerLoader}>
        <ActivityIndicator size="small" color={nbColors.primary} />
      </View>
    );
  }, [isLoadingMore]);

  const isSortActive = sort !== 'date_desc';
  const isClockOut = !!currentShift && !currentShift.is_overtime;

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        <FilterBar
          label="Kehadiran"
          filterCount={activeFilterCount}
          chips={filterChips}
          isSortActive={isSortActive}
          onSortPress={() => setIsSortModalOpen(true)}
          onFilterPress={() => setIsFilterModalOpen(true)}
          onReset={() => setFilters({})}
          style={styles.filterBarMargin}
        />

        <View style={[styles.listWrapper, canClock && styles.listWrapperWithFab]}>
          <FlatList
            style={styles.list}
            data={days}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            removeClippedSubviews
            maxToRenderPerBatch={10}
            windowSize={10}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            onEndReached={loadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={
              loading ? (
                <View style={styles.skeletonContainer}>
                  <NBSkeleton variant="list" count={5} />
                </View>
              ) : (
                <NBEmptyState
                  variant="noData"
                  illustration={activeFilterCount > 0 ? 'illo-search' : 'illo-reports'}
                  title={activeFilterCount > 0 ? 'Tidak ada hasil' : 'Belum ada kehadiran'}
                  description={
                    activeFilterCount > 0
                      ? 'Tidak ada kehadiran yang sesuai filter'
                      : 'Riwayat kehadiran Anda akan muncul di sini setelah clock in.'
                  }
                />
              )
            }
          />
        </View>

        {canClock && (
          <NBFabBar>
            <NBButton
              title={isClockOut ? 'Clock Out' : 'Clock In'}
              onPress={handleClockAction}
              variant={isClockOut ? 'danger' : 'primary'}
              size="lg"
              fullWidth
              accessibilityLabel={isClockOut ? 'Clock out dari shift aktif' : 'Clock in untuk memulai shift'}
            />
          </NBFabBar>
        )}

        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title="Urutkan Kehadiran"
          options={SORT_OPTIONS}
          selectedOption={sort}
          onSelect={(key) => setSort(key as SortKey)}
        />

        <AttendanceFilterModal
          visible={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onApplyFilters={setFilters}
          onResetFilters={() => setFilters({})}
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
  // Standalone screens (no padded contentWrapper) give the shared FilterBar its
  // horizontal inset + top gap from the navigator header.
  filterBarMargin: {
    marginHorizontal: nbSpacing.md,
    marginTop: nbSpacing.md,
  },
  listWrapper: {
    flex: 1,
  },
  listWrapperWithFab: {
    paddingBottom: NB_FAB_BAR_HEIGHT,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
    flexGrow: 1,
  },
  footerLoader: {
    paddingVertical: nbSpacing.md,
    alignItems: 'center',
  },
  skeletonContainer: {
    paddingHorizontal: nbSpacing.md,
    paddingVertical: nbSpacing.md,
  },
});
