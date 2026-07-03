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
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchMyPruningRequests,
  selectRequest,
} from '../../store/slices/pruningRequestsSlice';
import {
  NBBackgroundPattern,
  NBButton,
  NBEmptyState,
  NBToast,
  NBPageHeader,
  NBFabBar,
  NB_FAB_BAR_HEIGHT,
  NBSkeleton,
  NBText,
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
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import type { PruningRequest } from '../../types/models.types';

// ─── Constants ────────────────────────────────────────────────────────────────

type SortKey = 'created_at_desc' | 'created_at_asc' | 'expected_desc' | 'expected_asc';

const DEFAULT_SORT: SortKey = 'created_at_desc';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function PerantinganListScreen(): React.JSX.Element {
  const { t } = useTranslation('pruning');
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  // Build sort options with translations
  const SORT_OPTIONS = useMemo(() => [
    { key: 'created_at_desc', label: t('list.sortCreatedNewest') },
    { key: 'created_at_asc', label: t('list.sortCreatedOldest') },
    // ADR-035 amendment 2026-05-01: kecamatan now picks ISO week, not a date.
    { key: 'expected_asc', label: t('list.sortExpectedNearest') },
    { key: 'expected_desc', label: t('list.sortExpectedFarthest') },
  ], [t]);

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
        title: t('list.loadErrorTitle'),
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
      const toDate = filters.toDate;
      chips.push({
        text: f && toDate ? `${f.slice(5)} — ${toDate.slice(5)}` : t('filterChip.dateLabel'),
        chipStyle: 'date',
      });
    }
    if (filters.rayonId) { chips.push({ text: t('filterChip.rayonLabel'), chipStyle: 'location' }); }
    if (filters.referenceCode) { chips.push({ text: `# ${filters.referenceCode}`, chipStyle: 'status' }); }
    if (filters.requesterName) { chips.push({ text: `🧑 ${filters.requesterName}`, chipStyle: 'status' }); }
    return chips;
  }, [filters, t]);

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
    () => SORT_OPTIONS.find((o) => o.key === sort)?.label ?? t('list.sortCreatedNewest'),
    [sort, t],
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
        title={t('list.emptyTitle')}
        description={
          activeFilterCount > 0
            ? t('list.emptyDescWithFilter')
            : t('list.emptyDescNoFilter')
        }
        ctaLabel={activeFilterCount === 0 ? t('list.ctaLabel') : undefined}
        onCTA={activeFilterCount === 0 ? handleSubmit : undefined}
      />
    );
  }, [isLoading, activeFilterCount, handleSubmit, t]);

  if (isLoading && requests.length === 0) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <SafeAreaView style={styles.safeArea}>
          <NBPageHeader title={t('list.title')} />
          <View style={styles.skeletonContainer}>
            <NBSkeleton variant="list" count={5} />
          </View>
        </SafeAreaView>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.bgCanvas}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <SafeAreaView style={styles.safeArea}>
        {/* Page Title — same style as Tugas / Aktivitas / Lembur */}
        <NBPageHeader title={t('list.title')} />

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
                    <NBText variant="caption" color="black" style={styles.miniChipText}>{chip.text}</NBText>
                  </View>
                ))}
              </ScrollView>
            ) : (
              <NBText variant="body-sm" color="gray400" style={styles.filterBarPlaceholder}>{t('list.allRequestsLabel')}</NBText>
            )}
            {activeFilterCount > 0 && (
              <TouchableOpacity
                style={styles.filterClearButton}
                onPress={handleResetFilters}
                accessibilityRole="button"
                accessibilityLabel={t('review.resetFilterLabel')}
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
              accessibilityLabel={t('listScreen.sortLabel', { label: activeSortLabel })}
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
              accessibilityLabel={`${t('listScreen.filterLabel')}${
                activeFilterCount > 0 ? `, ${activeFilterCount} ${t('listScreen.filterActive')}` : ''
              }`}
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
        <NBFabBar>
          <NBButton
            title={t('list.submitFabButtonTitle')}
            variant="primary"
            size="lg"
            fullWidth
            onPress={handleSubmit}
            testID="perantingan-submit-fab"
          />
        </NBFabBar>

        {/* Sort modal */}
        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title={t('list.sortModalTitle')}
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
  filterBarCollapsed: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing.sm,
    paddingVertical: nbSpacing.xs,
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.widthExtra,
    borderBottomColor: nbColors.gray300,
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
    // Color/size handled by NBText variant="body-sm" color="gray400"
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
  miniChipStatus: { backgroundColor: nbColors.info },
  miniChipDate: { backgroundColor: nbColors.warning },
  miniChipLocation: { backgroundColor: nbColors.infoLight },
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
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeText: {
    // Typography handled by NBText variant="caption"
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
  skeletonContainer: {
    padding: nbSpacing.md,
  },
});
