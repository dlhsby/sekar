/**
 * Parse a KML document (or pasted KML / GeoJSON text) into a boundary geometry.
 *
 * Google Earth exports a Placemark whose Polygon holds the boundary as
 * whitespace-separated `lng,lat[,alt]` tuples inside
 * `<Polygon><outerBoundaryIs><LinearRing><coordinates>…`. Such exports also
 * append a binary `<?earth data="…"?>` processing instruction AFTER `</kml>`,
 * which makes the document invalid XML — we truncate to the KML root first.
 *
 * Returns a GeoJSON Polygon (single ring set) or MultiPolygon (multiple
 * Placemark polygons), or null when nothing valid is found.
 */
import { isBoundaryGeometry } from './geo';

type BoundaryGeometry = GeoJSON.Polygon | GeoJSON.MultiPolygon;

/** Parse a KML `<coordinates>` text block ("lng,lat,alt lng,lat,alt …"). */
function parseCoordinateString(text: string): GeoJSON.Position[] {
  return text
    .trim()
    .split(/\s+/)
    .map((tuple) => {
      const [lng, lat] = tuple.split(',').map(Number);
      return [lng, lat] as GeoJSON.Position;
    })
    .filter((p) => Number.isFinite(p[0]) && Number.isFinite(p[1]));
}

/** Ensure a ring is closed (first point repeated at the end). */
function closeRing(ring: GeoJSON.Position[]): GeoJSON.Position[] {
  if (ring.length < 3) return ring;
  const [fx, fy] = ring[0];
  const [lx, ly] = ring[ring.length - 1];
  return fx === lx && fy === ly ? ring : [...ring, ring[0]];
}

/** The `<coordinates>` text nearest a boundary container element. */
function ringFromContainer(container: Element): GeoJSON.Position[] | null {
  const coordsEl = container.getElementsByTagNameNS('*', 'coordinates')[0];
  if (!coordsEl?.textContent) return null;
  const ring = closeRing(parseCoordinateString(coordsEl.textContent));
  return ring.length >= 4 ? ring : null;
}

/** Convert one KML `<Polygon>` element to a GeoJSON polygon ring set. */
function polygonElementToRings(poly: Element): GeoJSON.Position[][] | null {
  const rings: GeoJSON.Position[][] = [];
  const outer = poly.getElementsByTagNameNS('*', 'outerBoundaryIs')[0];
  if (outer) {
    const ring = ringFromContainer(outer);
    if (ring) rings.push(ring);
  }
  const inners = poly.getElementsByTagNameNS('*', 'innerBoundaryIs');
  for (let i = 0; i < inners.length; i++) {
    const ring = ringFromContainer(inners[i]);
    if (ring) rings.push(ring);
  }
  // Fallback: a Polygon with a bare LinearRing (no boundary wrappers).
  if (rings.length === 0) {
    const ring = ringFromContainer(poly);
    if (ring) rings.push(ring);
  }
  return rings.length ? rings : null;
}

function parseKml(xmlText: string): BoundaryGeometry | null {
  // Truncate the Google-Earth binary trailer after </kml> so the XML is valid.
  const closeIdx = xmlText.lastIndexOf('</kml>');
  const xml = closeIdx >= 0 ? xmlText.slice(0, closeIdx + '</kml>'.length) : xmlText;

  let doc: Document;
  try {
    doc = new DOMParser().parseFromString(xml, 'application/xml');
  } catch {
    return null;
  }
  if (doc.getElementsByTagName('parsererror').length > 0) return null;

  const polygonEls = doc.getElementsByTagNameNS('*', 'Polygon');
  const polygons: GeoJSON.Position[][][] = [];
  for (let i = 0; i < polygonEls.length; i++) {
    const rings = polygonElementToRings(polygonEls[i]);
    if (rings) polygons.push(rings);
  }
  if (polygons.length === 0) return null;
  return polygons.length === 1
    ? { type: 'Polygon', coordinates: polygons[0] }
    : { type: 'MultiPolygon', coordinates: polygons };
}

/** Pull a Polygon/MultiPolygon out of pasted GeoJSON (geometry, Feature, or FC). */
function parseGeoJson(text: string): BoundaryGeometry | null {
  let obj: unknown;
  try {
    obj = JSON.parse(text);
  } catch {
    return null;
  }
  const geoms: unknown[] = [];
  const visit = (node: unknown): void => {
    if (!node || typeof node !== 'object') return;
    const n = node as Record<string, unknown>;
    if (n.type === 'FeatureCollection' && Array.isArray(n.features)) n.features.forEach(visit);
    else if (n.type === 'Feature') visit(n.geometry);
    else if (n.type === 'Polygon' || n.type === 'MultiPolygon') geoms.push(n);
  };
  visit(obj);
  return (geoms.find((g) => isBoundaryGeometry(g)) as BoundaryGeometry | undefined) ?? null;
}

export function parseKmlToGeometry(input: string): BoundaryGeometry | null {
  const text = (input ?? '').trim();
  if (!text) return null;
  const geom = text.startsWith('{') ? parseGeoJson(text) : parseKml(text);
  return geom && isBoundaryGeometry(geom) ? geom : null;
}
