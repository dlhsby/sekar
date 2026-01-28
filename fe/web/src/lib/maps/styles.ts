/**
 * Map Styles Configuration
 * Defines Mapbox map styles and default settings
 */

/**
 * Available Mapbox map styles
 */
export const mapStyles = {
  streets: 'mapbox://styles/mapbox/streets-v12',
  satellite: 'mapbox://styles/mapbox/satellite-streets-v12',
  light: 'mapbox://styles/mapbox/light-v11',
  dark: 'mapbox://styles/mapbox/dark-v11',
} as const;

export type MapStyle = keyof typeof mapStyles;

/**
 * Surabaya city center coordinates
 * [longitude, latitude]
 */
export const surabayaCenter: [number, number] = [112.7521, -7.2575];

/**
 * Default zoom level for Surabaya city view
 */
export const defaultZoom = 12;

/**
 * Map bounds for Surabaya area
 * Southwest and Northeast corners
 */
export const surabayaBounds: [[number, number], [number, number]] = [
  [112.5, -7.5], // Southwest
  [113.0, -7.0], // Northeast
];

/**
 * Polygon drawing colors (Neo Brutalism style)
 */
export const polygonColors = {
  fill: '#fbbf24', // amber-400
  fillOpacity: 0.2,
  stroke: '#000000', // black
  strokeWidth: 3,
  strokeActive: '#dc2626', // red-600
  vertex: '#000000',
  vertexActive: '#dc2626',
} as const;
