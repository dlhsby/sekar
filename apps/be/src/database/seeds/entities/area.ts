import type { SeedContext } from '../lib/context';
import { loadAreaSnapshot } from '../load-seed-data';

/**
 * A GeoJSON circle around a point. The snapshot still carries `radius_meters`
 * for a handful of lokasi that never got a drawn boundary, and geofencing is
 * polygon-only now (migration `17504000000000`) — so the seeder derives the same
 * ring that migration wrote, rather than leaving those lokasi with no geometry.
 *
 * That matters because `GpsUtil.isWithinAreaBoundary` **fails OPEN**: a lokasi
 * with no polygon reports every point as inside. A freshly seeded DB would
 * otherwise hand back 5 silently ungeofenced parks — real ones, in Taman Aktif,
 * that workers clock into.
 *
 * Longitude degrees shrink with latitude, so the lng step is scaled by cos(lat);
 * without it the ring is an ellipse stretched east-west.
 */
const CIRCLE_POINTS = 32;
const METERS_PER_DEGREE_LAT = 111_320;

function circlePolygon(lat: number, lng: number, radiusMeters: number): object {
  const latDelta = radiusMeters / METERS_PER_DEGREE_LAT;
  const lngDelta = latDelta / Math.cos((lat * Math.PI) / 180);
  const ring: Array<[number, number]> = [];
  for (let i = 0; i < CIRCLE_POINTS; i += 1) {
    const theta = (2 * Math.PI * i) / CIRCLE_POINTS;
    ring.push([lng + lngDelta * Math.cos(theta), lat + latDelta * Math.sin(theta)]);
  }
  ring.push(ring[0]); // GeoJSON rings must close.
  return { type: 'Polygon', coordinates: [ring] };
}

/**
 * Seed locations (areas) from the live-staging snapshot
 * (`data/areas.snapshot.json`) — the client-validated real-world footprint
 * (~953 areas across the 8 rayons). Staging is the source of truth, so both
 * demo and staging seed the exact same set by id (names, boundaries, rayon,
 * type), replacing the former KMZ-derived geometry + synthetic demo playground.
 *
 * Idempotent: re-seeding refreshes the mutable columns. Must run AFTER
 * seedRayons (FK rayon_id) and seedAreaTypes (FK location_type_id via code).
 */
export async function seedAreas(ctx: SeedContext): Promise<void> {
  ctx.log('📍 Seeding Areas (from live-staging snapshot)…');

  const areas = loadAreaSnapshot();
  const byRayon = new Map<string, number>();
  for (const a of areas) {
    await ctx.qr.query(
      `INSERT INTO locations (
         id, name, location_type_id, gps_lat, gps_lng,
         boundary_polygon, coverage_area, address, rayon_id, is_active
       )
       SELECT
         $1, $2,
         (SELECT id FROM location_types WHERE code = $3 LIMIT 1),
         $4, $5,
         $6::jsonb, $7, $8, $9, $10
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         location_type_id = EXCLUDED.location_type_id,
         gps_lat = EXCLUDED.gps_lat,
         gps_lng = EXCLUDED.gps_lng,
         boundary_polygon = EXCLUDED.boundary_polygon,
         coverage_area = EXCLUDED.coverage_area,
         address = EXCLUDED.address,
         rayon_id = EXCLUDED.rayon_id,
         is_active = EXCLUDED.is_active`,
      [
        a.id,
        a.name,
        a.area_type_code,
        a.gps_lat,
        a.gps_lng,
        // Derive a ring from the snapshot's radius when it has no drawn
        // boundary — geofencing is polygon-only and fails open without one.
        JSON.stringify(
          a.boundary_polygon ??
            (a.gps_lat != null && a.gps_lng != null && a.radius_meters
              ? circlePolygon(Number(a.gps_lat), Number(a.gps_lng), Number(a.radius_meters))
              : null),
        ),
        a.coverage_area,
        a.address,
        a.rayon_id,
        a.is_active,
      ],
    );
    byRayon.set(a.rayon_id, (byRayon.get(a.rayon_id) ?? 0) + 1);
  }

  ctx.log(`  ✓ ${areas.length} locations across ${byRayon.size} rayons (staging snapshot)`);
}
