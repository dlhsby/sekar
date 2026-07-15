/**
 * Shared map geometry helpers.
 *
 * Boundary geometry reaches us from KMZ / shapefile imports, so it is genuinely
 * either a Polygon or a MultiPolygon — and a fix for one of those (a winding
 * order, an inner ring, a null island) has to land in one place, not two. This
 * conversion previously existed twice: once in the monitoring map and once in
 * the day board's boundary map.
 */

/** GeoJSON Polygon/MultiPolygon → Google outer-ring paths. Holes are ignored. */
export function geometryToPaths(
  geom: GeoJSON.Geometry | null | undefined
): google.maps.LatLngLiteral[][] {
  if (!geom) return [];
  if (geom.type === 'Polygon') {
    return [geom.coordinates[0].map(([lng, lat]) => ({ lat, lng }))];
  }
  if (geom.type === 'MultiPolygon') {
    return geom.coordinates.map((poly) => poly[0].map(([lng, lat]) => ({ lat, lng })));
  }
  return [];
}
