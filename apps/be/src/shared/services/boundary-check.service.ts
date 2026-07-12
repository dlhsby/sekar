import { Injectable } from '@nestjs/common';
import { GpsUtil } from '../../common/utils/gps.util';

/**
 * Location-shaped input for boundary checks. Structural type so the service stays
 * entity-agnostic (works with Location entities, cached boundary rows, DTOs).
 */
export interface BoundaryArea {
  boundary_polygon?: { type?: string; coordinates?: number[][][] } | null;
  gps_lat?: number;
  gps_lng?: number;
  radius_meters?: number;
}

export interface ClockLocationResult<T extends BoundaryArea> {
  valid: boolean;
  area: T | null;
  /** Meters from the nearest area center when no area contains the point */
  distance?: number;
}

/**
 * BoundaryCheckService — single home for GPS/polygon containment logic
 * (Phase 4-7 H1). Extracted from StatusCalculatorService (polygon + tolerance
 * math) and ShiftsService (clock-in/out boundary checks); delegates the core
 * ray-casting + radius-fallback primitives to GpsUtil.
 */
@Injectable()
export class BoundaryCheckService {
  /** Meters per degree of latitude (approximation used for tolerance expansion) */
  private static readonly METERS_PER_DEGREE = 111_320;

  /** Polygon-first, radius-fallback containment check (GeoJSON [lng, lat] ring) */
  isWithinAreaBoundary(lat: number, lng: number, area: BoundaryArea): boolean {
    return GpsUtil.isWithinAreaBoundary(lat, lng, {
      ...area,
      boundary_polygon: area.boundary_polygon ?? undefined,
    });
  }

  /** Ray-casting point-in-polygon check on a single GeoJSON ring */
  isPointInPolygon(lat: number, lng: number, ring: number[][]): boolean {
    return GpsUtil.isPointInPolygon(lat, lng, ring);
  }

  /**
   * Point-in-polygon with a tolerance band: a point outside the ring still
   * passes when it falls within `toleranceMeters` of the boundary (the ring is
   * scaled outward from its centroid by the tolerance converted to degrees).
   */
  isPointInPolygonWithTolerance(
    lat: number,
    lng: number,
    ring: number[][],
    toleranceMeters: number,
  ): boolean {
    if (GpsUtil.isPointInPolygon(lat, lng, ring)) {
      return true;
    }
    if (toleranceMeters <= 0) {
      return false;
    }

    const toleranceDegrees = toleranceMeters / BoundaryCheckService.METERS_PER_DEGREE;
    const expandedRing = this.expandRing(ring, toleranceDegrees);
    return GpsUtil.isPointInPolygon(lat, lng, expandedRing);
  }

  /** First area whose boundary (polygon or radius) contains the point */
  findContainingArea<T extends BoundaryArea>(lat: number, lng: number, areas: T[]): T | null {
    for (const area of areas) {
      if (this.hasBoundary(area) && this.isWithinAreaBoundary(lat, lng, area)) {
        return area;
      }
    }
    return null;
  }

  /**
   * Clock-in/out location validation against the user's candidate areas.
   * Valid when any area contains the point; otherwise reports the distance to
   * the nearest area center so callers can log/inform (soft geofencing).
   */
  validateClockLocation<T extends BoundaryArea>(
    lat: number,
    lng: number,
    areas: T[],
  ): ClockLocationResult<T> {
    const containing = this.findContainingArea(lat, lng, areas);
    if (containing) {
      return { valid: true, area: containing };
    }

    let nearest: T | null = null;
    let nearestDistance = Number.POSITIVE_INFINITY;
    for (const area of areas) {
      if (area.gps_lat == null || area.gps_lng == null) continue;
      const distance = GpsUtil.calculateDistance(
        lat,
        lng,
        Number(area.gps_lat),
        Number(area.gps_lng),
      );
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearest = area;
      }
    }

    return {
      valid: false,
      area: nearest,
      distance: nearest ? Math.round(nearestDistance) : undefined,
    };
  }

  private hasBoundary(area: BoundaryArea): boolean {
    const ring = area.boundary_polygon?.coordinates?.[0];
    if (ring && ring.length >= 3) return true;
    return area.gps_lat != null && area.gps_lng != null && (area.radius_meters ?? 0) > 0;
  }

  /** Scale a ring outward from its centroid by the given degree delta */
  private expandRing(ring: number[][], degrees: number): number[][] {
    if (ring.length < 3) return ring;

    const centroidLng = ring.reduce((sum, p) => sum + p[0], 0) / ring.length;
    const centroidLat = ring.reduce((sum, p) => sum + p[1], 0) / ring.length;

    return ring.map((point) => {
      const dx = point[0] - centroidLng;
      const dy = point[1] - centroidLat;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist === 0) return point;
      const scale = (dist + degrees) / dist;
      return [centroidLng + dx * scale, centroidLat + dy * scale];
    });
  }
}
