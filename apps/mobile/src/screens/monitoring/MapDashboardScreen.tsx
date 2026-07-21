/**
 * MapDashboardScreen
 * Phase 2D: Four-status model, polygon boundaries, FAB controls,
 * StatusSummaryBar, UserDetailSheet, LocationTrail.
 * Phase 2E: Trail crash fix, FAB repositioning, status peek sheet, search bar,
 * marker zIndex precision.
 * Phase 3 M1-R: Refactored for composition with extracted hooks and components.
 */

import React, { useRef, useState, useCallback, useEffect, useMemo } from 'react';
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
import type { DistrictBoundary, AreaBoundary } from '../../types/models.types';
import {
  toggleLayer,
  fetchAggregate,
  initMonitoringView,
  drillTo,
  drillBack,
} from '../../store/slices/monitoringV2Slice';
import type {
  MonitoringV2VisibleLayers,
  MonitoringScope,
} from '../../store/slices/monitoringV2Slice';
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
  const view = useSelector((state: RootState) => state.monitoringV2.view);
  const floor = useSelector((state: RootState) => state.monitoringV2.floor);
  const aggregate = useSelector((state: RootState) => state.monitoringV2.aggregate);
  const scope = view.scope;
  const showWorkers = scope === 'location';

  // Local UI state
  const [mapReady, setMapReady] = useState(false);
  const [activityFilter, setActivityFilter] = useState<PresenceActivity | null>(null);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [trailUser, setTrailUser] = useState<LiveUser | null>(null);
  const [currentRegion, setCurrentRegion] = useState(SURABAYA_CITY_REGION);
  const [boundaryDetailVisible, setBoundaryDetailVisible] = useState(false);
  const [boundaryDetailType, setBoundaryDetailType] = useState<'district' | 'location'>('location');
  const [boundaryDetailData, setBoundaryDetailData] = useState<DistrictBoundary | AreaBoundary | null>(null);
  const [toolsExpanded, setToolsExpanded] = useState(false);
  const [boundaryKey, setBoundaryKey] = useState(0);

  // Extracted hooks
  useWebSocketUpdates(dispatch);
  useMapAutoFocus(mapRef, filters, boundaries, liveUsers);

  const { attendance, fetchLiveUsersWithFilters, handleRefresh } = useMonitoringFetchData(dispatch, filters);

  const { markerPreview, setMarkerPreview, showMarkerPreview, dismissPreview, setMapLayout } =
    useMarkerPreview(mapRef, currentRegion);

  // Zoom + My-Location are native Google controls now; only heading reset +
  // cluster tap remain custom.
  const { resetHeading, handleClusterPress, handleMyLocation, handleZoomIn, handleZoomOut } =
    useMapOperations(mapRef, currentRegion);

  const { visibleUsers, useClustering, clusters, labelMode, staffedAreas, totalAreas, lastUpdated } =
    useLiveUsersFiltering(liveUsers, activityFilter, filters, visibleLayers, currentRegion, boundaries, scope, scope === 'location' ? view.id : null);


  // Initialise the unified drill view + floor from the viewer's role.
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    let payload: { view: typeof view; floor: MonitoringScope };
    if (role === 'korlap' && currentUser.location_id) {
      payload = {
        view: {
          scope: 'location',
          id: currentUser.location_id,
          districtId: currentUser.district_id ?? null,
          regionId: currentUser.region_id ?? null,
          name: null,
        },
        floor: 'location',
      };
    } else if ((role === 'kepala_rayon' || role === 'admin_rayon') && currentUser.district_id) {
      payload = {
        view: {
          scope: 'district',
          id: currentUser.district_id,
          districtId: currentUser.district_id,
          regionId: null,
          name: null,
        },
        floor: 'district',
      };
    } else {
      // City roles land on the district bubbles (the Surabaya summary bubble was
      // retired in PR2, matching web).
      payload = {
        view: { scope: 'city', id: null, districtId: null, regionId: null, name: null },
        floor: 'city',
      };
    }
    dispatch(initMonitoringView(payload));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Aggregate fetch — city rollup feeds the district nodes; district rollup feeds
  // the lokasi nodes. (The `region`/kawasan aggregate tier + its bubble rendering is
  // a coupled follow-up — see PR2-visual — because switching the district-scope fetch
  // to `region` without rendering kawasan bubbles would strip the lokasi bubbles'
  // ratios. Until then a district drills straight to its lokasi, region-less.)
  useEffect(() => {
    if (scope === 'city') {
      void dispatch(fetchAggregate({ scope: 'city' }));
    } else if (scope === 'district' && view.id) {
      void dispatch(fetchAggregate({ scope: 'district', id: view.id }));
    } else if (scope === 'region' && view.districtId) {
      void dispatch(fetchAggregate({ scope: 'district', id: view.districtId }));
    } else if (scope === 'location' && view.districtId) {
      void dispatch(fetchAggregate({ scope: 'district', id: view.districtId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, view.id, view.districtId]);

  // Always fetch workers for the current scope so search can find people at any
  // level; the map only *renders* worker markers at location scope.
  useEffect(() => {
    void fetchLiveUsersWithFilters(
      scope === 'location' && view.id ? { ...filters, location_id: view.id } : filters,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, view.id, filters]);

  // Focus effect: refresh all data and remount boundary overlays
  useFocusEffect(
    useCallback(() => {
      handleRefresh(setBoundaryKey);
    }, [handleRefresh]),
  );

  // Gently zoom + recenter on a tapped marker (district / area / worker) so its
  // detail hint is framed. Never zooms out — clamps the target to the current
  // zoom, then tightens it a bit (~45%).
  const focusOn = useCallback(
    (lat: number, lng: number) => {
      const cur = currentRegion.latitudeDelta;
      const delta = Math.min(cur, Math.max(cur * 0.55, 0.004));
      mapRef.current?.animateToRegion(
        { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
        350,
      );
    },
    [currentRegion.latitudeDelta],
  );

  // Marker press → zoom/focus + show preview; "Lihat detail" opens detail sheet.
  // Tapping a worker shows a hint card; tapping the hint opens the detail sheet
  // (day summary + trail / call / task).
  const handleMarkerPress = useCallback(
    (user: LiveUser) => {
      focusOn(user.latitude, user.longitude);
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
        false, // focusOn already drives the camera — don't double-animate
      );
    },
    [dispatch, showMarkerPreview, setMarkerPreview, t, focusOn],
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
  const handleDistrictPress = useCallback(
    (district: DistrictBoundary) => {
      focusOn(Number(district.center_lat), Number(district.center_lng));
      showMarkerPreview(
        { latitude: Number(district.center_lat), longitude: Number(district.center_lng) },
        { title: district.name, typeText: t('monitoring:entityTypes.district'), accent: nbColors.requestUnderReview, icon: 'office-building' },
        18,
        () => {
          setBoundaryDetailType('district');
          setBoundaryDetailData(district);
          setBoundaryDetailVisible(true);
          setMarkerPreview(null);
        },
        false, // focusOn already drives the camera
      );
    },
    [showMarkerPreview, setMarkerPreview, t, focusOn],
  );

  const handleAreaPress = useCallback(
    (area: AreaBoundary) => {
      focusOn(Number(area.center_lat), Number(area.center_lng));
      showMarkerPreview(
        { latitude: Number(area.center_lat), longitude: Number(area.center_lng) },
        { title: area.name, typeText: t('monitoring:entityTypes.area'), accent: nbColors.warning, icon: 'map-marker' },
        18,
        () => {
          setBoundaryDetailType('location');
          setBoundaryDetailData(area);
          setBoundaryDetailVisible(true);
          setMarkerPreview(null);
        },
        false, // focusOn already drives the camera
      );
    },
    [showMarkerPreview, setMarkerPreview, t, focusOn],
  );

  // Search result handler
  const handleSearchSelect = useCallback(
    (result: SearchResult) => {
      setSearchModalVisible(false);
      addRecentSearch(result);
      if (result.type === 'petugas') {
        const user = liveUsers.find((u) => u.id === result.id);
        if (user) { handleMarkerPress(user); }
      } else if (result.type === 'location') {
        const area = boundaries?.districts.flatMap((r) => r.areas).find((a) => a.id === result.id);
        if (area) { handleAreaPress(area); }
      } else {
        const district = boundaries?.districts.find((r) => r.id === result.id);
        if (district) { handleDistrictPress(district); }
      }
    },
    [liveUsers, boundaries, handleMarkerPress, handleAreaPress, handleDistrictPress],
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

  // Per-node ratio (active-and-inside-area / terjadwal) keyed by district/area id —
  // fed to the geographic markers so each carries its count. The numerator is the
  // hadir workers who are BOTH active (fresh ping) and inside their area.
  const rosterById = useMemo<Record<string, { activeInside: number; scheduled: number }>>(() => {
    const map: Record<string, { activeInside: number; scheduled: number }> = {};
    for (const n of aggregate?.nodes ?? []) {
      map[n.id] = { activeInside: n.presence?.aktif?.dalam ?? 0, scheduled: n.roster?.scheduled ?? 0 };
    }
    return map;
  }, [aggregate]);

  const animateTo = useCallback((lat: number, lng: number, delta: number) => {
    mapRef.current?.animateToRegion(
      { latitude: lat, longitude: lng, latitudeDelta: delta, longitudeDelta: delta },
      350,
    );
  }, []);

  // Bubble taps DRILL into the child level and zoom IN (never out). The current
  // node's own detail lives on its icon marker (handleDistrictPress/handleAreaPress),
  // shown once you're at that scope — so a bubble tap is purely navigation.
  // Clamp so a drill-in only ever tightens the zoom (point 5: "do not zoom out").
  // If the user manually zoomed tighter than the target, keep their zoom.
  const zoomInTo = useCallback(
    (lat: number, lng: number, target: number) =>
      animateTo(lat, lng, Math.min(currentRegion.latitudeDelta, target)),
    [animateTo, currentRegion.latitudeDelta],
  );
  const handleDistrictBubblePress = useCallback(
    (district: DistrictBoundary) => {
      dispatch(drillTo({ id: district.id, type: 'district', name: district.name, districtId: district.id }));
      zoomInTo(Number(district.center_lat), Number(district.center_lng), 0.08);
    },
    [dispatch, zoomInTo],
  );
  const handleAreaBubblePress = useCallback(
    (area: AreaBoundary) => {
      dispatch(drillTo({ id: area.id, type: 'location', name: area.name, districtId: view.districtId }));
      zoomInTo(Number(area.center_lat), Number(area.center_lng), 0.02);
    },
    [dispatch, zoomInTo, view.districtId],
  );
  const handleDrillBack = useCallback(() => {
    const from = scope;
    dispatch(drillBack());
    // Zoom the camera back out to match the level we're returning to.
    if (from === 'district' || from === 'city') {
      // → city: show the whole city again (the district bubbles).
      animateTo(
        SURABAYA_CITY_REGION.latitude,
        SURABAYA_CITY_REGION.longitude,
        SURABAYA_CITY_REGION.latitudeDelta,
      );
    } else if (from === 'location' && view.districtId) {
      const district = boundaries?.districts?.find((r: DistrictBoundary) => r.id === view.districtId);
      if (district) {
        animateTo(Number(district.center_lat), Number(district.center_lng), 0.08);
      }
    }
  }, [scope, view.districtId, boundaries, dispatch, animateTo]);
  const canDrillBack = scope !== floor;

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
              // Live location dot + compass stay native; zoom + my-location are the
              // wrench-overlay tools (so the FAB set is the single control surface).
              showsUserLocation={true}
              showsMyLocationButton={false}
              zoomControlEnabled={false}
              showsCompass={true}
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
                scope={scope}
                districtId={view.districtId ?? view.id}
                areaId={scope === 'location' ? view.id : null}
                rosterById={rosterById}
                showWorkers={showWorkers}
                onDistrictDrill={handleDistrictBubblePress}
                onAreaDrill={handleAreaBubblePress}
                onDistrictDetail={handleDistrictPress}
                onAreaDetail={handleAreaPress}
                onMarkerPress={handleMarkerPress}
                onClusterPress={handleClusterPress}
              />
            </MapView>
          </MapErrorBoundary>

          {/* Floating search bar — opens the fullscreen search modal */}
          <View style={styles.searchBarOverlay} pointerEvents="box-none">
            <MonitoringSearchBar onPress={() => setSearchModalVisible(true)} />
          </View>

          {/* Drill breadcrumb (back) */}
          <View style={styles.drillBar} pointerEvents="box-none">
            {canDrillBack && (
              <TouchableOpacity
                style={styles.backChip}
                onPress={handleDrillBack}
                accessibilityRole="button"
                accessibilityLabel={t('monitoring:page.backLabel')}
              >
                <MaterialCommunityIcons name="chevron-left" size={18} color={nbColors.black} />
                <NBText variant="caption" numberOfLines={1} style={styles.backChipText}>
                  {view.name ?? t('monitoring:page.backLabel')}
                </NBText>
              </TouchableOpacity>
            )}
          </View>

          {/* Empty-boundaries warning */}
          {!isLoading && !boundaries && (
            <View style={styles.emptyAreaCallout}>
              <MaterialCommunityIcons name="map-marker-alert" size={16} color={nbColors.warning} />
              <NBText variant="caption" color="gray700">{t('monitoring:screen.error.title')}</NBText>
            </View>
          )}

          {/* The top-level Surabaya summary bubble was retired in PR2 (matching web):
              the map opens directly on the district bubbles at `city` scope. */}

          {/* FAB column — MON-3 refactored with tools overlay */}
          <FABColumn
            toolsExpanded={toolsExpanded}
            setToolsExpanded={setToolsExpanded}
            onOpenStatus={() => setStatusSheetVisible(true)}
            handleRefresh={() => handleRefresh(setBoundaryKey)}
            resetHeading={resetHeading}
            onZoomIn={handleZoomIn}
            onZoomOut={handleZoomOut}
            onMyLocation={handleMyLocation}
            visibleLayers={visibleLayers}
            onToggleLayer={handleToggleLayer}
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
          users={liveUsers ?? []}
          onApplyFilters={handleApplyFilters}
          searchModalVisible={searchModalVisible}
          setSearchModalVisible={setSearchModalVisible}
          liveUsers={liveUsers}
          districts={boundaries?.districts}
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
  drillBar: {
    position: 'absolute',
    top: 64,
    left: nbSpacing.sm,
    right: nbSpacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: nbSpacing.sm,
  },
  backChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '55%',
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    ...nbShadows.xs,
  },
  backChipText: {
    color: nbColors.black,
    flexShrink: 1,
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
