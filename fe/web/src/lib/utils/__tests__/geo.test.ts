/**
 * Unit Tests: Geo Utilities
 * Tests geospatial functions for polygon operations
 */

import {
  calculatePolygonArea,
  formatArea,
  calculatePolygonCenter,
  isValidPolygon,
  polygonToFeature,
  featureToPolygon,
  formatCoordinates,
} from '../geo';

describe('Geo Utilities', () => {
  const validPolygon: GeoJSON.Polygon = {
    type: 'Polygon',
    coordinates: [
      [
        [112.75, -7.25],
        [112.76, -7.25],
        [112.76, -7.26],
        [112.75, -7.26],
        [112.75, -7.25], // Closed ring
      ],
    ],
  };

  describe('calculatePolygonArea', () => {
    it('should calculate area for valid polygon', () => {
      const area = calculatePolygonArea(validPolygon);
      expect(area).toBeGreaterThan(0);
      expect(typeof area).toBe('number');
    });

    it('should return 0 for invalid polygon', () => {
      const invalidPolygon = {
        type: 'Polygon' as const,
        coordinates: [[[112.75, -7.25]]],
      };
      expect(calculatePolygonArea(invalidPolygon)).toBe(0);
    });

    it('should return 0 for polygon with less than 4 points', () => {
      const smallPolygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [112.75, -7.25],
            [112.76, -7.25],
            [112.75, -7.25],
          ],
        ],
      };
      expect(calculatePolygonArea(smallPolygon)).toBe(0);
    });

    it('should return 0 for null/undefined polygon', () => {
      expect(calculatePolygonArea(null as any)).toBe(0);
      expect(calculatePolygonArea(undefined as any)).toBe(0);
    });
  });

  describe('formatArea', () => {
    it('should format small areas in square meters', () => {
      expect(formatArea(5000)).toBe('5000 m²');
      expect(formatArea(9999)).toBe('9999 m²');
    });

    it('should format large areas in hectares', () => {
      expect(formatArea(10000)).toBe('1.00 ha');
      expect(formatArea(50000)).toBe('5.00 ha');
      expect(formatArea(123456)).toBe('12.35 ha');
    });

    it('should handle zero area', () => {
      expect(formatArea(0)).toBe('0 m²');
    });

    it('should handle decimal values', () => {
      expect(formatArea(1234.56)).toBe('1235 m²');
      expect(formatArea(15000.75)).toBe('1.50 ha');
    });
  });

  describe('calculatePolygonCenter', () => {
    it('should calculate centroid for valid polygon', () => {
      const center = calculatePolygonCenter(validPolygon);
      expect(Array.isArray(center)).toBe(true);
      expect(center).toHaveLength(2);
      expect(typeof center[0]).toBe('number');
      expect(typeof center[1]).toBe('number');
    });

    it('should return Surabaya default for invalid polygon', () => {
      const invalidPolygon: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [[]],
      };
      const center = calculatePolygonCenter(invalidPolygon);
      expect(center).toEqual([112.7521, -7.2575]);
    });

    it('should return Surabaya default for null polygon', () => {
      const center = calculatePolygonCenter(null as any);
      expect(center).toEqual([112.7521, -7.2575]);
    });
  });

  describe('isValidPolygon', () => {
    it('should validate correct polygon', () => {
      expect(isValidPolygon(validPolygon)).toBe(true);
    });

    it('should reject non-polygon type', () => {
      const notPolygon = {
        type: 'Point',
        coordinates: [112.75, -7.25],
      };
      expect(isValidPolygon(notPolygon as any)).toBe(false);
    });

    it('should reject polygon without coordinates', () => {
      const noCoords = {
        type: 'Polygon' as const,
        coordinates: [],
      };
      expect(isValidPolygon(noCoords)).toBe(false);
    });

    it('should reject polygon with less than 4 points', () => {
      const fewPoints: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [112.75, -7.25],
            [112.76, -7.25],
            [112.75, -7.25],
          ],
        ],
      };
      expect(isValidPolygon(fewPoints)).toBe(false);
    });

    it('should reject unclosed polygon ring', () => {
      const unclosed: GeoJSON.Polygon = {
        type: 'Polygon',
        coordinates: [
          [
            [112.75, -7.25],
            [112.76, -7.25],
            [112.76, -7.26],
            [112.75, -7.26],
          ],
        ],
      };
      expect(isValidPolygon(unclosed)).toBe(false);
    });

    it('should reject null/undefined', () => {
      expect(isValidPolygon(null as any)).toBe(false);
      expect(isValidPolygon(undefined as any)).toBe(false);
    });
  });

  describe('polygonToFeature', () => {
    it('should convert polygon to GeoJSON feature', () => {
      const feature = polygonToFeature(validPolygon);
      expect(feature.type).toBe('Feature');
      expect(feature.geometry).toEqual(validPolygon);
      expect(feature.properties).toEqual({});
    });
  });

  describe('featureToPolygon', () => {
    it('should extract polygon from feature', () => {
      const feature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: validPolygon,
      };
      const polygon = featureToPolygon(feature);
      expect(polygon).toEqual(validPolygon);
    });

    it('should return null for non-polygon geometry', () => {
      const pointFeature: GeoJSON.Feature = {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: [112.75, -7.25],
        },
      };
      expect(featureToPolygon(pointFeature)).toBeNull();
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with 6 decimal places', () => {
      const formatted = formatCoordinates(112.7521, -7.2575);
      expect(formatted).toBe('-7.257500°, 112.752100°');
    });

    it('should handle integer coordinates', () => {
      const formatted = formatCoordinates(113, -7);
      expect(formatted).toBe('-7.000000°, 113.000000°');
    });

    it('should handle very precise coordinates', () => {
      const formatted = formatCoordinates(112.752123456, -7.257543210);
      expect(formatted).toContain('-7.257543');
      expect(formatted).toContain('112.752123');
    });
  });
});
