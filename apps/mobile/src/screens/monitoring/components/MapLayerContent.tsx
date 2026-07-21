/**
 * MapLayerContent Component
 * Renders all MapView child elements: boundary overlays, area status, user markers, preview card.
 * Consolidated from MapDashboardScreen lines 620–715.
 */

import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { featureFlags } from '../../../utils/featureFlags';
import { ClusteredUserMarkers } from '../../../components/monitoring/ClusteredUserMarkers';
import { AreaStatusOverlay } from '../../../components/monitoring/AreaStatusOverlay';
import { PlantOverlayLayer } from '../../../components/monitoring/PlantOverlayLayer';
import { BoundaryOverlay } from '../../../components/monitoring/BoundaryOverlay';
import { AggregateBubbleLayer, type NodeMarker } from '../../../components/monitoring/AggregateBubbleLayer';
import { UserMarker, type LabelMode } from '../../../components/monitoring/UserMarker';
import type { LiveUser } from '../../../types/models.types';
import type { MonitoringV2VisibleLayers } from '../../../store/slices/monitoringV2Slice';

interface MapLayerContentProps {
  mapReady: boolean;
  boundaries: any;
  visibleLayers: MonitoringV2VisibleLayers;
  visibleUsers: LiveUser[];
  selectedUser: LiveUser | null;
  clusters: any[];
  labelMode: LabelMode;
  useClustering: boolean;
  currentRegion: { latitude: number; longitude: number; latitudeDelta: number; longitudeDelta: number };
  boundaryKey: number;
  /** Current drill scope — gates which boundary layers + markers show. */
  scope: 'city' | 'district' | 'region' | 'location';
  /** The district being viewed (district/location scope) — scopes markers to it. */
  districtId: string | null;
  /** The selected location (location scope) — only its boundary is drawn, on demand. */
  areaId: string | null;
  /** Attendance ratio per rayon/location id, shown on the geographic markers. */
  rosterById: Record<string, { activeInside: number; scheduled: number }>;
  /** Drill bubbles composed from the aggregate (district → regions ∪ region-less
   *  lokasi; region → the kawasan's lokasi). Replaces the boundary-derived bubbles
   *  so kawasan (no polygon) can render. */
  nodeMarkers: NodeMarker[];
  /** Bubble tap → drill into that node (variant decides the target scope). */
  onNodeDrill: (node: NodeMarker) => void;
  /** Unified drill-down: true → worker markers (location scope). */
  showWorkers: boolean;
  /** Bubble taps — drill into the child level (city→district, district→area). */
  onDistrictDrill: (district: any) => void;
  onAreaDrill: (area: any) => void;
  /** Marker taps — open the current node's detail sheet. */
  onDistrictDetail: (district: any) => void;
  onAreaDetail: (area: any) => void;
  onMarkerPress: (user: LiveUser) => void;
  onClusterPress: (center: { latitude: number; longitude: number }) => void;
}

