/**
 * MapDashboardScreen
 * Real-time map view showing active worker locations
 */

import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
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
  InteractionManager,
} from 'react-native';
import MapView, { Circle, PROVIDER_GOOGLE } from 'react-native-maps';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbTouchTarget,
} from '../../constants/nbTokens';
import { NBButton, NBCard } from '../../components/nb';
import { WorkerMarker } from '../../components/supervisor/WorkerMarker';
import { WorkerInfoCard } from '../../components/supervisor/WorkerInfoCard';
import { MapErrorBoundary } from '../../components/supervisor/MapErrorBoundary';
import { getActiveWorkers } from '../../services/api/supervisorApi';
import { get } from '../../services/api/apiClient';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import type { ActiveWorkerData } from '../../types/api.types';
import type { Area } from '../../types/models.types';
import {
  calculateWorkerStatus,
  calculateMapRegion,
  filterWorkersByArea,
  filterWorkersByRegion,
  getAreaCircles,
  getStatusSummary,
  clusterWorkers,
  shouldCluster,
  isValidRegion,
  SURABAYA_CITY_REGION,
  type WorkerCluster,
} from '../../utils/mapUtils';
import config from '../../constants/config';

// Use the centralized Surabaya city region from mapUtils
const SURABAYA_CENTER = {
  latitude: SURABAYA_CITY_REGION.latitude,
  longitude: SURABAYA_CITY_REGION.longitude,
};

// Performance constants
const INITIAL_FETCH_LIMIT = 50; // Load 50 workers initially for fast first render
const FULL_FETCH_LIMIT = 100; // Backend max limit is 100
const CLUSTER_THRESHOLD = 30; // Start clustering when more than 30 markers

