/**
 * Pruning Request Review Queue Screen
 * Phase 3 sub-phase 3-10: Admin (admin_data) queue for reviewing pruning requests
 * Shows pending and under_review requests with approve/reject/convert actions
 */

import React, { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAppDispatch, useAppSelector } from '../../store/hooks';
import {
  fetchAdminPruningRequests,
  selectRequest,
  reviewPruningRequest,
} from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import { NBEmptyState, NBCard, NBBadge, NBButton, NBAlert } from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { NBToast } from '../../components/nb/NBToast';
import { nbColors, nbSpacing, nbTypography, nbBorderRadius } from '../../constants/nbTokens';
import type { PruningRequest, PruningRequestStatus } from '../../types/models.types';
import { formatDate, formatDateTime } from '../../utils/dateUtils';
import { useUserRole } from '../../hooks/useUserRole';

/**
 * Type-safe navigation prop
 */
type ReviewQueueScreenProps = NativeStackScreenProps<any, 'PruningReviewQueue'>;

/**
 * Filter options for review queue
 */
type FilterStatus = 'all' | 'submitted' | 'under_review' | 'approved';

const FILTER_OPTIONS: Array<{ value: FilterStatus; label: string }> = [
  { value: 'all', label: 'Semua' },
  { value: 'submitted', label: 'Menunggu' },
  { value: 'under_review', label: 'Direview' },
  { value: 'approved', label: 'Disetujui' },
];

/**
 * Map status to NB variant + label
 */
const getStatusDisplay = (status: PruningRequestStatus) => {
  const statusMap: Record<
    PruningRequestStatus,
    { variant: 'default' | 'primary' | 'success' | 'warning' | 'error'; label: string }
  > = {
    submitted: { variant: 'warning', label: 'Menunggu' },
    under_review: { variant: 'warning', label: 'Direview' },
    approved: { variant: 'success', label: 'Disetujui' },
    rejected: { variant: 'error', label: 'Ditolak' },
    converted: { variant: 'primary', label: 'Dijadwalkan' },
    in_progress: { variant: 'primary', label: 'Diproses' },
    done: { variant: 'success', label: 'Selesai' },
    cancelled: { variant: 'error', label: 'Dibatalkan' },
  };
  return statusMap[status] || { variant: 'default', label: status };
};

/**
 * Request list item component with quick actions
 */
