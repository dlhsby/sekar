/**
 * Geospatial Utilities for Area Management
 * Provides polygon area calculation, validation, and formatting
 */

/**
 * Calculate area of a polygon in square meters using the Shoelace formula
 * This assumes the polygon is relatively small and uses a simple approximation
 * For large polygons, consider using a library like Turf.js
 */
export function calculatePolygonArea(polygon: GeoJSON.Polygon): number {
  if (!polygon?.coordinates?.[0] || polygon.coordinates[0].length < 4) {
    return 0;
  }

  const coords = polygon.coordinates[0];
  let area = 0;

  // Shoelace formula with lat/lng to meters approximation
  // At Surabaya's latitude (-7.25°), 1 degree ≈ 111,132 meters (latitude)
  // 1 degree longitude ≈ 110,500 meters (approximate at this latitude)
  const latToMeters = 111132;
  const lngToMeters = 110500;

  for (let i = 0; i < coords.length - 1; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[i + 1];

    // Convert to meters
    const x1 = lng1 * lngToMeters;
    const y1 = lat1 * latToMeters;
    const x2 = lng2 * lngToMeters;
    const y2 = lat2 * latToMeters;

    area += x1 * y2 - x2 * y1;
  }

  return Math.abs(area / 2);
}

/**
 * Format area for display
 * Converts to hectares if > 10,000 m²
 */
export function formatArea(squareMeters: number): string {
  if (squareMeters >= 10000) {
    const hectares = squareMeters / 10000;
    return `${hectares.toFixed(2)} ha`;
  }
  return `${squareMeters.toFixed(0)} m²`;
}

/**
 * Calculate the centroid (geometric center) of a polygon
 * Returns [longitude, latitude]
 */
export function calculatePolygonCenter(
  polygon: GeoJSON.Polygon,
): [number, number] {
  if (!polygon?.coordinates?.[0] || polygon.coordinates[0].length < 4) {
    return [112.7521, -7.2575]; // Default to Surabaya center
  }

  const coords = polygon.coordinates[0];
  let sumLng = 0;
  let sumLat = 0;
  const count = coords.length - 1; // Exclude the closing point

  for (let i = 0; i < count; i++) {
    sumLng += coords[i][0];
    sumLat += coords[i][1];
  }

  return [sumLng / count, sumLat / count];
}

/**
 * Validate a polygon
 * Checks for minimum 3 points and basic structure
 */
export function isValidPolygon(polygon: GeoJSON.Polygon): boolean {
  if (!polygon || polygon.type !== 'Polygon') {
    return false;
  }

  if (!polygon.coordinates || polygon.coordinates.length === 0) {
    return false;
  }

  const ring = polygon.coordinates[0];
  if (!Array.isArray(ring) || ring.length < 4) {
    return false;
  }

  // Check that first and last points are the same (closed ring)
  const first = ring[0];
  const last = ring[ring.length - 1];
  if (first[0] !== last[0] || first[1] !== last[1]) {
    return false;
  }

  return true;
}

/**
 * Convert GeoJSON polygon to Mapbox GL Draw feature
 */
export function polygonToFeature(polygon: GeoJSON.Polygon): GeoJSON.Feature {
  return {
    type: 'Feature',
    properties: {},
    geometry: polygon,
  };
}

/**
 * Extract polygon from Mapbox GL Draw feature
 */
export function featureToPolygon(
  feature: GeoJSON.Feature,
): GeoJSON.Polygon | null {
  if (feature.geometry.type === 'Polygon') {
    return feature.geometry as GeoJSON.Polygon;
  }
  return null;
}

/**
 * Format coordinates for display
 */
export function formatCoordinates(lng: number, lat: number): string {
  return `${lat.toFixed(6)}°, ${lng.toFixed(6)}°`;
}
