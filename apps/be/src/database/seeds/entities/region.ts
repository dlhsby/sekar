import type { SeedContext } from '../lib/context';
import { loadKawasanSnapshot, loadAreaRegionMap } from '../load-seed-data';

// Default per-level map styling (ADR-045). Boundaries/centres are drawn fresh in
// the UI, so seeded kawasan start with only these cosmetic defaults + a marker.
const BORDER_COLOR = '#1C1917';
const FILL_COLOR = '#7FBC8C';
const BORDER_OPACITY = 0.9;
const FILL_OPACITY = 0.25;
const MARKER_ICON = 'trees';

/**
 * Seed the Kawasan (Regions) from the client's workbook
 * (`data/kawasan.snapshot.json`) — the "Kawasan …" entries in each rayon tab's
 * column K, grouped under that rayon (ADR-045). Names + parent rayon only;
 * boundaries are drawn fresh in the UI. Deterministic ids make this idempotent.
 *
 * Runs for both demo and staging. Must run AFTER seedRayons (FK rayon_id) and
 * seedAreas (the re-parent step sets locations.region_id).
 */
export async function seedRegions(ctx: SeedContext): Promise<void> {
  ctx.log('🗺️  Seeding Kawasan (Regions) from workbook…');

  const kawasan = loadKawasanSnapshot();
  const byRayon = new Map<string, number>();
  for (const k of kawasan) {
    await ctx.qr.query(
      `INSERT INTO regions
         (id, name, rayon_id, border_color, fill_color, border_opacity, fill_opacity, marker_icon)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (id) DO UPDATE SET
         name = EXCLUDED.name,
         rayon_id = EXCLUDED.rayon_id`,
      [
        k.id,
        k.name,
        k.rayon_id,
        BORDER_COLOR,
        FILL_COLOR,
        BORDER_OPACITY,
        FILL_OPACITY,
        MARKER_ICON,
      ],
    );
    byRayon.set(k.rayon_id, (byRayon.get(k.rayon_id) ?? 0) + 1);
  }

  ctx.log(`  ✓ ${kawasan.length} kawasan across ${byRayon.size} rayons`);

  // Re-parent areas under their kawasan (confident name matches from the
  // workbook; the rest stay unassigned for UI remediation). One bulk UPDATE via
  // a VALUES join. Only sets region_id where still NULL (never clobbers).
  const map = Object.entries(loadAreaRegionMap());
  if (map.length > 0) {
    const values = map.map((_, i) => `($${i * 2 + 1}::uuid, $${i * 2 + 2}::uuid)`).join(', ');
    const params = map.flat();
    await ctx.qr.query(
      `UPDATE locations AS l
          SET region_id = m.region_id
         FROM (VALUES ${values}) AS m(area_id, region_id)
        WHERE l.id = m.area_id
          AND l.region_id IS NULL`,
      params,
    );
    ctx.log(`  ✓ Re-parented ${map.length} areas under their kawasan`);
  }
}