function RequestListItem({
  request,
  isReviewing,
  onPress,
  onQuickApprove,
  onQuickReject,
}: {
  request: PruningRequest;
  isReviewing: boolean;
  onPress: () => void;
  onQuickApprove: () => void;
  onQuickReject: () => void;
}): React.JSX.Element {
  const statusDisplay = getStatusDisplay(request.status);
  const [showActions, setShowActions] = useState(false);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Permohonan ${request.referenceCode} untuk direview`}
      accessibilityHint={`Status: ${statusDisplay.label}, Kecamatan: ${request.kecamatanName}, Pohon: ${request.estimatedPlantCount}`}
    >
      <NBCard style={styles.listItem}>
        <View style={styles.itemHeader}>
          <View style={styles.refAndBadge}>
            <Text style={[nbTypography.h3, { color: nbColors.black }]}>
              {request.referenceCode}
            </Text>
            <Text
              style={[
                nbTypography['body-sm'],
                { color: nbColors.gray500, marginTop: nbSpacing[1] },
              ]}
            >
              {request.kecamatanName}
            </Text>
            <View style={{ marginTop: nbSpacing[2] }}>
              <NBBadge variant={statusDisplay.variant} label={statusDisplay.label} />
            </View>
          </View>
          <MaterialCommunityIcons
            name="chevron-right"
            size={24}
            color={nbColors.gray600}
          />
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="map-marker"
              size={16}
              color={nbColors.gray500}
            />
            <Text
              style={[nbTypography.body, { color: nbColors.gray600, flex: 1 }]}
              numberOfLines={1}
            >
              {request.address}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons
              name="calendar"
              size={16}
              color={nbColors.gray500}
            />
            <Text style={[nbTypography.body, { color: nbColors.gray600 }]}>
              {formatDate(request.expectedDate)}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="tree" size={16} color={nbColors.gray500} />
            <Text style={[nbTypography.body, { color: nbColors.gray600 }]}>
              {request.estimatedPlantCount} pohon
            </Text>
          </View>
        </View>

        {/* Quick action buttons for pending/under_review */}
        {['submitted', 'under_review'].includes(request.status) && (
          <View style={[styles.quickActions, showActions && styles.quickActionsExpanded]}>
            {!showActions && (
              <NBButton
                variant="secondary"
                label="Aksi Cepat"
                size="sm"
                onPress={() => setShowActions(true)}
                leftIcon="lightning-bolt"
                disabled={isReviewing}
              />
            )}
            {showActions && (
              <View style={styles.actionButtons}>
                <NBButton
                  variant="success"
                  label="Setujui"
                  size="sm"
                  onPress={onQuickApprove}
                  leftIcon="check"
                  disabled={isReviewing}
                  style={{ flex: 1 }}
                />
                <NBButton
                  variant="danger"
                  label="Tolak"
                  size="sm"
                  onPress={onQuickReject}
                  leftIcon="close"
                  disabled={isReviewing}
                  style={{ flex: 1 }}
                />
                <NBButton
                  variant="secondary"
                  label="Batal"
                  size="sm"
                  onPress={() => setShowActions(false)}
                  disabled={isReviewing}
                  style={{ flex: 1 }}
                />
              </View>
            )}
          </View>
        )}
      </NBCard>
    </TouchableOpacity>
  );
}

/**
 * Filter tabs component
 */
function FilterTabs({
  activeFilter,
  onFilterChange,
}: {
  activeFilter: FilterStatus;
  onFilterChange: (filter: FilterStatus) => void;
}): React.JSX.Element {
  return (
    <View style={styles.filterContainer}>
      {FILTER_OPTIONS.map((option) => (
        <TouchableOpacity
          key={option.value}
          onPress={() => onFilterChange(option.value)}
          accessible={true}
          accessibilityRole="tab"
          accessibilityLabel={option.label}
          accessibilityState={{ selected: activeFilter === option.value }}
        >
          <View
            style={[
              styles.filterTab,
              activeFilter === option.value && styles.filterTabActive,
            ]}
          >
            <Text
              style={[
                nbTypography['body-sm'],
                activeFilter === option.value
                  ? { color: nbColors.black, fontWeight: '600' }
                  : { color: nbColors.gray600 },
              ]}
            >
              {option.label}
            </Text>
          </View>
        </TouchableOpacity>
      ))}
    </View>
  );
}

/**
 * Pruning Request Review Queue Screen
 */
export function ReviewQueueScreen(
  _props: ReviewQueueScreenProps,
): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();
  const userRole = useUserRole();

  const { adminList: requests, adminListLoading: isLoading, adminListError: error, reviewingId } =
    useAppSelector((state) => state.pruningRequests);

  const [refreshing, setRefreshing] = useState(false);
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all');
  const hasMountedRef = useRef(false);

  // Check authorization
  const isAuthorized = useMemo(
    () =>
      [
        'admin_data',
        'kepala_rayon',
        'top_management',
        'admin_system',
        'superadmin',
      ].includes(userRole),
    [userRole],
  );

  // Load requests on initial mount
  useEffect(() => {
    loadRequests();
  }, []);

  // Reload on re-focus
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      loadRequests();
    }, []),
  );

  const loadRequests = useCallback(async () => {
    try {
      const filters: Record<string, string | number> = {
        page: 1,
        limit: 50,
      };
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      await dispatch(fetchAdminPruningRequests(filters)).unwrap();
    } catch {
      // Error is stored in Redux state
    }
  }, [dispatch, filterStatus]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const filters: Record<string, string | number> = {
        page: 1,
        limit: 50,
      };
      if (filterStatus !== 'all') {
        filters.status = filterStatus;
      }
      await dispatch(fetchAdminPruningRequests(filters)).unwrap();
    } catch {
      // Error is stored in Redux state
    } finally {
      setRefreshing(false);
    }
  }, [dispatch, filterStatus]);

  const handleFilterChange = useCallback((newFilter: FilterStatus) => {
    setFilterStatus(newFilter);
  }, []);

  useEffect(() => {
    loadRequests();
  }, [filterStatus]);

  const handleRequestPress = useCallback(
    (requestId: string) => {
      dispatch(selectRequest(requestId));
      navigation.navigate('PruningDetail', { requestId, adminMode: true });
    },
    [dispatch, navigation],
  );

  const handleQuickApprove = useCallback(
    (requestId: string) => {
      dispatch(reviewPruningRequest({ id: requestId, decision: 'approve' }))
        .unwrap()
        .then(() => {
          NBToast.show({
            level: 'success',
            title: 'Berhasil',
            message: 'Permohonan telah disetujui',
          });
        })
        .catch((err) => {
          NBToast.show({
            level: 'danger',
            title: 'Gagal',
            message: err?.message || 'Gagal menyetujui permohonan',
          });
        });
    },
    [dispatch],
  );

  const handleQuickReject = useCallback(
    (requestId: string) => {
      dispatch(reviewPruningRequest({ id: requestId, decision: 'reject' }))
        .unwrap()
        .then(() => {
          NBToast.show({
            level: 'success',
            title: 'Berhasil',
            message: 'Permohonan telah ditolak',
          });
        })
        .catch((err) => {
          NBToast.show({
            level: 'danger',
            title: 'Gagal',
            message: err?.message || 'Gagal menolak permohonan',
          });
        });
    },
    [dispatch],
  );

  const renderItem = useCallback(
    ({ item }: { item: PruningRequest }) => (
      <RequestListItem
        request={item}
        isReviewing={reviewingId === item.id}
        onPress={() => handleRequestPress(item.id)}
        onQuickApprove={() => handleQuickApprove(item.id)}
        onQuickReject={() => handleQuickReject(item.id)}
      />
    ),
    [handleRequestPress, handleQuickApprove, handleQuickReject, reviewingId],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <NBEmptyState
        icon="inbox"
        title="Tidak ada permohonan"
        description={`Tidak ada permohonan dengan status '${filterStatus}' untuk direview`}
      />
    );
  }, [isLoading, filterStatus]);

  if (!isAuthorized) {
    return (
      <View style={styles.container}>
        <NBAlert
          type="error"
          title="Akses Ditolak"
          message="Anda tidak memiliki izin untuk mengakses halaman ini"
        />
      </View>
    );
  }

  if (isLoading && requests.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
      <FilterTabs activeFilter={filterStatus} onFilterChange={handleFilterChange} />

      <FlatList
        data={requests}
        renderItem={renderItem}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            tintColor={nbColors.black}
          />
        }
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={styles.listContent}
        scrollIndicatorInsets={{ right: 1 }}
        maxToRenderPerBatch={10}
        updateCellsBatchingPeriod={50}
        initialNumToRender={15}
        removeClippedSubviews={true}
      />

      {error && (
        <View style={styles.errorContainer}>
          <NBAlert
            type="error"
            title="Gagal memuat permohonan"
            message={error.error}
          />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: nbColors.bgCanvas,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: nbSpacing[4],
    paddingVertical: nbSpacing[3],
    borderBottomWidth: 2,
    borderBottomColor: nbColors.bgBorder,
    backgroundColor: nbColors.white,
  },
  filterTab: {
    paddingHorizontal: nbSpacing[3],
    paddingVertical: nbSpacing[2],
    borderBottomWidth: 0,
  },
  filterTabActive: {
    borderBottomWidth: 2,
    borderBottomColor: nbColors.primary,
  },
  listContent: {
    padding: nbSpacing[4],
    paddingBottom: nbSpacing[6],
  },
  listItem: {
    marginBottom: nbSpacing[3],
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: nbSpacing[3],
  },
  refAndBadge: {
    flex: 1,
    marginRight: nbSpacing[3],
  },
  itemDetails: {
    gap: nbSpacing[2],
    marginBottom: nbSpacing[3],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
  },
  quickActions: {
    borderTopWidth: 2,
    borderTopColor: nbColors.bgBorder,
    paddingTop: nbSpacing[3],
    marginTop: nbSpacing[3],
  },
  quickActionsExpanded: {
    paddingTop: nbSpacing[2],
  },
  actionButtons: {
    flexDirection: 'row',
    gap: nbSpacing[2],
  },
  errorContainer: {
    position: 'absolute',
    bottom: nbSpacing[4],
    left: nbSpacing[4],
    right: nbSpacing[4],
  },
});
