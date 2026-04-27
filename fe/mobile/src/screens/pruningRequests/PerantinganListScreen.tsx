/**
 * Perantingan List Screen — staff_kecamatan home tab.
 * Phase 3 Apr 27 redesign: replaces the standalone KecamatanNavigator MyRequests
 * route with a tabbed list-screen styled to match OvertimeListScreen and the
 * other field-side list screens.
 *
 * Capabilities:
 *   - Status filter chips (Menunggu, Disetujui, Ditolak, Dikonversi, Selesai, Dibatalkan)
 *   - Sort by date submitted (newest / oldest)
 *   - Floating action button → PerantinganSubmit (new submission form)
 *   - Pull-to-refresh
 *   - Empty state with primary CTA
 *
 * The RequestListItem mirrors the OvertimeCard / TaskCard layout so the look-and-feel
 * is consistent across roles.
 */

import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
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
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import { fetchMyPruningRequests, selectRequest } from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import { NBEmptyState, NBCard, NBBadge, NBAlert, NBButton } from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { nbColors, nbSpacing, nbTypography, nbShadows, nbBorders, nbBorderRadius } from '../../constants/nbTokens';
import type { PruningRequest, PruningRequestStatus } from '../../types/models.types';
import { formatDate } from '../../utils/dateUtils';

type StatusFilter = 'all' | PruningRequestStatus;
type SortOrder = 'newest' | 'oldest';

const STATUS_FILTERS: { key: StatusFilter; label: string }[] = [
  { key: 'all',         label: 'Semua' },
  { key: 'submitted',   label: 'Menunggu' },
  { key: 'approved',    label: 'Disetujui' },
  { key: 'rejected',    label: 'Ditolak' },
  { key: 'converted',   label: 'Dikonversi' },
  { key: 'in_progress', label: 'Diproses' },
  { key: 'done',        label: 'Selesai' },
];

const SORT_OPTIONS: { key: SortOrder; label: string }[] = [
  { key: 'newest', label: 'Terbaru' },
  { key: 'oldest', label: 'Terlama' },
];

type BadgeColor = 'primary' | 'success' | 'warning' | 'danger' | 'gray' | 'navy';
const STATUS_DISPLAY: Record<PruningRequestStatus, { color: BadgeColor; label: string }> = {
  submitted:    { color: 'warning', label: 'Menunggu' },
  under_review: { color: 'warning', label: 'Direview' },
  approved:     { color: 'success', label: 'Disetujui' },
  rejected:     { color: 'danger',  label: 'Ditolak' },
  converted:    { color: 'primary', label: 'Dikonversi' },
  in_progress:  { color: 'primary', label: 'Diproses' },
  done:         { color: 'success', label: 'Selesai' },
  cancelled:    { color: 'danger',  label: 'Dibatalkan' },
};

function RequestListItem({
  request,
  onPress,
}: {
  request: PruningRequest;
  onPress: () => void;
}): React.JSX.Element {
  const display = STATUS_DISPLAY[request.status] ?? { color: 'gray' as BadgeColor, label: request.status };
  const treeCount = request.treeCount ?? request.estimatedPlantCount;

  return (
    <TouchableOpacity
      onPress={onPress}
      accessible
      accessibilityRole="button"
      accessibilityLabel={`Permohonan ${request.referenceCode}`}
      accessibilityHint={`Status ${display.label}`}
    >
      <NBCard style={styles.listItem}>
        <View style={styles.itemHeader}>
          <View style={styles.refAndBadge}>
            <NBText variant="h3" numberOfLines={1}>{request.referenceCode}</NBText>
            <NBBadge text={display.label} color={display.color} size="sm" />
          </View>
          <MaterialCommunityIcons name="chevron-right" size={24} color={nbColors.gray600} />
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color={nbColors.gray500} />
            <NBText variant="body-sm" style={{ color: nbColors.gray600, flex: 1 }} numberOfLines={1}>
              {request.address}
            </NBText>
          </View>

          {request.kecamatanName ? (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="city-variant-outline" size={16} color={nbColors.gray500} />
              <NBText variant="body-sm" style={{ color: nbColors.gray600 }}>
                {request.kecamatanName}
              </NBText>
            </View>
          ) : null}

          {treeCount != null ? (
            <View style={styles.detailRow}>
              <MaterialCommunityIcons name="tree" size={16} color={nbColors.gray500} />
              <NBText variant="body-sm" style={{ color: nbColors.gray600 }}>
                {treeCount} pohon
              </NBText>
            </View>
          ) : null}

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="calendar-clock" size={16} color={nbColors.gray500} />
            <NBText variant="body-sm" style={{ color: nbColors.gray600 }}>
              Diajukan {formatDate(request.createdAt)}
            </NBText>
          </View>
        </View>
      </NBCard>
    </TouchableOpacity>
  );
}

