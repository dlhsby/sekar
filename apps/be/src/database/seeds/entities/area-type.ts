import type { SeedContext } from '../lib/context';

/**
 * Seed the location-type catalog.
 *
 * `location_types` is a TABLE, not an enum — types are data, and the backend
 * exposes full CRUD (`USER_MANAGERS`-gated), so operators change them via the
 * API rather than a migration. This seeder just establishes the baseline.
 *
 * `category` (ACTIVE/PASSIVE) is **decorative**: it is carried on two monitoring
 * DTOs and colours a badge on the locations grid, but nothing branches on it.
 * Kept deliberately — see the 2026-07-16 changelog entry in
 * `specs/features/geography/README.md`.
 */
const LOCATION_TYPES: ReadonlyArray<{
  code: string;
  name: string;
  category: 'ACTIVE' | 'PASSIVE';
  description: string;
}> = [
  {
    code: 'park',
    name: 'Taman',
    category: 'ACTIVE',
    description: 'Taman kota dan ruang terbuka hijau publik',
  },
  {
    code: 'pedestrian',
    name: 'Trotoar',
    category: 'PASSIVE',
    description: 'Jalur pejalan kaki di sepanjang jalan raya',
  },
  {
    code: 'street',
    name: 'Jalan',
    category: 'PASSIVE',
    description: 'Jalan umum yang memerlukan pemeliharaan kebersihan',
  },
  {
    code: 'traffic_island',
    name: 'Pulau Jalan',
    category: 'PASSIVE',
    description: 'Pulau jalan (traffic island) / median yang memerlukan pemeliharaan',
  },
];

export async function seedAreaTypes(ctx: SeedContext): Promise<void> {
  ctx.log('🏷️  Seeding Location Types…');

  for (const t of LOCATION_TYPES) {
    // DO UPDATE, not DO NOTHING: the previous version could only ever INSERT, so
    // renaming a type (Jalanan → Jalan) silently no-opped on any database that
    // already held the row. The seeder should be authoritative about its own
    // baseline.
    await ctx.qr.query(
      `INSERT INTO location_types (code, name, description, category)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (code) DO UPDATE
         SET name = EXCLUDED.name,
             description = EXCLUDED.description,
             category = EXCLUDED.category,
             updated_at = NOW()`,
      [t.code, t.name, t.description, t.category],
    );
  }
  ctx.log(`  ✓ ${LOCATION_TYPES.length} location types (Taman, Trotoar, Jalan, Pulau Jalan)`);

  // 'mini_garden' (Taman Mini) is retired. Guarded, never forced: a type still in
  // use must not vanish out from under its lokasi — soft-delete instead so the
  // rows keep resolving and an operator can decide.
  const [{ in_use }] = (await ctx.qr.query(
    `SELECT count(*)::int AS in_use
       FROM locations l JOIN location_types lt ON lt.id = l.location_type_id
      WHERE lt.code = 'mini_garden' AND l.deleted_at IS NULL`,
  )) as Array<{ in_use: number }>;

  if (in_use > 0) {
    await ctx.qr.query(
      `UPDATE location_types SET deleted_at = NOW() WHERE code = 'mini_garden' AND deleted_at IS NULL`,
    );
    ctx.log(`  ⚠ 'Taman Mini' still used by ${in_use} lokasi — soft-deleted instead of removed`);
  } else {
    await ctx.qr.query(`DELETE FROM location_types WHERE code = 'mini_garden'`);
    ctx.log(`  ✓ 'Taman Mini' removed (unused)`);
  }
}
