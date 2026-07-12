import type { SeedContext } from '../lib/context';
import { RAYON_ID_BY_CODE, RAYON_TAMAN_AKTIF_ID } from '../lib/ids';
import { loadRayons, loadKmzAreas } from '../load-seed-data';
import {
  RAYON_BOUNDARIES,
  RAYON_TAMAN_AKTIF_OFFICE,
  computeCentroidFromRings,
  hullPolygonFromRings,
  parseCoords,
  type RayonCode,
} from '../kmz-locations';

/**
 * Seed the 8 rayons.
 *
 * Master data (id/name/description/color) comes from `data/rayons.csv`; the
 * official boundary outlines come from the KMZ ("Batas Wilayah Kerja Rayon")
 * via `RAYON_BOUNDARIES` — never derived from member areas (see
 * ADR/PR #145). Taman Aktif has no admin outline, so its boundary is the convex
 * hull of its member park polygons, with the office as the map center.
 *
 * Populates `ctx.maps.rayonIdByCode` for downstream entities (areas, users…).
 */
export async function seedRayons(ctx: SeedContext): Promise<void> {
  ctx.log('📍 Seeding Rayons…');

  const rayons = loadRayons();
  for (const r of rayons) {
    await ctx.qr.query(
      `INSERT INTO rayons (id, name, description, color) VALUES ($1, $2, $3, $4)
       ON CONFLICT (id) DO NOTHING`,
      [r.id, r.name, r.description, r.color || null],
    );
    if (r.rayon_code) ctx.maps.rayonIdByCode.set(r.rayon_code, r.id);
  }
  ctx.log(`  ✓ ${rayons.length} rayons (from data/rayons.csv)`);

  // Geographic rayons: official KMZ boundary + polygon centroid as center.
  for (const code of Object.keys(RAYON_BOUNDARIES) as RayonCode[]) {
    const polygon = RAYON_BOUNDARIES[code];
    if (!polygon) continue;
    const ring = polygon.coordinates[0].map(([lng, lat]) => [lng, lat] as [number, number]);
    const centroid = computeCentroidFromRings([ring]);
    await ctx.qr.query(
      `UPDATE rayons SET center_lat = $1, center_lng = $2, boundary_polygon = $3::jsonb
       WHERE id = $4`,
      [centroid.lat, centroid.lng, JSON.stringify(polygon), RAYON_ID_BY_CODE[code]],
    );
  }

  // Taman Aktif: convex hull of member park polygons + office center.
  const tamanRings = loadKmzAreas()
    .filter((a) => a.rayonCode === 'TAMAN_AKTIF')
    .flatMap((a) => a.coordStrings.map((s) => parseCoords(s)));
  const tamanHull = hullPolygonFromRings(tamanRings);
  await ctx.qr.query(
    `UPDATE rayons SET center_lat = $1, center_lng = $2,
       boundary_polygon = COALESCE($3::jsonb, boundary_polygon)
     WHERE id = $4`,
    [
      RAYON_TAMAN_AKTIF_OFFICE.lat,
      RAYON_TAMAN_AKTIF_OFFICE.lng,
      tamanHull ? JSON.stringify(tamanHull) : null,
      RAYON_TAMAN_AKTIF_ID,
    ],
  );
  ctx.log('  ✓ 7 KMZ rayon boundaries + Taman Aktif hull');
}
