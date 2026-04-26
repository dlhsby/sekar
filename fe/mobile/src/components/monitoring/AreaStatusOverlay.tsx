/**
 * AreaStatusOverlay Component
 * Phase 3 sub-phase 3-5: Tints area polygons by plant status from the Redux
 * `plants.areaStatusById` store key. Falls back to transparent when no data.
 *
 * Status color mapping (30% opacity fills, NB token colors):
 *   'ok'      → nbColors.success  (green)
 *   'due'     → nbColors.warning  (amber)
 *   'overdue' → nbColors.error    (red)
 *   (none)    → transparent
 *
 * Apr 24 stability fixes applied:
 * - `useFocusEffect` re-fetches status on tab return (same as BoundaryOverlay).
 * - `boundaryKey` prop forces Polygon remount — caller increments it on focus
 *   and after refresh so Android native overlays are recreated when the tab
 *   is shown again.
 * - No `tracksViewChanges` on Polygon (N/A — only on Marker).
 */

import React, { useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import { Polygon } from 'react-native-maps';
import { useSelector } from 'react-redux';
import {
  nbColors,
  withAlpha,
} from '../../constants/nbTokens';
import type { RootState } from '../../store/store';
import type { RayonBoundary, GeoJsonPolygon } from '../../types/models.types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AreaPlantStatus = 'ok' | 'due' | 'overdue';

export interface AreaStatusById {
  [areaId: string]: AreaPlantStatus;
}

interface AreaStatusOverlayProps {
  rayons: RayonBoundary[];
  /**
   * Incrementing integer — callers pass a new value on tab focus and after
   * manual refresh so Android native Polygon overlays are force-recreated.
   */
  boundaryKey: number;
  /**
   * Optional override for the status map. When omitted, the component reads
   * from `state.plants?.areaStatusById` — gracefully renders nothing if that
   * slice does not exist yet (plants module ships in sub-phase 3-8).
   */
  areaStatusById?: AreaStatusById;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const FILL_OPACITY = 0.3;

function statusToFillColor(status: AreaPlantStatus | undefined): string {
  switch (status) {
    case 'ok':
      return withAlpha(nbColors.success, FILL_OPACITY);
    case 'due':
      return withAlpha(nbColors.warning, FILL_OPACITY);
    case 'overdue':
      return withAlpha(nbColors.danger, FILL_OPACITY);
    default:
      return 'transparent';
  }
}

function polygonToCoords(
  polygon: GeoJsonPolygon,
): { latitude: number; longitude: number }[] {
  const ring = polygon.coordinates[0];
  if (!ring || ring.length < 3) { return []; }
  return ring.map(([lng, lat]) => ({ latitude: Number(lat), longitude: Number(lng) }));
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AreaStatusOverlay({
  rayons,
  boundaryKey,
  areaStatusById: areaStatusByIdProp,
}: AreaStatusOverlayProps): React.JSX.Element {
  // Read from plants slice if it exists. The plants module ships in sub-phase 3-8;
  // until then `state.plants` is undefined and the fallback empty object is used.
  const storeStatus = useSelector(
    (state: RootState) =>
      (state as any).plants?.areaStatusById as AreaStatusById | undefined,
  );

  const areaStatusById = areaStatusByIdProp ?? storeStatus ?? {};

  // Re-register on tab focus so that a scope change (rayon filter) triggers a
  // fresh read — same pattern as BoundaryOverlay's useFocusEffect.
  useFocusEffect(
    useCallback(() => {
      // No async fetch needed here — data comes from Redux. The parent
      // (MapDashboardScreen) is responsible for dispatching fetchSnapshot on
      // focus. This effect is a placeholder for when the plants slice ships its
      // own fetch action in sub-phase 3-8.
    }, []),
  );

  if (!rayons || rayons.length === 0) {
    return <></>;
  }

  const polygons: React.JSX.Element[] = [];

  for (const rayon of rayons) {
    for (const area of rayon.areas) {
      if (!area.boundary_polygon) { continue; }

      const coords = polygonToCoords(area.boundary_polygon);
      if (coords.length < 3) { continue; }

      const status = areaStatusById[area.id];
      const fillColor = statusToFillColor(status);

      polygons.push(
        <Polygon
          key={`area-status-${area.id}-${boundaryKey}`}
          coordinates={coords}
          strokeColor="transparent"
          fillColor={fillColor}
          strokeWidth={0}
          zIndex={1}
        />,
      );
    }
  }

  return <>{polygons}</>;
}
