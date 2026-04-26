/**
 * MapDashboardScreen
 * Phase 2D: Four-status model, polygon boundaries, FAB controls,
 * StatusSummaryBar, UserListStrip, UserDetailSheet, LocationTrail.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { featureFlags } from '../../utils/featureFlags';
import { ClusteredUserMarkers } from '../../components/monitoring/ClusteredUserMarkers';
import { MonitoringToggleSheet } from '../../components/monitoring/MonitoringToggleSheet';
import { AreaStatusOverlay } from '../../components/monitoring/AreaStatusOverlay';
import { PlantOverlayLayer } from '../../components/monitoring/PlantOverlayLayer';
import {
  toggleLayer,
} from '../../store/slices/monitoringV2Slice';
import type { MonitoringV2VisibleLayers } from '../../store/slices/monitoringV2Slice';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import Geolocation from 'react-native-geolocation-service';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbBorderRadius,
} from '../../constants/nbTokens';
import { NBBackgroundPattern } from '../../components/nb';
import { UserMarker, type LabelMode } from '../../components/monitoring/UserMarker';
import { MapErrorBoundary } from '../../components/monitoring/MapErrorBoundary';
import { StatusSummaryBar } from '../../components/monitoring/StatusSummaryBar';
import { UserListStrip } from '../../components/monitoring/UserListStrip';
import { UserDetailSheet } from '../../components/monitoring/UserDetailSheet';
import { LocationTrail } from '../../components/monitoring/LocationTrail';
import { MonitoringFilterModal } from '../../components/modals/MonitoringFilterModal';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import {
  SURABAYA_CITY_REGION,
  shouldCluster,
  clusterUsers,
} from '../../utils/mapUtils';
import type { AppDispatch, RootState } from '../../store/store';
import type { LiveUser, TrackingStatus, UserRole } from '../../types/models.types';
import type { MonitoringFilters } from '../../types/api.types';
import {
  setLiveUsers,
  setSelectedUser,
  setMonitoringFilters,
  resetMonitoringFilters,
  fetchUserDaySummary,
  fetchBoundaries,
  fetchStaffingSummary,
  updateLiveUser,
} from '../../store/slices/monitoringSlice';
import { getLiveUsers } from '../../services/api/monitoringApi';
import websocketService from '../../services/websocket/websocketService';
import type { UserLocationEvent } from '../../services/websocket/websocketService';
import { BoundaryOverlay } from '../../components/monitoring/BoundaryOverlay';
import { BoundaryDetailModal } from '../../components/modals/BoundaryDetailModal';
import { useMapAutoFocus } from '../../hooks/useMapAutoFocus';
import type { RayonBoundary, AreaBoundary } from '../../types/models.types';

// ─── Component ────────────────────────────────────────────────────────────────

export function MapDashboardScreen(): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const dispatch = useDispatch<AppDispatch>();

  // Monitoring slice state
  const {
    liveUsers,
    statusCounts,
    selectedUser,
    filters,
    userDaySummary,
    isLoadingDaySummary,
    isLoading,
    error,
    boundaries,
  } = useSelector((state: RootState) => state.monitoring);

  const currentUser = useSelector((state: RootState) => state.auth.user);

  // MonitoringV2 slice state (Phase 3 sub-phase 3-5)
  const visibleLayers = useSelector(
    (state: RootState) => state.monitoringV2.visibleLayers,
  );
  const clusterZoomThreshold = useSelector(
    (state: RootState) => state.monitoringV2.clusterZoomThreshold,
  );

  // Local UI state
  const [toggleSheetVisible, setToggleSheetVisible] = useState(false);
  const [mapReady, setMapReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [trailUser, setTrailUser] = useState<LiveUser | null>(null);
  const [trailHideOthers, setTrailHideOthers] = useState(false);
  const [currentRegion, setCurrentRegion] = useState(SURABAYA_CITY_REGION);
  const [boundaryDetailVisible, setBoundaryDetailVisible] = useState(false);
  const [boundaryDetailType, setBoundaryDetailType] = useState<'rayon' | 'area'>('area');
  const [boundaryDetailData, setBoundaryDetailData] = useState<RayonBoundary | AreaBoundary | null>(null);
  // Incremented on focus and on manual refresh to force BoundaryOverlay remount,
  // ensuring Android native Polygon/Circle overlays are recreated when tabs switch.
  const [boundaryKey, setBoundaryKey] = useState(0);

  // Auto-focus on filter changes
  useMapAutoFocus(mapRef, filters, boundaries, liveUsers);

  // Fetch live users on mount and when filters change
  useEffect(() => {
    void fetchLiveUsersWithFilters(filters);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps


  // WebSocket: subscribe to real-time user updates
  useEffect(() => {
    let mounted = true;

    const setupWebSocket = async () => {
      const connected = await websocketService.connect();
      if (!connected || !mounted) return;
    };

    void setupWebSocket();

    const unsubLocation = websocketService.onUserLocation((data: UserLocationEvent) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        latitude: data.latitude,
        longitude: data.longitude,
        status: data.status as TrackingStatus,
        battery_level: data.battery_level,
        last_update: typeof data.timestamp === 'string' ? data.timestamp : new Date(data.timestamp).toISOString(),
        is_within_area: data.is_within_area,
      }));
    });

    const unsubStatus = websocketService.onUserStatusChanged((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        status: data.new_status as TrackingStatus,
      }));
    });

    const unsubLeftArea = websocketService.onUserLeftArea((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        is_within_area: false,
        outside_boundary: true,
      }));
    });

    const unsubEnteredArea = websocketService.onUserEnteredArea((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        is_within_area: true,
        outside_boundary: false,
      }));
    });

    const unsubReassigned = websocketService.onUserReassigned((data) => {
      if (!mounted) return;
      dispatch(updateLiveUser({
        id: data.user_id,
        area_id: data.new_area_id,
        area_name: data.new_area_name,
      }));
      dispatch(fetchBoundaries());
    });

    const unsubStaffing = websocketService.onAreaStaffingChanged(() => {
      if (!mounted) return;
      dispatch(fetchStaffingSummary(undefined));
    });

    return () => {
      mounted = false;
      unsubLocation();
      unsubStatus();
      unsubLeftArea();
      unsubEnteredArea();
      unsubReassigned();
      unsubStaffing();
    };
  }, [dispatch]);

  const fetchLiveUsersWithFilters = useCallback(
    async (currentFilters: MonitoringFilters) => {
      const filterPayload = { ...currentFilters };
      if (statusFilter) {
        filterPayload.status = [statusFilter];
      }
      try {
        const res = await getLiveUsers(filterPayload);
        if (res.data?.users) {
          dispatch(setLiveUsers(res.data.users));
        }
      } catch {
        // handled via slice error state
      }
    },
    [dispatch, statusFilter],
  );

  // Refresh boundaries + users whenever this tab gains focus.
  // Also increments boundaryKey to force BoundaryOverlay remount, since Android
  // drops native Polygon/Circle overlays when the MapView is hidden by tab switching.
  useFocusEffect(
    useCallback(() => {
      dispatch(fetchBoundaries());
      void fetchLiveUsersWithFilters(filters);
      setBoundaryKey(k => k + 1);
    }, [dispatch, filters, fetchLiveUsersWithFilters]),
  );

  const handleRefresh = useCallback(() => {
    dispatch(fetchBoundaries());
    void fetchLiveUsersWithFilters(filters);
    setBoundaryKey(k => k + 1);
  }, [dispatch, fetchLiveUsersWithFilters, filters]);

  // Filtered users for display
  const visibleUsers = React.useMemo(() => {
    if (!Array.isArray(liveUsers)) { return []; }
    let users = liveUsers.filter(u => u.status !== 'offline');
    if (statusFilter) {
      users = users.filter(u => u.status === statusFilter);
    }
    return users;
  }, [liveUsers, statusFilter]);

  const useClustering = React.useMemo(
    () => shouldCluster(currentRegion, visibleUsers.length),
    [currentRegion, visibleUsers.length],
  );

  const clusters = React.useMemo(
    () =>
      useClustering
        ? clusterUsers(
            visibleUsers.map(u => ({
              id: u.id,
              username: u.full_name,
              full_name: u.full_name,
              role: u.role as UserRole,
              shift: { id: u.shift_id, clock_in_time: u.clock_in_time, area: { id: u.area_id ?? '', name: u.area_name } },
              latest_location: { gps_lat: u.latitude, gps_lng: u.longitude, logged_at: u.last_update },
            })),
            currentRegion,
          )
        : [],
    [useClustering, visibleUsers, currentRegion],
  );

  // Derive a discrete label mode from the current zoom level. Passing this enum
  // (not the raw latitudeDelta float) to UserMarker prevents re-renders on every
  // map pan — only the 3 threshold crossings trigger a re-render + bitmap redraw.
  // Including labelMode in the marker key ensures tracksViewChanges={false} never
  // serves a stale (wrong-size) bitmap when the label appears or disappears.
  const labelMode = React.useMemo<LabelMode>(() => {
    const delta = currentRegion.latitudeDelta;
    if (delta >= 0.015) { return 'none'; }
    if (delta > 0.005) { return 'abbrev'; }
    return 'full';
  }, [currentRegion.latitudeDelta]);

  // Marker press
  const handleMarkerPress = useCallback(
    (user: LiveUser) => {
      dispatch(setSelectedUser(user));
      dispatch(fetchUserDaySummary(user.id));
    },
    [dispatch],
  );

  const handleCloseSheet = useCallback(() => {
    dispatch(setSelectedUser(null));
  }, [dispatch]);

  const handleTrailPress = useCallback((user: LiveUser) => {
    setTrailUser(user);
    setShowTrail(true);
  }, []);

  const handleCloseTrail = useCallback(() => {
    setShowTrail(false);
    setTrailUser(null);
    setTrailHideOthers(false);
  }, []);

  const handleRayonPress = useCallback((rayon: RayonBoundary) => {
    setBoundaryDetailType('rayon');
    setBoundaryDetailData(rayon);
    setBoundaryDetailVisible(true);
  }, []);

  const handleAreaPress = useCallback((area: AreaBoundary) => {
    setBoundaryDetailType('area');
    setBoundaryDetailData(area);
    setBoundaryDetailVisible(true);
  }, []);

  const handleMyLocation = useCallback(() => {
    Geolocation.getCurrentPosition(
      pos => {
        mapRef.current?.animateToRegion(
          {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            latitudeDelta: 0.01,
            longitudeDelta: 0.01,
          },
          300,
        );
      },
      () => {},
      { enableHighAccuracy: true, timeout: 5000 },
    );
  }, []);

  const handleZoomIn = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta / 2,
        longitudeDelta: currentRegion.longitudeDelta / 2,
      },
      200,
    );
  }, [currentRegion]);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        ...currentRegion,
        latitudeDelta: currentRegion.latitudeDelta * 2,
        longitudeDelta: currentRegion.longitudeDelta * 2,
      },
      200,
    );
  }, [currentRegion]);

  const handleApplyFilters = useCallback(
    (newFilters: MonitoringFilters) => {
      dispatch(setMonitoringFilters(newFilters));
    },
    [dispatch],
  );

  // MonitoringV2: layer toggle handler
  const handleToggleLayer = useCallback(
    (layer: keyof MonitoringV2VisibleLayers) => {
      dispatch(toggleLayer(layer));
    },
    [dispatch],
  );

  // MonitoringV2: cluster press — zoom into cluster center without racing bottom-sheet
  const handleClusterPress = useCallback(
    (center: { latitude: number; longitude: number }) => {
      mapRef.current?.animateToRegion(
        {
          latitude: center.latitude,
          longitude: center.longitude,
          latitudeDelta: currentRegion.latitudeDelta / 3,
          longitudeDelta: currentRegion.longitudeDelta / 3,
        },
        300,
      );
    },
    [currentRegion],
  );

  if (isLoading && (!liveUsers || liveUsers.length === 0)) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <Text style={styles.loadingText}>Memuat peta...</Text>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (error && (!liveUsers || liveUsers.length === 0)) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.background}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.centerContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <Text style={styles.retryText}>Coba Lagi</Text>
          </TouchableOpacity>
        </View>
      </NBBackgroundPattern>
    );
  }

  return (
    <NBBackgroundPattern
      pattern="dots"
      backgroundColor={nbColors.background}
      patternColor={nbColors.primary}
      opacity={0.06}
    >
      <View style={styles.container}>
        {/* Status Summary Bar */}
        <StatusSummaryBar
          statusCounts={statusCounts}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
        />

        {/* Map */}
        <View style={styles.mapContainer}>
          <MapErrorBoundary onReset={handleRefresh}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              userInterfaceStyle="light"
              style={styles.map}
              initialRegion={SURABAYA_CITY_REGION}
              showsUserLocation={false}
              showsMyLocationButton={false}
              toolbarEnabled={false}
              mapPadding={{ top: 0, right: 64, bottom: 0, left: 0 }}
              onMapReady={() => {
                setMapReady(true);
                mapRef.current?.animateToRegion(SURABAYA_CITY_REGION, 0);
              }}
              onRegionChangeComplete={setCurrentRegion}
            >
              {/* Boundary overlays */}
              {mapReady && boundaries && (
                <BoundaryOverlay
                  key={boundaryKey}
                  rayons={boundaries.rayons}
                  onRayonPress={handleRayonPress}
                  onAreaPress={handleAreaPress}
                />
              )}

              {/* Phase 3: Area status overlay (plant health tints) */}
              {mapReady && boundaries && visibleLayers.areas && (
                <AreaStatusOverlay
                  rayons={boundaries.rayons}
                  boundaryKey={boundaryKey}
                />
              )}

              {/* Phase 3: Plant notable markers (stub until sub-phase 3-8) */}
              {mapReady && (
                <PlantOverlayLayer visible={visibleLayers.plants} />
              )}

              {/* User markers — Phase 3: ClusteredUserMarkers when flag enabled */}
              {featureFlags.clusterMarkersV2 ? (
                <ClusteredUserMarkers
                  workers={visibleUsers}
                  zoom={currentRegion.latitudeDelta}
                  clusterZoomThreshold={clusterZoomThreshold}
                  labelMode={labelMode}
                  selectedUserId={selectedUser?.id ?? null}
                  onUserPress={userId => {
                    const user = visibleUsers.find(u => u.id === userId);
                    if (user) { handleMarkerPress(user); }
                  }}
                  onClusterPress={handleClusterPress}
                />
              ) : (
                <>
                  {/* User markers (individual) — legacy Phase 2D path */}
                  {!useClustering && visibleUsers.map(user => (
                    <UserMarker
                      key={`user-${user.id}-${user.status}-${labelMode}`}
                      user={user}
                      onPress={handleMarkerPress}
                      labelMode={labelMode}
                      dimmed={trailHideOthers && trailUser?.id !== user.id}
                    />
                  ))}

                  {/* Cluster markers — legacy Phase 2D path */}
                  {useClustering && clusters.map(cluster => {
                    const representative: LiveUser = cluster.workers.length > 0
                      ? {
                          ...cluster.workers[0],
                          id: cluster.id,
                          latitude: cluster.coordinate.latitude,
                          longitude: cluster.coordinate.longitude,
                          full_name: `${cluster.pointCount} petugas`,
                        } as unknown as LiveUser
                      : null as unknown as LiveUser;
                    if (!representative) { return null; }
                    return (
                      <UserMarker
                        key={cluster.id}
                        user={representative}
                        onPress={() => handleClusterPress(cluster.coordinate)}
                        clusterCount={cluster.pointCount}
                        labelMode={labelMode}
                      />
                    );
                  })}
                </>
              )}

              {/* Location trail overlay */}
              {showTrail && trailUser && (
                <LocationTrail
                  key={trailUser.id}
                  userId={trailUser.id}
                  date={new Date().toISOString().split('T')[0]}
                  shiftId={trailUser.shift_id}
                  mapRef={mapRef}
                  onClose={handleCloseTrail}
                  onHideOthersChange={setTrailHideOthers}
                />
              )}
            </MapView>
          </MapErrorBoundary>

          {/* FAB column — right side */}
          <View style={styles.fabColumn}>
            <FabButton
              icon="filter-variant"
              onPress={() => setFilterModalVisible(true)}
              accessibilityLabel="Filter"
            />
            {/* Phase 3: Layer visibility toggle */}
            <FabButton
              icon="layers"
              onPress={() => setToggleSheetVisible(true)}
              accessibilityLabel="Tampilan peta"
            />
            <FabButton
              icon="crosshairs-gps"
              onPress={handleMyLocation}
              accessibilityLabel="Lokasi saya"
            />
            <FabButton
              icon="plus"
              onPress={handleZoomIn}
              accessibilityLabel="Perbesar"
            />
            <FabButton
              icon="minus"
              onPress={handleZoomOut}
              accessibilityLabel="Perkecil"
            />
            <FabButton
              icon="refresh"
              onPress={handleRefresh}
              accessibilityLabel="Perbarui"
            />
          </View>
        </View>

        {/* Bottom user strip */}
        <UserListStrip users={visibleUsers} onUserPress={handleMarkerPress} />

        {/* User detail bottom sheet */}
        <UserDetailSheet
          user={selectedUser}
          daySummary={userDaySummary}
          isLoadingDaySummary={isLoadingDaySummary}
          onClose={handleCloseSheet}
          onTrailPress={handleTrailPress}
        />

        {/* Filter modal */}
        {currentUser && (
          <MonitoringFilterModal
            visible={filterModalVisible}
            onClose={() => setFilterModalVisible(false)}
            onApply={handleApplyFilters}
            currentFilters={filters}
            currentUser={currentUser}
          />
        )}

        {/* Boundary detail modal */}
        <BoundaryDetailModal
          type={boundaryDetailType}
          data={boundaryDetailData}
          visible={boundaryDetailVisible}
          onClose={() => setBoundaryDetailVisible(false)}
        />

        {/* Phase 3: Layer visibility toggle sheet */}
        <MonitoringToggleSheet
          visible={toggleSheetVisible}
          visibleLayers={visibleLayers}
          onToggleLayer={handleToggleLayer}
          onClose={() => setToggleSheetVisible(false)}
        />
      </View>
    </NBBackgroundPattern>
  );
}

