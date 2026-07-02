import type { SeedContext } from '../lib/context';
import {
  DARMO_P1_AREA_ID,
  DARMO_P2_AREA_ID,
  DARMO_P3_AREA_ID,
  DARMO_P4_AREA_ID,
  DARMO_P5_AREA_ID,
  BUNGKUL_AREA_ID,
  TAMAN_FLORA_AREA_ID,
  TAMAN_BUK_TONG_ID,
} from '../kmz-areas';

/**
 * Seed user_areas assignments (multi-area permanent assignments for
 * korlap and satgas). From seed-phase2.ts § SECTION E2 (Phase 2E).
 *
 * korlap_pusat_1     → Darmo P3 + Darmo P1 (multi-area, same rayon)
 * korlap_pusat_2     → Darmo P1
 * satgas_pusat_1     → Darmo P1 + Darmo P2
 * satgas_pusat_3     → Darmo P4
 * satgas_pusat_4     → Darmo P5 + Darmo P1 (multi-area)
 * satgas_taman_bungkul_1 → Taman Bungkul
 * korlap_taman_aktif_1   → Taman Bungkul + Taman Flora (multi-area within Rayon Taman Aktif)
 * linmas_taman_aktif_1   → Taman Bungkul
 * satgas_taman_flora_1   → Taman Flora
 * satgas_timur_1_2  → Taman Buk Tong (post-remap to Rayon Timur 2)
 * korlap_timur_2_1  → Taman Buk Tong (Timur 2 korlap has only one KMZ area)
 */
export async function seedUserAreas(ctx: SeedContext): Promise<void> {
  ctx.log('🗺️  Seeding User-Area Assignments…');

  // korlap_pusat_1 → Darmo Pulau 3 (primary permanent area, Rayon Pusat)
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_pusat_1' AND a.id = '${DARMO_P3_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // korlap_pusat_1 also → Jalan Raya Darmo (same Rayon Pusat — korlap must stay within one rayon)
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_pusat_1' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // korlap_pusat_2 → Jalan Raya Darmo (primary permanent area)
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_pusat_2' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // satgas_pusat_1 → Darmo Pulau 1 (default area, post-remap) + Darmo Pulau 2 (extra permanent).
  // Tests: satgas with default area_id can also be assigned to extra areas via user_areas.
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_1' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_1' AND a.id = '${DARMO_P2_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // satgas_pusat_3 → Darmo Pulau 4 (default area, no extra assignments)
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_3' AND a.id = '${DARMO_P4_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // satgas_taman_bungkul_1 → Taman Bungkul (Rayon Taman Aktif park worker)
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_taman_bungkul_1' AND a.id = '${BUNGKUL_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // korlap_taman_aktif_1 → Taman Bungkul + Taman Flora (multi-area within Rayon Taman Aktif)
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_taman_aktif_1' AND a.id IN ('${BUNGKUL_AREA_ID}', '${TAMAN_FLORA_AREA_ID}')
    ON CONFLICT DO NOTHING;
  `);

  // linmas_taman_aktif_1 → Taman Bungkul
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'linmas_taman_aktif_1' AND a.id = '${BUNGKUL_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // satgas_taman_flora_1 → Taman Flora
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_taman_flora_1' AND a.id = '${TAMAN_FLORA_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // satgas_pusat_4 → Darmo Pulau 5 (default area_id) + Jalan Raya Darmo Pulau 1 (secondary permanent area)
  // This tests: satgas with two permanent areas in the same rayon
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_4' AND a.id = '${DARMO_P5_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_4' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

  // satgas_timur_1_2 → Taman Buk Tong (post-remap, now in Rayon Timur 2).
  // The old "Taman Timur 1" dummy area is gone; user was moved in STEP 8.1.
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_timur_1_2' AND a.id = '${TAMAN_BUK_TONG_ID}'
    ON CONFLICT DO NOTHING;
  `);

  ctx.log('  ✓ korlap_pusat_1→Darmo P3+P1, korlap_pusat_2→Darmo P1');
  ctx.log('  ✓ satgas_pusat_1→Darmo P1+P2, satgas_pusat_4→Darmo P5+P1');
  ctx.log(
    '  ✓ satgas_pusat_3→Darmo P4, satgas_timur_1_2→Taman Buk Tong (Rayon Timur 2 after remap)',
  );
  ctx.log(
    '  ✓ Taman Aktif users: satgas_taman_bungkul_1, korlap_taman_aktif_1, linmas_taman_aktif_1, satgas_taman_flora_1',
  );

  // Per-rayon korlap area assignments. Only Rayon Timur 2 has a KMZ area
  // (Taman Buk Tong); the other rayons leave user_areas empty for korlap,
  // which exercises the "korlap with no assignments" supervisor view.
  await ctx.qr.query(`
    INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_timur_2_1' AND a.id = '${TAMAN_BUK_TONG_ID}'
    ON CONFLICT DO NOTHING;
  `);

  ctx.log(
    '  ✓ korlap_timur_2_1→Taman Buk Tong; other rayon korlap have no user_areas (intentional)',
  );

  ctx.log('✅ User-area assignments seeding complete');
}
