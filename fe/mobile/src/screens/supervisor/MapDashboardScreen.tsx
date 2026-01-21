/**
 * MapDashboardScreen
 * Real-time map view showing active worker locations
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import { colors, typography, spacing, borderRadius, shadows, touchTarget } from '../../constants/theme';
import { WorkerMarker } from '../../components/supervisor/WorkerMarker';
import { WorkerInfoCard } from '../../components/supervisor/WorkerInfoCard';
import { getActiveWorkers } from '../../services/api/supervisorApi';
import { get } from '../../services/api/apiClient';
import type { ActiveWorkerData } from '../../types/api.types';
import type { Area } from '../../types/models.types';
import {
  calculateWorkerStatus,
  calculateMapRegion,
  filterWorkersByArea,
  getAreaCircles,
  getStatusSummary,
} from '../../utils/mapUtils';
import config from '../../constants/config';

const SURABAYA_CENTER = {
  latitude: -7.2575,
  longitude: 112.7521,
};

/**
 * MapDashboardScreen - Main supervisor map view
 */
export function MapDashboardScreen(): React.JSX.Element {
  const mapRef = useRef<MapView>(null);

  // State
  const [workers, setWorkers] = useState<ActiveWorkerData[]>([]);
  const [areas, setAreas] = useState<Area[]>([]);
  const [selectedWorker, setSelectedWorker] = useState<ActiveWorkerData | null>(null);
  const [selectedAreaFilter, setSelectedAreaFilter] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch active workers data
   */
  const fetchWorkers = useCallback(async (showLoader = true) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      // Fetch with high limit to get all workers (backend is paginated)
      const response = await getActiveWorkers(1, 500);
      if (response.data) {
        setWorkers(response.data.data); // Response format: { data: [], meta: {} }
      }
    } catch (err) {
      console.error('Failed to fetch workers:', err);
      setError('Gagal memuat data pekerja');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  /**
   * Fetch areas data
   */
  const fetchAreas = useCallback(async () => {
    try {
      // Backend returns Area[] directly, not { areas: Area[] }
      const response = await get<Area[]>('/areas');
      if (response.data) {
        setAreas(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch areas:', err);
    }
  }, []);

  /**
   * Initial data load
   */
  useEffect(() => {
    fetchWorkers();
    fetchAreas();
  }, [fetchWorkers, fetchAreas]);

  /**
   * Setup auto-refresh interval
   */
  useEffect(() => {
    // Start auto-refresh every 2 minutes (configurable)
    refreshTimerRef.current = setInterval(() => {
      fetchWorkers(false); // Silent refresh
    }, config.MAP_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [fetchWorkers]);

  /**
   * Handle manual refresh
   */
  const handleRefresh = useCallback(() => {
    setRefreshing(true);
    fetchWorkers(false);
  }, [fetchWorkers]);

  /**
   * Handle marker press
   */
  const handleMarkerPress = useCallback((worker: ActiveWorkerData) => {
    setSelectedWorker(worker);
  }, []);

  /**
   * Handle close info card
   */
  const handleCloseInfoCard = useCallback(() => {
    setSelectedWorker(null);
  }, []);

  /**
   * Handle area filter change
   */
  const handleAreaFilterPress = useCallback(() => {
    // Show area filter options
    const options = [
      'Semua Area',
      ...areas.map(area => area.name),
      'Batal',
    ];

    Alert.alert(
      'Filter Area',
      'Pilih area untuk ditampilkan',
      [
        ...options.slice(0, -1).map((option, index) => ({
          text: option,
          onPress: () => {
            if (index === 0) {
              setSelectedAreaFilter(null);
            } else {
              setSelectedAreaFilter(areas[index - 1].id);
            }
          },
        })),
        { text: 'Batal', style: 'cancel' },
      ]
    );
  }, [areas]);

  /**
   * Fit map to show all markers
   */
  const handleFitToMarkers = useCallback(() => {
    const filteredWorkers = filterWorkersByArea(workers, selectedAreaFilter);
    const region = calculateMapRegion(filteredWorkers, SURABAYA_CENTER);

    mapRef.current?.animateToRegion(region, 500);
  }, [workers, selectedAreaFilter]);

  // Filter workers by selected area
  const filteredWorkers = filterWorkersByArea(workers, selectedAreaFilter);

  // Calculate status summary
  const statusSummary = getStatusSummary(filteredWorkers, areas);

  // Get area circles for overlay
  const areaCircles = getAreaCircles(areas);

  // Initial map region
  const initialRegion = calculateMapRegion(filteredWorkers, SURABAYA_CENTER);

  // Loading state
  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Memuat peta...</Text>
      </View>
    );
  }

  // Error state
  if (error && workers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchWorkers()}>
          <Text style={styles.retryButtonText}>Coba Lagi</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map */}
      <MapView
        ref={mapRef}
        provider={PROVIDER_GOOGLE}
        style={styles.map}
        initialRegion={initialRegion}
        showsUserLocation={false}
        showsMyLocationButton={false}
        toolbarEnabled={false}
      >
        {/* Area boundary circles */}
        {areaCircles.map(circle => (
          <Circle
            key={circle.key}
            center={circle.center}
            radius={circle.radius}
            strokeColor={colors.primary}
            strokeWidth={2}
            fillColor="rgba(46, 125, 50, 0.1)"
          />
        ))}

        {/* Worker markers */}
        {filteredWorkers.map(worker => (
          <WorkerMarker
            key={`worker-${worker.id}`}
            worker={worker}
            status={calculateWorkerStatus(worker, areas)}
            onPress={() => handleMarkerPress(worker)}
          />
        ))}
      </MapView>

      {/* Top controls */}
      <View style={styles.topControls}>
        {/* Status summary card */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
              <Text style={styles.summaryText}>{statusSummary.active}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.warning }]} />
              <Text style={styles.summaryText}>{statusSummary.warning}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: colors.error }]} />
              <Text style={styles.summaryText}>{statusSummary.outside}</Text>
            </View>
            <View style={styles.summarySeparator} />
            <Text style={styles.summaryTotal}>Total: {statusSummary.total}</Text>
          </View>
        </View>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleAreaFilterPress}
          >
            <Text style={styles.actionButtonText}>
              {selectedAreaFilter
                ? areas.find(a => a.id === selectedAreaFilter)?.name || 'Filter'
                : 'Semua Area'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator size="small" color={colors.primary} />
            ) : (
              <Text style={styles.actionButtonText}>Refresh</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleFitToMarkers}
          >
            <Text style={styles.actionButtonText}>Zoom</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Bottom worker list (scrollable) */}
      <View style={styles.bottomContainer}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.workerList}
          contentContainerStyle={styles.workerListContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[colors.primary]}
              tintColor={colors.primary}
            />
          }
        >
          {filteredWorkers.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>Tidak ada pekerja aktif</Text>
            </View>
          ) : (
            filteredWorkers.map(worker => {
              const status = calculateWorkerStatus(worker, areas);
              const statusColor =
                status === 'active' ? colors.success :
                status === 'warning' ? colors.warning :
                colors.error;

              return (
                <TouchableOpacity
                  key={`list-${worker.id}`}
                  style={styles.workerListItem}
                  onPress={() => handleMarkerPress(worker)}
                >
                  <View style={[styles.workerStatusDot, { backgroundColor: statusColor }]} />
                  <View style={styles.workerListItemContent}>
                    <Text style={styles.workerListName} numberOfLines={1}>
                      {worker.full_name}
                    </Text>
                    <Text style={styles.workerListArea} numberOfLines={1}>
                      {worker.shift.area.name}
                    </Text>
                  </View>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      </View>

      {/* Worker info card (slide-up) */}
      <WorkerInfoCard
        worker={selectedWorker}
        visible={selectedWorker !== null}
        onClose={handleCloseInfoCard}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: spacing.lg,
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
  errorText: {
    fontSize: typography.fontSize.base,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.md,
  },
  retryButtonText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.white,
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: spacing.md,
    right: spacing.md,
  },
  summaryCard: {
    backgroundColor: colors.white,
    borderRadius: borderRadius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: spacing.xs,
  },
  summaryText: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  summarySeparator: {
    flex: 1,
  },
  summaryTotal: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: colors.white,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    minHeight: touchTarget.minHeight,
    justifyContent: 'center',
    ...shadows.sm,
  },
  actionButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.primary,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.white,
    borderTopLeftRadius: borderRadius.lg,
    borderTopRightRadius: borderRadius.lg,
    ...shadows.lg,
  },
  workerList: {
    maxHeight: 100,
  },
  workerListContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  workerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.gray100,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.md,
    marginRight: spacing.sm,
    minWidth: 150,
  },
  workerStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: spacing.sm,
  },
  workerListItemContent: {
    flex: 1,
  },
  workerListName: {
    fontSize: typography.fontSize.base,
    fontWeight: typography.fontWeight.semibold,
    color: colors.textPrimary,
    marginBottom: 2,
  },
  workerListArea: {
    fontSize: typography.fontSize.sm,
    color: colors.textSecondary,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.lg,
  },
  emptyStateText: {
    fontSize: typography.fontSize.base,
    color: colors.textSecondary,
  },
});
