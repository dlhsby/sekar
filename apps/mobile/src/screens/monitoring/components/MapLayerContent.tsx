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
  scope: 'surabaya' | 'city' | 'rayon' | 'location';
  /** The rayon being viewed (rayon/location scope) — scopes markers to it. */
  rayonId: string | null;
  /** The selected location (location scope) — only its boundary is drawn, on demand. */
  areaId: string | null;
  /** Attendance ratio per rayon/location id, shown on the geographic markers. */
  rosterById: Record<string, { activeInside: number; scheduled: number }>;
  /** Unified drill-down: true → worker markers (location scope). */
  showWorkers: boolean;
  /** Bubble taps — drill into the child level (city→rayon, rayon→area). */
  onRayonDrill: (rayon: any) => void;
  onAreaDrill: (area: any) => void;
  /** Marker taps — open the current node's detail sheet. */
  onRayonDetail: (rayon: any) => void;
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
  rayonId,
  areaId,
  rosterById,
  showWorkers,
  onRayonDrill,
  onAreaDrill,
  onRayonDetail,
  onAreaDetail,
  onMarkerPress,
  onClusterPress,
}: MapLayerContentProps): React.JSX.Element {
  const { t } = useTranslation();

  // Scope the boundary set to the drill level. City → all rayons; rayon → the
  // current rayon (its locations are markers, not polygons, so nothing heavy draws);
  // location → the current rayon but ONLY the selected location's polygon (drawn on
  // demand when its marker is tapped) — this keeps the map cheap.
  const scopedRayons = useMemo(() => {
    const all = boundaries?.rayons ?? [];
    if (scope === 'location') {
      return all
        .filter((r: any) => r.id === rayonId)
        .map((r: any) => ({ ...r, areas: (r.areas ?? []).filter((a: any) => a.id === areaId) }));
    }
    if (scope === 'rayon') {
      return all.filter((r: any) => r.id === rayonId);
    }
    return all;
  }, [boundaries, scope, rayonId, areaId]);

  // Rayon outline follows its toggle from the city view down. Location outlines draw
  // ONLY at location scope (the one selected location) — never all-at-once at rayon scope.
  const showRayonBoundaries = visibleLayers.rayons && scope !== 'surabaya';
  const showAreaBoundaries = visibleLayers.areas && scope === 'location';

  // Bubbles vs markers are separated by scope (gated independently of the
  // boundary toggles):
  //   • city  → rayon BUBBLES (ratio, drill into a rayon)
  //   • rayon → the selected rayon MARKER (detail) + its area BUBBLES (drill)
  //   • location  → the selected location MARKER (detail) + worker markers
  const showRayonBubbles = scope === 'city';
  const showAreaBubbles = scope === 'rayon';
  const showRayonMarker = scope === 'rayon';
  const showAreaMarker = scope === 'location';
  const showBoundaryLayer =
    showRayonBoundaries || showAreaBoundaries ||
    showRayonBubbles || showAreaBubbles || showRayonMarker || showAreaMarker;

  return (
    <>
      {/* Boundary overlay — polygons (toggle-gated) + geographic drill markers
          (scope-gated). Keyed by scope so a drill-out fully remounts the layer
          and no stale markers linger. */}
      {mapReady && scopedRayons.length > 0 && showBoundaryLayer && (
        <BoundaryOverlay
          key={`boundary-${scope}-${boundaryKey}`}
          rayons={scopedRayons}
          onRayonBubblePress={onRayonDrill}
          onAreaBubblePress={onAreaDrill}
          onRayonMarkerPress={onRayonDetail}
          onAreaMarkerPress={onAreaDetail}
          showRayons={showRayonBoundaries}
          showAreas={showAreaBoundaries}
          showRayonBubbles={showRayonBubbles}
          showAreaBubbles={showAreaBubbles}
          showRayonMarker={showRayonMarker}
          showAreaMarker={showAreaMarker}
          rosterById={rosterById}
        />
      )}

      {/* Phase 3: Area status overlay (plant health tints) — inside a rayon only */}
      {mapReady && showAreaBoundaries && scopedRayons.length > 0 && (
        <AreaStatusOverlay
          rayons={scopedRayons}
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
