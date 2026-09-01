/**
 * Unit tests: geometryToPaths.
 *
 * This conversion used to exist twice (monitoring map + board boundary map) and
 * was untested in both. Boundary geometry comes from KMZ/shapefile imports, so
 * MultiPolygon is not hypothetical — it is what a district with detached parcels
 * actually looks like.
 */
import { geometryToPaths } from '../geometry';

const RING: GeoJSON.Position[] = [
  [112.7, -7.2],
  [112.8, -7.2],
  [112.8, -7.3],
  [112.7, -7.2],
];

describe('geometryToPaths', () => {
  it('flips GeoJSON [lng, lat] into Google {lat, lng}', () => {
    // The single most likely defect: GeoJSON is lng-first, Google is lat-first,
    // and swapping them puts Surabaya in the Indian Ocean without erroring.
    const paths = geometryToPaths({ type: 'Polygon', coordinates: [RING] });

    expect(paths[0][0]).toEqual({ lat: -7.2, lng: 112.7 });
  });

  it('returns one path per polygon of a MultiPolygon', () => {
    const paths = geometryToPaths({
      type: 'MultiPolygon',
      coordinates: [[RING], [RING]],
    });

    expect(paths).toHaveLength(2);
    expect(paths[1][0]).toEqual({ lat: -7.2, lng: 112.7 });
  });

  it('takes the outer ring only, ignoring holes', () => {
    const hole: GeoJSON.Position[] = [
      [112.72, -7.22],
      [112.74, -7.22],
      [112.74, -7.24],
      [112.72, -7.22],
    ];
    const paths = geometryToPaths({ type: 'Polygon', coordinates: [RING, hole] });

    expect(paths).toHaveLength(1);
    expect(paths[0]).toHaveLength(RING.length);
  });

  it('is empty for null/undefined rather than throwing', () => {
    // Callers render straight from an API field that is frequently absent.
    expect(geometryToPaths(null)).toEqual([]);
    expect(geometryToPaths(undefined)).toEqual([]);
  });

  it('is empty for a geometry type that has no area', () => {
    expect(geometryToPaths({ type: 'Point', coordinates: [112.7, -7.2] })).toEqual([]);
  });
});
