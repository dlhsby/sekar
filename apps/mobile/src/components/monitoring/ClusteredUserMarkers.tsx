/**
 * ClusteredUserMarkers Component
 * Phase 3 sub-phase 3-5: Decides between ClusterMarker bubbles and per-user
 * UserMarker components based on the current zoom level vs. clusterZoomThreshold.
 *
 * Clustering algorithm
 * --------------------
 * A lightweight distance-based grouping is used to avoid adding the `supercluster`
 * npm package to the mobile bundle. Workers within ~0.01° lat/lng of each other
 * are grouped into a single cluster. This is O(n²) for small sets (<200 workers)
 * which is fine in practice; it can be replaced with supercluster once the
 * Phase 3 monitoring v2 backend ships a pre-clustered snapshot endpoint.
 *
 * Key stability
 * -------------
 * Each ClusterMarker key encodes `zoomBucket-clusterIndex` where
 * `zoomBucket = Math.floor(latitudeDelta * 100)`. This prevents the Android
 * native bitmap from being recreated on every pan (only on zoom threshold crosses).
 *
 * Apr 24 stability fixes applied:
 * - All UserMarker keys include `labelMode` (not raw float).
 * - No `animateToRegion` in `onClusterPress` — parent receives the cluster center
 *   and decides what to do (typically zoom in without racing a bottom-sheet).
 */

import React, { useMemo } from 'react';
import { UserMarker, type LabelMode } from './UserMarker';
import { ClusterMarker } from './ClusterMarker';
import type { LiveUser } from '../../types/models.types';

// ─── Constants ────────────────────────────────────────────────────────────────

/** Degrees of lat/lng within which two workers are considered co-located. */
const CLUSTER_RADIUS_DEG = 0.01;

// ─── Types ────────────────────────────────────────────────────────────────────

interface WorkerCluster {
  center: { latitude: number; longitude: number };
  workers: LiveUser[];
}

export interface ClusteredUserMarkersProps {
  workers: LiveUser[];
  /** Current map `latitudeDelta` — drives cluster-vs-individual decision. */
  zoom: number;
  /** lat-delta below which individual markers are shown (e.g. 0.05). */
  clusterZoomThreshold: number;
  labelMode: LabelMode;
  selectedUserId: string | null;
  onUserPress: (userId: string) => void;
  /**
   * Called when a cluster bubble is pressed.
   * Parent should zoom in to `clusterCenter` without calling `animateToRegion`
   * from within this component (race-condition risk with bottom-sheet).
   */
  onClusterPress: (clusterCenter: { latitude: number; longitude: number }) => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Simple O(n²) distance-based clustering.
 * Sufficient for ≤200 workers; upgrade to supercluster in sub-phase 3-8 if needed.
 */
function buildClusters(workers: LiveUser[]): WorkerCluster[] {
  const assigned = new Set<string>();
  const clusters: WorkerCluster[] = [];

  for (const worker of workers) {
    if (assigned.has(worker.id)) { continue; }

    const group: LiveUser[] = [worker];
    assigned.add(worker.id);

    for (const other of workers) {
      if (assigned.has(other.id)) { continue; }
      const latDiff = Math.abs(worker.latitude - other.latitude);
      const lngDiff = Math.abs(worker.longitude - other.longitude);
      if (latDiff <= CLUSTER_RADIUS_DEG && lngDiff <= CLUSTER_RADIUS_DEG) {
        group.push(other);
        assigned.add(other.id);
      }
    }

    const centerLat = group.reduce((s, w) => s + w.latitude, 0) / group.length;
    const centerLng = group.reduce((s, w) => s + w.longitude, 0) / group.length;

    clusters.push({
      center: { latitude: centerLat, longitude: centerLng },
      workers: group,
    });
  }

  return clusters;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const ClusteredUserMarkers = React.memo(function ClusteredUserMarkers({
  workers,
  zoom,
  clusterZoomThreshold,
  labelMode,
  selectedUserId,
  onUserPress,
  onClusterPress,
}: ClusteredUserMarkersProps): React.JSX.Element {
  const shouldClusterNow = zoom >= clusterZoomThreshold;

  // Stable integer bucket — prevents marker key churn on every pan
  const zoomBucket = Math.floor(zoom * 100);

  const clusters = useMemo(
    () => (shouldClusterNow ? buildClusters(workers) : null),
    // Re-cluster only when worker list or cluster mode changes — not on every zoom tweak
    [shouldClusterNow, workers],
  );

  if (shouldClusterNow && clusters) {
    return (
      <>
        {clusters.map((cluster, idx) => {
          if (cluster.workers.length === 1) {
            const user = cluster.workers[0];
            return (
              <UserMarker
                key={`cv2-user-${user.id}-${user.status}-${labelMode}`}
                user={user}
                onPress={() => onUserPress(user.id)}
                labelMode={labelMode}
              />
            );
          }

          return (
            <ClusterMarker
              key={`cv2-cluster-${idx}-${zoomBucket}-${cluster.workers.length}`}
              coordinate={cluster.center}
              count={cluster.workers.length}
              zoomBucket={zoomBucket}
              onClusterPress={() => onClusterPress(cluster.center)}
            />
          );
        })}
      </>
    );
  }

  // Individual markers — same key pattern as the legacy code path
  return (
    <>
      {workers.map(user => (
        <UserMarker
          key={`cv2-user-${user.id}-${user.status}-${labelMode}`}
          user={user}
          onPress={() => onUserPress(user.id)}
          labelMode={labelMode}
          dimmed={selectedUserId !== null && selectedUserId !== user.id}
        />
      ))}
    </>
  );
});
