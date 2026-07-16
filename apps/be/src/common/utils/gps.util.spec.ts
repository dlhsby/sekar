import { GpsUtil } from './gps.util';

describe('GpsUtil', () => {
  describe('calculateDistance', () => {
    it('should return 0 for same coordinates', () => {
      const distance = GpsUtil.calculateDistance(-7.2905, 112.7398, -7.2905, 112.7398);
      expect(distance).toBe(0);
    });

    it('should calculate correct distance for known coordinates', () => {
      // Taman Bungkul to Jalan Raya Darmo (Surabaya)
      // Expected distance: approximately 5.7 km
      const distance = GpsUtil.calculateDistance(
        -7.2905, // Taman Bungkul
        112.7398,
        -7.2844, // Jalan Raya Darmo
        112.7915,
      );

      // Allow margin for floating point precision
      expect(distance).toBeGreaterThan(5700);
      expect(distance).toBeLessThan(5800);
    });

    it('should calculate distance for coordinates ~1km apart', () => {
      // Taman Bungkul to Taman Harmoni
      // Expected distance: approximately 1.5 km
      const distance = GpsUtil.calculateDistance(
        -7.2905, // Taman Bungkul
        112.7398,
        -7.3037, // Taman Harmoni
        112.7375,
      );

      // Check it's in the expected range (1.4km - 1.6km)
      expect(distance).toBeGreaterThan(1400);
      expect(distance).toBeLessThan(1600);
    });

    it('should handle negative coordinates correctly', () => {
      // Both points in southern/western hemisphere
      const distance = GpsUtil.calculateDistance(-7.2905, 112.7398, -7.2915, 112.7408);

      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200); // Should be ~150m
    });

    it('should handle coordinates across equator', () => {
      // North and South hemisphere
      const distance = GpsUtil.calculateDistance(
        10.0, // Northern hemisphere
        100.0,
        -10.0, // Southern hemisphere
        100.0,
      );

      // Distance should be approximately 2,222 km (20 degrees latitude)
      expect(distance).toBeGreaterThan(2200000);
      expect(distance).toBeLessThan(2300000);
    });

    it('should handle coordinates across date line', () => {
      // Points on either side of 180° longitude
      const distance = GpsUtil.calculateDistance(
        0.0,
        179.0, // Near date line
        0.0,
        -179.0, // Other side of date line
      );

      // Distance should be approximately 222 km (2 degrees longitude at equator)
      expect(distance).toBeGreaterThan(220000);
      expect(distance).toBeLessThan(230000);
    });

    it('should calculate small distances accurately', () => {
      // Points very close together (10 meters apart)
      const distance = GpsUtil.calculateDistance(
        -7.2905,
        112.7398,
        -7.2905,
        112.73989, // ~10m east
      );

      expect(distance).toBeGreaterThan(8);
      expect(distance).toBeLessThan(12);
    });

    it('should calculate large distances accurately', () => {
      // Surabaya to Jakarta (approximate)
      const distance = GpsUtil.calculateDistance(
        -7.2905, // Surabaya
        112.7398,
        -6.2088, // Jakarta
        106.8456,
      );

      // Expected distance: approximately 660-670 km
      expect(distance).toBeGreaterThan(660000);
      expect(distance).toBeLessThan(670000);
    });
  });

  describe('isWithinBoundary', () => {
    const centerLat = -7.2905;
    const centerLng = 112.7398;
    const radius = 100; // 100 meters

    it('should return true for same coordinates', () => {
      const result = GpsUtil.isWithinBoundary(centerLat, centerLng, centerLat, centerLng, radius);
      expect(result).toBe(true);
    });

    it('should return true for point within boundary', () => {
      // Point 50 meters away (well within 100m radius)
      const result = GpsUtil.isWithinBoundary(-7.29054, 112.73985, centerLat, centerLng, radius);
      expect(result).toBe(true);
    });

    it('should return false for point outside boundary', () => {
      // Point ~200 meters away (outside 100m radius)
      const result = GpsUtil.isWithinBoundary(
        -7.2905 + 0.002, // ~220m north
        112.7398,
        centerLat,
        centerLng,
        radius,
      );
      expect(result).toBe(false);
    });

    it('should return true for point near boundary radius', () => {
      // Calculate a point approximately 90m away (within 100m boundary)
      // Using approximate: 1 degree latitude ≈ 111,000 meters
      // So 90m ≈ 0.00081 degrees
      const result = GpsUtil.isWithinBoundary(
        centerLat + 0.00081,
        centerLng,
        centerLat,
        centerLng,
        radius,
      );
      expect(result).toBe(true);
    });

    it('should return false for point just outside boundary', () => {
      // Point ~150 meters away (outside 100m radius)
      const result = GpsUtil.isWithinBoundary(
        centerLat + 0.00135,
        centerLng,
        centerLat,
        centerLng,
        radius,
      );
      expect(result).toBe(false);
    });

    it('should handle different radius values', () => {
      // Test with 500m radius
      const largeRadius = 500;
      const result = GpsUtil.isWithinBoundary(
        -7.29068,
        112.73995,
        centerLat,
        centerLng,
        largeRadius,
      );
      expect(result).toBe(true);
    });

    it('should handle very small radius', () => {
      // Test with 10m radius - point should be outside
      const smallRadius = 10;
      const result = GpsUtil.isWithinBoundary(
        centerLat + 0.0001,
        centerLng,
        centerLat,
        centerLng,
        smallRadius,
      );
      expect(result).toBe(false);
    });

    it('should handle negative coordinates', () => {
      // Test in southern/western hemisphere
      const result = GpsUtil.isWithinBoundary(-7.2906, 112.7399, -7.2905, 112.7398, radius);
      expect(result).toBe(true);
    });

    it('should handle coordinates near equator', () => {
      const result = GpsUtil.isWithinBoundary(
        0.0005,
        100.0005,
        0.0,
        100.0,
        100, // 100m radius
      );
      expect(result).toBe(true);
    });

    it('should handle coordinates near poles', () => {
      // Near north pole
      const result = GpsUtil.isWithinBoundary(
        89.999,
        0.0,
        89.998,
        0.0,
        200, // 200m radius
      );
      expect(result).toBe(true);
    });
  });

  describe('isPointInPolygon', () => {
    // A simple square polygon around Taman Bungkul (GeoJSON [lng, lat])
    const square: number[][] = [
      [112.739, -7.291],
      [112.741, -7.291],
      [112.741, -7.289],
      [112.739, -7.289],
      [112.739, -7.291], // closed ring
    ];

    it('should return true for point inside polygon', () => {
      expect(GpsUtil.isPointInPolygon(-7.29, 112.74, square)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      expect(GpsUtil.isPointInPolygon(-7.295, 112.74, square)).toBe(false);
    });

    it('should return false for point far away', () => {
      expect(GpsUtil.isPointInPolygon(-7.3, 112.75, square)).toBe(false);
    });

    it('should handle triangle polygon', () => {
      const triangle: number[][] = [
        [112.739, -7.291],
        [112.741, -7.291],
        [112.74, -7.289],
        [112.739, -7.291],
      ];
      // Center of triangle should be inside
      expect(GpsUtil.isPointInPolygon(-7.2903, 112.74, triangle)).toBe(true);
      // Outside triangle
      expect(GpsUtil.isPointInPolygon(-7.288, 112.74, triangle)).toBe(false);
    });

    it('should handle L-shaped polygon', () => {
      const lShape: number[][] = [
        [0, 0],
        [2, 0],
        [2, 1],
        [1, 1],
        [1, 2],
        [0, 2],
        [0, 0],
      ];
      // Inside the bottom part
      expect(GpsUtil.isPointInPolygon(0.5, 1.5, lShape)).toBe(true);
      // Inside the left part
      expect(GpsUtil.isPointInPolygon(1.5, 0.5, lShape)).toBe(true);
      // Outside the concave corner
      expect(GpsUtil.isPointInPolygon(1.5, 1.5, lShape)).toBe(false);
    });

    it('should handle open ring (no closing vertex)', () => {
      const openSquare: number[][] = [
        [112.739, -7.291],
        [112.741, -7.291],
        [112.741, -7.289],
        [112.739, -7.289],
        // no closing point
      ];
      expect(GpsUtil.isPointInPolygon(-7.29, 112.74, openSquare)).toBe(true);
    });
  });

  describe('isWithinAreaBoundary', () => {
    it('should use polygon when available', () => {
      const area = {
        boundary_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [112.739, -7.291],
              [112.741, -7.291],
              [112.741, -7.289],
              [112.739, -7.289],
              [112.739, -7.291],
            ],
          ],
        },
        gps_lat: -7.29,
        gps_lng: 112.74,
        radius_meters: 10, // Tiny radius — would fail if radius was used
      };
      // Point inside polygon
      expect(GpsUtil.isWithinAreaBoundary(-7.29, 112.74, area)).toBe(true);
    });

    it('should return false for point outside polygon', () => {
      const area = {
        boundary_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [112.739, -7.291],
              [112.741, -7.291],
              [112.741, -7.289],
              [112.739, -7.289],
              [112.739, -7.291],
            ],
          ],
        },
      };
      expect(GpsUtil.isWithinAreaBoundary(-7.295, 112.74, area)).toBe(false);
    });

    // The radius fallback is retired (migration 17504000000000 turned the
    // radius-only lokasi into real polygons). Geofencing is polygon-only now, so
    // gps/radius on the area are simply ignored.
    it('fails OPEN when a lokasi has no polygon — by design', () => {
      // An un-mapped lokasi must not mark every worker standing in it as
      // outside-area. The trade is that "no polygon" is silently ungeofenced.
      expect(GpsUtil.isWithinAreaBoundary(-7.29, 112.74, {})).toBe(true);
      expect(GpsUtil.isWithinAreaBoundary(-7.3, 112.9, {})).toBe(true);
    });

    it('should return true when polygon has empty coordinates', () => {
      const area = {
        boundary_polygon: { type: 'Polygon', coordinates: [] },
      };
      expect(GpsUtil.isWithinAreaBoundary(-7.29, 112.74, area)).toBe(true);
    });

    it('should handle polygon with no fallback radius', () => {
      const area = {
        boundary_polygon: {
          type: 'Polygon',
          coordinates: [
            [
              [112.739, -7.291],
              [112.741, -7.291],
              [112.741, -7.289],
              [112.739, -7.289],
              [112.739, -7.291],
            ],
          ],
        },
      };
      // Inside polygon, no radius defined
      expect(GpsUtil.isWithinAreaBoundary(-7.29, 112.74, area)).toBe(true);
    });
  });

  describe('edge cases', () => {
    it('should handle zero radius', () => {
      const result = GpsUtil.isWithinBoundary(
        -7.2905,
        112.7398,
        -7.2905,
        112.7398,
        0, // 0 meter radius
      );
      expect(result).toBe(true); // Same point is within 0m radius
    });

    it('should handle very large radius', () => {
      // 10,000 meter (10km) radius
      const result = GpsUtil.isWithinBoundary(-7.2905, 112.7398, -7.3037, 112.7375, 10000);
      expect(result).toBe(true); // ~2.5km distance is within 10km radius
    });

    it('should return correct distance for antipodal points', () => {
      // Points on opposite sides of Earth
      const distance = GpsUtil.calculateDistance(
        0.0,
        0.0,
        0.0,
        180.0, // Opposite side at equator
      );

      // Should be approximately half Earth's circumference (~20,000 km)
      expect(distance).toBeGreaterThan(19000000);
      expect(distance).toBeLessThan(21000000);
    });
  });
});
