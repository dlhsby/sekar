/**
 * MapDashboardScreen
 * Phase 2D: Four-status model, polygon boundaries, FAB controls,
 * StatusSummaryBar, UserDetailSheet, LocationTrail.
 * Phase 2E: Trail crash fix, FAB repositioning, status peek sheet, search bar,
 * marker zIndex precision.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  ScrollView,
  Pressable,
} from 'react-native';
import BottomSheet from '@gorhom/bottom-sheet';
import { featureFlags } from '../../utils/featureFlags';
import { ClusteredUserMarkers } from '../../components/monitoring/ClusteredUserMarkers';
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
  nbSpacing,
  nbShadows,
  nbBorders,
  nbRadius,
} from '../../constants/nbTokens';
import { NBBackgroundPattern } from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { UserMarker, type LabelMode } from '../../components/monitoring/UserMarker';
import { MapErrorBoundary } from '../../components/monitoring/MapErrorBoundary';
import { MonitoringStatusSheet } from '../../components/monitoring/MonitoringStatusSheet';
import { MonitoringSearchBar } from '../../components/monitoring/MonitoringSearchBar';
import { UserDetailSheet } from '../../components/monitoring/UserDetailSheet';
import { LocationTrailModal } from '../../components/monitoring/LocationTrailModal';
import { MapFab } from '../../components/monitoring/MapFab';
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

// ─── Constants ────────────────────────────────────────────────────────────────

const PEEK_HEIGHT = 88;

// ─── Component ────────────────────────────────────────────────────────────────

export function MapDashboardScreen(): React.JSX.Element {
  const mapRef = useRef<MapView>(null);
  const statusSheetRef = useRef<BottomSheet>(null);
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
  const [mapReady, setMapReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [trailUser, setTrailUser] = useState<LiveUser | null>(null);
  const [currentRegion, setCurrentRegion] = useState(SURABAYA_CITY_REGION);
  const [boundaryDetailVisible, setBoundaryDetailVisible] = useState(false);
  const [boundaryDetailType, setBoundaryDetailType] = useState<'rayon' | 'area'>('area');
  const [boundaryDetailData, setBoundaryDetailData] = useState<RayonBoundary | AreaBoundary | null>(null);
  // Incremented on focus and on manual refresh to force BoundaryOverlay remount,
  // ensuring Android native Polygon/Circle overlays are recreated when tabs switch.
  const [boundaryKey, setBoundaryKey] = useState(0);
  // MON-3: Tools FAB expanded state
  const [toolsExpanded, setToolsExpanded] = useState(false);

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

  // Status filtering stays purely client-side (see `visibleUsers` below) so the
  // statusCounts shown on the peek bar always reflect the GLOBAL roster, not
  // just the currently-filtered subset. Sending `status` to the API would make
  // every other count drop to zero whenever a single chip is active.
  const fetchLiveUsersWithFilters = useCallback(
    async (currentFilters: MonitoringFilters) => {
      try {
        const res = await getLiveUsers(currentFilters);
        if (res.data?.users) {
          dispatch(setLiveUsers(res.data.users));
        }
      } catch {
        // handled via slice error state
      }
    },
    [dispatch],
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

  // Filtered users for display.
  // Phase 3 fix: respect `visibleLayers.workers` so toggling Petugas off in
  // MonitoringToggleSheet hides every marker (otherwise the toggle was a
  // no-op against the map render path).
  const visibleUsers = React.useMemo(() => {
    if (!visibleLayers.workers) { return []; }
    if (!Array.isArray(liveUsers)) { return []; }
    let users = liveUsers.filter(u => u.status !== 'offline');
    if (statusFilter) {
      users = users.filter(u => u.status === statusFilter);
    }
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      users = users.filter(u =>
        u.full_name?.toLowerCase().includes(q) ||
        u.username?.toLowerCase().includes(q),
      );
    }
    return users;
  }, [liveUsers, statusFilter, visibleLayers.workers, searchQuery]);

  const staffedAreas = useMemo(() => {
    if (!Array.isArray(liveUsers)) { return 0; }
    const ids = new Set(
      liveUsers.filter(u => u.status === 'active' && u.area_id).map(u => u.area_id),
    );
    return ids.size;
  }, [liveUsers]);

  const totalAreas = useMemo(() => {
    if (!boundaries?.rayons) { return 0; }
    return boundaries.rayons.reduce((sum, r) => sum + (r.areas?.length ?? 0), 0);
  }, [boundaries]);

  const lastUpdated = useMemo(() => {
    if (!Array.isArray(liveUsers) || liveUsers.length === 0) { return null; }
    const timestamps = liveUsers
      .map(u => u.last_update)
      .filter(Boolean)
      .map(t => new Date(t!).getTime());
    if (timestamps.length === 0) { return null; }
    return new Date(Math.max(...timestamps)).toISOString();
  }, [liveUsers]);

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
  }, []);

  const handleCloseTrail = useCallback(() => {
    setTrailUser(null);
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
    // maximumAge: 0 forces a fresh GPS fix (never a cached one) so the map
    // always recenters on the device's current position.
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
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    );
  }, []);

  // Reset the camera bearing/pitch to north-up (tools-overlay compass).
  const resetHeading = useCallback(() => {
    mapRef.current?.animateCamera({ heading: 0, pitch: 0 }, { duration: 300 });
  }, []);

  // Zoom by halving / doubling the current viewport deltas (cross-platform —
  // avoids getCamera().zoom which is Google-Maps-only on Android).
  const handleZoomIn = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: currentRegion.latitude,
        longitude: currentRegion.longitude,
        latitudeDelta: currentRegion.latitudeDelta / 2,
        longitudeDelta: currentRegion.longitudeDelta / 2,
      },
      250,
    );
  }, [currentRegion]);

  const handleZoomOut = useCallback(() => {
    mapRef.current?.animateToRegion(
      {
        latitude: currentRegion.latitude,
        longitude: currentRegion.longitude,
        latitudeDelta: currentRegion.latitudeDelta * 2,
        longitudeDelta: currentRegion.longitudeDelta * 2,
      },
      250,
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
          <NBText variant="body" color="gray500" style={styles.loadingText}>Memuat peta...</NBText>
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
          <NBText variant="body" color="dangerDark" style={styles.errorText}>{error}</NBText>
          <TouchableOpacity style={styles.retryButton} onPress={handleRefresh}>
            <NBText variant="body" style={styles.retryText}>Coba Lagi</NBText>
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
              mapPadding={{ top: 60, right: 64, bottom: PEEK_HEIGHT, left: 0 }}
              onMapReady={() => {
                setMapReady(true);
                mapRef.current?.animateToRegion(SURABAYA_CITY_REGION, 0);
              }}
              onRegionChangeComplete={setCurrentRegion}
            >
              {/* Boundary overlays */}
              {mapReady && boundaries && (visibleLayers.rayons || visibleLayers.areas) && (
                <BoundaryOverlay
                  key={boundaryKey}
                  rayons={boundaries.rayons}
                  onRayonPress={handleRayonPress}
                  onAreaPress={handleAreaPress}
                  showRayons={visibleLayers.rayons}
                  showAreas={visibleLayers.areas}
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
            </MapView>
          </MapErrorBoundary>

          {/* Floating search bar */}
          <View style={styles.searchBarOverlay} pointerEvents="box-none">
            <MonitoringSearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              onClear={() => setSearchQuery('')}
            />
          </View>

          {/* Empty-boundaries warning */}
          {!isLoading && !boundaries && (
            <View style={styles.emptyAreaCallout}>
              <MaterialCommunityIcons name="map-marker-alert" size={16} color={nbColors.warning} />
              <NBText variant="caption" color="gray700">Gagal memuat batas wilayah</NBText>
            </View>
          )}

          {/* Transparent scrim — a tap anywhere outside the tools overlay dismisses
              it. Sits below the FAB column so the wrench toggle still works. */}
          {toolsExpanded && (
            <Pressable
              style={styles.toolsScrim}
              onPress={() => setToolsExpanded(false)}
              accessibilityLabel="Tutup alat peta"
            />
          )}

          {/* FAB column — MON-3 refactored with tools overlay */}
          <View style={styles.fabColumn}>
            {/* Tools FAB — opens the map-tools overlay (compass, zoom, filter, layers) */}
            <MapFab
              icon="wrench"
              onPress={() => setToolsExpanded(!toolsExpanded)}
              accessibilityLabel="Alat peta"
            />
            {/* Locate me FAB — recenter on a fresh GPS fix */}
            <MapFab
              icon="crosshairs-gps"
              onPress={handleMyLocation}
              accessibilityLabel="Lokasi saya"
            />
            {/* Refresh FAB */}
            <MapFab
              icon="refresh"
              onPress={handleRefresh}
              accessibilityLabel="Perbarui"
            />

            {/* Tools overlay card — a left-anchored popover from the wrench FAB.
                MON-3: compass + zoom map controls plus the Filter entry (which now
                also hosts the merged "Tampilan Peta" layer toggles). */}
            {toolsExpanded && (
              <ScrollView
                style={styles.toolsOverlay}
                contentContainerStyle={styles.toolsOverlayContent}
                showsVerticalScrollIndicator={false}
              >
                {/* Map controls */}
                <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
                  Peta
                </NBText>
                <ToolActionRow
                  icon="compass-outline"
                  label="Arah utara"
                  onPress={resetHeading}
                />
                <ToolActionRow
                  icon="magnify-plus-outline"
                  label="Perbesar"
                  onPress={handleZoomIn}
                />
                <ToolActionRow
                  icon="magnify-minus-outline"
                  label="Perkecil"
                  onPress={handleZoomOut}
                />

                {/* Filter (status / area / jabatan / layer visibility) */}
                <NBText variant="mono-sm" uppercase style={styles.toolsHeader}>
                  Filter
                </NBText>
                <ToolActionRow
                  icon="filter-variant"
                  label="Filter monitoring"
                  active={filterModalVisible}
                  onPress={() => setFilterModalVisible(true)}
                />
              </ScrollView>
            )}
          </View>
        </View>

        {/* Monitoring status peek sheet */}
        <MonitoringStatusSheet
          sheetRef={statusSheetRef}
          statusCounts={statusCounts}
          activeFilter={statusFilter}
          onFilterChange={setStatusFilter}
          liveUsers={liveUsers ?? []}
          lastUpdated={lastUpdated}
          totalAreas={totalAreas}
          staffedAreas={staffedAreas}
          onUserPress={handleMarkerPress}
        />

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
            users={liveUsers ?? []}
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
          />
        )}

        {/* Boundary detail modal */}
        <BoundaryDetailModal
          type={boundaryDetailType}
          data={boundaryDetailData}
          visible={boundaryDetailVisible}
          onClose={() => setBoundaryDetailVisible(false)}
        />

        {/* Trail viewer — separate fullscreen modal with its own MapView so the
            main monitoring map is never disturbed by trail-specific overlays. */}
        <LocationTrailModal
          visible={trailUser !== null}
          user={trailUser}
          onClose={handleCloseTrail}
        />
      </View>
    </NBBackgroundPattern>
  );
}

