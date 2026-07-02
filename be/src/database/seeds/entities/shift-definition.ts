import type { SeedContext } from '../lib/context';
import { SHIFT_1_ID, SHIFT_2_ID, SHIFT_3_ID } from '../lib/ids';

/**
 * Seed 3 shift definitions (Shift 1: 06:00-15:00, Shift 2: 15:00-23:00, Shift 3: 21:00-05:00 midnight).
 */
export async function seedShiftDefinitions(ctx: SeedContext): Promise<void> {
  ctx.log('⏰ Seeding Shift Definitions…');
  await ctx.qr.query(
    `
    INSERT INTO shift_definitions (id, name, code, start_time, end_time, crosses_midnight, is_active) VALUES
      ($1, 'Shift 1', 'SHIFT1', '06:00:00', '15:00:00', FALSE, TRUE),
      ($2, 'Shift 2', 'SHIFT2', '15:00:00', '23:00:00', FALSE, TRUE),
      ($3, 'Shift 3', 'SHIFT3', '21:00:00', '05:00:00', TRUE, TRUE)
    ON CONFLICT (code) DO NOTHING;
  `,
    [SHIFT_1_ID, SHIFT_2_ID, SHIFT_3_ID],
  );
  ctx.log('  ✓ Created 3 Shift Definitions');
}
