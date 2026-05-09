/**
 * Perantingan List Screen — staff_kecamatan home tab.
 *
 * Visual + interaction parity with the canonical list screens (Lembur,
 * Tugas, Aktivitas):
 *   - Page title row
 *   - Filter bar: active mini-chips (left) + sort + filter icon buttons (right),
 *     filter badge with active count, "× reset" inline shortcut
 *   - FlatList of `PerantinganRequestCard` (NBCard variant="elevated")
 *   - Floating "+ Buat Permohonan" FAB
 *   - Generic `SortModal` + dedicated `PruningRequestFilterModal`
 *
 * Filter / sort are local-only for now (the slice fetches with
 * `mine=true&limit=50&offset=0` and we filter the in-memory list); when the
 * backend grows server-side filtering for `mine=true` we can wire this
 * through `fetchMyPruningRequests` params.
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMyPruningRequests,
  selectRequest,
} from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import {
  NBBackgroundPattern,
  NBButton,
  NBEmptyState,
  NBToast,
} from '../../components/nb';
import {
  SortModal,
  PruningRequestFilterModal,
  type PruningRequestFilterValue,
} from '../../components/modals';
import { PerantinganRequestCard } from './components/PerantinganRequestCard';
import { getPruningRequestStatusLabel } from '../../utils/statusHelpers';
import {
  nbColors,
  nbSpacing,
  nbTypography,
  nbBorders,
  nbBorderRadius,
  nbShadows,
} from '../../constants/nbTokens';
import type { PruningRequest } from '../../types/models.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const SORT_OPTIONS = [
  { key: 'created_at_desc', label: 'Dibuat Terbaru' },
  { key: 'created_at_asc',  label: 'Dibuat Terlama' },
  // ADR-035 amendment 2026-05-01: kecamatan now picks ISO week, not a date.
  { key: 'expected_asc',    label: 'Minggu Preferensi Terdekat' },
  { key: 'expected_desc',   label: 'Minggu Preferensi Terjauh' },
];

type SortKey = 'created_at_desc' | 'created_at_asc' | 'expected_desc' | 'expected_asc';

const DEFAULT_SORT: SortKey = 'created_at_desc';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function PerantinganListScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const user = useAppSelector((state) => state.auth.user);
  const { mine: requests, isLoading, error } = useAppSelector(
    (state) => state.pruningRequests,
  );

  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<PruningRequestFilterValue>({});
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const hasMountedRef = useRef(false);

  // ── Data fetching ─────────────────────────────────────────────────────
  const loadRequests = useCallback(async () => {
    try {
      await dispatch(fetchMyPruningRequests({ limit: 50, offset: 0 })).unwrap();
    } catch {
      /* error stored in slice; rendered below */
    }
  }, [dispatch]);

  useEffect(() => {
    void loadRequests();
  }, [loadRequests]);

  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      void loadRequests();
    }, [loadRequests]),
  );

  // Surface fetch errors as a toast (matches LoginScreen pattern).
  // Pre-existing inline NBAlert was easy to miss and pinned to a small
  // corner; toast slides over the screen and doesn't fight the layout.
  useEffect(() => {
    if (error) {
      NBToast.show({
        level: 'danger',
        title: 'Gagal memuat permohonan',
        body: error,
      });
    }
  }, [error]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchMyPruningRequests({ limit: 50, offset: 0 })).unwrap();
    } catch {
      /* error stored in slice */
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const handleRequestPress = useCallback(
    (requestId: string) => {
      dispatch(selectRequest(requestId));
      navigation.navigate('PruningDetail', { requestId });
    },
    [dispatch, navigation],
  );

  const handleSubmit = useCallback(() => {
    navigation.navigate('PerantinganSubmit');
  }, [navigation]);

  // ── Filter / sort plumbing ────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.status) { count++; }
    if (filters.fromDate || filters.toDate) { count++; }
    if (filters.rayonId) { count++; }
    if (filters.referenceCode) { count++; }
    if (filters.requesterName) { count++; }
    return count;
  }, [filters]);

  const filterChips = useMemo(() => {
    const chips: { text: string; chipStyle: 'status' | 'date' | 'location' }[] = [];
    if (filters.status) {
      chips.push({
        text: getPruningRequestStatusLabel(filters.status),
        chipStyle: 'status',
      });
    }
    if (filters.fromDate || filters.toDate) {
      const f = filters.fromDate;
      const t = filters.toDate;
      chips.push({
        text: f && t ? `${f.slice(5)} — ${t.slice(5)}` : 'Tanggal',
        chipStyle: 'date',
      });
    }
    if (filters.rayonId) { chips.push({ text: 'Rayon', chipStyle: 'location' }); }
    if (filters.referenceCode) { chips.push({ text: `# ${filters.referenceCode}`, chipStyle: 'status' }); }
    if (filters.requesterName) { chips.push({ text: `🧑 ${filters.requesterName}`, chipStyle: 'status' }); }
    return chips;
  }, [filters]);

  const filteredSorted = useMemo(() => {
    let list = requests;
    if (filters.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.fromDate) {
      const from = new Date(filters.fromDate).getTime();
      list = list.filter((r) => new Date(r.createdAt).getTime() >= from);
    }
    if (filters.toDate) {
      // toDate is end-of-day inclusive
      const to = new Date(filters.toDate + 'T23:59:59').getTime();
      list = list.filter((r) => new Date(r.createdAt).getTime() <= to);
    }
    if (filters.rayonId) {
      list = list.filter((r) => r.rayonId === filters.rayonId);
    }
    if (filters.referenceCode) {
      const needle = filters.referenceCode.toLowerCase();
      list = list.filter((r) => (r.referenceCode ?? '').toLowerCase().includes(needle));
    }
    if (filters.requesterName) {
      const needle = filters.requesterName.toLowerCase();
      list = list.filter((r) => (r.requesterName ?? '').toLowerCase().includes(needle));
    }
    return [...list].sort((a, b) => {
      switch (sort) {
        case 'created_at_asc':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case 'expected_desc': {
          const ax = a.expectedDate ? new Date(a.expectedDate).getTime() : 0;
          const bx = b.expectedDate ? new Date(b.expectedDate).getTime() : 0;
          return bx - ax;
        }
        case 'expected_asc': {
          const ax = a.expectedDate ? new Date(a.expectedDate).getTime() : Infinity;
          const bx = b.expectedDate ? new Date(b.expectedDate).getTime() : Infinity;
          return ax - bx;
        }
        case 'created_at_desc':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });
  }, [requests, filters, sort]);

  const activeSortLabel = useMemo(
    () => SORT_OPTIONS.find((o) => o.key === sort)?.label ?? 'Dibuat Terbaru',
    [sort],
  );
  const isSortActive = sort !== DEFAULT_SORT;

  const handleApplyFilters = useCallback(
    (newFilters: PruningRequestFilterValue) => setFilters(newFilters),
    [],
  );
  const handleResetFilters = useCallback(() => setFilters({}), []);
  const handleSortSelect = useCallback((key: string) => setSort(key as SortKey), []);

  // ── Render ────────────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: PruningRequest }) => (
      <PerantinganRequestCard
        request={item}
        onPress={() => handleRequestPress(item.id)}
      />
    ),
    [handleRequestPress],
  );

  const keyExtractor = useCallback((item: PruningRequest) => item.id, []);

  const renderEmpty = useCallback(() => {
    if (isLoading) { return null; }
    return (
      <NBEmptyState
        title="Belum ada permohonan"
        description={
          activeFilterCount > 0
            ? 'Tidak ada permohonan yang sesuai filter.'
            : 'Permohonan pemangkasan Anda akan muncul di sini.'
        }
        ctaLabel={activeFilterCount === 0 ? 'Buat Permohonan' : undefined}
        onCTA={activeFilterCount === 0 ? handleSubmit : undefined}
      />
    );
  }, [isLoading, activeFilterCount, handleSubmit]);

  if (isLoading && requests.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Page Title — same style as Tugas / Aktivitas / Lembur */}
        <View style={styles.headerContainer}>
          <Text style={styles.pageTitle}>Permohonan Perantingan</Text>
        </View>

        {/* Filter bar — mini chips (left) + sort/filter icons (right) */}
        <View
          style={[
            styles.filterBarCollapsed,
            activeFilterCount > 0 && styles.filterBarActive,
          ]}
        >
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
                    ]}
                  >
                    <Text style={styles.miniChipText}>{chip.text}</Text>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <Text style={styles.filterBarPlaceholder}>Semua Permohonan</Text>
            )}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.filterClearButton}
                onPress={handleResetFilters}
                accessibilityRole="button"
                accessibilityLabel="Reset filter permohonan"
              >
                <MaterialCommunityIcons
                  name="close-circle"
                  size={18}
                  color={nbColors.danger}
                />
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
              accessibilityLabel={`Filter permohonan${
                activeFilterCount > 0 ? `, ${activeFilterCount} filter aktif` : ''
              }`}
            >
              <MaterialCommunityIcons
                name="filter-variant"
                size={22}
                color={activeFilterCount > 0 ? nbColors.primary : nbColors.black}
              />
              {activeFilterCount > 0 && (
                <View style={styles.filterBadge}>
                  <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* List wrapper — leaves room for FAB at bottom (matches OvertimeListScreen) */}
        <View style={[styles.listWrapper, styles.listWrapperWithFab]}>
          <FlatList
            style={styles.list}
            data={filteredSorted}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            contentContainerStyle={styles.listContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                tintColor={nbColors.primary}
              />
            }
            ListEmptyComponent={renderEmpty}
            initialNumToRender={15}
            maxToRenderPerBatch={10}
            updateCellsBatchingPeriod={50}
            removeClippedSubviews
          />
        </View>

        {/* FAB — Buat Permohonan */}
        <View style={styles.fab} pointerEvents="box-none">
          <NBButton
            title="+ Buat Permohonan"
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            testID="perantingan-submit-fab"
          />
        </View>

        {/* Sort modal */}
        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title="URUTKAN PERMOHONAN"
          options={SORT_OPTIONS}
          selectedOption={sort}
          onSelect={handleSortSelect}
        />

        {/* Filter modal */}
        <PruningRequestFilterModal
          visible={isFilterModalOpen}
          onClose={() => setIsFilterModalOpen(false)}
          filters={filters}
          onApplyFilters={handleApplyFilters}
          onResetFilters={handleResetFilters}
          userRole={user?.role}
          userRayonId={user?.rayon_id ?? undefined}
        />
      </SafeAreaView>
    </NBBackgroundPattern>
  );
}

// ─── Styles ──────────────────────────────────────────────────────────────────
// Mirrors OvertimeListScreen for visual parity.

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  headerContainer: {
    paddingHorizontal: nbSpacing.md,
    paddingTop: nbSpacing.md,
    paddingBottom: nbSpacing.xs,
  },
  pageTitle: {
    fontSize: nbTypography.fontSize.lg,
    fontWeight: nbTypography.fontWeight.extrabold,
    color: nbColors.black,
  },
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
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[400],
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
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.sm,
    height: 32,
    justifyContent: 'center',
  },
  miniChipStatus: { backgroundColor: nbColors.info },
  miniChipDate: { backgroundColor: nbColors.warning },
  miniChipLocation: { backgroundColor: nbColors.infoLight },
  miniChipText: {
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.black,
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
    fontSize: nbTypography.fontSize.xs,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.white,
  },
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
  fab: {
    position: 'absolute',
    bottom: nbSpacing.md,
    left: nbSpacing.md,
    right: nbSpacing.md,
    zIndex: 10,
  },
});
