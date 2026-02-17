import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Activity Seeder Script
 *
 * Seeds comprehensive activity test data for mobile app UX testing.
 * Creates 50 activities distributed across:
 * - Satgas (30 activities, 60%): 12 recent + 18 extended
 * - Linmas (13 activities, 26%): 5 recent + 8 extended
 * - Korlap (7 activities, 14%): 3 recent + 4 extended
 *
 * Date range: Last 60 days (enables date filter testing over 8 weeks)
 * GPS coordinates: Varied within 100m of area center
 * Photo count: Realistic variance (~70% single, ~24% dual, ~6% triple)
 *
 * Usage: npm run seed:activities
 */

// Real UUID v4 IDs for activities (reproducible across seeds)
const ACT_SAT_1_ID = '11111111-aaaa-1111-aaaa-111111111111';
const ACT_SAT_2_ID = '22222222-aaaa-2222-aaaa-222222222222';
const ACT_SAT_3_ID = '33333333-aaaa-3333-aaaa-333333333333';
const ACT_SAT_4_ID = '44444444-aaaa-4444-aaaa-444444444444';
const ACT_SAT_5_ID = '55555555-aaaa-5555-aaaa-555555555555';
const ACT_SAT_6_ID = '66666666-aaaa-6666-aaaa-666666666666';
const ACT_SAT_7_ID = '77777777-aaaa-7777-aaaa-777777777777';
const ACT_SAT_8_ID = '88888888-aaaa-8888-aaaa-888888888888';
const ACT_SAT_9_ID = '99999999-aaaa-9999-aaaa-999999999999';
const ACT_SAT_10_ID = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const ACT_SAT_11_ID = 'bbbbbbbb-aaaa-bbbb-aaaa-bbbbbbbbbbbb';
const ACT_SAT_12_ID = 'cccccccc-aaaa-cccc-aaaa-cccccccccccc';

const ACT_LIN_1_ID = '11111111-bbbb-1111-bbbb-111111111111';
const ACT_LIN_2_ID = '22222222-bbbb-2222-bbbb-222222222222';
const ACT_LIN_3_ID = '33333333-bbbb-3333-bbbb-333333333333';
const ACT_LIN_4_ID = '44444444-bbbb-4444-bbbb-444444444444';
const ACT_LIN_5_ID = '55555555-bbbb-5555-bbbb-555555555555';

const ACT_KOR_1_ID = '11111111-cccc-1111-cccc-111111111111';
const ACT_KOR_2_ID = '22222222-cccc-2222-cccc-222222222222';
const ACT_KOR_3_ID = '33333333-cccc-3333-cccc-333333333333';

// Extended activity UUIDs (for scroll test coverage - 30 more)
const ACT_X1_ID  = 'a1000000-dddd-a100-dddd-a10000000001';
const ACT_X2_ID  = 'a2000000-dddd-a200-dddd-a20000000002';
const ACT_X3_ID  = 'a3000000-dddd-a300-dddd-a30000000003';
const ACT_X4_ID  = 'a4000000-dddd-a400-dddd-a40000000004';
const ACT_X5_ID  = 'a5000000-dddd-a500-dddd-a50000000005';
const ACT_X6_ID  = 'a6000000-dddd-a600-dddd-a60000000006';
const ACT_X7_ID  = 'a7000000-dddd-a700-dddd-a70000000007';
const ACT_X8_ID  = 'a8000000-dddd-a800-dddd-a80000000008';
const ACT_X9_ID  = 'a9000000-dddd-a900-dddd-a90000000009';
const ACT_X10_ID = 'aa000000-dddd-aa00-dddd-aa0000000010';
const ACT_X11_ID = 'ab000000-dddd-ab00-dddd-ab0000000011';
const ACT_X12_ID = 'ac000000-dddd-ac00-dddd-ac0000000012';
const ACT_X13_ID = 'ad000000-dddd-ad00-dddd-ad0000000013';
const ACT_X14_ID = 'ae000000-dddd-ae00-dddd-ae0000000014';
const ACT_X15_ID = 'af000000-dddd-af00-dddd-af0000000015';
const ACT_X16_ID = 'b0000000-dddd-b000-dddd-b00000000016';
const ACT_X17_ID = 'b1000000-dddd-b100-dddd-b10000000017';
const ACT_X18_ID = 'b2000000-dddd-b200-dddd-b20000000018';
const ACT_X19_ID = 'b3000000-dddd-b300-dddd-b30000000019';
const ACT_X20_ID = 'b4000000-dddd-b400-dddd-b40000000020';
const ACT_X21_ID = 'b5000000-dddd-b500-dddd-b50000000021';
const ACT_X22_ID = 'b6000000-dddd-b600-dddd-b60000000022';
const ACT_X23_ID = 'b7000000-dddd-b700-dddd-b70000000023';
const ACT_X24_ID = 'b8000000-dddd-b800-dddd-b80000000024';
const ACT_X25_ID = 'b9000000-dddd-b900-dddd-b90000000025';
const ACT_X26_ID = 'ba000000-dddd-ba00-dddd-ba0000000026';
const ACT_X27_ID = 'bb000000-dddd-bb00-dddd-bb0000000027';
const ACT_X28_ID = 'bc000000-dddd-bc00-dddd-bc0000000028';
const ACT_X29_ID = 'bd000000-dddd-bd00-dddd-bd0000000029';
const ACT_X30_ID = 'be000000-dddd-be00-dddd-be0000000030';

