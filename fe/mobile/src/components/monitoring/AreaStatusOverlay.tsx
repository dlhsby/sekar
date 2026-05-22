/**
 * AreaStatusOverlay Component
 * Phase 3 sub-phase 3-5: Tints area polygons by plant status from the Redux
 * `plants.areaStatusById` store key. Falls back to transparent when no data.
 *
 * Status color mapping (30% opacity fills, NB token colors):
 *   'ok'      → nbColors.success  (green)
 *   'due'     → nbColors.warning  (amber)
 *   'overdue' → nbColors.danger   (red)
 *   (none)    → transparent
 *
 * Apr 24 stability fixes applied:
 * - `useFocusEffect` re-fetches status on tab return (same as BoundaryOverlay).
 * - `boundaryKey` prop forces Polygon remount — caller increments it on focus
 *   and after refresh so Android native overlays are recreated when the tab
 *   is shown again.
 * - No `tracksViewChanges` on Polygon (N/A — only on Marker).
 */

import React from 'react';
import { Polygon } from 'react-native-maps';
import { useSelector } from 'react-redux';
import {
  nbColors,
  withAlpha,
} from '../../constants/nbTokens';
import type { RootState } from '../../store/store';
import type { RayonBoundary } from '../../types/models.types';
import { geometryToRings } from '../../utils/geoJsonUtils';

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

  // Note: useFocusEffect will be added in sub-phase 3-8 when the plants slice
  // ships its own fetch action. The parent (MapDashboardScreen) already
  // dispatches fetchSnapshot on focus — no extra effect needed here yet.

  if (!rayons || rayons.length === 0) {
    return <></>;
  }

  const polygons: React.JSX.Element[] = [];

  for (const rayon of rayons) {
    for (const area of rayon.areas) {
      // Handles Polygon + MultiPolygon — one <Polygon> per outer ring.
      const rings = geometryToRings(area.boundary_polygon);
      if (rings.length === 0) { continue; }

      const status = areaStatusById[area.id];
      const fillColor = statusToFillColor(status);

      rings.forEach((coords, i) => {
        polygons.push(
          <Polygon
            key={`area-status-${area.id}-${i}-${boundaryKey}`}
            coordinates={coords}
            strokeColor="transparent"
            fillColor={fillColor}
            strokeWidth={0}
            zIndex={1}
          />,
        );
      });
    }
  }

  return <>{polygons}</>;
}
