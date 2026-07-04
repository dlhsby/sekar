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
  setMode,
  initMonitoringView,
  drillTo,
  drillBack,
} from '../../store/slices/monitoringV2Slice';
import type {
  MonitoringV2VisibleLayers,
  MonitoringScope,
  MonitoringMode,
} from '../../store/slices/monitoringV2Slice';
import type { AggregateNode } from '../../types/models.types';
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
  const mode = useSelector((state: RootState) => state.monitoringV2.mode);
  const view = useSelector((state: RootState) => state.monitoringV2.view);
  const floor = useSelector((state: RootState) => state.monitoringV2.floor);
  const aggregate = useSelector((state: RootState) => state.monitoringV2.aggregate);

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
  const { resetHeading, handleClusterPress } = useMapOperations(mapRef, currentRegion);

  const { visibleUsers, useClustering, clusters, labelMode, staffedAreas, totalAreas, lastUpdated } =
    useLiveUsersFiltering(liveUsers, activityFilter, filters, visibleLayers, currentRegion, boundaries);


  // Initialise the aggregate-first drill view + floor from the viewer's role.
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;
    let payload: { view: typeof view; floor: MonitoringScope; mode: MonitoringMode };
    if (role === 'korlap' && currentUser.area_id) {
      payload = {
        view: { scope: 'area', id: currentUser.area_id, rayonId: currentUser.rayon_id ?? null, name: null },
        floor: 'area',
        mode: 'workers',
      };
    } else if ((role === 'kepala_rayon' || role === 'admin_data') && currentUser.rayon_id) {
      payload = {
        view: { scope: 'rayon', id: currentUser.rayon_id, rayonId: currentUser.rayon_id, name: null },
        floor: 'rayon',
        mode: 'aggregate',
      };
    } else {
      payload = { view: { scope: 'city', id: null, rayonId: null, name: null }, floor: 'city', mode: 'aggregate' };
    }
    dispatch(initMonitoringView(payload));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Aggregate ("Ringkasan") fetch — only when showing bubbles for city/rayon.
  useEffect(() => {
    if (mode === 'aggregate' && (view.scope === 'city' || view.scope === 'rayon')) {
      void dispatch(
        fetchAggregate({ scope: view.scope, id: view.scope === 'rayon' ? view.id ?? undefined : undefined }),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, view.scope, view.id]);

  // Always fetch workers for the current scope (even in Ringkasan) so search can
  // find people in any mode; the map only *renders* worker markers in the
  // "Semua Petugas" view (MapLayerContent gates on mode).
  useEffect(() => {
    void fetchLiveUsersWithFilters(
      view.scope === 'area' && view.id ? { ...filters, area_id: view.id } : filters,
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode, view.scope, view.id, filters]);

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

  // Aggregate-first drill handlers
  const aggregateNodes = useMemo<AggregateNode[]>(() => aggregate?.nodes ?? [], [aggregate]);
  const handleDrillNode = useCallback(
    (node: AggregateNode) => {
      dispatch(drillTo({ id: node.id, type: node.type, name: node.name, rayonId: node.rayon_id ?? null }));
    },
    [dispatch],
  );
  const handleSetMode = useCallback((m: MonitoringMode) => dispatch(setMode(m)), [dispatch]);
  const handleDrillBack = useCallback(() => dispatch(drillBack()), [dispatch]);
  const canToggleMode = view.scope !== 'area';
  const canDrillBack = view.scope !== floor;

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
              // Native Google Maps controls + UX (per revamp): live location dot +
              // My-Location button, native zoom buttons (Android), and the compass.
              showsUserLocation={true}
              showsMyLocationButton={true}
              zoomControlEnabled={true}
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
                mode={mode}
                aggregateNodes={aggregateNodes}
                onDrillNode={handleDrillNode}
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

          {/* Drill breadcrumb + Ringkasan / Semua Petugas toggle */}
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
            {canToggleMode && (
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'aggregate' && styles.modeBtnActive]}
                  onPress={() => handleSetMode('aggregate')}
                  accessibilityRole="button"
                  accessibilityLabel={t('monitoring:page.modeSummary')}
                >
                  <NBText variant="caption" style={mode === 'aggregate' ? styles.modeTextActive : undefined}>
                    {t('monitoring:page.modeSummary')}
                  </NBText>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeBtn, mode === 'workers' && styles.modeBtnActive]}
                  onPress={() => handleSetMode('workers')}
                  accessibilityRole="button"
                  accessibilityLabel={t('monitoring:page.modeAllWorkers')}
                >
                  <NBText variant="caption" style={mode === 'workers' ? styles.modeTextActive : undefined}>
                    {t('monitoring:page.modeAllWorkers')}
                  </NBText>
                </TouchableOpacity>
              </View>
            )}
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
            handleRefresh={() => handleRefresh(setBoundaryKey)}
            resetHeading={resetHeading}
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
  modeToggle: {
    flexDirection: 'row',
    marginLeft: 'auto',
    padding: 2,
    backgroundColor: nbColors.white,
    borderWidth: nbBorders.widthBase,
    borderColor: nbColors.black,
    borderRadius: nbRadius.base,
    ...nbShadows.xs,
  },
  modeBtn: {
    paddingVertical: nbSpacing.xs,
    paddingHorizontal: nbSpacing.sm,
    borderRadius: nbRadius.sm,
  },
  modeBtnActive: {
    backgroundColor: nbColors.primary,
  },
  modeTextActive: {
    color: nbColors.black,
    fontWeight: '700',
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