// ─── FabButton sub-component ──────────────────────────────────────────────────

interface FabButtonProps {
  icon: string;
  onPress: () => void;
  accessibilityLabel: string;
}

function FabButton({ icon, onPress, accessibilityLabel }: FabButtonProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={styles.fab}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
    >
      <MaterialCommunityIcons name={icon} size={20} color={nbColors.black} />
    </TouchableOpacity>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
    padding: nbSpacing.lg,
  },
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: nbSpacing.md,
    fontSize: nbTypography.fontSize.base,
    color: nbColors.gray['500'],
  },
  errorText: {
    fontSize: nbTypography.fontSize.base,
    color: nbColors.dangerDark,
    textAlign: 'center',
    marginBottom: nbSpacing.md,
  },
  retryButton: {
    backgroundColor: nbColors.primary,
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.md,
    borderRadius: nbBorderRadius.base,
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
  },
  retryText: {
    fontSize: nbTypography.fontSize.base,
    fontWeight: nbTypography.fontWeight.bold,
    color: nbColors.black,
  },
  fabColumn: {
    position: 'absolute',
    right: nbSpacing.md,
    top: 0,
    bottom: 0,
    justifyContent: 'center',
    gap: nbSpacing.sm,
    pointerEvents: 'box-none',
  },
  fab: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: nbColors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: nbBorders.base,
    borderColor: nbColors.black,
    ...nbShadows.md,
  },
});
