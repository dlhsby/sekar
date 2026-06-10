import { BoundaryCheckService, BoundaryArea } from './boundary-check.service';

describe('BoundaryCheckService', () => {
  let service: BoundaryCheckService;

  // Square ring around Taman Bungkul (GeoJSON [lng, lat], closed)
  const SQUARE_RING: number[][] = [
    [112.738, -7.291],
    [112.741, -7.291],
    [112.741, -7.288],
    [112.738, -7.288],
    [112.738, -7.291],
  ];

  const INSIDE = { lat: -7.2895, lng: 112.7395 };
  const OUTSIDE = { lat: -7.295, lng: 112.745 };
  /** ~30 m east of the eastern edge (just outside) */
  const JUST_OUTSIDE = { lat: -7.2895, lng: 112.74127 };

  function makePolygonArea(overrides: Partial<BoundaryArea> = {}): BoundaryArea {
    return {
      boundary_polygon: { type: 'Polygon', coordinates: [SQUARE_RING] },
      gps_lat: -7.2895,
      gps_lng: 112.7395,
      radius_meters: 150,
      ...overrides,
    };
  }

  function makeRadiusArea(overrides: Partial<BoundaryArea> = {}): BoundaryArea {
    return {
      boundary_polygon: null,
      gps_lat: -7.2895,
      gps_lng: 112.7395,
      radius_meters: 100,
      ...overrides,
    };
  }

  beforeEach(() => {
    service = new BoundaryCheckService();
  });

  describe('isPointInPolygon', () => {
    it('should return true for a point inside the ring', () => {
      expect(service.isPointInPolygon(INSIDE.lat, INSIDE.lng, SQUARE_RING)).toBe(true);
    });

    it('should return false for a point outside the ring', () => {
      expect(service.isPointInPolygon(OUTSIDE.lat, OUTSIDE.lng, SQUARE_RING)).toBe(false);
    });
  });

  describe('isPointInPolygonWithTolerance', () => {
    it('should return true for a point inside regardless of tolerance', () => {
      expect(service.isPointInPolygonWithTolerance(INSIDE.lat, INSIDE.lng, SQUARE_RING, 0)).toBe(
        true,
      );
    });

    it('should return false for a point just outside with zero tolerance', () => {
      expect(
        service.isPointInPolygonWithTolerance(JUST_OUTSIDE.lat, JUST_OUTSIDE.lng, SQUARE_RING, 0),
      ).toBe(false);
    });

    it('should return true for a point just outside within the tolerance band', () => {
      expect(
        service.isPointInPolygonWithTolerance(JUST_OUTSIDE.lat, JUST_OUTSIDE.lng, SQUARE_RING, 100),
      ).toBe(true);
    });

    it('should return false for a point far beyond the tolerance band', () => {
      expect(
        service.isPointInPolygonWithTolerance(OUTSIDE.lat, OUTSIDE.lng, SQUARE_RING, 100),
      ).toBe(false);
    });
  });

  describe('isWithinAreaBoundary', () => {
    it('should use the polygon when present', () => {
      const area = makePolygonArea();
      expect(service.isWithinAreaBoundary(INSIDE.lat, INSIDE.lng, area)).toBe(true);
      expect(service.isWithinAreaBoundary(OUTSIDE.lat, OUTSIDE.lng, area)).toBe(false);
    });

    it('should fall back to the radius check when no polygon exists', () => {
      const area = makeRadiusArea();
      expect(service.isWithinAreaBoundary(INSIDE.lat, INSIDE.lng, area)).toBe(true);
      expect(service.isWithinAreaBoundary(OUTSIDE.lat, OUTSIDE.lng, area)).toBe(false);
    });

    it('should allow the point when the area defines no boundary at all', () => {
      const area: BoundaryArea = { boundary_polygon: null };
      expect(service.isWithinAreaBoundary(OUTSIDE.lat, OUTSIDE.lng, area)).toBe(true);
    });
  });

  describe('findContainingArea', () => {
    it('should return the first area containing the point', () => {
      const far = makeRadiusArea({ gps_lat: -7.5, gps_lng: 112.5 });
      const hit = makePolygonArea();
      expect(service.findContainingArea(INSIDE.lat, INSIDE.lng, [far, hit])).toBe(hit);
    });

    it('should return null when no area contains the point', () => {
      expect(service.findContainingArea(OUTSIDE.lat, OUTSIDE.lng, [makePolygonArea()])).toBeNull();
    });

    it('should not treat a boundary-less area as containing (avoids false positives)', () => {
      const boundaryless: BoundaryArea = { boundary_polygon: null };
      expect(service.findContainingArea(OUTSIDE.lat, OUTSIDE.lng, [boundaryless])).toBeNull();
    });
  });

  describe('validateClockLocation', () => {
    it('should be valid with the containing area when inside', () => {
      const area = makePolygonArea();
      const result = service.validateClockLocation(INSIDE.lat, INSIDE.lng, [area]);
      expect(result).toEqual({ valid: true, area });
    });

    it('should be invalid with nearest area and distance when outside', () => {
      const area = makeRadiusArea();
      const result = service.validateClockLocation(OUTSIDE.lat, OUTSIDE.lng, [area]);
      expect(result.valid).toBe(false);
      expect(result.area).toBe(area);
      expect(result.distance).toBeGreaterThan(100);
    });

    it('should be invalid with no area when the candidate list is empty', () => {
      const result = service.validateClockLocation(INSIDE.lat, INSIDE.lng, []);
      expect(result).toEqual({ valid: false, area: null, distance: undefined });
    });
  });
});
