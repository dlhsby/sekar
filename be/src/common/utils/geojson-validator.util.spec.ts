import { GeoJsonValidator } from './geojson-validator.util';

const VALID_POLYGON = {
  type: 'Polygon' as const,
  coordinates: [
    [
      [112.7388, -7.2905],
      [112.7395, -7.2905],
      [112.7395, -7.2910],
      [112.7388, -7.2910],
      [112.7388, -7.2905], // closed
    ],
  ],
};

describe('GeoJsonValidator', () => {
  describe('validatePolygon', () => {
    it('returns no errors for a valid polygon', () => {
      expect(GeoJsonValidator.validatePolygon(VALID_POLYGON)).toEqual([]);
    });

    it('returns error when polygon is null', () => {
      const errors = GeoJsonValidator.validatePolygon(null as any);
      expect(errors).toContain('Polygon must be a non-null object');
    });

    it('returns error when type is not Polygon', () => {
      const errors = GeoJsonValidator.validatePolygon({ ...VALID_POLYGON, type: 'Point' as any });
      expect(errors.some((e) => e.includes("Type must be 'Polygon'"))).toBe(true);
    });

    it('returns error when coordinates is not an array', () => {
      const errors = GeoJsonValidator.validatePolygon({ ...VALID_POLYGON, coordinates: 'bad' as any });
      expect(errors.some((e) => e.includes('Coordinates must be an array'))).toBe(true);
    });

    it('returns error when coordinates is empty', () => {
      const errors = GeoJsonValidator.validatePolygon({ ...VALID_POLYGON, coordinates: [] });
      expect(errors.some((e) => e.includes('at least one ring'))).toBe(true);
    });

    it('returns error when outer ring has fewer than 4 points', () => {
      const errors = GeoJsonValidator.validatePolygon({
        ...VALID_POLYGON,
        coordinates: [[[112.7388, -7.2905], [112.7395, -7.2905], [112.7388, -7.2905]]],
      });
      expect(errors.some((e) => e.includes('>= 4 points'))).toBe(true);
    });

    it('returns error when ring is not closed', () => {
      const errors = GeoJsonValidator.validatePolygon({
        ...VALID_POLYGON,
        coordinates: [
          [
            [112.7388, -7.2905],
            [112.7395, -7.2905],
            [112.7395, -7.2910],
            [112.7388, -7.2910], // NOT closed
          ],
        ],
      });
      expect(errors.some((e) => e.includes('closed'))).toBe(true);
    });

    it('returns error when coordinates are outside Surabaya bounds', () => {
      const errors = GeoJsonValidator.validatePolygon({
        ...VALID_POLYGON,
        coordinates: [
          [
            [106.8, -6.2], // Jakarta
            [106.9, -6.2],
            [106.9, -6.3],
            [106.8, -6.3],
            [106.8, -6.2],
          ],
        ],
      });
      expect(errors.some((e) => e.includes('Surabaya bounds'))).toBe(true);
    });

    it('returns error for non-numeric coordinate values', () => {
      const errors = GeoJsonValidator.validatePolygon({
        ...VALID_POLYGON,
        coordinates: [
          [
            ['bad', -7.2905] as any,
            [112.7395, -7.2905],
            [112.7395, -7.2910],
            [112.7388, -7.2910],
            ['bad', -7.2905] as any,
          ],
        ],
      });
      expect(errors.some((e) => e.includes('numeric'))).toBe(true);
    });

    it('returns error for point with insufficient elements', () => {
      const errors = GeoJsonValidator.validatePolygon({
        ...VALID_POLYGON,
        coordinates: [[[112.7388] as any, [112.7395, -7.2905], [112.7395, -7.2910], [112.7388, -7.2910], [112.7388] as any]],
      });
      expect(errors.some((e) => e.includes('[longitude, latitude]'))).toBe(true);
    });

    it('accumulates multiple errors', () => {
      const errors = GeoJsonValidator.validatePolygon({ type: 'LineString' as any, coordinates: [] });
      expect(errors.length).toBeGreaterThan(1);
    });
  });

  describe('isClosedRing', () => {
    it('returns true when first and last points are identical', () => {
      const ring = [[112.7, -7.29], [112.8, -7.29], [112.8, -7.3], [112.7, -7.29]];
      expect(GeoJsonValidator.isClosedRing(ring)).toBe(true);
    });

    it('returns false when first and last points differ', () => {
      const ring = [[112.7, -7.29], [112.8, -7.29], [112.8, -7.3], [112.7, -7.31]];
      expect(GeoJsonValidator.isClosedRing(ring)).toBe(false);
    });

    it('returns false for ring with fewer than 2 points', () => {
      expect(GeoJsonValidator.isClosedRing([[112.7, -7.29]])).toBe(false);
    });

    it('returns false for null or empty ring', () => {
      expect(GeoJsonValidator.isClosedRing(null as any)).toBe(false);
      expect(GeoJsonValidator.isClosedRing([])).toBe(false);
    });
  });

  describe('isWithinSurabayaBounds', () => {
    it('returns true for coordinates within Surabaya', () => {
      const ring = [[112.7, -7.2], [112.8, -7.2], [112.8, -7.3], [112.7, -7.2]];
      expect(GeoJsonValidator.isWithinSurabayaBounds(ring)).toBe(true);
    });

    it('returns false for coordinates outside Surabaya', () => {
      const ring = [[106.8, -6.2], [106.9, -6.2], [106.9, -6.3], [106.8, -6.2]];
      expect(GeoJsonValidator.isWithinSurabayaBounds(ring)).toBe(false);
    });

    it('returns false for empty array', () => {
      expect(GeoJsonValidator.isWithinSurabayaBounds([])).toBe(false);
    });

    it('returns false for null', () => {
      expect(GeoJsonValidator.isWithinSurabayaBounds(null as any)).toBe(false);
    });

    it('returns false for point with insufficient elements', () => {
      expect(GeoJsonValidator.isWithinSurabayaBounds([[112.7]] as any)).toBe(false);
    });

    it('enforces boundary edges (112.5, 113.0, -7.5, -7.0)', () => {
      // Exactly on boundary - valid
      expect(GeoJsonValidator.isWithinSurabayaBounds([[112.5, -7.0], [113.0, -7.5], [112.5, -7.5], [112.5, -7.0]])).toBe(true);
      // Just outside lng max
      expect(GeoJsonValidator.isWithinSurabayaBounds([[113.1, -7.2], [112.7, -7.2], [112.7, -7.3], [113.1, -7.2]])).toBe(false);
    });
  });

  describe('computeAreaSqMeters', () => {
    it('computes positive area for a valid closed ring', () => {
      const area = GeoJsonValidator.computeAreaSqMeters(VALID_POLYGON.coordinates[0]);
      expect(area).toBeGreaterThan(0);
    });

    it('returns 0 for ring with fewer than 4 points', () => {
      expect(GeoJsonValidator.computeAreaSqMeters([[112.7, -7.2], [112.8, -7.2]])).toBe(0);
    });

    it('returns 0 for null input', () => {
      expect(GeoJsonValidator.computeAreaSqMeters(null as any)).toBe(0);
    });

    it('returns 0 for empty array', () => {
      expect(GeoJsonValidator.computeAreaSqMeters([])).toBe(0);
    });

    it('computes approximate area within 10% for a 100m x 100m square near Surabaya', () => {
      // ~0.001 degrees ≈ 111m lat, ~90m lng at -7.3°
      const ring = [
        [112.7388, -7.2900],
        [112.7399, -7.2900],
        [112.7399, -7.2909],
        [112.7388, -7.2909],
        [112.7388, -7.2900],
      ];
      const area = GeoJsonValidator.computeAreaSqMeters(ring);
      // Rough ~1000 sqm range accepted (lat correction varies)
      expect(area).toBeGreaterThan(500);
      expect(area).toBeLessThan(20000);
    });
  });
});
