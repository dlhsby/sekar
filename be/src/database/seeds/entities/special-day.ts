import type { SeedContext } from '../lib/context';

/**
 * Seed 4 special day overrides (holidays).
 */
export async function seedSpecialDayOverrides(ctx: SeedContext): Promise<void> {
  ctx.log('📅 Seeding Special Day Overrides…');

  // Local IDs for special days
  const SPECIAL_DAY_1_ID = 'aee11144-0a99-458f-90b2-3df456f5bdf0';
  const SPECIAL_DAY_2_ID = 'd2bb4962-0d2e-46fb-b45d-c3038254f5c4';
  const SPECIAL_DAY_3_ID = '72bfe1fd-6285-4853-a4a9-d75e8edc65e6';
  const SPECIAL_DAY_4_ID = '8a8ff3d8-8c45-461e-b66c-8563c04cbbd5';

  await ctx.qr.query(
    `
    INSERT INTO special_day_overrides (id, date, day_type, name) VALUES
      ($1, '2026-08-17', 'HOLIDAY', 'Hari Kemerdekaan'),
      ($2, '2026-12-25', 'HOLIDAY', 'Natal'),
      ($3, '2026-01-01', 'HOLIDAY', 'Tahun Baru'),
      ($4, '2026-05-01', 'HOLIDAY', 'Hari Buruh')
    ON CONFLICT (date) DO NOTHING;
  `,
    [SPECIAL_DAY_1_ID, SPECIAL_DAY_2_ID, SPECIAL_DAY_3_ID, SPECIAL_DAY_4_ID],
  );
  ctx.log('  ✓ Created 4 Special Day Overrides');
}
