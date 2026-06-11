/**
 * MapLayerContent Component
 * Renders all MapView child elements: boundary overlays, area status, user markers, preview card.
 * Consolidated from MapDashboardScreen lines 620–715.
 */

import React from 'react';
import { featureFlags } from '../../../utils/featureFlags';
import { ClusteredUserMarkers } from '../../../components/monitoring/ClusteredUserMarkers';
import { AreaStatusOverlay } from '../../../components/monitoring/AreaStatusOverlay';
import { PlantOverlayLayer } from '../../../components/monitoring/PlantOverlayLayer';
import { BoundaryOverlay } from '../../../components/monitoring/BoundaryOverlay';
import { MarkerPreview, type MarkerPreviewData } from '../../../components/monitoring/MarkerPreview';
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
  markerPreview: MarkerPreviewData | null;
  boundaryKey: number;
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
  markerPreview,
  boundaryKey,
  onRayonPress,
  onAreaPress,
  onMarkerPress,
  onClusterPress,
}: MapLayerContentProps): React.JSX.Element {
  return (
    <>
      {/* Boundary overlays */}
      {mapReady && boundaries && (visibleLayers.rayons || visibleLayers.areas) && (
        <BoundaryOverlay
          key={boundaryKey}
          rayons={boundaries.rayons}
          onRayonPress={onRayonPress}
          onAreaPress={onAreaPress}
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

      {/* Phase 3: Plant notable markers */}
      {mapReady && (
        <PlantOverlayLayer visible={visibleLayers.plants} />
      )}

      {/* User markers — Phase 3: ClusteredUserMarkers when flag enabled */}
      {featureFlags.clusterMarkersV2 ? (
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
                  full_name: `${cluster.pointCount} petugas`,
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
      )}

      {/* Marker preview card — pinned over the tapped marker (custom callout). */}
      {markerPreview && <MarkerPreview data={markerPreview} />}
    </>
  );
}
