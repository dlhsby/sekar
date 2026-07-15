import type { SeedContext } from '../lib/context';
import { loadRayonSnapshot } from '../load-seed-data';

/**
 * Seed the 8 rayons from the live-staging snapshot (`data/rayons.snapshot.json`).
 *
 * Staging is the source of truth: the client validated each rayon's name,
 * description, colour, centre and boundary polygon there via the UI, so we pull
 * those rows verbatim instead of deriving boundaries from the KMZ. The snapshot
 * keeps every rayon's stable `id` + `rayon_code`, so downstream entities
 * (areas/users/kecamatans) that resolve a rayon by code are unaffected — only
 * the display data (names/colours/descriptions/geometry) reflects staging.
 *
 * Populates `ctx.maps.rayonIdByCode` for downstream entities. Idempotent:
 * re-seeding refreshes the mutable columns so a stale local DB catches up.
 */
export async function seedRayons(ctx: SeedContext): Promise<void> {
  ctx.log('📍 Seeding Rayons (from live-staging snapshot)…');

  const rayons = loadRayonSnapshot();
  for (const r of rayons) {
    // The snapshot's single boundary `color` maps onto the per-level styling
    // (ADR-045) — the legacy `color` column was retired; monitoring derives the
    // boundary tint from border_color/fill_color.
    await ctx.qr.query(
      `INSERT INTO rayons
         (id, name, description, border_color, fill_color, center_lat, center_lng, boundary_polygon, staffing_level)
       VALUES ($1, $2, $3, $4, $4, $5, $6, $7::jsonb, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         border_color = EXCLUDED.border_color,
         fill_color = EXCLUDED.fill_color,
         center_lat = EXCLUDED.center_lat,
         center_lng = EXCLUDED.center_lng,
         boundary_polygon = EXCLUDED.boundary_polygon,
         staffing_level = EXCLUDED.staffing_level`,
      [
        r.id,
        r.name,
        r.description,
        r.color || null,
        r.center_lat,
        r.center_lng,
        JSON.stringify(r.boundary_polygon),
        r.staffing_level || 'region',
      ],
    );
    if (r.rayon_code) ctx.maps.rayonIdByCode.set(r.rayon_code, r.id);
  }

  ctx.log(`  ✓ ${rayons.length} rayons (name/colour/boundary from staging)`);
}
