import type { SeedContext } from '../lib/context';
import { loadDistrictSnapshot } from '../load-seed-data';

/**
 * Seed the 8 districts from the live-staging snapshot (`data/districts.snapshot.json`).
 *
 * Staging is the source of truth: the client validated each district's name,
 * description, colour, centre and boundary polygon there via the UI, so we pull
 * those rows verbatim instead of deriving boundaries from the KMZ. The snapshot
 * keeps every district's stable `id` + `rayon_code`, so downstream entities
 * (areas/users/kecamatans) that resolve a district by code are unaffected — only
 * the display data (names/colours/descriptions/geometry) reflects staging.
 *
 * Populates `ctx.maps.districtIdByCode` for downstream entities. Idempotent:
 * re-seeding refreshes the mutable columns so a stale local DB catches up.
 */
export async function seedDistricts(ctx: SeedContext): Promise<void> {
  ctx.log('📍 Seeding Districts (from live-staging snapshot)…');

  const districts = loadDistrictSnapshot();
  for (const r of districts) {
    // The snapshot's single boundary `color` maps onto the per-level styling
    // (ADR-045) — the legacy `color` column was retired; monitoring derives the
    // boundary tint from border_color/fill_color.
    await ctx.qr.query(
      `INSERT INTO districts
         (id, name, description, border_color, fill_color, marker_icon, center_lat, center_lng, boundary_polygon, staffing_level)
       VALUES ($1, $2, $3, $4, $4, 'building', $5, $6, $7::jsonb, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         description = EXCLUDED.description,
         border_color = EXCLUDED.border_color,
         fill_color = EXCLUDED.fill_color,
         marker_icon = COALESCE(districts.marker_icon, EXCLUDED.marker_icon),
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
    if (r.rayon_code) ctx.maps.districtIdByCode.set(r.rayon_code, r.id);
  }

  ctx.log(`  ✓ ${districts.length} districts (name/colour/boundary from staging)`);
}
