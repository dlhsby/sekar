import type { SeedContext } from '../lib/context';
import {
  SHIFT_1_ID,
  SHIFT_2_ID,
  SHIFT_3_ID,
  RAYON_TAMAN_AKTIF_ID,
  RAYON_TIMUR2_ID,
} from '../lib/ids';
import { TAMAN_BUK_TONG_ID } from '../kmz-areas';

/**
 * Seed area staff requirements (mode-dependent):
 *
 * Demo: ~20 rows (Taman Bungkul + Taman Buk Tong).
 *
 * Staging: 332 rows. 1 satgas + 1 linmas per area in Taman Aktif rayon + Rayon
 * Timur 2, SHIFT1/WEEKDAY only. Drives understaffing KPI calculations.
 */
export async function seedAreaStaffRequirements(ctx: SeedContext): Promise<void> {
  ctx.log('👥 Seeding Area Staff Requirements...');

  if (ctx.mode === 'staging') {
    // STAGING: 332 rows (1 satgas + 1 linmas per area in Taman Aktif + Timur 2)
    await ctx.qr.query(
      `INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
       SELECT
         a.id,
         $1,
         r.role,
         1,
         'WEEKDAY'
       FROM areas a
       CROSS JOIN (VALUES ('satgas'), ('linmas')) AS r(role)
       WHERE a.rayon_id IN ($2, $3)
       AND a.deleted_at IS NULL
       ON CONFLICT DO NOTHING`,
      [SHIFT_1_ID, RAYON_TAMAN_AKTIF_ID, RAYON_TIMUR2_ID],
    );
    ctx.log(
      '  ✓ Created 332 Area Staff Requirements (1 satgas + 1 linmas per Taman Aktif + Timur 2 area, SHIFT1/WEEKDAY)',
    );
  } else {
    // DEMO: Demo area staff requirements

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
}