// ─── ToolActionRow ────────────────────────────────────────────────────────────
// A tappable action row inside the tools overlay (compass / zoom / filter).
// Shares the icon-chip + label chrome with the legacy tool rows; the layer
// toggles use LayerToggleRow (with a Switch) instead.

interface ToolActionRowProps {
  icon: string;
  label: string;
  onPress: () => void;
  active?: boolean;
}

function ToolActionRow({ icon, label, onPress, active = false }: ToolActionRowProps): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.toolRow, active && styles.toolRowActive]}
      onPress={onPress}
      activeOpacity={0.75}
      accessibilityRole="button"
      accessibilityLabel={label}
    >
      <View style={styles.toolIconChip}>
        <MaterialCommunityIcons name={icon} size={16} color={nbColors.black} />
      </View>
      <NBText variant="body-sm">{label}</NBText>
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
  searchBarOverlay: {
    position: 'absolute',
    top: nbSpacing.sm,
    left: nbSpacing.sm,
    right: nbSpacing.sm,
  },
  emptyAreaCallout: {
    position: 'absolute',
    top: 64, // below search bar (48px height + spacing)
    left: nbSpacing.md,
    right: nbSpacing.md + 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.md,
    backgroundColor: nbColors.warningLight,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    ...nbShadows.xs,
  },
  map: {
    flex: 1,
  },
  loadingText: {
    marginTop: nbSpacing.md,
  },
  errorText: {
    textAlign: 'center',
    marginBottom: nbSpacing.md,
  },
  retryButton: {
    backgroundColor: nbColors.primary,
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.md,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
  },
  retryText: {},
  fabColumn: {
    position: 'absolute',
    right: nbSpacing.md,
    bottom: PEEK_HEIGHT + nbSpacing.md,
    gap: nbSpacing.sm,
    pointerEvents: 'box-none',
  },
  // Invisible full-bleed catcher for outside-taps while the tools overlay is open.
  toolsScrim: {
    ...StyleSheet.absoluteFillObject,
  },
  // Left-anchored popover from the wrench FAB (which is now the top FAB). Sits
  // beside the column so it never covers the FABs; maxHeight + internal scroll
  // keeps the (now taller) tool list on-screen on short devices.
  toolsOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 44 + nbSpacing.sm, // to the left of the 44px FAB column
    width: 210,
    maxHeight: 360,
    borderRadius: nbRadius.md,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    ...nbShadows.md,
  },
  toolsOverlayContent: {
    paddingVertical: nbSpacing.sm,
    paddingHorizontal: nbSpacing.sm,
  },
  toolsHeader: {
    paddingHorizontal: nbSpacing.xs,
    paddingVertical: nbSpacing.xs,
    marginBottom: nbSpacing.xs,
    color: nbColors.black,
  },
  toolRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: nbSpacing.sm,
    paddingVertical: nbSpacing.xs + 2,
    paddingHorizontal: nbSpacing.xs,
    marginVertical: nbSpacing.xs - 2,
    borderRadius: nbRadius.base,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
  },
  toolRowActive: {
    backgroundColor: nbColors.bgAccentMint,
  },
  toolIconChip: {
    width: 24,
    height: 24,
    borderRadius: nbRadius.sm,
    borderWidth: nbBorders.widthThin,
    borderColor: nbColors.black,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: nbColors.white,
  },
});
