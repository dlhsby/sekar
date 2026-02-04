/**
 * Static Map Image Utilities
 * Generates Mapbox Static Images API URLs for map previews
 */

/**
 * Generate a static map image URL
 * Uses Mapbox Static Images API
 * https://docs.mapbox.com/api/maps/static-images/
 */
export function getStaticMapUrl(
  center: [number, number],
  polygon?: GeoJSON.Polygon,
  width = 300,
  height = 200,
): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token === 'your-mapbox-token-here') {
    // Return a placeholder image if no valid token
    return `https://via.placeholder.com/${width}x${height}/e5e7eb/6b7280?text=Map+Preview`;
  }

  const [lng, lat] = center;
  const zoom = polygon ? 14 : 15; // Slightly more zoomed out if showing polygon
  const style = 'mapbox/streets-v12';

  // Base URL
  let url = `https://api.mapbox.com/styles/v1/${style}/static/`;

  // Add polygon overlay if provided
  if (polygon && polygon.coordinates?.[0]) {
    // Add polygon as GeoJSON overlay
    // Format: geojson({...})
    const geojson = encodeURIComponent(JSON.stringify({
      type: 'Feature',
      properties: {
        stroke: '#000',
        'stroke-width': 3,
        fill: '#fbbf24',
        'fill-opacity': 0.3,
      },
      geometry: polygon,
    }));

    url += `geojson(${geojson})/`;
  }

  // Add center, zoom, bearing, pitch
  url += `${lng},${lat},${zoom},0,0/`;

  // Add dimensions
  url += `${width}x${height}@2x?`;

  // Add token
  url += `access_token=${token}`;

  return url;
}

/**
 * Get a simple marker-only static map
 */
export function getStaticMapWithMarker(
  center: [number, number],
  width = 300,
  height = 200,
): string {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token || token === 'your-mapbox-token-here') {
    return `https://via.placeholder.com/${width}x${height}/e5e7eb/6b7280?text=Map+Preview`;
  }

  const [lng, lat] = center;
  const style = 'mapbox/streets-v12';

  // Add a pin marker
  const url = `https://api.mapbox.com/styles/v1/${style}/static/pin-s+fbbf24(${lng},${lat})/${lng},${lat},14,0,0/${width}x${height}@2x?access_token=${token}`;

  return url;
}
