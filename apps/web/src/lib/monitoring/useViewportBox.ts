'use client';

/**
 * The `bbox` viewport mode sends to the server, held steady while the operator
 * pans around inside it.
 *
 * Naively feeding the camera's bounds straight into a query key would refetch on
 * every idle — a drag across the city is a dozen requests for regions that
 * mostly overlap. Instead the fetched box is **padded** well beyond the screen
 * and only redrawn when the camera leaves it. Small pans then cost nothing, and
 * because the box is part of the React-Query key, panning back to a region
 * already fetched is served from cache.
 *
 * Rounding matters as much as the padding: two boxes differing in the tenth
 * decimal are two cache entries for the same view. Coordinates are quantised so
 * an unchanged view produces a byte-identical key.
 */
import { useEffect, useRef, useState } from 'react';
import type { MapBounds } from '@/components/monitoring/WorkerClusterLayer';

/**
 * How much beyond the screen to fetch, as a fraction of the viewport's size.
 * 0.5 = half a screen of margin on each side — enough that ordinary panning
 * stays inside the fetched region, without quadrupling the payload.
 */
const PAD = 0.5;
/** ~11 m. Finer than this and identical views mint different cache keys. */
const PRECISION = 4;

const round = (n: number): number => Number(n.toFixed(PRECISION));

/** Grow bounds by `PAD` on every side and serialise as the API's bbox string. */
export function padToBox(b: MapBounds): string {
  const dLat = Math.abs(b.north - b.south) * PAD;
  const dLng = Math.abs(b.east - b.west) * PAD;
  return [
    round(b.west - dLng),
    round(b.south - dLat),
    round(b.east + dLng),
    round(b.north + dLat),
  ].join(',');
}

/** Is the camera still fully inside the box we last fetched? */
export function boundsWithinBox(b: MapBounds, box: string): boolean {
  const [minLng, minLat, maxLng, maxLat] = box.split(',').map(Number);
  if ([minLng, minLat, maxLng, maxLat].some((n) => !Number.isFinite(n))) return false;
  return b.west >= minLng && b.east <= maxLng && b.south >= minLat && b.north <= maxLat;
}

/**
 * @param bounds  camera bounds, captured on map idle
 * @param active  false in drill/zoom mode — the box then stays null and no
 *                `bbox` is sent, so those modes are byte-for-byte unchanged
 */
export function useViewportBox(bounds: MapBounds | null, active: boolean): string | null {
  const [box, setBox] = useState<string | null>(null);
  // Read inside the effect rather than listed as a dependency: the effect must
  // run on a bounds change, and depending on the box it sets would re-run it on
  // its own output.
  const boxRef = useRef<string | null>(null);

  useEffect(() => {
    if (!active) {
      // Clear on the way out, so re-entering viewport mode fetches for wherever
      // the camera is NOW rather than reusing a stale box from last time.
      if (boxRef.current !== null) {
        boxRef.current = null;
        setBox(null);
      }
      return;
    }
    if (!bounds) return;
    if (boxRef.current && boundsWithinBox(bounds, boxRef.current)) return;
    const next = padToBox(bounds);
    if (next === boxRef.current) return;
    boxRef.current = next;
    setBox(next);
  }, [bounds, active]);

  return box;
}
