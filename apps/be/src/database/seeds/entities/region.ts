import type { SeedContext } from '../lib/context';

/**
 * Seed a couple of sample regions (Kawasan) under the first rayon so the new
 * tier + re-parenting are demonstrable in demo (ADR-045). Regions are otherwise
 * drawn fresh in the UI; staging/production seed none. Idempotent.
 * Run AFTER seedRayons + seedAreas.
 */
export async function seedRegions(ctx: SeedContext): Promise<void> {
  if (ctx.mode !== 'demo') return; // demo-only sample data
  ctx.log('🗺️  Seeding sample Regions (Kawasan)…');

  const R1 = 'a1a1a1a1-0000-4000-8000-000000000001';
  const R2 = 'a1a1a1a1-0000-4000-8000-000000000002';

  // Pick the rayon with the most areas so the sample regions have areas to hold.
  const rayonRows = (await ctx.qr.query(
    `SELECT r.id, count(a.id) AS n
       FROM rayons r JOIN areas a ON a.rayon_id = r.id AND a.deleted_at IS NULL
      WHERE r.deleted_at IS NULL
      GROUP BY r.id ORDER BY n DESC LIMIT 1`,
  )) as Array<{ id: string }>;
  const rayonId = rayonRows[0]?.id;
  if (!rayonId) {
    ctx.log('  ⚠ no rayon with areas found — skipping regions');
    return;
  }

  await ctx.qr.query(
    `INSERT INTO regions (id, name, rayon_id, border_color, fill_color, border_opacity, fill_opacity, marker_icon, marker_color)
     VALUES
       ($1, 'Kawasan A', $3, '#1C1917', '#7FBC8C', 0.9, 0.25, 'trees', '#7FBC8C'),
       ($2, 'Kawasan B', $3, '#1C1917', '#69D2E7', 0.9, 0.25, 'trees', '#69D2E7')
     ON CONFLICT (id) DO NOTHING`,
    [R1, R2, rayonId],
  );

  // Re-parent up to 5 of that rayon's areas into Kawasan A.
  await ctx.qr.query(
    `UPDATE areas SET region_id = $1
     WHERE id IN (
       SELECT id FROM areas WHERE rayon_id = $2 AND deleted_at IS NULL AND region_id IS NULL LIMIT 5
     )`,
    [R1, rayonId],
  );

  ctx.log('  ✓ Seeded 2 sample regions + linked up to 5 areas');
}
