/**
 * The `bbox` viewport mode sends to the server, held steady while the operator
 * pans inside it. The mobile twin of web's `lib/monitoring/useViewportBox`.
 *
 * Feeding the camera straight into the request would refetch on every settled
 * pan — a drag across the city becomes a dozen calls for overlapping regions, on
 * the connection least able to afford them. The fetched box is padded well
 * beyond the screen and only redrawn once the camera leaves it.
 *
 * Rounding matters as much as the padding: two boxes differing in the tenth
 * decimal are two fetches of the same view.
 */

/** A `react-native-maps` region — centre plus full span. */
export interface MapRegion {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

/**
 * Margin beyond the screen, as a fraction of the viewport. 0.5 = half a screen
 * each side: ordinary panning stays inside without quadrupling the payload.
 */
const PAD = 0.5;
/** ~11 m. Finer and identical views produce different requests. */
const PRECISION = 4;

const round = (n: number): number => Number(n.toFixed(PRECISION));

/** Grow a region by `PAD` on every side, serialised as the API's bbox string. */
export function regionToBox(r: MapRegion): string {
  const halfLat = (Math.abs(r.latitudeDelta) / 2) * (1 + PAD * 2);
  const halfLng = (Math.abs(r.longitudeDelta) / 2) * (1 + PAD * 2);
  return [
    round(r.longitude - halfLng),
    round(r.latitude - halfLat),
    round(r.longitude + halfLng),
    round(r.latitude + halfLat),
  ].join(',');
}

/** Is the camera still fully inside the box we last fetched? */
export function regionWithinBox(r: MapRegion, box: string): boolean {
  const [minLng, minLat, maxLng, maxLat] = box.split(',').map(Number);
  if ([minLng, minLat, maxLng, maxLat].some(n => !Number.isFinite(n))) return false;
  const halfLat = Math.abs(r.latitudeDelta) / 2;
  const halfLng = Math.abs(r.longitudeDelta) / 2;
  return (
    r.longitude - halfLng >= minLng &&
    r.longitude + halfLng <= maxLng &&
    r.latitude - halfLat >= minLat &&
    r.latitude + halfLat <= maxLat
  );
}
