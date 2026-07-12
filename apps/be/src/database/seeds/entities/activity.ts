import type { SeedContext } from '../lib/context';
import { ACT_SAT_2_ID, ACT_LIN_1_ID } from '../lib/ids';

/**
 * Seed activities (Section C).
 *
 * ~50 activities across satgas (12+30+10), linmas (5), korlap (3).
 * Covers varied activity types, GPS locations, timestamps spanning 2+ months.
 */
export async function seedActivities(ctx: SeedContext): Promise<void> {
  ctx.log('');
  ctx.log('📸 ======== SECTION C: Activities ========');
  ctx.log('🗑️  Clearing existing activities...');
  await ctx.qr.query(`DELETE FROM activities`);
  ctx.log('  ✓ Cleared activities table');

  // Fetch user + shift + area refs for activities
  const actSatgas1 = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'satgas_pusat_1' LIMIT 1`,
  );
  const actSatgas2 = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'satgas_timur_1_2' LIMIT 1`,
  );
  const actLinmas1 = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'linmas_pusat_1' LIMIT 1`,
  );
  const actLinmas2 = await ctx.qr.query(
    `SELECT id FROM users WHERE username = 'linmas_pusat_2' LIMIT 1`,
  );
  const actKorlap = await ctx.qr.query(`SELECT id FROM users WHERE role = 'korlap' LIMIT 1`);
  const actShift = await ctx.qr.query(`SELECT id FROM shifts LIMIT 1`);
  const actArea = await ctx.qr.query(`SELECT id FROM areas WHERE name ILIKE '%bungkul%' LIMIT 1`);

  if (
    actSatgas1.length === 0 ||
    actLinmas1.length === 0 ||
    actKorlap.length === 0 ||
    actShift.length === 0 ||
    actArea.length === 0
  ) {
    ctx.log('  ⚠ Required refs not found, skipping activities');
  } else {
    const aS1 = actSatgas1[0].id;
    const aS2 = actSatgas2.length > 0 ? actSatgas2[0].id : aS1;
    const aL1 = actLinmas1[0].id;
    const aL2 = actLinmas2.length > 0 ? actLinmas2[0].id : aL1;
    const aK = actKorlap[0].id;
    const aSh = actShift[0].id;
    const aAr = actArea[0].id;

    // Helper function to get GPS variants around Taman Bungkul center
    const lat = (o: number) => (-7.2905 + o * 0.0005).toFixed(6);
    const lng = (o: number) => (112.7395 + o * 0.0005).toFixed(6);
    const dAgo = (d: number) => `NOW() - INTERVAL '${d} days'`;

    // Get activity type IDs by code
    const atypes = await ctx.qr.query(`SELECT id, code FROM activity_types`);
    const at = (code: string) => atypes.find((a: any) => a.code === code)?.id ?? null;

    const perawatanId = at('perawatan');
    const penanamanId = at('penanaman');
    const penyiramanId = at('penyiraman');
    const potongRumputId = at('potong_rumput');
    const angkutSampahId = at('angkut_sampah');
    const lainnySatgasId = at('lainnya_satgas');
    const patroliId = at('patroli');
    const insidenId = at('insiden');
    const periksaFasId = at('periksa_fasilitas');
    const halauPklId = at('halau_pkl');
    const lainnasLinmasId = at('lainnya_linmas');
    const cekKendaraanId = at('cek_kendaraan');
    const patroliKorlapId = at('patroli_korlap');
    const cekAlatId = at('cek_alat');

    if (perawatanId && patroliId && cekKendaraanId) {
      // Local activity ID consts (ACT_SAT_2_ID and ACT_LIN_1_ID are imported from lib/ids)
      const ACT_SAT_1_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
      const ACT_SAT_3_ID = 'c3d4e5f6-a7b8-4c9d-ae1f-a2b3c4d5e6f7';
      const ACT_SAT_4_ID = 'd4e5f6a7-b8c9-4d0e-bf2a-b3c4d5e6f7a8';
      const ACT_SAT_5_ID = 'e5f6a7b8-c9d0-4e1f-9a3b-c4d5e6f7a8b9';
      const ACT_SAT_6_ID = 'f6a7b8c9-d0e1-4f2a-8b4c-d5e6f7a8b9c0';
      const ACT_SAT_7_ID = 'a7b8c9d0-e1f2-4a3b-ac5d-e6f7a8b9c0d1';
      const ACT_SAT_8_ID = 'b8c9d0e1-f2a3-4b4c-bd6e-f7a8b9c0d1e2';
      const ACT_SAT_9_ID = 'c9d0e1f2-a3b4-4c5d-9e7f-a8b9c0d1e2f3';
      const ACT_SAT_10_ID = 'd0e1f2a3-b4c5-4d6e-af8a-b9c0d1e2f3a4';
      const ACT_SAT_11_ID = 'e1f2a3b4-c5d6-4e7f-b09b-c0d1e2f3a4b5';
      const ACT_SAT_12_ID = 'f2a3b4c5-d6e7-4f8a-9b0c-d1e2f3a4b5c6';

      const ACT_LIN_2_ID = 'b4c5d6e7-f8a9-4b0c-9d2e-f3a4b5c6d7e8';
      const ACT_LIN_3_ID = 'c5d6e7f8-a9b0-4c1d-ae3f-a4b5c6d7e8f9';
      const ACT_LIN_4_ID = 'd6e7f8a9-b0c1-4d2e-bf4a-b5c6d7e8f9a0';
      const ACT_LIN_5_ID = 'e7f8a9b0-c1d2-4e3f-9a5b-c6d7e8f9a0b1';

      const ACT_KOR_1_ID = 'f8a9b0c1-d2e3-4f4a-8b6c-d7e8f9a0b1c2';
      const ACT_KOR_2_ID = 'a9b0c1d2-e3f4-4a5b-9c7d-e8f9a0b1c2d3';
      const ACT_KOR_3_ID = 'b0c1d2e3-f4a5-4b6c-ae8d-f9a0b1c2d3e4';

      // 12 Satgas activities spanning 4 weeks
      await ctx.qr.query(`
        INSERT INTO activities (id, user_id, shift_id, location_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at) VALUES
          ('${ACT_SAT_1_ID}',  '${aS1}', '${aSh}', '${aAr}', '${perawatanId}',    'Perawatan area playground - pembersihan dan pengecatan pagar.',    ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat1-perawatan.jpg'],                                                                         ${lat(1)},  ${lng(1)},  ${dAgo(27)}),
          ('${ACT_SAT_2_ID}',  '${aS1}', '${aSh}', '${aAr}', '${penanamanId}',    'Penanaman 20 pohon bunga musiman di area taman utama.',            ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat2-penanaman-1.jpg','https://sekar-media-dev.s3.amazonaws.com/activities/sat2-penanaman-2.jpg'], ${lat(2)},  ${lng(2)},  ${dAgo(25)}),
          ('${ACT_SAT_3_ID}',  '${aS2}', '${aSh}', '${aAr}', '${penyiramanId}',   'Penyiraman tanaman pagi hari - seluruh area taman.',               ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat3-penyiraman.jpg'],                                                                           ${lat(-1)}, ${lng(-1)}, ${dAgo(23)}),
          ('${ACT_SAT_4_ID}',  '${aS2}', '${aSh}', '${aAr}', '${potongRumputId}', 'Potong rumput area jogging track dan lapangan.',                   ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat4-potong-rumput.jpg'],                                                                         ${lat(3)},  ${lng(3)},  ${dAgo(20)}),
          ('${ACT_SAT_5_ID}',  '${aS1}', '${aSh}', '${aAr}', '${angkutSampahId}', 'Pengangkutan sampah dari 5 tempat sampah area taman.',             ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat5-angkut-sampah.jpg'],                                                                         ${lat(-2)}, ${lng(-2)}, ${dAgo(18)}),
          ('${ACT_SAT_6_ID}',  '${aS2}', '${aSh}', '${aAr}', '${perawatanId}',    'Perawatan bangku taman - perbaikan dan pengecatan ulang.',         ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat6-bangku-1.jpg','https://sekar-media-dev.s3.amazonaws.com/activities/sat6-bangku-2.jpg'],     ${lat(4)},  ${lng(4)},  ${dAgo(17)}),
          ('${ACT_SAT_7_ID}',  '${aS1}', '${aSh}', '${aAr}', '${penyiramanId}',   'Penyiraman tanaman sore hari - fokus pada tanaman baru.',          ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat7-penyiraman-sore.jpg'],                                                                       ${lat(-3)}, ${lng(-3)}, ${dAgo(15)}),
          ('${ACT_SAT_8_ID}',  '${aS2}', '${aSh}', '${aAr}', '${penanamanId}',    'Penanaman 15 tanaman hias di area gazebo.',                        ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat8-penanaman.jpg'],                                                                             ${lat(5)},  ${lng(5)},  ${dAgo(13)}),
          ('${ACT_SAT_9_ID}',  '${aS1}', '${aSh}', '${aAr}', '${potongRumputId}', 'Potong rumput area parkir dan sekitar pagar.',                     ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat9-potong-rumput.jpg'],                                                                         ${lat(-4)}, ${lng(-4)}, ${dAgo(10)}),
          ('${ACT_SAT_10_ID}', '${aS2}', '${aSh}', '${aAr}', '${angkutSampahId}', 'Pengangkutan sampah event weekend - volume besar.',                ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat10-sampah-1.jpg','https://sekar-media-dev.s3.amazonaws.com/activities/sat10-sampah-2.jpg','https://sekar-media-dev.s3.amazonaws.com/activities/sat10-sampah-3.jpg'], ${lat(6)}, ${lng(6)}, ${dAgo(9)}),
          ('${ACT_SAT_11_ID}', '${aS1}', '${aSh}', '${aAr}', '${perawatanId}',    'Perawatan lampu taman - penggantian 3 lampu mati.',                ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat11-lampu.jpg'],                                                                               ${lat(-5)}, ${lng(-5)}, ${dAgo(5)}),
          ('${ACT_SAT_12_ID}', '${aS2}', '${aSh}', '${aAr}', '${lainnySatgasId}', 'Pembersihan kolam ikan dan perawatan area sekitarnya.',            ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/sat12-kolam.jpg'],                                                                               ${lat(7)},  ${lng(7)},  ${dAgo(2)})
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 12 satgas activities');

      // 5 Linmas activities
      await ctx.qr.query(`
        INSERT INTO activities (id, user_id, shift_id, location_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at) VALUES
          ('${ACT_LIN_1_ID}', '${aL1}', '${aSh}', '${aAr}', '${patroliId}',       'Patroli keamanan malam - area jogging track dan playground.',       ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin1-patroli.jpg'],         ${lat(8)},  ${lng(8)},  ${dAgo(26)}),
          ('${ACT_LIN_2_ID}', '${aL2}', '${aSh}', '${aAr}', '${insidenId}',       'Laporan insiden: PKL masuk area taman - sudah ditangani.',          ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin2-insiden-1.jpg','https://sekar-media-dev.s3.amazonaws.com/activities/lin2-insiden-2.jpg'], ${lat(-6)}, ${lng(-6)}, ${dAgo(19)}),
          ('${ACT_LIN_3_ID}', '${aL1}', '${aSh}', '${aAr}', '${periksaFasId}',    'Pengecekan fasilitas: lampu, bangku, pagar - kondisi baik.',        ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin3-periksa-fasilitas.jpg'], ${lat(9)}, ${lng(9)}, ${dAgo(14)}),
          ('${ACT_LIN_4_ID}', '${aL2}', '${aSh}', '${aAr}', '${halauPklId}',      'Menghalau PKL di area parkir taman.',                              ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin4-halau-pkl.jpg'],        ${lat(-7)}, ${lng(-7)}, ${dAgo(7)}),
          ('${ACT_LIN_5_ID}', '${aL1}', '${aSh}', '${aAr}', '${lainnasLinmasId}', 'Koordinasi dengan satpol PP terkait penertiban area taman.',        ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin5-koordinasi.jpg'],      ${lat(10)}, ${lng(10)}, ${dAgo(3)})
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 5 linmas activities');

      // 3 Korlap activities
      await ctx.qr.query(`
        INSERT INTO activities (id, user_id, shift_id, location_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at) VALUES
          ('${ACT_KOR_1_ID}', '${aK}', '${aSh}', '${aAr}', '${cekKendaraanId}',  'Pengecekan kendaraan operasional - semua dalam kondisi baik.',  ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/kor1-kendaraan.jpg'],  ${lat(-8)}, ${lng(-8)}, ${dAgo(21)}),
          ('${ACT_KOR_2_ID}', '${aK}', '${aSh}', '${aAr}', '${patroliKorlapId}', 'Patroli area kerja dan koordinasi dengan satgas.',               ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/kor2-patroli.jpg'],    ${lat(11)}, ${lng(11)}, ${dAgo(11)}),
          ('${ACT_KOR_3_ID}', '${aK}', '${aSh}', '${aAr}', '${cekAlatId}',       'Pengecekan alat kerja - menemukan 2 cangkul yang perlu diganti.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/kor3-alat.jpg'],     ${lat(-9)}, ${lng(-9)}, ${dAgo(4)})
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 3 korlap activities');

      // 30 extended activities for scroll testing (IDs via gen_random_uuid — Section C DELETE clears first)
      await ctx.qr.query(`
        INSERT INTO activities (id, user_id, shift_id, location_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at)
        SELECT
          gen_random_uuid(),
          CASE gs.n % 3
            WHEN 0 THEN '${aS1}'
            WHEN 1 THEN '${aS2}'
            ELSE '${aL1}'
          END::UUID,
          '${aSh}',
          '${aAr}',
          '${perawatanId}',
          'Aktivitas extended ' || gs.n || ' untuk scroll test coverage.',
          ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/extended-' || gs.n || '.jpg'],
          -7.2905 + ((gs.n % 10) * 0.0003),
          112.7395 + ((gs.n % 7) * 0.0004),
          NOW() - (gs.n * INTERVAL '2 days')
        FROM generate_series(1, 30) AS gs(n)
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 30 extended activities (scroll test coverage)');

      // 10 activities for satgas_pusat_1 created TODAY — needed so the
      // "Ringkasan hari ini" tile shows a non-zero count on a fresh dev install
      // and the TodayActivitiesModal has enough rows to test sheet scrollability.
      await ctx.qr.query(`
        INSERT INTO activities (id, user_id, shift_id, location_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at)
        SELECT
          gen_random_uuid(),
          '${aS1}'::UUID,
          '${aSh}',
          '${aAr}',
          CASE gs.n % 4
            WHEN 0 THEN '${perawatanId}'
            WHEN 1 THEN '${penyiramanId}'
            WHEN 2 THEN '${potongRumputId}'
            ELSE '${penanamanId}'
          END::UUID,
          'Aktivitas hari ini #' || gs.n || ' - ' ||
            CASE gs.n % 4
              WHEN 0 THEN 'perawatan area taman pagi ini.'
              WHEN 1 THEN 'penyiraman seluruh area taman.'
              WHEN 2 THEN 'perantingan rumput zona A.'
              ELSE 'penanaman bibit baru di area timur.'
            END,
          ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/today-' || gs.n || '.jpg'],
          -7.2905 + ((gs.n % 5) * 0.0003),
          112.7395 + ((gs.n % 5) * 0.0003),
          NOW() - (gs.n * INTERVAL '30 minutes')
        FROM generate_series(1, 10) AS gs(n)
        ON CONFLICT (id) DO NOTHING;
      `);
      ctx.log('  ✓ Created 10 today-dated activities for satgas_pusat_1 (ringkasan hari ini)');
    } else {
      ctx.log('  ⚠ Activity types not found, skipping activities');
    }
  }
}
