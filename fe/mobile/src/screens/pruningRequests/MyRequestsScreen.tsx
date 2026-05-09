/**
 * My Pruning Requests Screen
 * Phase 3 sub-phase 3-10: List of staff_kecamatan submissions
 * Shows status, reference code, address, expected date per request
 * Supports pull-to-refresh and navigation to detail view
 */

import React, { useEffect, useState, useCallback, useRef } from 'react';
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
import { fetchMyPruningRequests, selectRequest } from '../../store/slices/pruningRequestsSlice';
import { LoadingSpinner } from '../../components/common';
import { NBEmptyState, NBCard, NBBadge } from '../../components/nb';
import { nbColors, nbSpacing, nbTypography } from '../../constants/nbTokens';
import type { PruningRequest, PruningRequestStatus } from '../../types/models.types';
import { formatDate } from '../../utils/dateUtils';

/**
 * Type-safe navigation prop for main tab (staff_kecamatan routed to PruningRequest screens)
 */
type MainTabScreenProps<T extends keyof any> = NativeStackScreenProps<any, T>;

/**
 * Map status to NB variant + label
 */
const getStatusDisplay = (status: PruningRequestStatus) => {
  const statusMap: Record<PruningRequestStatus, { variant: 'default' | 'primary' | 'success' | 'warning' | 'error'; label: string }> = {
    'submitted': { variant: 'warning', label: 'Menunggu' },
    'under_review': { variant: 'warning', label: 'Direview' },
    'approved': { variant: 'success', label: 'Disetujui' },
    'rejected': { variant: 'error', label: 'Ditolak' },
    'converted': { variant: 'primary', label: 'Dijadwalkan' },
    'in_progress': { variant: 'primary', label: 'Diproses' },
    'done': { variant: 'success', label: 'Selesai' },
    'cancelled': { variant: 'error', label: 'Dibatalkan' },
  };
  return statusMap[status] || { variant: 'default', label: status };
};

/**
 * Request list item component
 */
function RequestListItem({
  request,
  onPress,
}: {
  request: PruningRequest;
  onPress: () => void;
}): React.JSX.Element {
  const statusDisplay = getStatusDisplay(request.status);

  return (
    <TouchableOpacity
      onPress={onPress}
      accessible={true}
      accessibilityRole="button"
      accessibilityLabel={`Permohonan ${request.referenceCode}`}
      accessibilityHint={`Status: ${statusDisplay.label}, Tanggal: ${formatDate(request.expectedDate)}`}
    >
      <NBCard style={styles.listItem}>
        <View style={styles.itemHeader}>
          <View style={styles.refAndBadge}>
            <Text style={[nbTypography.h3, { color: nbColors.black }]}>
              {request.referenceCode}
            </Text>
            <NBBadge variant={statusDisplay.variant} label={statusDisplay.label} />
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
            <MaterialCommunityIcons
              name="tree"
              size={16}
              color={nbColors.gray500}
            />
            <Text style={[nbTypography.body, { color: nbColors.gray600 }]}>
              {request.estimatedPlantCount} pohon
            </Text>
          </View>
        </View>
      </NBCard>
    </TouchableOpacity>
  );
}

/**
 * My Pruning Requests List Screen
 */
export function MyRequestsScreen(
  _props: MainTabScreenProps<'PruningMyRequests'>
): React.JSX.Element {
  const navigation = useNavigation<any>();
  const dispatch = useAppDispatch();

  const { mine: requests, isLoading, error } = useAppSelector((state) => state.pruningRequests);

  const [refreshing, setRefreshing] = useState(false);
  const hasMountedRef = useRef(false);

  // Load requests on initial mount
  useEffect(() => {
    loadRequests();
  }, []);

  // Reload on re-focus (e.g., returning from detail screen)
  useFocusEffect(
    useCallback(() => {
      if (!hasMountedRef.current) {
        hasMountedRef.current = true;
        return;
      }
      loadRequests();
    }, [])
  );

  const loadRequests = useCallback(async () => {
    try {
      await dispatch(fetchMyPruningRequests({ limit: 50, offset: 0 })).unwrap();
    } catch {
      // Error is stored in Redux state and displayed via NBAlert
    }
  }, [dispatch]);

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await dispatch(fetchMyPruningRequests({ limit: 50, offset: 0 })).unwrap();
    } catch {
      // Error is stored in Redux state
    } finally {
      setRefreshing(false);
    }
  }, [dispatch]);

  const handleRequestPress = useCallback(
    (requestId: string) => {
      dispatch(selectRequest(requestId));
      navigation.navigate('PruningDetail', { requestId });
    },
    [dispatch, navigation]
  );

  const renderItem = useCallback(
    ({ item }: { item: PruningRequest }) => (
      <RequestListItem
        request={item}
        onPress={() => handleRequestPress(item.id)}
      />
    ),
    [handleRequestPress]
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <NBEmptyState
        icon="inbox"
        title="Belum ada permohonan"
        description="Permohonan pemangkasan Anda akan muncul di sini"
        action={{
          label: 'Buat Permohonan',
          onPress: () => navigation.navigate('PruningSubmit'),
        }}
      />
    );
  }, [isLoading, navigation]);

  if (isLoading && requests.length === 0) {
    return <LoadingSpinner />;
  }

  return (
    <View style={styles.container}>
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
            message={error}
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
    alignItems: 'center',
    marginBottom: nbSpacing[3],
  },
  refAndBadge: {
    flex: 1,
    marginRight: nbSpacing[3],
  },
  itemDetails: {
    gap: nbSpacing[2],
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing[2],
  },
  errorContainer: {
    position: 'absolute',
    bottom: nbSpacing[4],
    left: nbSpacing[4],
    right: nbSpacing[4],
  },
});
