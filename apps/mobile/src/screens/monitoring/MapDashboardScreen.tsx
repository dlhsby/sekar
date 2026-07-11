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
import type { RayonBoundary, AreaBoundary } from '../../types/models.types';
import {
  toggleLayer,
  fetchAggregate,
  initMonitoringView,
  enterCity,
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
  const showWorkers = scope === 'area';

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

  // Zoom + My-Location are native Google controls now; only heading reset +
  // cluster tap remain custom.
  const { resetHeading, handleClusterPress, handleMyLocation, handleZoomIn, handleZoomOut } =
    useMapOperations(mapRef, currentRegion);

  const { visibleUsers, useClustering, clusters, labelMode, staffedAreas, totalAreas, lastUpdated } =
    useLiveUsersFiltering(liveUsers, activityFilter, filters, visibleLayers, currentRegion, boundaries, scope, scope === 'area' ? view.id : null);


  // Initialise the unified drill view + floor from the viewer's role.
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    let payload: { view: typeof view; floor: MonitoringScope };
    if (role === 'korlap' && currentUser.area_id) {
      payload = {
        view: { scope: 'area', id: currentUser.area_id, rayonId: currentUser.rayon_id ?? null, name: null },
        floor: 'area',
      };
    } else if ((role === 'kepala_rayon' || role === 'admin_rayon') && currentUser.rayon_id) {
      payload = {
        view: { scope: 'rayon', id: currentUser.rayon_id, rayonId: currentUser.rayon_id, name: null },
        floor: 'rayon',
      };
    } else {
      payload = { view: { scope: 'surabaya', id: null, rayonId: null, name: null }, floor: 'surabaya' };
    }
    dispatch(initMonitoringView(payload));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Aggregate fetch — city rollup feeds Surabaya (roster totals) + the rayon
  // nodes; rayon rollup feeds the area nodes. No fetch at area scope (workers).
  useEffect(() => {
    if (scope === 'surabaya' || scope === 'city') {
      void dispatch(fetchAggregate({ scope: 'city' }));
    } else if (scope === 'rayon') {
      void dispatch(fetchAggregate({ scope: 'rayon', id: view.id ?? undefined }));
    } else if (scope === 'area' && view.rayonId) {
      // Keep the parent rayon's area rollup loaded so the selected area's ratio
      // shows (covers area-floored roles that never visited the rayon view).
      void dispatch(fetchAggregate({ scope: 'rayon', id: view.rayonId }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, view.id, view.rayonId]);

  // Always fetch workers for the current scope so search can find people at any
  // level; the map only *renders* worker markers at area scope.
  useEffect(() => {
    void fetchLiveUsersWithFilters(
      scope === 'area' && view.id ? { ...filters, area_id: view.id } : filters,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scope, view.id, filters]);

  // Focus effect: refresh all data and remount boundary overlays
  useFocusEffect(
    useCallback(() => {
      handleRefresh(setBoundaryKey);
    }, [handleRefresh]),
  );

  // Gently zoom + recenter on a tapped marker (rayon / area / worker) so its
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
  const handleRayonPress = useCallback(
    (rayon: RayonBoundary) => {
      focusOn(Number(rayon.center_lat), Number(rayon.center_lng));
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
          setBoundaryDetailType('area');
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

  // Unified drill handlers.
  const rosterTotals = aggregate?.roster_totals ?? { scheduled: 0, clocked_in: 0, not_clocked_in: 0 };

  // Per-node ratio (active-and-inside-area / terjadwal) keyed by rayon/area id —
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

  // Tapping the fixed Surabaya bubble drills into the rayon list (city scope).
  const handleEnterCity = useCallback(() => dispatch(enterCity()), [dispatch]);

  // Bubble taps DRILL into the child level and zoom IN (never out). The current
  // node's own detail lives on its icon marker (handleRayonPress/handleAreaPress),
  // shown once you're at that scope — so a bubble tap is purely navigation.
  // Clamp so a drill-in only ever tightens the zoom (point 5: "do not zoom out").
  // If the user manually zoomed tighter than the target, keep their zoom.
  const zoomInTo = useCallback(
    (lat: number, lng: number, target: number) =>
      animateTo(lat, lng, Math.min(currentRegion.latitudeDelta, target)),
    [animateTo, currentRegion.latitudeDelta],
  );
  const handleRayonBubblePress = useCallback(
    (rayon: RayonBoundary) => {
      dispatch(drillTo({ id: rayon.id, type: 'rayon', name: rayon.name, rayonId: rayon.id }));
      zoomInTo(Number(rayon.center_lat), Number(rayon.center_lng), 0.08);
    },
    [dispatch, zoomInTo],
  );
  const handleAreaBubblePress = useCallback(
    (area: AreaBoundary) => {
      dispatch(drillTo({ id: area.id, type: 'area', name: area.name, rayonId: view.rayonId }));
      zoomInTo(Number(area.center_lat), Number(area.center_lng), 0.02);
    },
    [dispatch, zoomInTo, view.rayonId],
  );
  const handleDrillBack = useCallback(() => {
    const from = scope;
    dispatch(drillBack());
    // Zoom the camera back out to match the level we're returning to.
    if (from === 'rayon' || from === 'city') {
      // → city / Surabaya: show the whole city again (and the Surabaya bubble).
      animateTo(
        SURABAYA_CITY_REGION.latitude,
        SURABAYA_CITY_REGION.longitude,
        SURABAYA_CITY_REGION.latitudeDelta,
      );
    } else if (from === 'area' && view.rayonId) {
      const rayon = boundaries?.rayons?.find((r: RayonBoundary) => r.id === view.rayonId);
      if (rayon) {
        animateTo(Number(rayon.center_lat), Number(rayon.center_lng), 0.08);
      }
    }
  }, [scope, view.rayonId, boundaries, dispatch, animateTo]);
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
                rayonId={view.rayonId ?? view.id}
                areaId={scope === 'area' ? view.id : null}
                rosterById={rosterById}
                showWorkers={showWorkers}
                onRayonDrill={handleRayonBubblePress}
                onAreaDrill={handleAreaBubblePress}
                onRayonDetail={handleRayonPress}
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

          {/* Fixed Surabaya summary bubble — pinned to the screen centre at the
              top level so it stays put while the map pans. Tap to drill into the
              rayons. */}
          {scope === 'surabaya' && (
            <View style={styles.surabayaBubbleWrap} pointerEvents="box-none">
              <TouchableOpacity
                style={styles.surabayaBubble}
                onPress={handleEnterCity}
                activeOpacity={0.85}
                accessibilityRole="button"
                accessibilityLabel={`${t('monitoring:surabaya.title')} — ${t('monitoring:surabaya.tapHint')}`}
                testID="surabaya-bubble"
              >
                <NBText variant="mono-sm" uppercase style={styles.surabayaBubbleLabel}>
                  {t('monitoring:surabaya.title')}
                </NBText>
                <NBText variant="h2" color="black">
                  {rosterTotals.clocked_in}/{rosterTotals.scheduled}
                </NBText>
                <NBText variant="caption" color="gray600">{t('monitoring:surabaya.tapHint')}</NBText>
              </TouchableOpacity>
            </View>
          )}

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
  // Screen-fixed Surabaya bubble: full-bleed catcher centred over the map so the
  // bubble stays pinned to the screen centre while the map pans underneath.
  surabayaBubbleWrap: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  surabayaBubble: {
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: nbSpacing.lg,
    paddingVertical: nbSpacing.sm,
    borderRadius: nbRadius.lg,
    borderWidth: nbBorders.widthThick,
    borderColor: nbColors.black,
    backgroundColor: nbColors.white,
    ...nbShadows.md,
  },
  surabayaBubbleLabel: {
    letterSpacing: 1,
    color: nbColors.black,
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
