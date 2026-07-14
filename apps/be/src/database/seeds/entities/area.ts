import type { SeedContext } from '../lib/context';
import { loadAreaSnapshot } from '../load-seed-data';

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
         id, name, location_type_id, gps_lat, gps_lng, radius_meters,
         boundary_polygon, coverage_area, address, rayon_id, is_active
       )
       SELECT
         $1, $2,
         (SELECT id FROM location_types WHERE code = $3 LIMIT 1),
         $4, $5, COALESCE($6, 100),
         $7::jsonb, $8, $9, $10, $11
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         location_type_id = EXCLUDED.location_type_id,
         gps_lat = EXCLUDED.gps_lat,
         gps_lng = EXCLUDED.gps_lng,
         radius_meters = EXCLUDED.radius_meters,
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
        a.radius_meters,
        a.boundary_polygon ? JSON.stringify(a.boundary_polygon) : null,
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
