import { DataSource } from 'typeorm';
import { config } from 'dotenv';

// Load environment variables
config();

/**
 * Phase 2 Seed Script
 *
 * Seeds the Phase 2 database tables:
 * - Rayons (7 geographic sectors)
 * - Shift Definitions (3 fixed shifts)
 * - Activity Types (20 work activities across 4 roles)
 * - Special Day Overrides (4 initial holidays)
 * - Additional Users (7 users with new roles)
 * - Area Staff Requirements (14 requirements)
 * - Worker Schedules (4 assignments)
 *
 * Also updates existing data:
 * - Area Types: Set category (ACTIVE/PASSIVE)
 * - Areas: Assign to Rayons
 *
 * Usage: npx ts-node src/database/seeds/seed-phase2.ts
 */

// Real UUID v4 IDs for consistent references
const RAYON_1_ID = '085a298f-d8e9-435c-8a3b-998ffa47a26e';
const RAYON_2_ID = '861a7e7c-8bd5-4e73-8aa7-e92988959dca';
const RAYON_3_ID = 'd564809d-316f-4a2a-a1c6-671eebb49653';
const RAYON_4_ID = '42934ad5-4ea0-4537-abb6-cf7e984e2d39';
const RAYON_5_ID = '742a135b-ddeb-45ca-8d0a-88d7d08aa78a';
const RAYON_6_ID = 'bf040137-fce4-4016-b5e7-704ad82c1594';
const RAYON_7_ID = '7422e6ee-0693-4565-9016-d4f759bdeed2';

const SHIFT_1_ID = 'ca18ac41-2577-4f67-abfa-adaae27b75c8';
const SHIFT_2_ID = '28822613-65de-47e4-a9b4-7b9bfd437f8a';
const SHIFT_3_ID = '85860407-7b2d-425a-87cc-7a94bb47e5d8';

// Satgas activity types (8)
const AT_PERAWATAN_ID = 'ddc94ad6-a625-4c27-964f-10f3a79a6794';
const AT_PENANAMAN_ID = 'a8cf5d46-1435-413b-ae03-8ea135bd5fb3';
const AT_PERANTINGAN_ID = '8a890970-5fc8-4672-ae6f-b945cb80bba5';
const AT_PENYIRAMAN_ID = '2eaed437-c662-4285-b9a7-8c7d5d0755b7';
const AT_PENYULAMAN_ID = '70c75e9a-df48-4c71-89d5-91978112103f';
const AT_POTONG_RUMPUT_ID = '715b8196-8473-4afe-9103-adb6c2ee7c50';
const AT_ANGKUT_SAMPAH_ID = 'eef48fdc-e235-4a03-9fc4-517cff92c8bb';
const AT_LAINNYA_SATGAS_ID = '4153cd86-c6bf-4f06-b536-5016a74114d5';

// Linmas activity types (5)
const AT_PATROLI_ID = 'dd7efc02-36fe-4e70-b4b5-bfa163fc3bb0';
const AT_INSIDEN_ID = '3a37e00b-7702-4296-b387-96964b45e251';
const AT_PERIKSA_FASILITAS_ID = 'b4e7c1a2-3d5f-4e8a-9b0c-1d2e3f4a5b6c';
const AT_HALAU_PKL_ID = 'c5f8d2b3-4e6a-5f9b-0c1d-2e3f4a5b6c7d';
const AT_LAINNYA_LINMAS_ID = 'd6a9e3c4-5f7b-6a0c-1d2e-3f4a5b6c7d8e';

// Korlap activity types (4)
const AT_CEK_KENDARAAN_ID = 'e7b0f4d5-6a8c-7b1d-2e3f-4a5b6c7d8e9f';
const AT_PATROLI_KORLAP_ID = 'f8c1a5e6-7b9d-8c2e-3f4a-5b6c7d8e9f0a';
const AT_CEK_ALAT_ID = 'a9d2b6f7-8c0e-9d3f-4a5b-6c7d8e9f0a1b';
const AT_LAINNYA_KORLAP_ID = 'b0e3c7a8-9d1f-0e4a-5b6c-7d8e9f0a1b2c';

// Admin Data activity types (3)
const AT_CEK_ABSENSI_ID = 'c1f4d8b9-0e2a-1f5b-6c7d-8e9f0a1b2c3d';
const AT_ENTRI_LAPORAN_ID = 'd2a5e9c0-1f3b-2a6c-7d8e-9f0a1b2c3d4e';
const AT_LAINNYA_ADMIN_DATA_ID = 'e3b6f0d1-2a4c-3b7d-8e9f-0a1b2c3d4e5f';

