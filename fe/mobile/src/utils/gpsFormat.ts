/**
 * gpsFormat — GPS coordinate formatting utility
 * Coerces lat/lng to Numbers and formats to 6 decimal places.
 */

export function formatGps(lat: unknown, lng: unknown): string {
  if (lat == null || lng == null) {
    return '—';
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (Number.isNaN(nLat) || Number.isNaN(nLng)) {
    return '—';
  }
  return `${nLat.toFixed(6)}, ${nLng.toFixed(6)}`;
}

export function formatGpsWithPrecision(lat: unknown, lng: unknown, precision: number = 6): string {
  if (lat == null || lng == null) {
    return '—';
  }
  const nLat = Number(lat);
  const nLng = Number(lng);
  if (Number.isNaN(nLat) || Number.isNaN(nLng)) {
    return '—';
  }
  return `${nLat.toFixed(precision)}, ${nLng.toFixed(precision)}`;
}
