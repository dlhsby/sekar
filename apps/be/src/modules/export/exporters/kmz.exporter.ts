import JSZip from 'jszip';
import type { ExportFile } from './dataset';
import { CONTENT_TYPES } from './dataset';

export interface KmlPlacemark {
  name: string;
  description?: string | null;
  latitude: number;
  longitude: number;
  /** Optional boundary ring as [lng, lat] pairs (closed or open). */
  polygon?: Array<{ latitude: number; longitude: number }> | null;
}

/** Escape XML special characters in text nodes. */
function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function polygonXml(ring: Array<{ latitude: number; longitude: number }>): string {
  const coords = ring.map((p) => `${p.longitude},${p.latitude},0`).join(' ');
  return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coords}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
}

function placemarkXml(area: KmlPlacemark): string {
  const parts = [`<name>${escapeXml(area.name)}</name>`];
  if (area.description) {
    parts.push(`<description>${escapeXml(area.description)}</description>`);
  }
  parts.push(`<Point><coordinates>${area.longitude},${area.latitude},0</coordinates></Point>`);
  if (area.polygon && area.polygon.length >= 3) {
    parts.push(polygonXml(area.polygon));
  }
  return `<Placemark>${parts.join('')}</Placemark>`;
}

function buildKml(areas: KmlPlacemark[]): string {
  const placemarks = areas.map(placemarkXml).join('');
  return (
    '<?xml version="1.0" encoding="UTF-8"?>' +
    '<kml xmlns="http://www.opengis.net/kml/2.2">' +
    `<Document><name>SEKAR Areas</name>${placemarks}</Document>` +
    '</kml>'
  );
}

/**
 * Build a KMZ (zipped KML) buffer for the given areas. Each area becomes a
 * Placemark with a Point and, when a boundary ring is available, a Polygon.
 */
export async function toKmz(areas: KmlPlacemark[]): Promise<ExportFile> {
  const zip = new JSZip();
  zip.file('doc.kml', buildKml(areas));
  const buffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
  return {
    buffer,
    contentType: CONTENT_TYPES.kmz,
    extension: 'kmz',
  };
}