const SPECIAL_DAY_1_ID = 'aee11144-0a99-458f-90b2-3df456f5bdf0';
const SPECIAL_DAY_2_ID = 'd2bb4962-0d2e-46fb-b45d-c3038254f5c4';
const SPECIAL_DAY_3_ID = '72bfe1fd-6285-4853-a4a9-d75e8edc65e6';
const SPECIAL_DAY_4_ID = '8a8ff3d8-8c45-461e-b66c-8563c04cbbd5';

const USER_PHASE2_1_ID = '72a9cad5-bc9f-44a6-a982-e714080c1643';
const USER_PHASE2_2_ID = '8dd46350-3bad-4232-be54-23d144c8aefb';
const USER_PHASE2_3_ID = '1db260a1-446a-41dc-9215-e934ec5eb14f';
const USER_PHASE2_4_ID = '83ee0766-9cf1-471f-812f-d9b41a5397e3';
const USER_PHASE2_5_ID = '2598e482-be79-447f-9235-e7ed355b7a30';
const USER_PHASE2_6_ID = '6d88c343-c4e3-4388-bc68-a652c1d078a7';
const USER_PHASE2_7_ID = '52be9254-81a1-4ba6-b440-1e7ae6707365';
const USER_PHASE2_8_ID = '9da22bbf-ea00-4e7a-b2fb-f22339690eb9';
const USER_PHASE2_9_ID = 'b8c6c6a4-7270-4790-8b2f-ba5e8aec5a7a';
async function seedPhase2() {
  console.log('🌱 Phase 2 Seeding Started...');
  console.log('');

  // Create a direct connection using TypeORM
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
    // STEP 1: Seed Rayons
    // ==========================================
    console.log('📍 Seeding Rayons...');
    await queryRunner.query(`
      INSERT INTO rayons (id, name, code, description) VALUES
        ('${RAYON_1_ID}', 'Rayon Selatan', 'SELATAN', 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan'),
        ('${RAYON_2_ID}', 'Rayon Utara', 'UTARA', 'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak'),
        ('${RAYON_3_ID}', 'Rayon Pusat', 'PUSAT', 'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto'),
        ('${RAYON_4_ID}', 'Rayon Timur 1', 'TIMUR1', 'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo'),
        ('${RAYON_5_ID}', 'Rayon Timur 2', 'TIMUR2', 'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar'),
        ('${RAYON_6_ID}', 'Rayon Barat 1', 'BARAT1', 'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo'),
        ('${RAYON_7_ID}', 'Rayon Barat 2', 'BARAT2', 'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep')
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 7 Rayons');

    // ==========================================
    // STEP 2: Seed Shift Definitions
    // ==========================================
    console.log('⏰ Seeding Shift Definitions...');
    await queryRunner.query(`
      INSERT INTO shift_definitions (id, name, code, start_time, end_time, crosses_midnight, is_active) VALUES
        ('${SHIFT_1_ID}', 'Shift 1', 'SHIFT1', '06:00:00', '15:00:00', FALSE, TRUE),
        ('${SHIFT_2_ID}', 'Shift 2', 'SHIFT2', '15:00:00', '23:00:00', FALSE, TRUE),
        ('${SHIFT_3_ID}', 'Shift 3', 'SHIFT3', '21:00:00', '05:00:00', TRUE, TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 3 Shift Definitions');

    // ==========================================
    // STEP 3: Seed Activity Types (Phase 2C: 20 types across 4 roles)
    // ==========================================
    console.log('🔧 Seeding Activity Types...');

    // Satgas activities (8)
    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('${AT_PERAWATAN_ID}', 'Perawatan', 'perawatan', 'Perawatan tanaman dan area', ARRAY['satgas'], TRUE),
        ('${AT_PENANAMAN_ID}', 'Penanaman', 'penanaman', 'Penanaman tanaman baru', ARRAY['satgas'], TRUE),
        ('${AT_PERANTINGAN_ID}', 'Perantingan', 'perantingan', 'Pemangkasan ranting pohon', ARRAY['satgas'], TRUE),
        ('${AT_PENYIRAMAN_ID}', 'Penyiraman', 'penyiraman', 'Penyiraman tanaman', ARRAY['satgas'], TRUE),
        ('${AT_PENYULAMAN_ID}', 'Penyulaman', 'penyulaman', 'Penggantian tanaman mati', ARRAY['satgas'], TRUE),
        ('${AT_POTONG_RUMPUT_ID}', 'Potong Rumput', 'potong_rumput', 'Pemotongan rumput', ARRAY['satgas'], TRUE),
        ('${AT_ANGKUT_SAMPAH_ID}', 'Angkut Sampah', 'angkut_sampah', 'Pengangkutan sampah', ARRAY['satgas'], TRUE),
        ('${AT_LAINNYA_SATGAS_ID}', 'Lainnya', 'lainnya_satgas', 'Aktivitas satgas lainnya', ARRAY['satgas'], TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 8 Satgas Activity Types');

    // Linmas activities (5)
    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('${AT_PATROLI_ID}', 'Patroli', 'patroli', 'Patroli keamanan area', ARRAY['linmas'], TRUE),
        ('${AT_INSIDEN_ID}', 'Insiden', 'insiden', 'Pelaporan insiden keamanan', ARRAY['linmas'], TRUE),
        ('${AT_PERIKSA_FASILITAS_ID}', 'Memeriksa Kondisi Fasilitas', 'periksa_fasilitas', 'Pemeriksaan kondisi fasilitas', ARRAY['linmas'], TRUE),
        ('${AT_HALAU_PKL_ID}', 'Halau PKL', 'halau_pkl', 'Penertiban pedagang kaki lima', ARRAY['linmas'], TRUE),
        ('${AT_LAINNYA_LINMAS_ID}', 'Lainnya', 'lainnya_linmas', 'Aktivitas linmas lainnya', ARRAY['linmas'], TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 5 Linmas Activity Types');

    // Korlap activities (4)
    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('${AT_CEK_KENDARAAN_ID}', 'Pengecekan Kendaraan', 'cek_kendaraan', 'Pemeriksaan kendaraan operasional', ARRAY['korlap'], TRUE),
        ('${AT_PATROLI_KORLAP_ID}', 'Patroli', 'patroli_korlap', 'Patroli area kerja', ARRAY['korlap'], TRUE),
        ('${AT_CEK_ALAT_ID}', 'Pengecekan Alat', 'cek_alat', 'Pemeriksaan peralatan kerja', ARRAY['korlap'], TRUE),
        ('${AT_LAINNYA_KORLAP_ID}', 'Lainnya', 'lainnya_korlap', 'Aktivitas korlap lainnya', ARRAY['korlap'], TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 4 Korlap Activity Types');

    // Admin Data activities (3)
    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('${AT_CEK_ABSENSI_ID}', 'Cek Absensi', 'cek_absensi', 'Pengecekan data absensi', ARRAY['admin_data'], TRUE),
        ('${AT_ENTRI_LAPORAN_ID}', 'Cek dan Entri Laporan', 'entri_laporan', 'Pengecekan dan entri laporan', ARRAY['admin_data'], TRUE),
        ('${AT_LAINNYA_ADMIN_DATA_ID}', 'Lainnya', 'lainnya_admin_data', 'Aktivitas admin data lainnya', ARRAY['admin_data'], TRUE)
      ON CONFLICT (code) DO NOTHING;
    `);
    console.log('  ✓ Created 3 Admin Data Activity Types');

    // ==========================================
    // STEP 4: Update Area Types with Category
    // ==========================================
    console.log('🏷️  Updating Area Types with Category...');
    await queryRunner.query(`
      UPDATE area_types SET category = 'ACTIVE' WHERE code IN ('park', 'mini_garden');
    `);
    await queryRunner.query(`
      UPDATE area_types SET category = 'PASSIVE' WHERE code IN ('pedestrian', 'street');
    `);
    console.log('  ✓ Updated Area Types with ACTIVE/PASSIVE categories');

    // ==========================================
    // STEP 5: Update Areas with Rayon Assignment
    // ==========================================
    console.log('📍 Updating Areas with Rayon assignments...');
    // Assign Taman Bungkul to Rayon Selatan
    await queryRunner.query(`
      UPDATE areas SET rayon_id = '${RAYON_1_ID}'
      WHERE name = 'Taman Bungkul';
    `);
    // Assign Jalan Raya Darmo to Rayon Pusat
    await queryRunner.query(`
      UPDATE areas SET rayon_id = '${RAYON_3_ID}'
      WHERE name = 'Jalan Raya Darmo';
    `);
    // Assign Taman Harmoni to Rayon Selatan
    await queryRunner.query(`
      UPDATE areas SET rayon_id = '${RAYON_1_ID}'
      WHERE name = 'Taman Harmoni';
    `);
    console.log('  ✓ Assigned existing Areas to Rayons');

    // ==========================================
    // STEP 6: Seed Special Day Overrides
    // ==========================================
    console.log('📅 Seeding Special Day Overrides...');
    await queryRunner.query(`
      INSERT INTO special_day_overrides (id, date, day_type, name) VALUES
        ('${SPECIAL_DAY_1_ID}', '2026-08-17', 'HOLIDAY', 'Hari Kemerdekaan'),
        ('${SPECIAL_DAY_2_ID}', '2026-12-25', 'HOLIDAY', 'Natal'),
        ('${SPECIAL_DAY_3_ID}', '2026-01-01', 'HOLIDAY', 'Tahun Baru'),
        ('${SPECIAL_DAY_4_ID}', '2026-05-01', 'HOLIDAY', 'Hari Buruh')
      ON CONFLICT (date) DO NOTHING;
    `);
    console.log('  ✓ Created 4 Special Day Overrides');

    // ==========================================
    // STEP 7: Seed Area Staff Requirements
    // ==========================================
    console.log('👥 Seeding Area Staff Requirements...');

    // Get Taman Bungkul area_id
    const areaResult = await queryRunner.query(`
      SELECT id FROM areas WHERE name = 'Taman Bungkul' LIMIT 1;
    `);
    const tamanBungkulId = areaResult[0]?.id;

    if (tamanBungkulId) {
      await queryRunner.query(`
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
      console.log('  ✓ Created 14 Area Staff Requirements for Taman Bungkul');
    } else {
      console.log('  ⚠ Taman Bungkul not found, skipping staff requirements');
    }

    // ==========================================
    // STEP 8: Seed Additional Users (Phase 2 roles)
    // ==========================================
    console.log('👤 Seeding Additional Users with Phase 2 roles...');

    // Bcrypt hash for password "password123" with 10 salt rounds
    const passwordHash = '$2b$10$i2N897RRT33OoHXWMHiDoOGQKl/gG.yxg3OvRN53PZZKMeFjkPUTm';

    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone, role, rayon_id, area_id, is_active) VALUES
        ('${USER_PHASE2_1_ID}', 'top_management1', '${passwordHash}', 'Kepala Dinas RTH', '081234567890', 'top_management', NULL, NULL, TRUE),
        ('${USER_PHASE2_2_ID}', 'kepala_rayon_selatan', '${passwordHash}', 'Kepala Rayon Selatan', '081234567891', 'kepala_rayon', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_PHASE2_3_ID}', 'kepala_rayon_utara', '${passwordHash}', 'Kepala Rayon Utara', '081234567892', 'kepala_rayon', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_PHASE2_4_ID}', 'korlap_bungkul', '${passwordHash}', 'Korlap Taman Bungkul', '081234567893', 'korlap', NULL, '${tamanBungkulId}', TRUE),
        ('${USER_PHASE2_5_ID}', 'linmas1', '${passwordHash}', 'Linmas Satu', '081234567894', 'linmas', NULL, NULL, TRUE),
        ('${USER_PHASE2_6_ID}', 'linmas2', '${passwordHash}', 'Linmas Dua', '081234567895', 'linmas', NULL, NULL, TRUE),
        ('${USER_PHASE2_7_ID}', 'satgas4', '${passwordHash}', 'Satgas Empat', '081234567896', 'satgas', NULL, NULL, TRUE),
        ('${USER_PHASE2_8_ID}', 'admin_data1', '${passwordHash}', 'Admin Data Satu', '081234567897', 'admin_data', NULL, NULL, TRUE),
        ('${USER_PHASE2_9_ID}', 'admin_system1', '${passwordHash}', 'Admin Sistem Satu', '081234567898', 'admin_system', NULL, NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('  ✓ Created 9 additional users with Phase 2C roles');

    // ==========================================
    // STEP 9: Seed Schedules
    // ==========================================
    console.log('📅 Seeding Schedules...');

    // Get worker IDs
    const workerResult = await queryRunner.query(`
      SELECT id, username FROM users WHERE role IN ('satgas', 'linmas') LIMIT 10;
    `);

    if (workerResult.length > 0 && tamanBungkulId) {
      const workers = workerResult.slice(0, 4);
      for (let i = 0; i < workers.length; i++) {
        const shiftId = i < 2 ? SHIFT_1_ID : SHIFT_2_ID;
        await queryRunner.query(`
          INSERT INTO schedules (user_id, area_id, shift_definition_id, effective_date, end_date, created_by)
          VALUES ('${workers[i].id}', '${tamanBungkulId}', '${shiftId}', '2026-01-20', NULL, NULL)
          ON CONFLICT DO NOTHING;
        `);
      }
      console.log('  ✓ Created 4 Schedules');
    } else {
      console.log('  ⚠ No workers or areas found, skipping schedules');
    }

    // ==========================================
    // STEP 10: Seed Overtimes (Phase 2C)
    // ==========================================
    console.log('⏰ Seeding Overtime records...');

    // Get test users
    const korlapResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'korlap_bungkul' LIMIT 1
    `);
    const satgasResult = await queryRunner.query(`
      SELECT id FROM users WHERE username IN ('satgas1', 'satgas_bungkul') LIMIT 1
    `);

    if (korlapResult.length > 0 && satgasResult.length > 0 && tamanBungkulId) {
      const korlapId = korlapResult[0].id;
      const satgasId = satgasResult[0].id;

      // Get activity type ID
      const activityTypeResult = await queryRunner.query(`
        SELECT id FROM activity_types WHERE code = 'perawatan' LIMIT 1
      `);

      if (activityTypeResult.length > 0) {
        const activityTypeId = activityTypeResult[0].id;

        const OVERTIME_1_ID = '11111111-1111-1111-1111-111111111111';
        const OVERTIME_2_ID = '22222222-2222-2222-2222-222222222222';
        const OVERTIME_3_ID = '33333333-3333-3333-3333-333333333333';

        // Flat overtime structure (Phase 2C - no overtime_aktivitas table)
        await queryRunner.query(`
          INSERT INTO overtimes (
            id, user_id, area_id, date, start_time, end_time,
            activity_type_id, description, photo_urls,
            gps_lat, gps_lng, status,
            created_at, updated_at
          ) VALUES
            (
              '${OVERTIME_1_ID}',
              '${satgasId}',
              '${tamanBungkulId}',
              '2026-02-10',
              '17:00:00',
              '20:00:00',
              '${activityTypeId}',
              'Perawatan tambahan setelah jam kerja',
              ARRAY['https://example.com/overtime1.jpg'],
              -7.2756,
              112.7395,
              'PENDING',
              NOW(),
              NOW()
            ),
            (
              '${OVERTIME_2_ID}',
              '${korlapId}',
              '${tamanBungkulId}',
              '2026-02-09',
              '16:00:00',
              '19:00:00',
              '${activityTypeId}',
              'Koordinasi tim malam',
              ARRAY['https://example.com/overtime2.jpg'],
              -7.2756,
              112.7395,
              'APPROVED',
              NOW(),
              NOW()
            ),
            (
              '${OVERTIME_3_ID}',
              '${satgasId}',
              '${tamanBungkulId}',
              '2026-02-08',
              '15:00:00',
              '18:00:00',
              '${activityTypeId}',
              'Request ditolak - tidak ada budget',
              '{}',
              NULL,
              NULL,
              'REJECTED',
              NOW(),
              NOW()
            )
          ON CONFLICT (id) DO NOTHING;
        `);

        console.log('  ✓ Created 3 overtime records (PENDING, APPROVED, REJECTED)');
      } else {
        console.log('  ⚠ Activity types not found, skipping overtime seeding');
      }
    } else {
      console.log('  ⚠ Required users or areas not found, skipping overtime seeding');
    }

    console.log('');
    console.log('✅ Phase 2 Seeding Completed Successfully!');
    console.log('');
    console.log('Summary:');
    console.log('  - 7 Rayons');
    console.log('  - 3 Shift Definitions');
    console.log('  - 20 Activity Types (8 satgas, 5 linmas, 4 korlap, 3 admin_data)');
    console.log('  - 4 Special Day Overrides');
    console.log('  - 9 Additional Users (Phase 2C roles)');
    console.log('  - 14 Area Staff Requirements');
    console.log('  - 4 Schedules');
    console.log('  - 3 Overtime records (PENDING, APPROVED, REJECTED)');
    console.log('  - Updated Area Types with categories');
    console.log('  - Updated Areas with Rayon assignments');
  } catch (error) {
    console.error('❌ Error during Phase 2 seeding:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

// Run the seed
seedPhase2()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