/**
 * TODO: Performance Load Testing for 500 Workers (Issue #10)
 *
 * The clustering algorithm is optimized for O(n log n) complexity and includes
 * performance logging. To validate performance with 500 workers:
 *
 * 1. Create test data generator:
 *    - Generate 500 mock workers with realistic Surabaya GPS coordinates
 *    - Spread across multiple areas (Taman, Parks, RTH zones)
 *    - Include various active, warning, and outside statuses
 *
 * 2. Benchmark clustering performance:
 *    - Measure clustering time at different zoom levels
 *    - Test with different cluster radius values
 *    - Verify memory usage stays under 100MB
 *    - Check for any UI jank (should maintain 60fps)
 *
 * 3. Expected performance targets:
 *    - Clustering: <50ms for 500 workers
 *    - Initial render: <100ms
 *    - Scroll/zoom: smooth at 60fps
 *    - Memory: <100MB total
 *
 * 4. Test scenarios:
 *    - All workers in one area (worst case for clustering)
 *    - Workers evenly distributed across Surabaya
 *    - Rapid zoom in/out operations
 *    - Network toggle while viewing map
 *
 * Performance logs are automatically generated when clustering runs.
 * Check console for "[MapUtils] Clustering performance" and
 * "[MapDashboard] Total clustering time" messages.
 */

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
  const [mapReady, setMapReady] = useState(false); // Delay MapView rendering to avoid native crash
  const [currentRegion, setCurrentRegion] = useState<{
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  } | null>(null);
  const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

  // Auto-refresh timer
  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  /**
   * Fetch active workers data with progressive loading
   * First load limited data for fast initial render, then load remaining in background
   */
  const fetchWorkers = useCallback(async (showLoader = true, fullLoad = false) => {
    try {
      if (showLoader) {
        setLoading(true);
      }
      setError(null);

      // Initial load: fetch limited data for fast first render
      const limit = fullLoad ? FULL_FETCH_LIMIT : INITIAL_FETCH_LIMIT;
      const response = await getActiveWorkers(1, limit);
      if (response.data) {
        setWorkers(response.data.data); // Response format: { data: [], meta: {} }

        // If initial load and more data available, fetch remaining in background
        if (!fullLoad && response.data.meta && response.data.meta.total > INITIAL_FETCH_LIMIT) {
          setIsInitialLoadComplete(true);
          // Background fetch for remaining data
          setTimeout(async () => {
            try {
              const fullResponse = await getActiveWorkers(1, FULL_FETCH_LIMIT);
              if (fullResponse.data) {
                setWorkers(fullResponse.data.data);
              }
            } catch (bgErr) {
              console.warn('Background worker fetch failed:', bgErr);
            }
          }, 100); // Small delay to let UI render first
        }
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
   * Delay MapView rendering until React Native bridge is fully initialized
   * This prevents NullPointerException on native module initialization
   */
  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      setMapReady(true);
    });

    return () => task.cancel();
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
   * Use ref to store latest fetchWorkers to avoid stale closures
   */
  const fetchWorkersRef = useRef(fetchWorkers);

  useEffect(() => {
    fetchWorkersRef.current = fetchWorkers;
  }, [fetchWorkers]);

  useEffect(() => {
    // Start auto-refresh every 2 minutes (configurable)
    refreshTimerRef.current = setInterval(() => {
      fetchWorkersRef.current(false); // Silent refresh using latest function
    }, config.MAP_REFRESH_INTERVAL);

    // Cleanup on unmount
    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
        refreshTimerRef.current = null;
      }
    };
  }, []); // Empty deps - only set up once

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
   * Handle map region change for region-based filtering
   */
  const handleRegionChange = useCallback((region: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  }) => {
    setCurrentRegion(region);
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

  // Memoized: Filter workers by selected area
  const filteredWorkers = useMemo(
    () => filterWorkersByArea(workers, selectedAreaFilter),
    [workers, selectedAreaFilter]
  );

  // Memoized: Calculate status summary (from all filtered workers, not just visible)
  const statusSummary = useMemo(
    () => getStatusSummary(filteredWorkers, areas),
    [filteredWorkers, areas]
  );

  // Memoized: Calculate role counts (Phase 2 enhancement)
  const roleCounts = useMemo(() => {
    const workers = filteredWorkers.filter(w => !w.role || w.role === 'worker').length;
    const linmas = filteredWorkers.filter(w => w.role === 'linmas').length;
    return { workers, linmas };
  }, [filteredWorkers]);

  // Memoized: Get area circles for overlay
  const areaCircles = useMemo(
    () => getAreaCircles(areas),
    [areas]
  );

  // Memoized: Initial map region
  const initialRegion = useMemo(
    () => calculateMapRegion(filteredWorkers, SURABAYA_CENTER),
    [filteredWorkers]
  );

  // Memoized: Determine if clustering should be applied - validate region first
  const regionForClustering = currentRegion || initialRegion;
  const hasValidRegion = useMemo(
    () => isValidRegion(regionForClustering),
    [regionForClustering]
  );

  const useClustering = useMemo(
    () => hasValidRegion && shouldCluster(regionForClustering, filteredWorkers.length, CLUSTER_THRESHOLD),
    [hasValidRegion, regionForClustering, filteredWorkers.length]
  );

  // Memoized: Compute clusters or individual markers based on zoom level with performance tracking
  const clusters = useMemo(
    () => {
      if (useClustering && hasValidRegion) {
        const startTime = performance.now();
        const result = clusterWorkers(filteredWorkers, regionForClustering);
        const duration = performance.now() - startTime;

        // Log overall clustering operation including memoization overhead
        console.log(
          `[MapDashboard] Total clustering time: ${duration.toFixed(2)}ms for ${filteredWorkers.length} workers → ${result.length} clusters`
        );

        return result;
      }
      return [];
    },
    [useClustering, hasValidRegion, filteredWorkers, regionForClustering]
  );

  // Memoized: For non-clustered view, limit visible markers based on region
  const visibleWorkers = useMemo(
    () => useClustering
      ? [] // Using clusters instead
      : (currentRegion && isValidRegion(currentRegion))
        ? filterWorkersByRegion(filteredWorkers, currentRegion)
        : filteredWorkers,
    [useClustering, currentRegion, filteredWorkers]
  );

  // Loading state - show while data is loading OR map is not ready
  if (loading || !mapReady) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={nbColors.primary} />
        <Text style={styles.loadingText}>Memuat peta...</Text>
      </View>
    );
  }

  // Error state
  if (error && workers.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <NBButton
          title="Coba Lagi"
          onPress={() => fetchWorkers()}
          variant="primary"
          style={styles.retryButton}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Map with Error Boundary */}
      <MapErrorBoundary onReset={() => fetchWorkers()}>
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={styles.map}
          initialRegion={initialRegion}
          showsUserLocation={false}
          showsMyLocationButton={false}
          toolbarEnabled={false}
          onRegionChangeComplete={handleRegionChange}
        >
        {/* Area boundary circles */}
        {areaCircles.map(circle => (
          <Circle
            key={circle.key}
            center={circle.center}
            radius={circle.radius}
            strokeColor={nbColors.primary}
            strokeWidth={2}
            fillColor="rgba(46, 125, 50, 0.1)"
          />
        ))}

        {/* Clustered markers when zoomed out */}
        {useClustering && clusters.map(cluster => (
          <WorkerMarker
            key={cluster.id}
            worker={cluster.workers[0]}
            status={calculateWorkerStatus(cluster.workers[0], areas)}
            onPress={() => {
              // Zoom in to cluster area when cluster has multiple workers
              if (cluster.pointCount > 1 && mapRef.current) {
                mapRef.current.animateToRegion({
                  ...cluster.coordinate,
                  latitudeDelta: regionForClustering.latitudeDelta / 3,
                  longitudeDelta: regionForClustering.longitudeDelta / 3,
                }, 300);
              } else {
                handleMarkerPress(cluster.workers[0]);
              }
            }}
            clusterCount={cluster.pointCount > 1 ? cluster.pointCount : undefined}
          />
        ))}

        {/* Individual worker markers when zoomed in */}
        {!useClustering && visibleWorkers.map(worker => (
          <WorkerMarker
            key={`worker-${worker.id}`}
            worker={worker}
            status={calculateWorkerStatus(worker, areas)}
            onPress={() => handleMarkerPress(worker)}
          />
        ))}
        </MapView>
      </MapErrorBoundary>

      {/* Top controls */}
      <View style={styles.topControls}>
        {/* Status summary card with role breakdown */}
        <NBCard variant="elevated" style={styles.summaryCard}>
          {/* Status row */}
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: nbColors.success }]} />
              <Text style={styles.summaryText}>{statusSummary.active}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: nbColors.warning }]} />
              <Text style={styles.summaryText}>{statusSummary.warning}</Text>
            </View>
            <View style={styles.summaryItem}>
              <View style={[styles.statusDot, { backgroundColor: nbColors.danger }]} />
              <Text style={styles.summaryText}>{statusSummary.outside}</Text>
            </View>
            <View style={styles.summarySeparator} />
            <Text style={styles.summaryTotal}>Total: {statusSummary.total}</Text>
          </View>
          {/* Role breakdown row (Phase 2) */}
          <View style={styles.roleRow}>
            <View style={styles.roleItem}>
              <MaterialCommunityIcons name="account-hard-hat" size={16} color={nbColors.primary} />
              <Text style={styles.roleText}>Satgas: {roleCounts.workers}</Text>
            </View>
            <View style={styles.roleItem}>
              <MaterialCommunityIcons name="shield-account" size={16} color={nbColors.navy} />
              <Text style={styles.roleText}>Linmas: {roleCounts.linmas}</Text>
            </View>
          </View>
        </NBCard>

        {/* Action buttons */}
        <View style={styles.actionButtons}>
          <NBButton
            title={selectedAreaFilter
              ? areas.find(a => a.id === selectedAreaFilter)?.name || 'Filter'
              : 'Semua Area'}
            onPress={handleAreaFilterPress}
            variant="secondary"
            size="sm"
            style={styles.actionButton}
          />

          <NBButton
            title="Perbarui"
            onPress={handleRefresh}
            disabled={refreshing}
            loading={refreshing}
            variant="secondary"
            size="sm"
            style={styles.actionButton}
          />

          <NBButton
            title="Perbesar"
            onPress={handleFitToMarkers}
            variant="secondary"
            size="sm"
            style={styles.actionButton}
          />
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
              colors={[nbColors.primary]}
              tintColor={nbColors.primary}
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
              let statusColor: string;
              if (status === 'active') {
                statusColor = nbColors.success;
              } else if (status === 'warning') {
                statusColor = nbColors.warning;
              } else {
                statusColor = nbColors.danger;
              }
              const isLinmas = worker.role === 'linmas';
              const roleIcon = isLinmas ? 'shield-account' : 'account-hard-hat';
              const roleColor = isLinmas ? nbColors.navy : nbColors.primary;

              return (
                <TouchableOpacity
                  key={`list-${worker.id}`}
                  style={styles.workerListItem}
                  onPress={() => handleMarkerPress(worker)}
                >
                  <View style={[styles.workerStatusDot, { backgroundColor: statusColor }]} />
                  <MaterialCommunityIcons name={roleIcon} size={16} color={roleColor} style={styles.workerRoleIcon} />
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
    backgroundColor: nbColors.gray[50],
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.gray[50],
    padding: nbSpacing.lg,
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[500],
  },
  errorText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.danger,
    textAlign: 'center',
    marginBottom: nbSpacing.md,
  },
  retryButton: {
    backgroundColor: nbColors.primary,
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.md,
    borderRadius: 0,
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
  },
  retryButtonText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.white,
  },
  topControls: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 60 : 20,
    left: nbSpacing.md,
    right: nbSpacing.md,
  },
  summaryCard: {
    backgroundColor: nbColors.white,
    borderRadius: 0,
    padding: nbSpacing.md,
    marginBottom: nbSpacing.sm,
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: nbSpacing.md,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6, // Keep circular for status dots
    marginRight: nbSpacing.xs,
  },
  summaryText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray[700],
  },
  summarySeparator: {
    flex: 1,
  },
  summaryTotal: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray[700],
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: nbSpacing.sm,
    paddingTop: nbSpacing.sm,
    borderTopWidth: nbBorders.thin,
    borderTopColor: nbColors.gray[300],
  },
  roleItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: nbSpacing.lg,
  },
  roleText: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[500],
    marginLeft: nbSpacing.xs,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: nbSpacing.sm,
  },
  actionButton: {
    flex: 1,
    backgroundColor: nbColors.white,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: 0,
    alignItems: 'center',
    minHeight: nbTouchTarget.minHeight,
    justifyContent: 'center',
    borderWidth: nbBorders.default,
    borderColor: nbColors.black,
    ...nbShadows.sm,
  },
  actionButtonText: {
    fontSize: nbTypography.fontSize.sm,
    fontWeight: nbTypography.fontWeight.medium,
    color: nbColors.primary,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: nbColors.white,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    borderTopWidth: nbBorders.default,
    borderTopColor: nbColors.black,
    ...nbShadows.lg,
  },
  workerList: {
    maxHeight: 100,
  },
  workerListContent: {
    padding: nbSpacing.md,
    gap: nbSpacing.sm,
  },
  workerListItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: nbColors.gray[100],
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    borderRadius: 0,
    marginRight: nbSpacing.sm,
    minWidth: 150,
    borderWidth: nbBorders.thin,
    borderColor: nbColors.black,
  },
  workerStatusDot: {
    width: 10,
    height: 10,
    borderRadius: 5, // Keep circular for status dots
    marginRight: nbSpacing.xs,
  },
  workerRoleIcon: {
    marginRight: nbSpacing.sm,
  },
  workerListItemContent: {
    flex: 1,
  },
  workerListName: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.semibold,
    color: nbColors.gray[700],
    marginBottom: 2,
  },
  workerListArea: {
    fontSize: nbTypography.fontSize.sm,
    color: nbColors.gray[500],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: nbSpacing.lg,
  },
  emptyStateText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray[500],
  },
});
