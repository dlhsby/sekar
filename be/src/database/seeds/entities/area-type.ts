import type { SeedContext } from '../lib/context';

/**
 * Seed 4 area types and categorize them (ACTIVE/PASSIVE).
 * Combines INSERT from seed-phase1 and UPDATE from seed-phase2.
 */
export async function seedAreaTypes(ctx: SeedContext): Promise<void> {
  ctx.log('🏷️  Seeding Area Types…');

  // Insert 4 area types
  await ctx.qr.query(`
    INSERT INTO area_types (code, name, description) VALUES
      ('park',        'Taman',      'Taman kota dan ruang terbuka hijau publik'),
      ('pedestrian',  'Trotoar',    'Jalur pejalan kaki di sepanjang jalan raya'),
      ('mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan'),
      ('street',      'Jalanan',    'Jalanan umum yang memerlukan pemeliharaan kebersihan')
    ON CONFLICT (code) DO NOTHING
  `);
  ctx.log('  ✓ Created 4 area types');

  // Update categories: ACTIVE
  await ctx.qr.query(`
    UPDATE area_types SET category = 'ACTIVE' WHERE code IN ('park', 'mini_garden');
  `);

  // Update categories: PASSIVE
  await ctx.qr.query(`
    UPDATE area_types SET category = 'PASSIVE' WHERE code IN ('pedestrian', 'street');
  `);
  ctx.log('  ✓ Updated Area Types with ACTIVE/PASSIVE categories');
}
