import type { SeedContext } from '../lib/context';
import { SHIFT_1_ID, SHIFT_2_ID, SHIFT_3_ID } from '../lib/ids';
import { TAMAN_BUK_TONG_ID } from '../kmz-areas';

/**
 * Seed area staff requirements: Taman Bungkul (14) + Taman Buk Tong (3, the
 * ACTIVE-park anchor in Rayon Timur 2 so understaffing alerts have inputs).
 * Requirements define minimum staffing per shift/day-type for satgas and linmas roles.
 */
export async function seedAreaStaffRequirements(ctx: SeedContext): Promise<void> {
  ctx.log('👥 Seeding Area Staff Requirements...');

  // Get Taman Bungkul area_id
  const areaResult = await ctx.qr.query(`
    SELECT id FROM areas WHERE name = 'Taman Bungkul' LIMIT 1;
  `);
  const tamanBungkulId = areaResult[0]?.id;

  if (tamanBungkulId) {
    await ctx.qr.query(`
      INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type) VALUES
        -- Shift 1 Weekday
        ('${tamanBungkulId}', '${SHIFT_1_ID}', 'satgas', 6, 'WEEKDAY'),
        ('${tamanBungkulId}', '${SHIFT_1_ID}', 'linmas', 2, 'WEEKDAY'),
        -- Shift 2 Weekday
        ('${tamanBungkulId}', '${SHIFT_2_ID}', 'satgas', 9, 'WEEKDAY'),
        ('${tamanBungkulId}', '${SHIFT_2_ID}', 'linmas', 2, 'WEEKDAY'),
        -- Shift 3 Weekday
        ('${tamanBungkulId}', '${SHIFT_3_ID}', 'satgas', 0, 'WEEKDAY'),
        ('${tamanBungkulId}', '${SHIFT_3_ID}', 'linmas', 4, 'WEEKDAY'),
        -- Shift 1 Weekend
        ('${tamanBungkulId}', '${SHIFT_1_ID}', 'satgas', 8, 'WEEKEND'),
        ('${tamanBungkulId}', '${SHIFT_1_ID}', 'linmas', 3, 'WEEKEND'),
        -- Shift 2 Weekend
        ('${tamanBungkulId}', '${SHIFT_2_ID}', 'satgas', 12, 'WEEKEND'),
        ('${tamanBungkulId}', '${SHIFT_2_ID}', 'linmas', 3, 'WEEKEND'),
        -- Shift 3 Weekend
        ('${tamanBungkulId}', '${SHIFT_3_ID}', 'satgas', 0, 'WEEKEND'),
        ('${tamanBungkulId}', '${SHIFT_3_ID}', 'linmas', 5, 'WEEKEND'),
        -- Shift 1 Holiday
        ('${tamanBungkulId}', '${SHIFT_1_ID}', 'satgas', 10, 'HOLIDAY'),
        ('${tamanBungkulId}', '${SHIFT_1_ID}', 'linmas', 4, 'HOLIDAY')
      ON CONFLICT DO NOTHING;
    `);
    ctx.log('  ✓ Created 14 Area Staff Requirements for Taman Bungkul');
  } else {
    ctx.log('  ⚠ Taman Bungkul not found, skipping staff requirements');
  }

  // Extra staff requirements for the real park areas that anchor scenarios.
  // Mirror Bungkul for the ACTIVE-park scenario in Rayon Timur 2 so
  // understaffing alerts have inputs.
  await ctx.qr.query(`
    INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type) VALUES
      ('${TAMAN_BUK_TONG_ID}', '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
      ('${TAMAN_BUK_TONG_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
      ('${TAMAN_BUK_TONG_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY')
    ON CONFLICT DO NOTHING;
  `);
  ctx.log('  ✓ Added 3 staff requirements for Taman Buk Tong (Rayon Timur 2 anchor)');
}
