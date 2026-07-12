import type { SeedContext } from '../lib/context';

/**
 * Seed shifts (Phase 2C).
 *
 * 4 completed shifts for korlap/linmas/admin_data/kepala_rayon (ready for live clock-in),
 * + 19 historical shifts for satgas_pusat_1 spread across 2+ months (for filter/scroll testing).
 * Total: 23 shift records.
 */
export async function seedShifts(ctx: SeedContext): Promise<void> {
  ctx.log('🕐 Seeding shifts for Phase 2C role users...');

  const shiftLinmas = await ctx.qr.query(
    `SELECT id, location_id FROM users WHERE username = 'linmas_pusat_1' LIMIT 1`,
  );
  const shiftKorlap1 = await ctx.qr.query(
    `SELECT id, location_id FROM users WHERE username = 'korlap_pusat_1' LIMIT 1`,
  );
  const shiftAdminData = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'admin_data_pusat_1' LIMIT 1`,
  );
  const shiftKepalaRayon = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'kepala_rayon_selatan_1' LIMIT 1`,
  );
  const shiftArea = await ctx.qr.query(`SELECT id FROM locations LIMIT 1`);

  if (shiftArea.length > 0) {
    const locationId = shiftArea[0].id;
    let shiftCount = 0;

    // Phase 3 fix: only seed COMPLETED shifts for korlap/linmas Phase 2C
    // demo accounts. The previously-seeded active shift was orphaned —
    // user_tracking_status was never advanced from `offline`, so the user
    // never appeared on the monitoring map and re-clocking via the app
    // failed with SHIFT_ALREADY_ACTIVE. Leaving them clocked-out lets a
    // real clock-in via the app run `StatusCalculator.onClockIn` and
    // populate the tracking row correctly.
    if (shiftLinmas.length > 0) {
      const linmasId = shiftLinmas[0].id;
      const linmasAreaId = shiftLinmas[0].location_id || locationId;
      await ctx.qr.query(`
        INSERT INTO shifts (user_id, location_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
          clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
        VALUES
          ('${linmasId}', '${linmasAreaId}', NOW() - INTERVAL '1 day 8 hours', -7.2905, 112.7398,
            'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/linmas1-001.jpg',
            NOW() - INTERVAL '1 day', -7.2906, 112.7399, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day')
      `);
      shiftCount += 1;
      ctx.log(
        '  ✓ Created 1 completed shift for linmas_pusat_1 (clocked-out, ready for live clock-in)',
      );
    }

    if (shiftKorlap1.length > 0) {
      const korlap1Id = shiftKorlap1[0].id;
      const korlap1AreaId = shiftKorlap1[0].location_id || locationId;
      await ctx.qr.query(`
        INSERT INTO shifts (user_id, location_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
          clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
        VALUES
          ('${korlap1Id}', '${korlap1AreaId}', NOW() - INTERVAL '1 day 8 hours', -7.2905, 112.7398,
            'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/korlap1-001.jpg',
            NOW() - INTERVAL '1 day', -7.2906, 112.7399, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day')
      `);
      shiftCount += 1;
      ctx.log(
        '  ✓ Created 1 completed shift for korlap_pusat_1 (clocked-out, ready for live clock-in)',
      );
    }

    if (shiftAdminData.length > 0) {
      const adminDataId = shiftAdminData[0].id;
      await ctx.qr.query(`
        INSERT INTO shifts (user_id, location_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
          clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
        VALUES
          ('${adminDataId}', '${locationId}', NOW() - INTERVAL '3 days 8 hours', -7.2905, 112.7398,
            'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/admin-data1-001.jpg',
            NOW() - INTERVAL '3 days', -7.2906, 112.7399, NOW() - INTERVAL '3 days 8 hours', NOW() - INTERVAL '3 days')
      `);
      shiftCount += 1;
      ctx.log('  ✓ Created 1 shift for admin_data_pusat_1 (completed)');
    }

    if (shiftKepalaRayon.length > 0) {
      const kepalaId = shiftKepalaRayon[0].id;
      await ctx.qr.query(`
        INSERT INTO shifts (user_id, location_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
          clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
        VALUES
          ('${kepalaId}', '${locationId}', NOW() - INTERVAL '2 days 8 hours', -7.2905, 112.7398,
            'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/kepala-rayon-001.jpg',
            NOW() - INTERVAL '2 days', -7.2906, 112.7399, NOW() - INTERVAL '2 days 8 hours', NOW() - INTERVAL '2 days')
      `);
      shiftCount += 1;
      ctx.log('  ✓ Created 1 shift for kepala_rayon_selatan_1 (completed)');
    }

    ctx.log(`  ✓ Total: ${shiftCount} Phase 2C shifts created`);

    // ── satgas_pusat_1: rich shift history for mobile RiwayatShift testing ──
    // Spreads shifts across: this week, last week, this month, last month,
    // and 2 months ago — so date-range filters (this week / this month / etc.)
    // and the scrollable list all have meaningful data to display.
    await ctx.qr.query(`
      INSERT INTO shifts (
        user_id, location_id,
        clock_in_time, clock_in_gps_lat, clock_in_gps_lng, clock_in_photo_url,
        clock_out_time, clock_out_gps_lat, clock_out_gps_lng,
        created_at, updated_at
      )
      SELECT
        u.id,
        u.location_id,
        t.cin,
        -7.2905, 112.7398,
        'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/satgas_pusat1-dummy.jpg',
        t.cout,
        -7.2906, 112.7399,
        t.cin, t.cout
      FROM users u
      CROSS JOIN (VALUES
        -- This week (Mon–today, assuming up to Wed)
        (NOW() - INTERVAL '0 days 9 hours',  NOW() - INTERVAL '0 days 1 hour'),
        (NOW() - INTERVAL '1 day 8 hours',   NOW() - INTERVAL '1 day 0 hours'),
        (NOW() - INTERVAL '2 days 8 hours',  NOW() - INTERVAL '2 days 0 hours'),
        -- Last week
        (NOW() - INTERVAL '7 days 8 hours',  NOW() - INTERVAL '7 days 0 hours'),
        (NOW() - INTERVAL '8 days 9 hours',  NOW() - INTERVAL '8 days 1 hour'),
        (NOW() - INTERVAL '9 days 8 hours',  NOW() - INTERVAL '9 days 30 minutes'),
        (NOW() - INTERVAL '11 days 7 hours 30 minutes', NOW() - INTERVAL '11 days 0 hours'),
        -- Earlier this month (~2–3 weeks ago)
        (NOW() - INTERVAL '14 days 8 hours', NOW() - INTERVAL '14 days 0 hours'),
        (NOW() - INTERVAL '16 days 9 hours', NOW() - INTERVAL '16 days 1 hour'),
        (NOW() - INTERVAL '18 days 8 hours 30 minutes', NOW() - INTERVAL '18 days 0 hours'),
        (NOW() - INTERVAL '20 days 8 hours', NOW() - INTERVAL '20 days 30 minutes'),
        -- Last month (~5–6 weeks ago)
        (NOW() - INTERVAL '32 days 8 hours', NOW() - INTERVAL '32 days 0 hours'),
        (NOW() - INTERVAL '35 days 9 hours', NOW() - INTERVAL '35 days 1 hour'),
        (NOW() - INTERVAL '38 days 8 hours', NOW() - INTERVAL '38 days 0 hours'),
        (NOW() - INTERVAL '42 days 7 hours 30 minutes', NOW() - INTERVAL '42 days 0 hours'),
        (NOW() - INTERVAL '45 days 8 hours', NOW() - INTERVAL '45 days 30 minutes'),
        -- Two months ago (~8–9 weeks ago)
        (NOW() - INTERVAL '60 days 8 hours', NOW() - INTERVAL '60 days 0 hours'),
        (NOW() - INTERVAL '63 days 9 hours', NOW() - INTERVAL '63 days 1 hour'),
        (NOW() - INTERVAL '67 days 8 hours', NOW() - INTERVAL '67 days 0 hours')
      ) AS t(cin, cout)
      WHERE u.username = 'satgas_pusat_1'
    `);
    ctx.log(
      '  ✓ Created 19 shifts for satgas_pusat_1 (spread across 2+ months for filter/scroll testing)',
    );
  } else {
    ctx.log('  ⚠ No locations found, skipping Phase 2C shifts');
  }
}
