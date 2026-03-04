/**
 * MapDashboardScreen
 * Phase 2D: Four-status model, polygon boundaries, FAB controls,
 * StatusSummaryBar, UserListStrip, UserDetailSheet, LocationTrail.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
} from 'react-native';
import MapView, { Circle, Polygon, PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import Geolocation from 'react-native-geolocation-service';
import {
  nbColors,
  nbTypography,
  nbSpacing,
  nbShadows,
  nbBorders,
  nbBorderRadius,
  withAlpha,
} from '../../constants/nbTokens';
import { NBBackgroundPattern } from '../../components/nb';
import { UserMarker } from '../../components/monitoring/UserMarker';
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
import { useMapDashboard } from '../../hooks';
import type { AppDispatch, RootState } from '../../store';
import type { LiveUser, TrackingStatus } from '../../types/models.types';
import type { MonitoringFilters } from '../../types/api.types';
import {
  setSelectedUser,
  setMonitoringFilters,
  resetMonitoringFilters,
  fetchUserDaySummary,
} from '../../store/slices/monitoringSlice';
import { getLiveUsers } from '../../services/api/monitoringApi';

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
  } = useSelector((state: RootState) => state.monitoring);

  const currentUser = useSelector((state: RootState) => state.auth.user);

  // Local UI state
  const [mapReady, setMapReady] = useState(false);
  const [statusFilter, setStatusFilter] = useState<TrackingStatus | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [showTrail, setShowTrail] = useState(false);
  const [trailUser, setTrailUser] = useState<LiveUser | null>(null);
  const [currentRegion, setCurrentRegion] = useState(SURABAYA_CITY_REGION);

  // Legacy hook for areas data (boundary polygons and circles)
  const { areas, fetchUsers } = useMapDashboard(mapRef);

  // Fetch live users on mount and when filters change
  useEffect(() => {
    void fetchLiveUsersWithFilters(filters);
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLiveUsersWithFilters = useCallback(
    async (currentFilters: MonitoringFilters) => {
      const filterPayload = { ...currentFilters };
      if (statusFilter) {
        filterPayload.status = [statusFilter];
      }
      try {
        const res = await getLiveUsers(filterPayload);
        if (res.data) {
          dispatch({ type: 'monitoring/setLiveUsers', payload: res.data.users });
        }
      } catch {
        // handled via slice error state
      }
    },
    [dispatch, statusFilter],
  );

  const handleRefresh = useCallback(() => {
    void fetchLiveUsersWithFilters(filters);
  }, [fetchLiveUsersWithFilters, filters]);

  // Filtered users for display
  const visibleUsers = React.useMemo(() => {
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
              role: u.role as any,
              shift: { id: u.shift_id, clock_in_time: u.clock_in_time, area: { id: u.area_id ?? '', name: u.area_name } },
              latest_location: { gps_lat: u.latitude, gps_lng: u.longitude, logged_at: u.last_update },
            })),
            currentRegion,
          )
        : [],
    [useClustering, visibleUsers, currentRegion],
  );

  // Marker press
  const handleMarkerPress = useCallback(
    (user: LiveUser) => {
      dispatch(setSelectedUser(user));
      dispatch(fetchUserDaySummary(user.id));
      mapRef.current?.animateToRegion(
        {
          latitude: user.latitude,
          longitude: user.longitude,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        },
        300,
      );
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

  if (isLoading && liveUsers.length === 0) {
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

  if (error && liveUsers.length === 0) {
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
              onMapReady={() => setMapReady(true)}
              onRegionChangeComplete={setCurrentRegion}
            >
              {/* Area boundaries */}
              {mapReady && areas.map(area => {
                const poly = (area as any).boundary_polygon;
                if (
                  poly?.coordinates?.length > 0 &&
                  poly.coordinates[0]?.length >= 3
                ) {
                  const coords = poly.coordinates[0].map(
                    ([lng, lat]: [number, number]) => ({
                      latitude: lat,
                      longitude: lng,
                    }),
                  );
                  return (
                    <Polygon
                      key={`poly-${area.id}`}
                      coordinates={coords}
                      strokeColor={nbColors.primary}
                      fillColor={withAlpha(nbColors.primary, 0.1)}
                      strokeWidth={2}
                    />
                  );
                }

                return (
                  <Circle
                    key={`circle-${area.id}`}
                    center={{
                      latitude: typeof area.gps_lat === 'string'
                        ? parseFloat(area.gps_lat)
                        : area.gps_lat,
                      longitude: typeof area.gps_lng === 'string'
                        ? parseFloat(area.gps_lng)
                        : area.gps_lng,
                    }}
                    radius={typeof area.radius_meters === 'string'
                      ? parseFloat(area.radius_meters)
                      : area.radius_meters}
                    strokeColor={nbColors.primary}
                    strokeWidth={2}
                    fillColor={withAlpha(nbColors.primary, 0.1)}
                  />
                );
              })}

              {/* User markers */}
              {!useClustering && visibleUsers.map(user => (
                <UserMarker
                  key={`user-${user.id}`}
                  user={user}
                  onPress={handleMarkerPress}
                  showLabel={currentRegion.latitudeDelta < 0.03}
                />
              ))}

              {/* Location trail overlay */}
              {showTrail && trailUser && (
                <LocationTrail
                  userId={trailUser.id}
                  date={new Date().toISOString().split('T')[0]}
                  shiftId={trailUser.shift_id}
                  mapRef={mapRef}
                  onClose={handleCloseTrail}
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
