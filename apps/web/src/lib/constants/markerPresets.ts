/**
 * Preseeded default map-marker images (UAT: markers are images, choose from a
 * gallery or upload a custom one). Files live in `public/markers/*.svg` and are
 * served same-origin, so the stored value is a root-relative path. Custom
 * uploads are stored as base64 data-URIs (see the markers upload endpoint).
 */
export interface MarkerPreset {
  /** Stored value (root-relative path) + gallery src. */
  url: string;
  /** i18n-free short label (color/shape); display uses the key below. */
  key: string;
}

export const MARKER_PRESETS: MarkerPreset[] = [
  { url: '/markers/pin-sage.svg', key: 'sage' },
  { url: '/markers/pin-green.svg', key: 'green' },
  { url: '/markers/pin-blue.svg', key: 'blue' },
  { url: '/markers/pin-teal.svg', key: 'teal' },
  { url: '/markers/pin-yellow.svg', key: 'yellow' },
  { url: '/markers/pin-orange.svg', key: 'orange' },
  { url: '/markers/pin-red.svg', key: 'red' },
  { url: '/markers/pin-purple.svg', key: 'purple' },
  { url: '/markers/pin-gray.svg', key: 'gray' },
];

/** True for a stored custom upload (data-URI) rather than a preset path. */
export function isCustomMarker(url: string | null | undefined): boolean {
  return !!url && url.startsWith('data:');
}
