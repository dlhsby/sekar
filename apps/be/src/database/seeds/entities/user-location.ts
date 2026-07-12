import type { SeedContext } from '../lib/context';
import { RAYON_PUSAT_ID } from '../lib/ids';
import {
  DARMO_P1_AREA_ID,
  DARMO_P2_AREA_ID,
  DARMO_P3_AREA_ID,
  DARMO_P4_AREA_ID,
  DARMO_P5_AREA_ID,
  BUNGKUL_AREA_ID,
  TAMAN_FLORA_AREA_ID,
  TAMAN_BUK_TONG_ID,
} from '../kmz-locations';

/**
 * Seed user_areas assignments (mode-dependent):
 *
 * Demo: ~15 demo assignments (korlap/satgas multi-area assignments for testing).
 *
 * Staging: 381 permanent assignments. Korlap_pusat_1,2 → 12 Pusat areas each.
 * Satgas/linmas distributed across areas. Real users assigned to Bungkul + other
 * parks. All generated from user + area data at runtime.
 */
export async function seedUserAreas(ctx: SeedContext): Promise<void> {
  ctx.log('🗺️  Seeding User-Location Assignments…');

  if (ctx.mode === 'staging') {
    // Faithful port of seed-staging STEP 11 — a FIXED set of permanent
    // assignments (not "all areas in rayon"). The roster's taman-aktif area
    // links are already created during user seeding (STEP 9).
    const superadminRow = (await ctx.qr.query(
      `SELECT id FROM users WHERE username = 'superadmin' LIMIT 1`,
    )) as Array<{ id: string }>;
    const superadminId = superadminRow[0]?.id;
    const pusatDummyAreaIds: string[] = (
      (await ctx.qr.query(
        `SELECT id FROM areas WHERE rayon_id = $1 AND deleted_at IS NULL ORDER BY name LIMIT 12`,
        [RAYON_PUSAT_ID],
      )) as Array<{ id: string }>
    ).map((r) => r.id);
    const pusatDummyAreaId = pusatDummyAreaIds[0] ?? null;
    const AREA_BUNGKUL_ID = BUNGKUL_AREA_ID;

    const assign = async (username: string, locationId: string | null) => {
      if (!locationId) return;
      await ctx.qr.query(
        `INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
         SELECT u.id, $2, 'permanent', $3 FROM users u WHERE u.username = $1
         ON CONFLICT DO NOTHING`,
        [username, locationId, superadminId],
      );
    };

    // Rayon Pusat pedestrian assignments.
    for (const aid of pusatDummyAreaIds) await assign('korlap_pusat_1', aid);
    for (const aid of pusatDummyAreaIds) await assign('korlap_pusat_2', aid);
    await assign('korlap_pusat_3', pusatDummyAreaId);
    for (const aid of pusatDummyAreaIds) await assign('satgas_pusat_1', aid);
    for (const aid of pusatDummyAreaIds) await assign('satgas_pusat_2', aid);
    for (const aid of pusatDummyAreaIds) await assign('linmas_pusat_1', aid);
    await assign('linmas_pusat_2', pusatDummyAreaId);
    await assign('satgas_pusat_3', pusatDummyAreaId);
    // Rayon Taman Aktif role matrix.
    await assign('satgas_taman_bungkul_1', AREA_BUNGKUL_ID);
    await assign('korlap_taman_aktif_1', AREA_BUNGKUL_ID);
    await assign('korlap_taman_aktif_1', TAMAN_FLORA_AREA_ID);
    await assign('linmas_taman_aktif_1', AREA_BUNGKUL_ID);
    await assign('satgas_taman_flora_1', TAMAN_FLORA_AREA_ID);
    // Hardcoded real users.
    await assign('rakhmat_novianto', pusatDummyAreaId);
    await assign('roy_junaidi', pusatDummyAreaId);
    for (const un of ['edi_santoso', 'jihan_nabila_safitri', 'deni_purwanto', 'agus_ramadhan']) {
      await assign(un, AREA_BUNGKUL_ID);
    }
    ctx.log('✅ Staging user_areas (STEP 11 fixed assignments) complete');
  } else {
    // DEMO: Demo user_areas assignments
    ctx.log('  [Demo assignments]');

    // korlap_pusat_1 → Darmo Pulau 3 (primary permanent area, Rayon Pusat)
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_pusat_1' AND a.id = '${DARMO_P3_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // korlap_pusat_1 also → Jalan Raya Darmo (same Rayon Pusat — korlap must stay within one rayon)
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_pusat_1' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // korlap_pusat_2 → Jalan Raya Darmo (primary permanent area)
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_pusat_2' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // satgas_pusat_1 → Darmo Pulau 1 (default area, post-remap) + Darmo Pulau 2 (extra permanent).
    // Tests: satgas with default location_id can also be assigned to extra areas via user_areas.
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_1' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_1' AND a.id = '${DARMO_P2_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // satgas_pusat_3 → Darmo Pulau 4 (default area, no extra assignments)
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_3' AND a.id = '${DARMO_P4_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // satgas_taman_bungkul_1 → Taman Bungkul (Rayon Taman Aktif park worker)
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_taman_bungkul_1' AND a.id = '${BUNGKUL_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // korlap_taman_aktif_1 → Taman Bungkul + Taman Flora (multi-area within Rayon Taman Aktif)
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_taman_aktif_1' AND a.id IN ('${BUNGKUL_AREA_ID}', '${TAMAN_FLORA_AREA_ID}')
    ON CONFLICT DO NOTHING;
  `);

    // linmas_taman_aktif_1 → Taman Bungkul
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'linmas_taman_aktif_1' AND a.id = '${BUNGKUL_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // satgas_taman_flora_1 → Taman Flora
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_taman_flora_1' AND a.id = '${TAMAN_FLORA_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // satgas_pusat_4 → Darmo Pulau 5 (default location_id) + Jalan Raya Darmo Pulau 1 (secondary permanent area)
    // This tests: satgas with two permanent areas in the same rayon
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_4' AND a.id = '${DARMO_P5_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'satgas_pusat_4' AND a.id = '${DARMO_P1_AREA_ID}'
    ON CONFLICT DO NOTHING;
  `);

    // satgas_timur_1_2 → Taman Buk Tong (post-remap, now in Rayon Timur 2).
    // The old "Taman Timur 1" dummy area is gone; user was moved in STEP 8.1.
    await ctx.qr.query(`
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
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
    INSERT INTO user_areas (user_id, location_id, assignment_type, assigned_by)
    SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
    FROM users u, areas a
    WHERE u.username = 'korlap_timur_2_1' AND a.id = '${TAMAN_BUK_TONG_ID}'
    ON CONFLICT DO NOTHING;
  `);

    ctx.log(
      '  ✓ korlap_timur_2_1→Taman Buk Tong; other rayon korlap have no user_areas (intentional)',
    );

    ctx.log('✅ User-area assignments seeding complete (demo)');
  }
}