export function MapLayerContent({
  mapReady,
  boundaries,
  visibleLayers,
  visibleUsers,
  selectedUser,
  clusters,
  labelMode,
  useClustering,
  currentRegion,
  boundaryKey,
  scope,
  districtId,
  areaId,
  rosterById,
  nodeMarkers,
  onNodeDrill,
  showWorkers,
  onDistrictDrill,
  onAreaDrill,
  onDistrictDetail,
  onAreaDetail,
  onMarkerPress,
  onClusterPress,
}: MapLayerContentProps): React.JSX.Element {
  const { t } = useTranslation();

  // Scope the boundary set to the drill level. City → all districts; district → the
  // current district (its locations are markers, not polygons, so nothing heavy draws);
  // location → the current district but ONLY the selected location's polygon (drawn on
  // demand when its marker is tapped) — this keeps the map cheap.
  const scopedDistricts = useMemo(() => {
    const all = boundaries?.districts ?? [];
    if (scope === 'location') {
      return all
        .filter((r: any) => r.id === districtId)
        .map((r: any) => ({ ...r, areas: (r.areas ?? []).filter((a: any) => a.id === areaId) }));
    }
    if (scope === 'district') {
      return all.filter((r: any) => r.id === districtId);
    }
    return all;
  }, [boundaries, scope, districtId, areaId]);

  // Rayon outline follows its toggle from the city view down. Location outlines draw
  // ONLY at location scope (the one selected location) — never all-at-once at district scope.
  // The Surabaya top level was retired (PR2) — district boundaries show at every
  // tier when toggled (city is now the top, and it draws the district outlines).
  const showDistrictBoundaries = visibleLayers.districts;
  const showAreaBoundaries = visibleLayers.areas && scope === 'location';

  // Drill BUBBLES now come from the aggregate (AggregateBubbleLayer below) so the
  // kawasan tier — which has no boundary polygon — can render. BoundaryOverlay keeps
  // the polygons + the current node's DETAIL marker:
  //   • district → the selected district MARKER (detail)
  //   • location  → the selected location MARKER (detail) + worker markers
  const showDistrictBubbles = false;
  const showAreaBubbles = false;
  const showDistrictMarker = scope === 'district';
  const showAreaMarker = scope === 'location';
  const showBoundaryLayer =
    showDistrictBoundaries || showAreaBoundaries ||
    showDistrictMarker || showAreaMarker;

  return (
    <>
      {/* Boundary overlay — polygons (toggle-gated) + geographic drill markers
          (scope-gated). Keyed by scope so a drill-out fully remounts the layer
          and no stale markers linger. */}
      {mapReady && scopedDistricts.length > 0 && showBoundaryLayer && (
        <BoundaryOverlay
          key={`boundary-${scope}-${boundaryKey}`}
          districts={scopedDistricts}
          onDistrictBubblePress={onDistrictDrill}
          onAreaBubblePress={onAreaDrill}
          onDistrictMarkerPress={onDistrictDetail}
          onAreaMarkerPress={onAreaDetail}
          showDistricts={showDistrictBoundaries}
          showAreas={showAreaBoundaries}
          showDistrictBubbles={showDistrictBubbles}
          showAreaBubbles={showAreaBubbles}
          showDistrictMarker={showDistrictMarker}
          showAreaMarker={showAreaMarker}
          rosterById={rosterById}
        />
      )}

      {/* Drill bubbles from the aggregate — district nodes (city), regions ∪
          region-less lokasi (district), a kawasan's lokasi (region). Tap → drill. */}
      {mapReady && nodeMarkers.length > 0 && (
        <AggregateBubbleLayer nodes={nodeMarkers} onDrill={onNodeDrill} />
      )}

      {/* Phase 3: Area status overlay (plant health tints) — inside a district only */}
      {mapReady && showAreaBoundaries && scopedDistricts.length > 0 && (
        <AreaStatusOverlay
          districts={scopedDistricts}
          boundaryKey={boundaryKey}
        />
      )}

      {/* Phase 3: Plant notable markers */}
      {mapReady && (
        <PlantOverlayLayer visible={visibleLayers.plants} />
      )}

      {/* Worker markers only at location scope. */}
      {showWorkers &&
        (featureFlags.clusterMarkersV2 ? (
        <ClusteredUserMarkers
          workers={visibleUsers}
          zoom={currentRegion.latitudeDelta}
          clusterZoomThreshold={0.05}
          labelMode={labelMode}
          selectedUserId={selectedUser?.id ?? null}
          onUserPress={userId => {
            const user = visibleUsers.find(u => u.id === userId);
            if (user) { onMarkerPress(user); }
          }}
          onClusterPress={onClusterPress}
        />
      ) : (
        <>
          {/* User markers (individual) — legacy Phase 2D path */}
          {!useClustering && visibleUsers.map(user => (
            <UserMarker
              key={`user-${user.id}-${user.status}-${labelMode}`}
              user={user}
              onPress={onMarkerPress}
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
                  full_name: t('monitoring:clusterCountAria', { count: cluster.pointCount }),
                } as unknown as LiveUser
              : null as unknown as LiveUser;
            if (!representative) { return null; }
            return (
              <UserMarker
                key={cluster.id}
                user={representative}
                onPress={() => onClusterPress(cluster.coordinate)}
                clusterCount={cluster.pointCount}
                labelMode={labelMode}
              />
            );
          })}
        </>
        ))}
    </>
  );
}
