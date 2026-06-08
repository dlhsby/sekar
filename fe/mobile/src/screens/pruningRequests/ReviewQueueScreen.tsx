/**
 * Pruning Request Review Queue Screen — admin (admin_data, kepala_rayon,
 * top_management, admin_system, superadmin) inbox for incoming permohonan
 * perantingan.
 *
 * Visual + interaction parity with the canonical list screens (Tugas,
 * Aktivitas, Lembur, Permohonan staff_kecamatan):
 *   - `NBBackgroundPattern` + `SafeAreaView` page chrome
 *   - Page title row ("Review Permohonan Perantingan")
 *   - Filter bar: active mini-chips (left) + sort + filter icon buttons
 *     (right), filter badge with active count, "× reset" inline shortcut
 *   - `FlatList` of `PerantinganRequestCard` (NBCard variant="elevated") —
 *     same card the staff_kecamatan list uses
 *   - Generic `SortModal` + dedicated `PruningRequestFilterModal` (admin
 *     surface; rayon picker hidden for admin_data because the backend forces
 *     scoping)
 *
 * Approve / reject / assign-to-task happen on `RequestDetailScreen` (passed
 * `adminMode: true`) — same pattern as `OvertimeDetailScreen` / Aktivitas.
 *
 * The slice fetches with `fetchAdminPruningRequests({ status?, page, limit })`;
 * filtering by reference code, requester name, and date range happens
 * server-side (backend `findAll` supports them), but we also apply the
 * predicate locally so a stale list still narrows immediately when filters
 * change before the next fetch lands.
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
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchAdminPruningRequests,
  selectRequest,
} from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import {
  NBAlert,
  NBBackgroundPattern,
  NBEmptyState,
  NBToast,
  NBText,
  NBPageHeader,
} from '../../components/nb';
import {
  SortModal,
  PruningRequestFilterModal,
  type PruningRequestFilterValue,
} from '../../components/modals';
import { StatusPill } from '../../components/home/StatusPill';
import { PerantinganRequestCard } from './components/PerantinganRequestCard';
import { pruningSlaTag } from './utils/sla';
import { getPruningRequestStatusLabel } from '../../utils/statusHelpers';
import {
  nbColors,
  nbSpacing,
  nbBorders,
  nbRadius,
  nbShadows,
} from '../../constants/nbTokens';
import { useUserRole } from '../../hooks/useUserRole';
import type { PruningRequest } from '../../types/models.types';

// ─── Constants ────────────────────────────────────────────────────────────────

const ADMIN_ROLES = [
  'admin_data',
  'kepala_rayon',
  'top_management',
  'admin_system',
  'superadmin',
];

const SORT_OPTIONS = [
  { key: 'created_at_desc', label: 'Dibuat Terbaru' },
  { key: 'created_at_asc',  label: 'Dibuat Terlama' },
  { key: 'expected_asc',    label: 'Minggu Preferensi Terdekat' },
  { key: 'expected_desc',   label: 'Minggu Preferensi Terjauh' },
];

type SortKey = 'created_at_desc' | 'created_at_asc' | 'expected_asc' | 'expected_desc';

const DEFAULT_SORT: SortKey = 'created_at_desc';

// ─── Screen ───────────────────────────────────────────────────────────────────

export function ReviewQueueScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const userRole = useUserRole();

  const user = useAppSelector((state) => state.auth.user);
  const {
    adminList: requests,
    adminListLoading: isLoading,
    adminListError: error,
  } = useAppSelector((state) => state.pruningRequests);

  const [refreshing, setRefreshing] = useState(false);
  const [filters, setFilters] = useState<PruningRequestFilterValue>({});
  const [sort, setSort] = useState<SortKey>(DEFAULT_SORT);
  const [isSortModalOpen, setIsSortModalOpen] = useState(false);
  const [isFilterModalOpen, setIsFilterModalOpen] = useState(false);
  const hasMountedRef = useRef(false);

  const isAuthorized = useMemo(
    () => userRole != null && ADMIN_ROLES.includes(userRole),
    [userRole],
  );

  // ── Data fetching ────────────────────────────────────────────────────────
  // We refetch whenever the *server-side* status filter changes; the rest
  // (referenceCode / requesterName / dates / rayon) we apply locally so the
  // list responds without a network round-trip.
  const loadRequests = useCallback(async () => {
    try {
      const params: { status?: string; page?: number; limit?: number } = {
        page: 1,
        limit: 50,
      };
      if (filters.status) {
        params.status = filters.status;
      }
      await dispatch(fetchAdminPruningRequests(params)).unwrap();
    } catch {
      /* error stored in slice; rendered below */
    }
  }, [dispatch, filters.status]);

  useEffect(() => {
    if (!isAuthorized) { return; }
    void loadRequests();
  }, [loadRequests, isAuthorized]);

  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      if (!isAuthorized) { return; }
      void loadRequests();
    }, [loadRequests, isAuthorized]),
  );

  useEffect(() => {
    if (error?.error) {
      NBToast.show({
        level: 'danger',
        title: 'Gagal memuat permohonan',
        body: error.error,
      });
    }
  }, [error]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const params: { status?: string; page?: number; limit?: number } = {
        page: 1,
        limit: 50,
      };
      if (filters.status) {
        params.status = filters.status;
      }
      await dispatch(fetchAdminPruningRequests(params)).unwrap();
    } catch {
      /* error stored in slice */
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, filters.status]);

  const handleRequestPress = useCallback(
    (requestId: string) => {
      dispatch(selectRequest(requestId));
      navigation.navigate('PruningDetail', { requestId, adminMode: true });
    },
    [dispatch, navigation],
  );

  // ── Filter / sort plumbing ───────────────────────────────────────────────
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
    // Status is also applied server-side, but we re-apply for the brief window
    // before the next fetch lands.
    if (filters.status) {
      list = list.filter((r) => r.status === filters.status);
    }
    if (filters.fromDate) {
      const from = new Date(filters.fromDate).getTime();
      list = list.filter((r) => new Date(r.createdAt).getTime() >= from);
    }
    if (filters.toDate) {
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

  // ── Render helpers ───────────────────────────────────────────────────────
  const renderItem = useCallback(
    ({ item }: { item: PruningRequest }) => {
      // SLA urgency is derived (no DB column) and hung off the card's extraTag
      // slot as a StatusPill — open requests only; closed ones get nothing.
      const sla = pruningSlaTag(item);
      return (
        <PerantinganRequestCard
          request={item}
          onPress={() => handleRequestPress(item.id)}
          extraTag={sla ? <StatusPill tone={sla.tone} label={sla.label} /> : undefined}
        />
      );
    },
    [handleRequestPress],
  );

  const keyExtractor = useCallback((item: PruningRequest) => item.id, []);

  const renderEmpty = useCallback(() => {
    if (isLoading) { return null; }
    return (
      <NBEmptyState
        title="Tidak ada permohonan"
        description={
          activeFilterCount > 0
            ? 'Tidak ada permohonan yang sesuai filter.'
            : 'Permohonan perantingan dari kecamatan akan muncul di sini.'
        }
      />
    );
  }, [isLoading, activeFilterCount]);

  // ── Authorization gate ──────────────────────────────────────────────────
  if (!isAuthorized) {
    return (
      <View style={styles.unauthorizedContainer}>
        <NBAlert
          variant="danger"
          title="Akses Ditolak"
          message="Anda tidak memiliki izin untuk mengakses halaman ini."
        />
      </View>
    );
  }

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
        <NBPageHeader title="Review Permohonan Perantingan" />

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
              <NBText variant="body-sm" color="gray400" style={styles.filterBarPlaceholder}>Semua Permohonan</NBText>
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
                  <NBText variant="caption" color="white" style={styles.filterBadgeText}>{activeFilterCount}</NBText>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* List */}
        <View style={styles.listWrapper}>
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

        {/* Sort modal */}
        <SortModal
          visible={isSortModalOpen}
          onClose={() => setIsSortModalOpen(false)}
          title="Urutkan Permohonan"
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
// Mirrors PerantinganListScreen / OvertimeListScreen for visual parity.

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  unauthorizedContainer: {
    flex: 1,
    backgroundColor: nbColors.background,
    padding: nbSpacing.md,
    justifyContent: 'center',
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
    // Color handled by NBText color="black"
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
    // Color handled by NBText color="white"
  },
  listWrapper: {
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: nbSpacing.md,
    paddingBottom: nbSpacing['2xl'],
    flexGrow: 1,
  },
});
