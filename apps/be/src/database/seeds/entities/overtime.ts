import type { SeedContext } from '../lib/context';

/**
 * Seed overtime records (Phase 2C).
 *
 * 10 overtime rows across 5 roles: satgas (3), linmas (3), korlap (2), admin_data (2).
 * Covers pending, approved, rejected statuses.
 */
export async function seedOvertimes(ctx: SeedContext): Promise<void> {
  ctx.log('⏰ Seeding Overtime records...');

  // Get test users for overtime
  const korlapOtResult = await ctx.qr.query(`
    SELECT id FROM users WHERE username = 'korlap_pusat_1' LIMIT 1
  `);
  const satgasOtResult = await ctx.qr.query(`
    SELECT id FROM users WHERE username = 'satgas_pusat_1' LIMIT 1
  `);
  const linmasOtResult = await ctx.qr.query(`
    SELECT id FROM users WHERE username = 'linmas_pusat_1' LIMIT 1
  `);
  const korlapDarmoOtResult = await ctx.qr.query(`
    SELECT id FROM users WHERE username = 'korlap_pusat_2' LIMIT 1
  `);

  const kepalaRayonOtResult = await ctx.qr.query(`
    SELECT id FROM users WHERE username = 'kepala_rayon_selatan_1' LIMIT 1
  `);

  const tamanBungkulIdResult = await ctx.qr.query(`
    SELECT id FROM locations WHERE name = 'Taman Bungkul' LIMIT 1
  `);

  if (korlapOtResult.length > 0 && satgasOtResult.length > 0 && tamanBungkulIdResult.length > 0) {
    const korlapOtId = korlapOtResult[0].id;
    const satgasOtId = satgasOtResult[0].id;
    const linmasOtId = linmasOtResult.length > 0 ? linmasOtResult[0].id : null;
    const korlap1OtId = korlapDarmoOtResult.length > 0 ? korlapDarmoOtResult[0].id : null;
    const kepalaRayonOtId = kepalaRayonOtResult.length > 0 ? kepalaRayonOtResult[0].id : null;
    const tamanBungkulId = tamanBungkulIdResult[0].id;

    // Get activity type IDs for varied overtime
    const otActivityTypes = await ctx.qr.query(`
      SELECT id, code FROM activity_types WHERE code IN ('perawatan', 'patroli', 'cek_kendaraan', 'penyiraman', 'cek_absensi')
    `);

    if (otActivityTypes.length > 0) {
      const perawatanId =
        otActivityTypes.find((a: any) => a.code === 'perawatan')?.id ?? otActivityTypes[0].id;
      const patroliId =
        otActivityTypes.find((a: any) => a.code === 'patroli')?.id ?? otActivityTypes[0].id;
      const cekKendaraanId =
        otActivityTypes.find((a: any) => a.code === 'cek_kendaraan')?.id ?? otActivityTypes[0].id;
      const penyiramanId =
        otActivityTypes.find((a: any) => a.code === 'penyiraman')?.id ?? otActivityTypes[0].id;

      const OVERTIME_1_ID = 'e0f1a2b3-c4d5-4e6f-9a8b-8c9d0e1f2a3b';
      const OVERTIME_2_ID = 'f1a2b3c4-d5e6-4f7a-ab9c-9d0e1f2a3b4c';
      const OVERTIME_3_ID = 'a2b3c4d5-e6f7-4a8b-bc0d-0e1f2a3b4c5d';
      const OVERTIME_4_ID = 'b3c4d5e6-f7a8-4b9c-8d1e-1f2a3b4c5d6e';
      const OVERTIME_5_ID = 'c4d5e6f7-a8b9-4c0d-9e2f-2a3b4c5d6e7f';
      const OVERTIME_6_ID = 'd5e6f7a8-b9c0-4d1e-af3a-3b4c5d6e7f8a';
      const OVERTIME_7_ID = 'e6f7a8b9-c0d1-4e2f-b04b-4c5d6e7f8a9b';
      const OVERTIME_8_ID = 'f7a8b9c0-d1e2-4f3a-9a5c-5d6e7f8a9b0c';

      // Satgas overtimes (3: pending, approved, rejected + overnight example)
      await ctx.qr.query(`
        INSERT INTO overtimes (
          id, user_id, location_id, start_datetime, end_datetime,
          activity_type_id, description, photo_urls,
          gps_lat, gps_lng, status, approved_by, approved_at,
          created_at, updated_at
        ) VALUES
          (
            '${OVERTIME_1_ID}', '${satgasOtId}', '${tamanBungkulId}',
            '2026-02-10T17:00:00+07:00', '2026-02-10T20:00:00+07:00',
            '${perawatanId}', 'Perawatan tambahan setelah jam kerja',
            ARRAY['https://example.com/overtime1.jpg'],
            -7.2756, 112.7395, 'pending', NULL, NULL,
            NOW() - INTERVAL '10 days', NOW() - INTERVAL '10 days'
          ),
          (
            '${OVERTIME_2_ID}', '${satgasOtId}', '${tamanBungkulId}',
            '2026-02-08T16:00:00+07:00', '2026-02-08T19:00:00+07:00',
            '${penyiramanId}', 'Penyiraman darurat akibat panas ekstrem',
            ARRAY['https://example.com/overtime-siram.jpg'],
            -7.2756, 112.7395, 'approved', '${korlapOtId}', NOW() - INTERVAL '11 days',
            NOW() - INTERVAL '12 days', NOW() - INTERVAL '11 days'
          ),
          (
            '${OVERTIME_3_ID}', '${satgasOtId}', '${tamanBungkulId}',
            '2026-02-06T22:00:00+07:00', '2026-02-07T02:00:00+07:00',
            '${perawatanId}', 'Lembur lintas tengah malam - ditolak tidak ada budget',
            '{}', NULL, NULL, 'rejected', '${korlapOtId}', NOW() - INTERVAL '13 days',
            NOW() - INTERVAL '14 days', NOW() - INTERVAL '13 days'
          )
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 3 satgas overtime records (pending, approved, rejected)');

      // Linmas overtimes (3: pending, approved, rejected)
      if (linmasOtId) {
        await ctx.qr.query(`
          INSERT INTO overtimes (
            id, user_id, location_id, start_datetime, end_datetime,
            activity_type_id, description, photo_urls,
            gps_lat, gps_lng, status, approved_by, approved_at,
            created_at, updated_at
          ) VALUES
            (
              '${OVERTIME_4_ID}', '${linmasOtId}', '${tamanBungkulId}',
              '2026-02-11T20:00:00+07:00', '2026-02-11T23:00:00+07:00',
              '${patroliId}', 'Patroli tambahan malam minggu',
              ARRAY['https://example.com/overtime-patroli.jpg'],
              -7.2756, 112.7395, 'pending', NULL, NULL,
              NOW() - INTERVAL '9 days', NOW() - INTERVAL '9 days'
            ),
            (
              '${OVERTIME_5_ID}', '${linmasOtId}', '${tamanBungkulId}',
              '2026-02-07T19:00:00+07:00', '2026-02-07T22:00:00+07:00',
              '${patroliId}', 'Pengamanan event sore di taman',
              ARRAY['https://example.com/overtime-event.jpg'],
              -7.2756, 112.7395, 'approved', '${korlapOtId}', NOW() - INTERVAL '12 days',
              NOW() - INTERVAL '13 days', NOW() - INTERVAL '12 days'
            ),
            (
              '${OVERTIME_6_ID}', '${linmasOtId}', '${tamanBungkulId}',
              '2026-02-05T18:00:00+07:00', '2026-02-05T21:00:00+07:00',
              '${patroliId}', 'Patroli tambahan ditolak - sudah ada jadwal shift 3',
              '{}', NULL, NULL, 'rejected', '${korlapOtId}', NOW() - INTERVAL '14 days',
              NOW() - INTERVAL '15 days', NOW() - INTERVAL '14 days'
            )
          ON CONFLICT (id) DO NOTHING;
        `);
        ctx.log('  ✓ Created 3 linmas overtime records (pending, approved, rejected)');
      }

      // Korlap overtimes (2: pending, approved)
      if (korlap1OtId) {
        await ctx.qr.query(`
          INSERT INTO overtimes (
            id, user_id, location_id, start_datetime, end_datetime,
            activity_type_id, description, photo_urls,
            gps_lat, gps_lng, status, approved_by, approved_at,
            created_at, updated_at
          ) VALUES
            (
              '${OVERTIME_7_ID}', '${korlap1OtId}', '${tamanBungkulId}',
              '2026-02-09T16:00:00+07:00', '2026-02-09T19:00:00+07:00',
              '${cekKendaraanId}', 'Koordinasi tim malam dan cek kendaraan',
              ARRAY['https://example.com/overtime-korlap.jpg'],
              -7.2756, 112.7395, 'approved', ${kepalaRayonOtId ? `'${kepalaRayonOtId}'` : 'NULL'}, ${kepalaRayonOtId ? "NOW() - INTERVAL '10 days'" : 'NULL'},
              NOW() - INTERVAL '11 days', NOW() - INTERVAL '11 days'
            ),
            (
              '${OVERTIME_8_ID}', '${korlap1OtId}', '${tamanBungkulId}',
              '2026-02-12T17:00:00+07:00', '2026-02-12T20:00:00+07:00',
              '${cekKendaraanId}', 'Pengecekan kendaraan operasional setelah jam kerja',
              ARRAY['https://example.com/overtime-korlap2.jpg'],
              -7.2756, 112.7395, 'pending', NULL, NULL,
              NOW() - INTERVAL '8 days', NOW() - INTERVAL '8 days'
            )
          ON CONFLICT (id) DO NOTHING;
        `);
        ctx.log('  ✓ Created 2 korlap overtime records (approved, pending)');
      }

      // Admin Data overtimes (2: pending, approved)
      const adminDataOtResult = await ctx.qr.query(`
        SELECT id, location_id FROM users WHERE username = 'admin_data_pusat_1' LIMIT 1
      `);
      if (adminDataOtResult.length > 0) {
        const OVERTIME_9_ID = 'a8b9c0d1-e2f3-4a4b-8b6d-6e7f8a9b0c1d';
        const OVERTIME_10_ID = 'b9c0d1e2-f3a4-4b5c-8d7e-7f8a9b0c1d2e';
        const adminDataOtId = adminDataOtResult[0].id;
        // admin_data is in Rayon Pusat but has no location_id; use tamanBungkulId as fallback
        const adminDataAreaId = adminDataOtResult[0].location_id || tamanBungkulId;
        const cekAbsensiId = otActivityTypes.find((a: any) => a.code === 'cek_absensi')?.id;

        if (cekAbsensiId) {
          await ctx.qr.query(`
            INSERT INTO overtimes (
              id, user_id, location_id, start_datetime, end_datetime,
              activity_type_id, description, photo_urls,
              gps_lat, gps_lng, status, approved_by, approved_at,
              created_at, updated_at
            ) VALUES
              (
                '${OVERTIME_9_ID}', '${adminDataOtId}', '${adminDataAreaId}',
                '2026-02-13T17:00:00+07:00', '2026-02-13T20:00:00+07:00',
                '${cekAbsensiId}', 'Entri data absensi bulan sebelumnya',
                ARRAY['https://example.com/overtime-admin-data1.jpg'],
                -7.2756, 112.7395, 'pending', NULL, NULL,
                NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days'
              ),
              (
                '${OVERTIME_10_ID}', '${adminDataOtId}', '${adminDataAreaId}',
                '2026-02-11T16:00:00+07:00', '2026-02-11T19:00:00+07:00',
                '${cekAbsensiId}', 'Rekap laporan mingguan di luar jam kerja',
                ARRAY['https://example.com/overtime-admin-data2.jpg'],
                -7.2756, 112.7395, 'approved', ${kepalaRayonOtId ? `'${kepalaRayonOtId}'` : 'NULL'}, ${kepalaRayonOtId ? "NOW() - INTERVAL '8 days'" : 'NULL'},
                NOW() - INTERVAL '9 days', NOW() - INTERVAL '8 days'
              )
            ON CONFLICT (id) DO NOTHING;
          `);
          ctx.log('  ✓ Created 2 admin_data overtime records (pending, approved)');
        }
      }
    } else {
      ctx.log('  ⚠ Activity types not found, skipping overtime seeding');
    }
  } else {
    ctx.log('  ⚠ Required users or locations not found, skipping overtime seeding');
  }
}