export function PerantinganListScreen(): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { mine: requests, isLoading, error } = useAppSelector((state) => state.pruningRequests);

  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sort, setSort] = useState<SortOrder>('newest');
  const hasMountedRef = useRef(false);

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

  // Filter + sort
  const filteredSorted = useMemo(() => {
    let list = requests;
    if (statusFilter !== 'all') {
      list = list.filter((r) => r.status === statusFilter);
    }
    return [...list].sort((a, b) => {
      const da = new Date(a.createdAt).getTime();
      const db = new Date(b.createdAt).getTime();
      return sort === 'newest' ? db - da : da - db;
    });
  }, [requests, statusFilter, sort]);

  const renderItem = useCallback(
    ({ item }: { item: PruningRequest }) => (
      <RequestListItem request={item} onPress={() => handleRequestPress(item.id)} />
    ),
    [handleRequestPress],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) {
      return null;
    }
    return (
      <NBEmptyState
        title="Belum ada permohonan"
        description={
          statusFilter === 'all'
            ? 'Permohonan pemangkasan Anda akan muncul di sini.'
            : 'Tidak ada permohonan dengan status tersebut.'
        }
        ctaLabel={statusFilter === 'all' ? 'Buat Permohonan' : undefined}
        onCTA={statusFilter === 'all' ? handleSubmit : undefined}
      />
    );
  }, [isLoading, statusFilter, handleSubmit]);

  if (isLoading && requests.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      {/* Filter + sort bar */}
      <View style={styles.filterBar}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScroll}
        >
          {STATUS_FILTERS.map((f) => {
            const active = statusFilter === f.key;
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => setStatusFilter(f.key)}
                style={[styles.chip, active && styles.chipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                accessibilityLabel={`Filter ${f.label}`}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {f.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        <TouchableOpacity
          onPress={() => setSort((s) => (s === 'newest' ? 'oldest' : 'newest'))}
          style={styles.sortButton}
          accessibilityRole="button"
          accessibilityLabel={`Urutkan ${SORT_OPTIONS.find((o) => o.key === sort)?.label}`}
        >
          <MaterialCommunityIcons
            name={sort === 'newest' ? 'sort-clock-descending' : 'sort-clock-ascending'}
            size={20}
            color={nbColors.black}
          />
        </TouchableOpacity>
      </View>

      <View style={styles.listWrapperWithFab}>
        <FlatList
          data={filteredSorted}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={nbColors.black} />
          }
          ListEmptyComponent={renderEmpty}
          contentContainerStyle={styles.listContent}
          scrollIndicatorInsets={{ right: 1 }}
          maxToRenderPerBatch={10}
          updateCellsBatchingPeriod={50}
          initialNumToRender={15}
          removeClippedSubviews
        />
      </View>

      {/* FAB — Buat Permohonan (mirrors OvertimeListScreen / TasksActivityScreen pattern) */}
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

      {error ? (
        <View style={styles.errorContainer}>
          <NBAlert variant="danger" title="Gagal memuat permohonan" message={error} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  filterBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: nbSpacing[3],
    paddingVertical: nbSpacing[2],
    backgroundColor: nbColors.white,
    borderBottomWidth: nbBorders.base,
    borderBottomColor: nbColors.black,
  },
  filterScroll: {
    gap: nbSpacing[2],
    paddingRight: nbSpacing[2],
  },
  chip: {
    paddingHorizontal: nbSpacing[3],
    paddingVertical: nbSpacing[1],
    borderRadius: nbBorderRadius.full,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    marginRight: nbSpacing[1],
  },
  chipActive: {
    backgroundColor: nbColors.primary,
  },
  chipText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.black,
  },
  chipTextActive: {
    color: nbColors.white,
  },
  sortButton: {
    marginLeft: nbSpacing[2],
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    borderRadius: nbBorderRadius.base,
    backgroundColor: nbColors.white,
  },
  listWrapperWithFab: {
    flex: 1,
    paddingBottom: 80, // matches OvertimeListScreen
  },
  listContent: {
    padding: nbSpacing[4],
    paddingBottom: nbSpacing[6],
    flexGrow: 1,
  },
  listItem: {
    marginBottom: nbSpacing[3],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: nbSpacing[3],
  },
  refAndBadge: {
    flex: 1,
    marginRight: nbSpacing[3],
    gap: nbSpacing[1],
  },
  itemDetails: {
    gap: nbSpacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
  },
  fab: {
    position: 'absolute',
    bottom: nbSpacing.md,
    left: nbSpacing.md,
    right: nbSpacing.md,
    zIndex: 10,
  },
  errorContainer: {
    position: 'absolute',
    top: 70,
    left: nbSpacing[4],
    right: nbSpacing[4],
  },
});
