/**
 * MapLayerContent Component
 * Renders all MapView child elements: boundary overlays, area status, user markers, preview card.
 * Consolidated from MapDashboardScreen lines 620–715.
 */

import React from 'react';
import { useTranslation } from 'react-i18next';
import { featureFlags } from '../../../utils/featureFlags';
import { ClusteredUserMarkers } from '../../../components/monitoring/ClusteredUserMarkers';
import { AreaStatusOverlay } from '../../../components/monitoring/AreaStatusOverlay';
import { PlantOverlayLayer } from '../../../components/monitoring/PlantOverlayLayer';
import { BoundaryOverlay } from '../../../components/monitoring/BoundaryOverlay';
import { UserMarker, type LabelMode } from '../../../components/monitoring/UserMarker';
import { AggregateBubbleLayer, type NodeMarker } from '../../../components/monitoring/AggregateBubbleLayer';
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
  /** Current drill scope — gates which boundary layers show. */
  scope: 'surabaya' | 'city' | 'rayon' | 'area';
  /** Unified drill-down: false → node markers (Surabaya/rayon/area), true → workers. */
  showWorkers: boolean;
  nodeMarkers: NodeMarker[];
  onDrillNode: (node: NodeMarker) => void;
  onRayonPress: (rayon: any) => void;
  onAreaPress: (area: any) => void;
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
  showWorkers,
  nodeMarkers,
  onDrillNode,
  onRayonPress,
  onAreaPress,
  onMarkerPress,
  onClusterPress,
}: MapLayerContentProps): React.JSX.Element {
  const { t } = useTranslation();
  // Scope-gate the boundary polygons: rayon outlines from the city view down,
  // area outlines only once inside a rayon. At the top (Surabaya) the map shows
  // just the Surabaya bubble. The ratio bubbles (AggregateBubbleLayer) are the
  // node markers, so the boundary layer draws polygons only — no duplicate pins.
  const showRayonBoundaries = visibleLayers.rayons && scope !== 'surabaya';
  const showAreaBoundaries = visibleLayers.areas && (scope === 'rayon' || scope === 'area');
  return (
    <>
      {/* Boundary overlays (polygons only — bubbles are the drill affordance) */}
      {mapReady && boundaries && (showRayonBoundaries || showAreaBoundaries) && (
        <BoundaryOverlay
          key={boundaryKey}
          rayons={boundaries.rayons}
          onRayonPress={onRayonPress}
          onAreaPress={onAreaPress}
          showRayons={showRayonBoundaries}
          showAreas={showAreaBoundaries}
          showRayonMarkers={false}
          showAreaMarkers={false}
        />
      )}

      {/* Phase 3: Area status overlay (plant health tints) — inside a rayon only */}
      {mapReady && boundaries && showAreaBoundaries && (
        <AreaStatusOverlay
          rayons={boundaries.rayons}
          boundaryKey={boundaryKey}
        />
      )}

      {/* Phase 3: Plant notable markers */}
      {mapReady && (
        <PlantOverlayLayer visible={visibleLayers.plants} />
      )}

      {/* Drill-down node markers (Surabaya / rayon / area) — drill on tap. */}
      {mapReady && !showWorkers && (
        <AggregateBubbleLayer nodes={nodeMarkers} onDrill={onDrillNode} />
      )}

      {/* Worker markers only at area scope. */}
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
