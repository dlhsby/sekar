import * as gpsUtils from '../gpsUtils';

describe('GPS Utils', () => {
  describe('calculateDistance', () => {
    it('should calculate distance between two points', () => {
      // Surabaya Tugu Pahlawan to Balai Kota Surabaya (~2 km)
      const distance = gpsUtils.calculateDistance(
        -7.2458, 112.7378, // Tugu Pahlawan
        -7.2575, 112.7521  // Balai Kota
      );
      expect(distance).toBeGreaterThan(2000);
      expect(distance).toBeLessThan(2100);
    });

    it('should return 0 for same coordinates', () => {
      const distance = gpsUtils.calculateDistance(
        -7.2905, 112.7398,
        -7.2905, 112.7398
      );
      expect(distance).toBe(0);
    });

    it('should calculate small distances accurately', () => {
      // 100 meter difference (~0.001 degrees)
      const distance = gpsUtils.calculateDistance(
        -7.2905, 112.7398,
        -7.2915, 112.7398
      );
      expect(distance).toBeGreaterThan(100);
      expect(distance).toBeLessThan(120);
    });
  });

  describe('isWithinBoundary', () => {
    it('should return true when within boundary', () => {
      const result = gpsUtils.isWithinBoundary(
        -7.2905, 112.7398, // Current location
        -7.2905, 112.7398, // Area center
        100 // 100m radius
      );
      expect(result).toBe(true);
    });

    it('should return false when outside boundary', () => {
      const result = gpsUtils.isWithinBoundary(
        -7.2905, 112.7398,  // Current location
        -7.2915, 112.7408,  // Area center (~1.5km away)
        100 // 100m radius
      );
      expect(result).toBe(false);
    });

    it('should return true for location near boundary edge', () => {
      // ~90m away (within 100m boundary)
      const result = gpsUtils.isWithinBoundary(
        -7.2905, 112.7398,
        -7.2913, 112.7398, // ~90m north
        100
      );
      expect(result).toBe(true);
    });
  });

  describe('formatCoordinates', () => {
    it('should format coordinates with default 6 decimals', () => {
      const formatted = gpsUtils.formatCoordinates(-7.290512, 112.739845);
      expect(formatted).toBe('-7.290512, 112.739845');
    });

    it('should format coordinates with custom decimals', () => {
      const formatted = gpsUtils.formatCoordinates(-7.290512, 112.739845, 4);
      expect(formatted).toBe('-7.2905, 112.7398');
    });

    it('should handle positive coordinates', () => {
      const formatted = gpsUtils.formatCoordinates(45.123456, -122.654321);
      expect(formatted).toBe('45.123456, -122.654321');
    });
  });

  describe('formatDistance', () => {
    it('should format meters for distances < 1000', () => {
      expect(gpsUtils.formatDistance(500)).toBe('500m');
      expect(gpsUtils.formatDistance(999)).toBe('999m');
    });

    it('should format kilometers for distances >= 1000', () => {
      expect(gpsUtils.formatDistance(1000)).toBe('1km');
      expect(gpsUtils.formatDistance(1500)).toBe('1.5km');
      expect(gpsUtils.formatDistance(2345)).toBe('2.3km');
    });

    it('should round to 0 meters', () => {
      expect(gpsUtils.formatDistance(0.4)).toBe('0m');
    });
  });

  describe('isAccuracyAcceptable', () => {
    it('should accept accuracy <= 30m', () => {
      expect(gpsUtils.isAccuracyAcceptable(10)).toBe(true);
      expect(gpsUtils.isAccuracyAcceptable(30)).toBe(true);
    });

    it('should reject accuracy > 30m', () => {
      expect(gpsUtils.isAccuracyAcceptable(31)).toBe(false);
      expect(gpsUtils.isAccuracyAcceptable(100)).toBe(false);
    });

    it('should handle null accuracy', () => {
      expect(gpsUtils.isAccuracyAcceptable(null)).toBe(false);
    });
  });

  describe('getAccuracyStatus', () => {
    it('should return good status for accuracy <= 10m', () => {
      const status = gpsUtils.getAccuracyStatus(5);
      expect(status.status).toBe('good');
      expect(status.message).toContain('Excellent');
    });

    it('should return fair status for accuracy 10-30m', () => {
      const status = gpsUtils.getAccuracyStatus(20);
      expect(status.status).toBe('fair');
      expect(status.message).toContain('Acceptable');
    });

    it('should return poor status for accuracy > 30m', () => {
      const status = gpsUtils.getAccuracyStatus(50);
      expect(status.status).toBe('poor');
      expect(status.message).toContain('Poor');
    });

    it('should return unavailable status for null accuracy', () => {
      const status = gpsUtils.getAccuracyStatus(null);
      expect(status.status).toBe('unavailable');
      expect(status.message).toContain('unavailable');
    });
  });

  describe('validateClockInLocation', () => {
    const areaLat = -7.2905;
    const areaLng = 112.7398;

    it('should validate location within 100m with good accuracy', () => {
      // Current location same as area (0m distance)
      const result = gpsUtils.validateClockInLocation(
        areaLat,
        areaLng,
        10, // 10m accuracy (good)
        areaLat,
        areaLng
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should validate location at exactly 100m boundary with good accuracy', () => {
      // ~90m north of area (within 100m boundary)
      const result = gpsUtils.validateClockInLocation(
        -7.2897, // ~90m north
        areaLng,
        15, // 15m accuracy (acceptable)
        areaLat,
        areaLng
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject location outside 100m boundary', () => {
      // ~200m away from area
      const result = gpsUtils.validateClockInLocation(
        -7.2887, // ~200m north
        areaLng,
        10, // Good accuracy
        areaLat,
        areaLng
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('away from the work area');
      expect(result.error).toContain('100m');
    });

    it('should reject location with poor accuracy', () => {
      // Current location same as area but poor accuracy
      const result = gpsUtils.validateClockInLocation(
        areaLat,
        areaLng,
        50, // 50m accuracy (poor)
        areaLat,
        areaLng
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('GPS accuracy too low');
      expect(result.error).toContain('50m');
    });

    it('should reject location with null accuracy', () => {
      const result = gpsUtils.validateClockInLocation(
        areaLat,
        areaLng,
        null, // Null accuracy
        areaLat,
        areaLng
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('GPS accuracy too low');
      expect(result.error).toContain('unknown');
    });

    it('should prioritize accuracy check over distance check', () => {
      // Within 100m but poor accuracy
      const result = gpsUtils.validateClockInLocation(
        -7.2900, // ~50m away
        areaLng,
        40, // 40m accuracy (poor)
        areaLat,
        areaLng
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('GPS accuracy too low');
    });

    it('should accept location at boundary edge with good accuracy', () => {
      // ~90m away with good accuracy
      const result = gpsUtils.validateClockInLocation(
        -7.2897, // ~90m north
        areaLng,
        20, // 20m accuracy (acceptable)
        areaLat,
        areaLng
      );

      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('isPointInPolygon', () => {
    // Simple rectangle polygon around Taman Bungkul
    // GeoJSON format: [lng, lat]
    const rectangle: [number, number][] = [
      [112.739, -7.291],
      [112.741, -7.291],
      [112.741, -7.289],
      [112.739, -7.289],
    ];

    it('should return true for point inside rectangle', () => {
      expect(gpsUtils.isPointInPolygon(-7.2905, 112.7398, rectangle)).toBe(true);
    });

    it('should return false for point outside rectangle', () => {
      expect(gpsUtils.isPointInPolygon(-7.2850, 112.7398, rectangle)).toBe(false);
    });

    it('should return false for point far outside', () => {
      expect(gpsUtils.isPointInPolygon(-7.30, 112.75, rectangle)).toBe(false);
    });

    it('should handle triangle polygon', () => {
      const triangle: [number, number][] = [
        [112.739, -7.291],
        [112.741, -7.291],
        [112.740, -7.289],
      ];
      expect(gpsUtils.isPointInPolygon(-7.2905, 112.7400, triangle)).toBe(true);
      expect(gpsUtils.isPointInPolygon(-7.2850, 112.7395, triangle)).toBe(false);
    });

    it('should handle empty polygon', () => {
      expect(gpsUtils.isPointInPolygon(-7.2905, 112.7398, [])).toBe(false);
    });
  });

  describe('isWithinAreaBoundary', () => {
    it('should use polygon when boundary_polygon exists', () => {
      const area = {
        boundary_polygon: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [112.739, -7.291],
              [112.741, -7.291],
              [112.741, -7.289],
              [112.739, -7.289],
            ],
          ],
        },
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        radius_meters: 100,
      };
      // Inside polygon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture polygon structure
      expect(gpsUtils.isWithinAreaBoundary(-7.2905, 112.7398, area as any)).toBe(true);
      // Outside polygon
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture polygon structure
      expect(gpsUtils.isWithinAreaBoundary(-7.285, 112.7398, area as any)).toBe(false);
    });

    it('should fallback to radius when no polygon', () => {
      const area = {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        radius_meters: 100,
      };
      // Within radius
      expect(gpsUtils.isWithinAreaBoundary(-7.2905, 112.7398, area)).toBe(true);
      // Outside radius
      expect(gpsUtils.isWithinAreaBoundary(-7.295, 112.7398, area)).toBe(false);
    });

    it('should return true when no boundary defined', () => {
      expect(gpsUtils.isWithinAreaBoundary(-7.2905, 112.7398, {})).toBe(true);
    });

    it('should return true when polygon has fewer than 3 points', () => {
      const area = {
        boundary_polygon: {
          type: 'Polygon' as const,
          coordinates: [
            [
              [112.739, -7.291],
              [112.741, -7.291],
            ],
          ],
        },
      };
      // eslint-disable-next-line @typescript-eslint/no-explicit-any -- test fixture polygon structure
      expect(gpsUtils.isWithinAreaBoundary(-7.2905, 112.7398, area as any)).toBe(true);
    });

    it('should return true when radius is 0 or null', () => {
      const area = { gps_lat: -7.2905, gps_lng: 112.7398, radius_meters: 0 };
      expect(gpsUtils.isWithinAreaBoundary(-7.2905, 112.7398, area)).toBe(true);
      const area2 = { gps_lat: -7.2905, gps_lng: 112.7398, radius_meters: null };
      expect(gpsUtils.isWithinAreaBoundary(-7.2905, 112.7398, area2)).toBe(true);
    });
  });

  describe('getMockCoordinates', () => {
    it('should return Surabaya coordinates', () => {
      const coords = gpsUtils.getMockCoordinates();
      expect(coords.latitude).toBe(-7.2905);
      expect(coords.longitude).toBe(112.7398);
      expect(coords.accuracy).toBe(10);
    });
  });

  describe('Edge cases', () => {
    it('should handle zero distance', () => {
      const distance = gpsUtils.calculateDistance(
        -7.2905, 112.7398,
        -7.2905, 112.7398
      );
      expect(distance).toBe(0);
    });

    it('should handle very large distances', () => {
      // Surabaya to Jakarta (~700km)
      const distance = gpsUtils.calculateDistance(
        -7.2905, 112.7398,  // Surabaya
        -6.2088, 106.8456   // Jakarta
      );
      expect(distance).toBeGreaterThan(600000); // > 600km
      expect(distance).toBeLessThan(800000); // < 800km
    });

    it('should handle coordinates at equator', () => {
      const distance = gpsUtils.calculateDistance(
        0, 0,
        0, 1
      );
      expect(distance).toBeGreaterThan(0);
      expect(distance).toBeLessThan(200000); // Should be ~111km
    });

    it('should format distance for whole kilometers', () => {
      expect(gpsUtils.formatDistance(1000)).toBe('1km');
      expect(gpsUtils.formatDistance(5000)).toBe('5km');
    });

    it('should format distance for fractional kilometers', () => {
      expect(gpsUtils.formatDistance(1500)).toBe('1.5km');
      expect(gpsUtils.formatDistance(2345)).toBe('2.3km');
    });

    it('should handle accuracy at exact threshold', () => {
      expect(gpsUtils.isAccuracyAcceptable(30)).toBe(true);
      expect(gpsUtils.isAccuracyAcceptable(30.01)).toBe(false);
    });

    it('should handle formatCoordinates with coordinate object', () => {
      const coords = { latitude: -7.290512, longitude: 112.739845 };
      const formatted = gpsUtils.formatCoordinates(coords);
      expect(formatted).toBe('-7.290512, 112.739845');
    });

    it('should throw error when formatCoordinates called with number but no longitude', () => {
      expect(() => gpsUtils.formatCoordinates(-7.290512)).toThrow('Longitude is required');
    });
  });
});
