/**
 * MapDashboardScreen
 * Phase 2D: Four-status model, polygon boundaries, FAB controls,
 * StatusSummaryBar, UserDetailSheet, LocationTrail.
 * Phase 2E: Trail crash fix, FAB repositioning, status peek sheet, search bar,
 * marker zIndex precision.
 * Phase 3 M1-R: Refactored for composition with extracted hooks and components.
 */

import React, { useRef, useState, useCallback, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { View, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import MapView, { PROVIDER_GOOGLE } from 'react-native-maps';
import { useSelector, useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { nbColors, nbSpacing, nbShadows, nbBorders, nbRadius } from '../../constants/nbTokens';
import { NBBackgroundPattern } from '../../components/nb';
import { NBText } from '../../components/nb/NBText';
import { MapErrorBoundary } from '../../components/monitoring/MapErrorBoundary';
import { MonitoringSearchBar } from '../../components/monitoring/MonitoringSearchBar';
import { MarkerPreview } from '../../components/monitoring/MarkerPreview';
import type { SearchResult } from '../../hooks/useMonitoringSearch';
import { addRecentSearch } from '../../services/storage/recentSearches';
import { ROLE_LABELS } from '../../constants/roles';
import type { AppDispatch, RootState } from '../../store/store';
import type { LiveUser, UserRole, PresenceActivity } from '../../types/models.types';
import type { MonitoringFilters } from '../../types/api.types';
import {
  setSelectedUser,
  setMonitoringFilters,
  fetchUserDaySummary,
} from '../../store/slices/monitoringSlice';
import { getRoleIcon, SURABAYA_CITY_REGION } from '../../utils/mapUtils';
import { userAxes } from '../../utils/statusHelpers';
import { useMapAutoFocus } from '../../hooks/useMapAutoFocus';
import type { RayonBoundary, AreaBoundary } from '../../types/models.types';
import { toggleLayer } from '../../store/slices/monitoringV2Slice';
import type { MonitoringV2VisibleLayers } from '../../store/slices/monitoringV2Slice';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

import {
  useWebSocketUpdates,
  useMonitoringFetchData,
  useMarkerPreview,
  useMapOperations,
  useLiveUsersFiltering,
} from './hooks';
import {
  MapLayerContent,
  FABColumn,
  StatusAndDetailSheets,
  FilterAndSearchModals,
} from './components';

// ─── Component ────────────────────────────────────────────────────────────────

export function MapDashboardScreen(): React.JSX.Element {
  const { t } = useTranslation();
  const mapRef = useRef<MapView | null>(null);
  const [statusSheetVisible, setStatusSheetVisible] = useState(false);
  const dispatch = useDispatch<AppDispatch>();

  // Redux state
  const { liveUsers, selectedUser, filters, userDaySummary, isLoadingDaySummary, isLoading, error, boundaries } =
    useSelector((state: RootState) => state.monitoring);
  const currentUser = useSelector((state: RootState) => state.auth.user);
  const visibleLayers = useSelector((state: RootState) => state.monitoringV2.visibleLayers);

  // Local UI state
  const [mapReady, setMapReady] = useState(false);
  const [activityFilter, setActivityFilter] = useState<PresenceActivity | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [trailUser, setTrailUser] = useState<LiveUser | null>(null);
  const [currentRegion, setCurrentRegion] = useState(SURABAYA_CITY_REGION);
  const [boundaryDetailVisible, setBoundaryDetailVisible] = useState(false);
  const [boundaryDetailType, setBoundaryDetailType] = useState<'rayon' | 'area'>('area');
  const [boundaryDetailData, setBoundaryDetailData] = useState<RayonBoundary | AreaBoundary | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [boundaryKey, setBoundaryKey] = useState(0);

  // Extracted hooks
  useWebSocketUpdates(dispatch);
  useMapAutoFocus(mapRef, filters, boundaries, liveUsers);

  const { attendance, fetchLiveUsersWithFilters, handleRefresh } = useMonitoringFetchData(dispatch, filters);

  const { markerPreview, setMarkerPreview, showMarkerPreview, dismissPreview, setMapLayout } =
    useMarkerPreview(mapRef, currentRegion);

  const { handleMyLocation, resetHeading, handleZoomIn, handleZoomOut, handleClusterPress } =
    useMapOperations(mapRef, currentRegion);

  const { visibleUsers, useClustering, clusters, labelMode, staffedAreas, totalAreas, lastUpdated } =
    useLiveUsersFiltering(liveUsers, activityFilter, filters, visibleLayers, currentRegion, boundaries);


  // Fetch users on mount and filter changes
  useEffect(() => {
    void fetchLiveUsersWithFilters(filters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filters]);

  // Focus effect: refresh all data and remount boundary overlays
  useFocusEffect(
    useCallback(() => {
      handleRefresh(setBoundaryKey);
    }, [handleRefresh]),
  );

  // Marker press → show preview; "Lihat detail" opens detail sheet
  const handleMarkerPress = useCallback(
    (user: LiveUser) => {
      showMarkerPreview(
        { latitude: user.latitude, longitude: user.longitude },
        {
          title: user.full_name,
          typeText: t('monitoring:markerPreview.typeOfficer'),
          roleText: ROLE_LABELS[user.role as UserRole] ?? user.role,
          accent: nbColors.primary,
          icon: getRoleIcon(user.role),
          presence: userAxes(user),
        },
        46,
        () => {
          dispatch(setSelectedUser(user));
          dispatch(fetchUserDaySummary(user.id));
          setMarkerPreview(null);
        },
      );
    },
    [dispatch, showMarkerPreview, setMarkerPreview, t],
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

  // Boundary press handlers
  const handleRayonPress = useCallback(
    (rayon: RayonBoundary) => {
      showMarkerPreview(
        { latitude: Number(rayon.center_lat), longitude: Number(rayon.center_lng) },
        { title: rayon.name, typeText: t('monitoring:entityTypes.rayon'), accent: nbColors.requestUnderReview, icon: 'office-building' },
        18,
        () => {
          setBoundaryDetailType('rayon');
          setBoundaryDetailData(rayon);
          setBoundaryDetailVisible(true);
          setMarkerPreview(null);
        },
      );
    },
    [showMarkerPreview, setMarkerPreview, t],
  );

  const handleAreaPress = useCallback(
    (area: AreaBoundary) => {
      showMarkerPreview(
        { latitude: Number(area.center_lat), longitude: Number(area.center_lng) },
        { title: area.name, typeText: t('monitoring:entityTypes.area'), accent: nbColors.warning, icon: 'map-marker' },
        18,
        () => {
          setBoundaryDetailType('area');
          setBoundaryDetailData(area);
          setBoundaryDetailVisible(true);
          setMarkerPreview(null);
        },
      );
    },
    [showMarkerPreview, setMarkerPreview, t],
  );

  // Search result handler
  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      setSearchModalVisible(false);
      addRecentSearch(result);
      if (result.type === 'petugas') {
        const user = liveUsers.find((u) => u.id === result.id);
        if (user) { handleMarkerPress(user); }
      } else if (result.type === 'area') {
        const area = boundaries?.rayons.flatMap((r) => r.areas).find((a) => a.id === result.id);
        if (area) { handleAreaPress(area); }
      } else {
        const rayon = boundaries?.rayons.find((r) => r.id === result.id);
        if (rayon) { handleRayonPress(rayon); }
      }
    },
    [liveUsers, boundaries, handleMarkerPress, handleAreaPress, handleRayonPress],
  );

  // Filter handler
  const handleApplyFilters = useCallback(
    (newFilters: MonitoringFilters) => {
      dispatch(setMonitoringFilters(newFilters));
    },
    [dispatch],
  );

  // Layer toggle handler
  const handleToggleLayer = useCallback(
    (layer: string | number | symbol) => {
      dispatch(toggleLayer(layer as keyof MonitoringV2VisibleLayers));
    },
    [dispatch],
  );

  if (isLoading && (!liveUsers || liveUsers.length === 0)) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={nbColors.primary} />
          <NBText variant="body" color="gray500" style={styles.loadingText}>{t('monitoring:screen.loading')}</NBText>
        </View>
      </NBBackgroundPattern>
    );
  }

  if (error && (!liveUsers || liveUsers.length === 0)) {
    return (
      <NBBackgroundPattern
        pattern="dots"
        backgroundColor={nbColors.bgCanvas}
        patternColor={nbColors.primary}
        opacity={0.06}
      >
        <View style={styles.centerContainer}>
          <NBText variant="body" color="dangerDark" style={styles.errorText}>{error}</NBText>
          <TouchableOpacity style={styles.retryButton} onPress={() => handleRefresh(setBoundaryKey)}>
            <NBText variant="body" style={styles.retryText}>{t('monitoring:screen.error.retry')}</NBText>
          </TouchableOpacity>
        </View>
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
      <View style={styles.container}>
        {/* Map */}
        <View style={styles.mapContainer}>
          <MapErrorBoundary onReset={() => handleRefresh(setBoundaryKey)}>
            <MapView
              ref={mapRef}
              provider={PROVIDER_GOOGLE}
              userInterfaceStyle="light"
              style={styles.map}
              initialRegion={SURABAYA_CITY_REGION}
              showsUserLocation={false}
              showsMyLocationButton={false}
              toolbarEnabled={false}
              onMapReady={() => {
                setMapReady(true);
                mapRef.current?.animateToRegion(SURABAYA_CITY_REGION, 0);
              }}
              onLayout={(e) => setMapLayout(e.nativeEvent.layout)}
              onPress={dismissPreview}
              onPanDrag={dismissPreview}
              onRegionChangeComplete={setCurrentRegion}
            >
              <MapLayerContent
                mapReady={mapReady}
                boundaries={boundaries}
                visibleLayers={visibleLayers}
                visibleUsers={visibleUsers}
                selectedUser={selectedUser}
                clusters={clusters}
                labelMode={labelMode}
                useClustering={useClustering}
                currentRegion={currentRegion}
                boundaryKey={boundaryKey}
                onRayonPress={handleRayonPress}
                onAreaPress={handleAreaPress}
                onMarkerPress={handleMarkerPress}
                onClusterPress={handleClusterPress}
              />
            </MapView>
          </MapErrorBoundary>

          {/* Floating search bar — opens the fullscreen search modal */}
          <View style={styles.searchBarOverlay} pointerEvents="box-none">
            <MonitoringSearchBar onPress={() => setSearchModalVisible(true)} />
          </View>

          {/* Empty-boundaries warning */}
          {!isLoading && !boundaries && (
            <View style={styles.emptyAreaCallout}>
              <MaterialCommunityIcons name="map-marker-alert" size={16} color={nbColors.warning} />
              <NBText variant="caption" color="gray700">{t('monitoring:screen.error.title')}</NBText>
            </View>
          )}

          {/* FAB column — MON-3 refactored with tools overlay */}
          <FABColumn
            toolsExpanded={toolsExpanded}
            setToolsExpanded={setToolsExpanded}
            onOpenStatus={() => setStatusSheetVisible(true)}
            handleMyLocation={handleMyLocation}
            handleRefresh={() => handleRefresh(setBoundaryKey)}
            resetHeading={resetHeading}
            handleZoomIn={handleZoomIn}
            handleZoomOut={handleZoomOut}
            filterModalVisible={filterModalVisible}
            setFilterModalVisible={setFilterModalVisible}
          />

          {/* Marker preview card — a viewport-centered overlay OVER the map (not a
              MapView child). Rendered here as a sibling so react-native-maps does
              not treat this plain View as a native map feature (which crashes the
              Fabric renderer with "child already has a parent" on tap). */}
          {markerPreview && <MarkerPreview data={markerPreview} />}
        </View>

        {/* Monitoring status peek sheet, user detail sheet, trail viewer */}
        <StatusAndDetailSheets
          statusSheetVisible={statusSheetVisible}
          onCloseStatusSheet={() => setStatusSheetVisible(false)}
          activityFilter={activityFilter}
          onActivityChange={setActivityFilter}
          liveUsers={liveUsers ?? []}
          selectedUser={selectedUser}
          trailUser={trailUser}
          userDaySummary={userDaySummary}
          isLoadingDaySummary={isLoadingDaySummary}
          onCloseSheet={handleCloseSheet}
          onTrailPress={handleTrailPress}
          onCloseTrail={handleCloseTrail}
          onUserPress={handleMarkerPress}
          attendance={attendance}
          lastUpdated={lastUpdated}
          totalAreas={totalAreas}
          staffedAreas={staffedAreas}
        />

        {/* Filter modal, boundary detail modal, search modal */}
        <FilterAndSearchModals
          currentUser={currentUser}
          filterModalVisible={filterModalVisible}
          setFilterModalVisible={setFilterModalVisible}
          filters={filters}
          visibleLayers={visibleLayers}
          users={liveUsers ?? []}
          onApplyFilters={handleApplyFilters}
          onToggleLayer={handleToggleLayer}
          searchModalVisible={searchModalVisible}
          setSearchModalVisible={setSearchModalVisible}
          liveUsers={liveUsers}
          rayons={boundaries?.rayons}
          onSearchSelect={handleSearchSelect}
          boundaryDetailVisible={boundaryDetailVisible}
          setBoundaryDetailVisible={setBoundaryDetailVisible}
          boundaryDetailType={boundaryDetailType}
          boundaryDetailData={boundaryDetailData}
        />
      </View>
    </NBBackgroundPattern>
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
    top: 64,
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
});
