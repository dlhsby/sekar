import { simplifyGeometry, countVertices } from './geojson-simplify.util';

describe('geojson-simplify.util', () => {
  it('drops near-collinear vertices from a Polygon ring', () => {
    // A square edge with 3 extra collinear points along the bottom edge.
    const poly = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [0.25, 0], // collinear
          [0.5, 0], // collinear
          [0.75, 0], // collinear
          [1, 0],
          [1, 1],
          [0, 1],
          [0, 0],
        ],
      ],
    };
    const before = countVertices(poly);
    const simplified = simplifyGeometry(poly, 1e-4);
    const after = countVertices(simplified);
    expect(after).toBeLessThan(before);
    // Ring stays closed.
    const ring = (simplified as any).coordinates[0];
    expect(ring[0]).toEqual(ring[ring.length - 1]);
    // Corner points preserved.
    expect(ring).toEqual(
      expect.arrayContaining([
        [0, 0],
        [1, 0],
        [1, 1],
        [0, 1],
      ]),
    );
  });

  it('leaves a small ring untouched', () => {
    const poly = {
      type: 'Polygon',
      coordinates: [
        [
          [0, 0],
          [1, 0],
          [1, 1],
          [0, 0],
        ],
      ],
    };
    expect(simplifyGeometry(poly)).toEqual(poly);
  });

  it('handles MultiPolygon', () => {
    const multi = {
      type: 'MultiPolygon',
      coordinates: [
        [
          [
            [0, 0],
            [0.5, 0],
            [1, 0],
            [1, 1],
            [0, 1],
            [0, 0],
          ],
        ],
      ],
    };
    const simplified = simplifyGeometry(multi, 1e-4);
    expect((simplified as any).type).toBe('MultiPolygon');
    expect(countVertices(simplified)).toBeLessThanOrEqual(countVertices(multi));
  });

  it('returns nullish / non-polygon geometry unchanged', () => {
    expect(simplifyGeometry(null)).toBeNull();
    const point = { type: 'Point', coordinates: [1, 2] };
    expect(simplifyGeometry(point)).toEqual(point);
  });
});