async function seedActivities() {
  console.log('📸 Activity Seeding Started...');
  console.log('');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // ==========================================
    // Fetch Required References
    // ==========================================
    console.log('🔍 Fetching references...');

    // Get users
    const satgas1 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'satgas1' LIMIT 1`,
    );
    const satgas2 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'satgas2' LIMIT 1`,
    );
    const linmas1 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'linmas1' LIMIT 1`,
    );
    const linmas2 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'linmas2' LIMIT 1`,
    );
    const korlap = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'korlap' LIMIT 1`,
    );

    if (satgas1.length === 0 || linmas1.length === 0 || korlap.length === 0) {
      throw new Error('Required users not found. Please run main seeder first.');
    }

    const satgas1Id = satgas1[0].id;
    const satgas2Id = satgas2.length > 0 ? satgas2[0].id : satgas1Id;
    const linmas1Id = linmas1[0].id;
    const linmas2Id = linmas2.length > 0 ? linmas2[0].id : linmas1Id;
    const korlapId = korlap[0].id;

    // Get shifts (use existing shifts or create references)
    const shift1 = await queryRunner.query(`SELECT id FROM shifts LIMIT 1`);
    if (shift1.length === 0) {
      throw new Error('No shifts found. Please run Phase 2 seeder first.');
    }
    const shiftId = shift1[0].id;

    // Get area (Taman Bungkul)
    const area = await queryRunner.query(
      `SELECT id FROM areas WHERE name ILIKE '%bungkul%' LIMIT 1`,
    );
    if (area.length === 0) {
      throw new Error('Taman Bungkul area not found. Please run main seeder first.');
    }
    const areaId = area[0].id;

    // Get activity types
    const getActivityType = async (namePattern: string) => {
      const result = await queryRunner.query(
        `SELECT id FROM activity_types WHERE name ILIKE '%${namePattern}%' LIMIT 1`,
      );
      return result.length > 0 ? result[0].id : null;
    };

    const perawatanTypeId = await getActivityType('perawatan');
    const penanamanTypeId = await getActivityType('penanaman');
    const penyiramanTypeId = await getActivityType('penyiraman');
    const potongRumputTypeId = await getActivityType('potong rumput');
    const angkutSampahTypeId = await getActivityType('angkut sampah');
    const lainnySatgasTypeId = await getActivityType('lainnya');
    const patroliTypeId = await getActivityType('patroli');
    const insidenTypeId = await getActivityType('insiden');
    const periksaFasilitasTypeId = await getActivityType('periksa fasilitas');
    const halauPklTypeId = await getActivityType('halau pkl');
    const cekKendaraanTypeId = await getActivityType('cek kendaraan');
    const patroliKorlapTypeId = await getActivityType('patroli');
    const cekAlatTypeId = await getActivityType('cek alat');

    console.log('  ✓ Found required references');

    // ==========================================
    // Date Calculations (4 weeks back)
    // ==========================================
    const now = new Date();
    const getDateFromDaysAgo = (days: number) => {
      const date = new Date(now);
      date.setDate(date.getDate() - days);
      return date.toISOString();
    };

    // Taman Bungkul GPS center: -7.2905, 112.7395
    const getGPSVariant = (offset: number) => {
      const baseLat = -7.2905;
      const baseLng = 112.7395;
      const variance = 0.0005; // ±50m approx
      return {
        lat: (baseLat + (offset * variance)).toFixed(6),
        lng: (baseLng + (offset * variance)).toFixed(6),
      };
    };

    // ==========================================
    // Clear Existing Activities
    // ==========================================
    console.log('🗑️  Clearing existing activities...');
    await queryRunner.query(`DELETE FROM activities`);
    console.log('  ✓ Cleared activities table');

    // ==========================================
    // Seed Satgas Activities (12 total)
    // ==========================================
    console.log('');
    console.log('👷 Seeding Satgas Activities...');

    const satgasActivities = [
      // Week 1 (28-22 days ago) - 3 activities
      {
        id: ACT_SAT_1_ID,
        userId: satgas1Id,
        typeId: perawatanTypeId,
        description: 'Perawatan area playground - pembersihan dan pengecatan pagar',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat1-perawatan.jpg'],
        gps: getGPSVariant(1),
        daysAgo: 27,
      },
      {
        id: ACT_SAT_2_ID,
        userId: satgas1Id,
        typeId: penanamanTypeId,
        description: 'Penanaman 20 pohon bunga musiman di area taman utama',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/sat2-penanaman-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/sat2-penanaman-2.jpg',
        ],
        gps: getGPSVariant(2),
        daysAgo: 25,
      },
      {
        id: ACT_SAT_3_ID,
        userId: satgas2Id,
        typeId: penyiramanTypeId,
        description: 'Penyiraman tanaman pagi hari - seluruh area taman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat3-penyiraman.jpg'],
        gps: getGPSVariant(-1),
        daysAgo: 23,
      },
      // Week 2 (21-15 days ago) - 4 activities
      {
        id: ACT_SAT_4_ID,
        userId: satgas2Id,
        typeId: potongRumputTypeId,
        description: 'Potong rumput area jogging track dan lapangan',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat4-potong-rumput.jpg'],
        gps: getGPSVariant(3),
        daysAgo: 20,
      },
      {
        id: ACT_SAT_5_ID,
        userId: satgas1Id,
        typeId: angkutSampahTypeId,
        description: 'Pengangkutan sampah dari 5 tempat sampah area taman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat5-angkut-sampah.jpg'],
        gps: getGPSVariant(-2),
        daysAgo: 18,
      },
      {
        id: ACT_SAT_6_ID,
        userId: satgas2Id,
        typeId: perawatanTypeId,
        description: 'Perawatan bangku taman - perbaikan dan pengecatan ulang',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/sat6-bangku-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/sat6-bangku-2.jpg',
        ],
        gps: getGPSVariant(4),
        daysAgo: 17,
      },
      {
        id: ACT_SAT_7_ID,
        userId: satgas1Id,
        typeId: penyiramanTypeId,
        description: 'Penyiraman tanaman sore hari - fokus pada tanaman baru',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat7-penyiraman-sore.jpg'],
        gps: getGPSVariant(-3),
        daysAgo: 15,
      },
      // Week 3 (14-8 days ago) - 3 activities
      {
        id: ACT_SAT_8_ID,
        userId: satgas2Id,
        typeId: penanamanTypeId,
        description: 'Penanaman 15 tanaman hias di area gazebo',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat8-penanaman.jpg'],
        gps: getGPSVariant(5),
        daysAgo: 13,
      },
      {
        id: ACT_SAT_9_ID,
        userId: satgas1Id,
        typeId: potongRumputTypeId,
        description: 'Potong rumput area parkir dan sekitar pagar',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat9-potong-rumput.jpg'],
        gps: getGPSVariant(-4),
        daysAgo: 10,
      },
      {
        id: ACT_SAT_10_ID,
        userId: satgas2Id,
        typeId: angkutSampahTypeId,
        description: 'Pengangkutan sampah event weekend - volume besar',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/sat10-sampah-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/sat10-sampah-2.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/sat10-sampah-3.jpg',
        ],
        gps: getGPSVariant(6),
        daysAgo: 9,
      },
      // Week 4 (7-1 days ago) - 2 activities
      {
        id: ACT_SAT_11_ID,
        userId: satgas1Id,
        typeId: perawatanTypeId,
        description: 'Perawatan lampu taman - penggantian 3 lampu mati',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat11-lampu.jpg'],
        gps: getGPSVariant(-5),
        daysAgo: 5,
      },
      {
        id: ACT_SAT_12_ID,
        userId: satgas2Id,
        typeId: lainnySatgasTypeId,
        description: 'Pembersihan kolam ikan dan perawatan area sekitarnya',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/sat12-kolam.jpg'],
        gps: getGPSVariant(7),
        daysAgo: 2,
      },
    ];

    for (const activity of satgasActivities) {
      if (!activity.typeId) continue; // Skip if activity type not found

      await queryRunner.query(
        `
        INSERT INTO activities (
          id, user_id, shift_id, area_id, activity_type_id,
          description, photo_urls, gps_lat, gps_lng, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id) DO NOTHING;
      `,
        [
          activity.id,
          activity.userId,
          shiftId,
          areaId,
          activity.typeId,
          activity.description,
          activity.photos,
          parseFloat(activity.gps.lat),
          parseFloat(activity.gps.lng),
          getDateFromDaysAgo(activity.daysAgo),
        ],
      );
    }

    console.log('  ✓ Created 12 satgas activities');

    // ==========================================
    // Seed Linmas Activities (5 total)
    // ==========================================
    console.log('');
    console.log('🛡️  Seeding Linmas Activities...');

    const linmasActivities = [
      {
        id: ACT_LIN_1_ID,
        userId: linmas1Id,
        typeId: patroliTypeId,
        description: 'Patroli keamanan malam - area jogging track dan playground',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/lin1-patroli.jpg'],
        gps: getGPSVariant(8),
        daysAgo: 26,
      },
      {
        id: ACT_LIN_2_ID,
        userId: linmas2Id,
        typeId: insidenTypeId,
        description: 'Laporan insiden: PKL masuk area taman - sudah ditangani',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/lin2-insiden-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/lin2-insiden-2.jpg',
        ],
        gps: getGPSVariant(-6),
        daysAgo: 19,
      },
      {
        id: ACT_LIN_3_ID,
        userId: linmas1Id,
        typeId: periksaFasilitasTypeId,
        description: 'Pengecekan fasilitas: lampu, bangku, pagar - semua kondisi baik',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/lin3-periksa-fasilitas.jpg'],
        gps: getGPSVariant(9),
        daysAgo: 14,
      },
      {
        id: ACT_LIN_4_ID,
        userId: linmas2Id,
        typeId: halauPklTypeId,
        description: 'Menghalau PKL di area parkir taman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/lin4-halau-pkl.jpg'],
        gps: getGPSVariant(-7),
        daysAgo: 8,
      },
      {
        id: ACT_LIN_5_ID,
        userId: linmas1Id,
        typeId: patroliTypeId,
        description: 'Patroli sore hari - pengawasan event komunitas',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/lin5-patroli-event.jpg'],
        gps: getGPSVariant(10),
        daysAgo: 3,
      },
    ];

    for (const activity of linmasActivities) {
      if (!activity.typeId) continue;

      await queryRunner.query(
        `
        INSERT INTO activities (
          id, user_id, shift_id, area_id, activity_type_id,
          description, photo_urls, gps_lat, gps_lng, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id) DO NOTHING;
      `,
        [
          activity.id,
          activity.userId,
          shiftId,
          areaId,
          activity.typeId,
          activity.description,
          activity.photos,
          parseFloat(activity.gps.lat),
          parseFloat(activity.gps.lng),
          getDateFromDaysAgo(activity.daysAgo),
        ],
      );
    }

    console.log('  ✓ Created 5 linmas activities');

    // ==========================================
    // Seed Korlap Activities (3 total)
    // ==========================================
    console.log('');
    console.log('📋 Seeding Korlap Activities...');

    const korlapActivities = [
      {
        id: ACT_KOR_1_ID,
        userId: korlapId,
        typeId: cekKendaraanTypeId,
        description: 'Pengecekan kendaraan operasional - servis bulanan dan penggantian oli',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/kor1-kendaraan.jpg'],
        gps: getGPSVariant(11),
        daysAgo: 21,
      },
      {
        id: ACT_KOR_2_ID,
        userId: korlapId,
        typeId: patroliKorlapTypeId,
        description: 'Patroli koordinasi - cek progress satgas dan linmas di 3 area',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/kor2-patroli-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/kor2-patroli-2.jpg',
        ],
        gps: getGPSVariant(-8),
        daysAgo: 12,
      },
      {
        id: ACT_KOR_3_ID,
        userId: korlapId,
        typeId: cekAlatTypeId,
        description: 'Pengecekan alat dan perlengkapan kerja tim',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/kor3-alat.jpg'],
        gps: getGPSVariant(12),
        daysAgo: 6,
      },
    ];

    for (const activity of korlapActivities) {
      if (!activity.typeId) continue;

      await queryRunner.query(
        `
        INSERT INTO activities (
          id, user_id, shift_id, area_id, activity_type_id,
          description, photo_urls, gps_lat, gps_lng, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id) DO NOTHING;
      `,
        [
          activity.id,
          activity.userId,
          shiftId,
          areaId,
          activity.typeId,
          activity.description,
          activity.photos,
          parseFloat(activity.gps.lat),
          parseFloat(activity.gps.lng),
          getDateFromDaysAgo(activity.daysAgo),
        ],
      );
    }

    console.log('  ✓ Created 3 korlap activities');

    // ==========================================
    // Extended Activities (30 more for scroll testing)
    // ==========================================
    console.log('');
    console.log('📦 Seeding Extended Activities (scroll/filter testing)...');

    const extendedActivities = [
      // Extended Satgas (18 activities, days 30-60 ago)
      {
        id: ACT_X1_ID,
        userId: satgas1Id,
        typeId: perawatanTypeId,
        description: 'Perawatan pagar kawat keliling taman - perbaikan bagian rusak',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x1-pagar.jpg'],
        gps: getGPSVariant(13),
        daysAgo: 30,
      },
      {
        id: ACT_X2_ID,
        userId: satgas2Id,
        typeId: penyiramanTypeId,
        description: 'Penyiraman intensif pasca kemarau - semua bed tanaman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x2-penyiraman.jpg'],
        gps: getGPSVariant(-9),
        daysAgo: 32,
      },
      {
        id: ACT_X3_ID,
        userId: satgas1Id,
        typeId: potongRumputTypeId,
        description: 'Potong rumput rutin area bermain anak',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x3-rumput-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x3-rumput-2.jpg',
        ],
        gps: getGPSVariant(14),
        daysAgo: 34,
      },
      {
        id: ACT_X4_ID,
        userId: satgas2Id,
        typeId: angkutSampahTypeId,
        description: 'Angkut sampah daun kering musim gugur',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x4-sampah-daun.jpg'],
        gps: getGPSVariant(-10),
        daysAgo: 36,
      },
      {
        id: ACT_X5_ID,
        userId: satgas1Id,
        typeId: penanamanTypeId,
        description: 'Penanaman kembali tanaman yang mati akibat hama',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x5-tanam-ulang.jpg'],
        gps: getGPSVariant(15),
        daysAgo: 38,
      },
      {
        id: ACT_X6_ID,
        userId: satgas2Id,
        typeId: perawatanTypeId,
        description: 'Perawatan air mancur - pembersihan filter dan nozzle',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x6-air-mancur-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x6-air-mancur-2.jpg',
        ],
        gps: getGPSVariant(-11),
        daysAgo: 40,
      },
      {
        id: ACT_X7_ID,
        userId: satgas1Id,
        typeId: penyiramanTypeId,
        description: 'Penyiraman tanaman baru di area perluasan taman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x7-siram-baru.jpg'],
        gps: getGPSVariant(16),
        daysAgo: 42,
      },
      {
        id: ACT_X8_ID,
        userId: satgas2Id,
        typeId: potongRumputTypeId,
        description: 'Potong rumput area VIP dan gazebo utama',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x8-potong-vip.jpg'],
        gps: getGPSVariant(-12),
        daysAgo: 44,
      },
      {
        id: ACT_X9_ID,
        userId: satgas1Id,
        typeId: angkutSampahTypeId,
        description: 'Angkut dan sortir sampah pilah organik/anorganik',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x9-pilah-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x9-pilah-2.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x9-pilah-3.jpg',
        ],
        gps: getGPSVariant(17),
        daysAgo: 46,
      },
      {
        id: ACT_X10_ID,
        userId: satgas2Id,
        typeId: perawatanTypeId,
        description: 'Perawatan area kolam refleksi - pembersihan lumut',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x10-kolam.jpg'],
        gps: getGPSVariant(-13),
        daysAgo: 48,
      },
      {
        id: ACT_X11_ID,
        userId: satgas1Id,
        typeId: penanamanTypeId,
        description: 'Penanaman pohon trembesi di area parkir utara',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x11-trembesi.jpg'],
        gps: getGPSVariant(18),
        daysAgo: 50,
      },
      {
        id: ACT_X12_ID,
        userId: satgas2Id,
        typeId: lainnySatgasTypeId,
        description: 'Pemasangan papan informasi taman baru',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x12-papan-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x12-papan-2.jpg',
        ],
        gps: getGPSVariant(-14),
        daysAgo: 52,
      },
      {
        id: ACT_X13_ID,
        userId: satgas1Id,
        typeId: perawatanTypeId,
        description: 'Pengecatan ulang batas jalur jogging track',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x13-cat-track.jpg'],
        gps: getGPSVariant(19),
        daysAgo: 54,
      },
      {
        id: ACT_X14_ID,
        userId: satgas2Id,
        typeId: penyiramanTypeId,
        description: 'Penyiraman khusus tanaman hias langka koleksi taman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x14-langka.jpg'],
        gps: getGPSVariant(-15),
        daysAgo: 56,
      },
      {
        id: ACT_X15_ID,
        userId: satgas1Id,
        typeId: potongRumputTypeId,
        description: 'Potong rumput menjelang libur nasional',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x15-libur-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x15-libur-2.jpg',
        ],
        gps: getGPSVariant(20),
        daysAgo: 57,
      },
      {
        id: ACT_X16_ID,
        userId: satgas2Id,
        typeId: angkutSampahTypeId,
        description: 'Pembersihan besar pasca event tahunan taman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x16-pasca-event.jpg'],
        gps: getGPSVariant(-16),
        daysAgo: 58,
      },
      {
        id: ACT_X17_ID,
        userId: satgas1Id,
        typeId: perawatanTypeId,
        description: 'Perbaikan sistem drainase area barat taman',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x17-drainase.jpg'],
        gps: getGPSVariant(21),
        daysAgo: 59,
      },
      {
        id: ACT_X18_ID,
        userId: satgas2Id,
        typeId: penanamanTypeId,
        description: 'Penanaman 50 bibit bambu kuning di area pembatas',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x18-bambu-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x18-bambu-2.jpg',
        ],
        gps: getGPSVariant(-17),
        daysAgo: 60,
      },
      // Extended Linmas (8 activities, days 31-59 ago)
      {
        id: ACT_X19_ID,
        userId: linmas1Id,
        typeId: patroliTypeId,
        description: 'Patroli dini hari - cek kondisi taman sebelum buka',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x19-patroli-pagi.jpg'],
        gps: getGPSVariant(22),
        daysAgo: 31,
      },
      {
        id: ACT_X20_ID,
        userId: linmas2Id,
        typeId: periksaFasilitasTypeId,
        description: 'Inspeksi fasilitas pasca hujan deras - cek kerusakan',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x20-inspeksi-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x20-inspeksi-2.jpg',
        ],
        gps: getGPSVariant(-18),
        daysAgo: 35,
      },
      {
        id: ACT_X21_ID,
        userId: linmas1Id,
        typeId: halauPklTypeId,
        description: 'Penertiban PKL gerobak di pintu masuk utara',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x21-pkl.jpg'],
        gps: getGPSVariant(23),
        daysAgo: 39,
      },
      {
        id: ACT_X22_ID,
        userId: linmas2Id,
        typeId: insidenTypeId,
        description: 'Laporan vandalisme: coret-coretan di dinding gazebo',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x22-vandal-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x22-vandal-2.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x22-vandal-3.jpg',
        ],
        gps: getGPSVariant(-19),
        daysAgo: 43,
      },
      {
        id: ACT_X23_ID,
        userId: linmas1Id,
        typeId: patroliTypeId,
        description: 'Patroli malam - pengawasan area parkir dan pintu belakang',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x23-malam.jpg'],
        gps: getGPSVariant(24),
        daysAgo: 47,
      },
      {
        id: ACT_X24_ID,
        userId: linmas2Id,
        typeId: periksaFasilitasTypeId,
        description: 'Cek kondisi CCTV dan lampu keamanan',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x24-cctv.jpg'],
        gps: getGPSVariant(-20),
        daysAgo: 51,
      },
      {
        id: ACT_X25_ID,
        userId: linmas1Id,
        typeId: halauPklTypeId,
        description: 'Penertiban PKL motor modifikasi yang mengganggu pengunjung',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x25-motor-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x25-motor-2.jpg',
        ],
        gps: getGPSVariant(25),
        daysAgo: 55,
      },
      {
        id: ACT_X26_ID,
        userId: linmas2Id,
        typeId: patroliTypeId,
        description: 'Patroli koordinasi dengan satpol PP - penertiban terpadu',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x26-satpol.jpg'],
        gps: getGPSVariant(-21),
        daysAgo: 59,
      },
      // Extended Korlap (4 activities, days 33-57 ago)
      {
        id: ACT_X27_ID,
        userId: korlapId,
        typeId: cekKendaraanTypeId,
        description: 'Pengecekan kendaraan - penggantian ban dan rem',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x27-ban-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x27-ban-2.jpg',
        ],
        gps: getGPSVariant(26),
        daysAgo: 33,
      },
      {
        id: ACT_X28_ID,
        userId: korlapId,
        typeId: cekAlatTypeId,
        description: 'Inventarisasi alat kerja - cek mesin potong dan blower',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x28-inventaris.jpg'],
        gps: getGPSVariant(-22),
        daysAgo: 41,
      },
      {
        id: ACT_X29_ID,
        userId: korlapId,
        typeId: patroliKorlapTypeId,
        description: 'Supervisi lapangan - evaluasi kinerja satgas bulan ini',
        photos: [
          'https://sekar-media-dev.s3.amazonaws.com/activities/x29-supervisi-1.jpg',
          'https://sekar-media-dev.s3.amazonaws.com/activities/x29-supervisi-2.jpg',
        ],
        gps: getGPSVariant(27),
        daysAgo: 49,
      },
      {
        id: ACT_X30_ID,
        userId: korlapId,
        typeId: cekKendaraanTypeId,
        description: 'Servis besar kendaraan dinas - ganti oli dan filter',
        photos: ['https://sekar-media-dev.s3.amazonaws.com/activities/x30-servis.jpg'],
        gps: getGPSVariant(-23),
        daysAgo: 57,
      },
    ];

    for (const activity of extendedActivities) {
      if (!activity.typeId) continue;

      await queryRunner.query(
        `
        INSERT INTO activities (
          id, user_id, shift_id, area_id, activity_type_id,
          description, photo_urls, gps_lat, gps_lng, created_at
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10
        )
        ON CONFLICT (id) DO NOTHING;
      `,
        [
          activity.id,
          activity.userId,
          shiftId,
          areaId,
          activity.typeId,
          activity.description,
          activity.photos,
          parseFloat(activity.gps.lat),
          parseFloat(activity.gps.lng),
          getDateFromDaysAgo(activity.daysAgo),
        ],
      );
    }

    console.log('  ✓ Created 30 extended activities (scroll/filter test coverage)');

    // ==========================================
    // Summary
    // ==========================================
    console.log('');
    console.log('✅ Activity seeding completed successfully!');
    console.log('');
    console.log('📊 Summary:');
    console.log('   - 12 satgas activities (recent, last 28 days)');
    console.log('   - 5 linmas activities (recent, last 28 days)');
    console.log('   - 3 korlap activities (recent, last 28 days)');
    console.log('   - 18 satgas extended (30-60 days ago)');
    console.log('   - 8 linmas extended (30-60 days ago)');
    console.log('   - 4 korlap extended (30-60 days ago)');
    console.log('   Total: 50 activities');
    console.log('');
    console.log('📅 Date Distribution (for filter testing):');
    console.log('   - Week 1-4 (1-28 days ago): 20 activities');
    console.log('   - Week 5-8 (29-60 days ago): 30 activities');
    console.log('');
    console.log('📸 Photo Distribution:');
    console.log('   - ~35 activities with 1 photo (70%)');
    console.log('   - ~12 activities with 2 photos (24%)');
    console.log('   - ~3 activities with 3 photos (6%)');
  } catch (error) {
    console.error('❌ Error seeding activities:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// Run the seeder
seedActivities()
  .then(() => {
    console.log('✨ Activity seeding script finished');
    process.exit(0);
  })
  .catch((error) => {
    console.error('💥 Activity seeding script failed:', error);
    process.exit(1);
  });
