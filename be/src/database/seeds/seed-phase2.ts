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
const AT_HALAU_PKL_ID = 'c5f8d2b3-4e6a-4f9b-8c1d-2e3f4a5b6c7d';
const AT_LAINNYA_LINMAS_ID = 'd6a9e3c4-5f7b-4a0c-9d2e-3f4a5b6c7d8e';

// Korlap activity types (4)
const AT_CEK_KENDARAAN_ID = 'e7b0f4d5-6a8c-4b1d-8e3f-4a5b6c7d8e9f';
const AT_PATROLI_KORLAP_ID = 'f8c1a5e6-7b9d-4c2e-9f4a-5b6c7d8e9f0a';
const AT_CEK_ALAT_ID = 'a9d2b6f7-8c0e-4d3f-8a5b-6c7d8e9f0a1b';
const AT_LAINNYA_KORLAP_ID = 'b0e3c7a8-9d1f-4e4a-9b6c-7d8e9f0a1b2c';

// Admin Data activity types (3)
const AT_CEK_ABSENSI_ID = 'c1f4d8b9-0e2a-4f5b-8c7d-8e9f0a1b2c3d';
const AT_ENTRI_LAPORAN_ID = 'd2a5e9c0-1f3b-4a6c-9d8e-9f0a1b2c3d4e';
const AT_LAINNYA_ADMIN_DATA_ID = 'e3b6f0d1-2a4c-4b7d-8e9f-0a1b2c3d4e5f';

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
    // Generated: bcrypt.hash('password123', 10)
    const passwordHash = '$2b$10$gF9qXRA.0ZtNWgbrwoYHMOmdUFUbaL4AkGdxAEMDMrMZtFexnH.H.';

    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone, role, rayon_id, area_id, is_active) VALUES
        ('${USER_PHASE2_1_ID}', 'top_management1', '${passwordHash}', 'Kepala Dinas RTH', '081234567890', 'top_management', NULL, NULL, TRUE),
        ('${USER_PHASE2_2_ID}', 'kepala_rayon_selatan', '${passwordHash}', 'Kepala Rayon Selatan', '081234567891', 'kepala_rayon', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_PHASE2_3_ID}', 'kepala_rayon_utara', '${passwordHash}', 'Kepala Rayon Utara', '081234567892', 'kepala_rayon', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_PHASE2_4_ID}', 'korlap_bungkul', '${passwordHash}', 'Korlap Taman Bungkul', '081234567893', 'korlap', NULL, '${tamanBungkulId}', TRUE),
        ('${USER_PHASE2_5_ID}', 'linmas1', '${passwordHash}', 'Linmas Satu', '081234567894', 'linmas', NULL, NULL, TRUE),
        ('${USER_PHASE2_6_ID}', 'linmas2', '${passwordHash}', 'Linmas Dua', '081234567895', 'linmas', NULL, NULL, TRUE),
        ('${USER_PHASE2_7_ID}', 'satgas4', '${passwordHash}', 'Satgas Empat', '081234567896', 'satgas', NULL, NULL, TRUE),
        ('${USER_PHASE2_8_ID}', 'admin_data1', '${passwordHash}', 'Admin Data Satu', '081234567897', 'admin_data', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_PHASE2_9_ID}', 'admin_system1', '${passwordHash}', 'Admin Sistem Satu', '081234567898', 'admin_system', NULL, NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('  ✓ Created 9 additional users with Phase 2C roles');

    // ==========================================
    // STEP 8.5: Assign area_id + rayon_id to field workers
    // Phase 1 users (satgas1/2/3, korlap1/2) had no area/rayon; Phase 2 users
    // (linmas1/2, satgas4) were inserted with NULL area/rayon above.
    // ==========================================
    console.log('📍 Assigning area_id and rayon_id to field workers...');

    // Taman Bungkul workers → Rayon Selatan
    await queryRunner.query(`
      UPDATE users
      SET area_id = (SELECT id FROM areas WHERE name = 'Taman Bungkul' LIMIT 1)
      WHERE username IN ('satgas1', 'linmas1', 'korlap1')
        AND area_id IS NULL;
    `);
    // Jalan Raya Darmo workers → Rayon Pusat
    await queryRunner.query(`
      UPDATE users
      SET area_id = (SELECT id FROM areas WHERE name = 'Jalan Raya Darmo' LIMIT 1)
      WHERE username IN ('satgas2', 'korlap2', 'linmas2')
        AND area_id IS NULL;
    `);
    // Taman Harmoni workers → Rayon Selatan
    await queryRunner.query(`
      UPDATE users
      SET area_id = (SELECT id FROM areas WHERE name = 'Taman Harmoni' LIMIT 1)
      WHERE username IN ('satgas3', 'satgas4')
        AND area_id IS NULL;
    `);
    // Derive rayon_id from the area's rayon for all field workers missing it
    await queryRunner.query(`
      UPDATE users u
      SET rayon_id = a.rayon_id
      FROM areas a
      WHERE u.area_id = a.id
        AND u.rayon_id IS NULL
        AND u.role IN ('satgas', 'linmas', 'korlap');
    `);
    console.log('  ✓ Assigned area_id and rayon_id to all field workers');

    // ==========================================
    // STEP 9: Seed Schedules
    // ==========================================
    console.log('📅 Seeding Schedules...');

    // Get ALL clockable worker IDs (satgas, linmas, AND korlap)
    // Phase 2C: korlap is CLOCKABLE but needs schedule entries too!
    const workerResult = await queryRunner.query(`
      SELECT id, username FROM users WHERE role IN ('satgas', 'linmas', 'korlap');
    `);

    if (workerResult.length > 0 && tamanBungkulId) {
      // Create schedules for ALL workers (not just first 4)
      for (let i = 0; i < workerResult.length; i++) {
        const shiftId = i % 3 === 0 ? SHIFT_1_ID : i % 3 === 1 ? SHIFT_2_ID : SHIFT_3_ID;
        await queryRunner.query(`
          INSERT INTO schedules (user_id, area_id, shift_definition_id, effective_date, end_date, created_by)
          VALUES ('${workerResult[i].id}', '${tamanBungkulId}', '${shiftId}', '2026-02-01', NULL, NULL)
          ON CONFLICT DO NOTHING;
        `);
      }
      console.log(`  ✓ Created ${workerResult.length} Schedules (satgas, linmas, korlap)`);
    } else {
      console.log('  ⚠ No workers or areas found, skipping schedules');
    }

    // ==========================================
    // STEP 10: Seed Overtimes (Phase 2C)
    // ==========================================
    console.log('⏰ Seeding Overtime records...');

    // Get test users for overtime
    const korlapOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'korlap_bungkul' LIMIT 1
    `);
    const satgasOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'satgas1' LIMIT 1
    `);
    const linmasOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'linmas1' LIMIT 1
    `);
    const korlap1OtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'korlap1' LIMIT 1
    `);

    const kepalaRayonOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'kepala_rayon_selatan' LIMIT 1
    `);

    if (korlapOtResult.length > 0 && satgasOtResult.length > 0 && tamanBungkulId) {
      const korlapOtId = korlapOtResult[0].id;
      const satgasOtId = satgasOtResult[0].id;
      const linmasOtId = linmasOtResult.length > 0 ? linmasOtResult[0].id : null;
      const korlap1OtId = korlap1OtResult.length > 0 ? korlap1OtResult[0].id : null;
      const kepalaRayonOtId = kepalaRayonOtResult.length > 0 ? kepalaRayonOtResult[0].id : null;

      // Get activity type IDs for varied overtime
      const otActivityTypes = await queryRunner.query(`
        SELECT id, code FROM activity_types WHERE code IN ('perawatan', 'patroli', 'cek_kendaraan', 'penyiraman') LIMIT 4
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

        const OVERTIME_1_ID = '01100000-0000-0000-0000-000000000001';
        const OVERTIME_2_ID = '02200000-0000-0000-0000-000000000002';
        const OVERTIME_3_ID = '03300000-0000-0000-0000-000000000003';
        const OVERTIME_4_ID = '04400000-0000-0000-0000-000000000004';
        const OVERTIME_5_ID = '05500000-0000-0000-0000-000000000005';
        const OVERTIME_6_ID = '06600000-0000-0000-0000-000000000006';
        const OVERTIME_7_ID = '07700000-0000-0000-0000-000000000007';
        const OVERTIME_8_ID = '08800000-0000-0000-0000-000000000008';

        // Satgas overtimes (3: pending, approved, rejected + overnight example)
        await queryRunner.query(`
          INSERT INTO overtimes (
            id, user_id, area_id, start_datetime, end_datetime,
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
        console.log('  ✓ Created 3 satgas overtime records (pending, approved, rejected)');

        // Linmas overtimes (3: pending, approved, rejected)
        if (linmasOtId) {
          await queryRunner.query(`
            INSERT INTO overtimes (
              id, user_id, area_id, start_datetime, end_datetime,
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
          console.log('  ✓ Created 3 linmas overtime records (pending, approved, rejected)');
        }

        // Korlap overtimes (2: pending, approved)
        if (korlap1OtId) {
          await queryRunner.query(`
            INSERT INTO overtimes (
              id, user_id, area_id, start_datetime, end_datetime,
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
          console.log('  ✓ Created 2 korlap overtime records (approved, pending)');
        }
        // Admin Data overtimes (2: pending, approved)
        const adminDataOtResult = await queryRunner.query(`
          SELECT id, area_id FROM users WHERE username = 'admin_data1' LIMIT 1
        `);
        if (adminDataOtResult.length > 0) {
          const OVERTIME_9_ID = '09900000-0000-0000-0000-000000000009';
          const OVERTIME_10_ID = '10100000-0000-0000-0000-000000000010';
          const adminDataOtId = adminDataOtResult[0].id;
          // admin_data is in rayon-1 but may not have area_id; use tamanBungkulId as fallback
          const adminDataAreaId = adminDataOtResult[0].area_id || tamanBungkulId;
          const cekAbsensiId = otActivityTypes.find((a: any) => a.code === 'cek_absensi')?.id;

          if (cekAbsensiId) {
            await queryRunner.query(`
              INSERT INTO overtimes (
                id, user_id, area_id, start_datetime, end_datetime,
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
            console.log('  ✓ Created 2 admin_data overtime records (pending, approved)');
          }
        }
      } else {
        console.log('  ⚠ Activity types not found, skipping overtime seeding');
      }
    } else {
      console.log('  ⚠ Required users or areas not found, skipping overtime seeding');
    }

    // ==========================================
    // STEP 11: Seed Shifts for Phase 2C Roles
    // ==========================================
    console.log('🕐 Seeding shifts for Phase 2C role users...');

    const shiftLinmas = await queryRunner.query(
      `SELECT id, area_id FROM users WHERE username = 'linmas1' LIMIT 1`,
    );
    const shiftKorlap1 = await queryRunner.query(
      `SELECT id, area_id FROM users WHERE username = 'korlap1' LIMIT 1`,
    );
    const shiftAdminData = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'admin_data1' LIMIT 1`,
    );
    const shiftKepalaRayon = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'kepala_rayon_selatan' LIMIT 1`,
    );
    const shiftArea = await queryRunner.query(`SELECT id FROM areas LIMIT 1`);

    if (shiftArea.length > 0) {
      const areaId = shiftArea[0].id;
      let shiftCount = 0;

      if (shiftLinmas.length > 0) {
        const linmasId = shiftLinmas[0].id;
        const linmasAreaId = shiftLinmas[0].area_id || areaId;
        await queryRunner.query(`
          INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
            clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
          VALUES
            ('${linmasId}', '${linmasAreaId}', NOW() - INTERVAL '1 day 8 hours', -7.2905, 112.7398,
              'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/linmas1-001.jpg',
              NOW() - INTERVAL '1 day', -7.2906, 112.7399, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day'),
            ('${linmasId}', '${linmasAreaId}', NOW() - INTERVAL '2 hours', -7.2905, 112.7398,
              'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/linmas1-002.jpg',
              NULL, NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
        `);
        shiftCount += 2;
        console.log('  ✓ Created 2 shifts for linmas1 (1 completed, 1 active)');
      }

      if (shiftKorlap1.length > 0) {
        const korlap1Id = shiftKorlap1[0].id;
        const korlap1AreaId = shiftKorlap1[0].area_id || areaId;
        await queryRunner.query(`
          INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
            clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
          VALUES
            ('${korlap1Id}', '${korlap1AreaId}', NOW() - INTERVAL '1 day 8 hours', -7.2905, 112.7398,
              'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/korlap1-001.jpg',
              NOW() - INTERVAL '1 day', -7.2906, 112.7399, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day'),
            ('${korlap1Id}', '${korlap1AreaId}', NOW() - INTERVAL '2 hours', -7.2905, 112.7398,
              'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/korlap1-002.jpg',
              NULL, NULL, NULL, NOW() - INTERVAL '2 hours', NOW() - INTERVAL '2 hours')
        `);
        shiftCount += 2;
        console.log('  ✓ Created 2 shifts for korlap1 (1 completed, 1 active)');
      }

      if (shiftAdminData.length > 0) {
        const adminDataId = shiftAdminData[0].id;
        await queryRunner.query(`
          INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
            clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
          VALUES
            ('${adminDataId}', '${areaId}', NOW() - INTERVAL '3 days 8 hours', -7.2905, 112.7398,
              'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/admin-data1-001.jpg',
              NOW() - INTERVAL '3 days', -7.2906, 112.7399, NOW() - INTERVAL '3 days 8 hours', NOW() - INTERVAL '3 days')
        `);
        shiftCount += 1;
        console.log('  ✓ Created 1 shift for admin_data1 (completed)');
      }

      if (shiftKepalaRayon.length > 0) {
        const kepalaId = shiftKepalaRayon[0].id;
        await queryRunner.query(`
          INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
            clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
          VALUES
            ('${kepalaId}', '${areaId}', NOW() - INTERVAL '2 days 8 hours', -7.2905, 112.7398,
              'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/kepala-rayon-001.jpg',
              NOW() - INTERVAL '2 days', -7.2906, 112.7399, NOW() - INTERVAL '2 days 8 hours', NOW() - INTERVAL '2 days')
        `);
        shiftCount += 1;
        console.log('  ✓ Created 1 shift for kepala_rayon_selatan (completed)');
      }

      console.log(`  ✓ Total: ${shiftCount} Phase 2C shifts created`);
    } else {
      console.log('  ⚠ No areas found, skipping Phase 2C shifts');
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
    console.log('  - 10 Overtime records (satgas×3, linmas×3, korlap×2, admin_data×2)');
    console.log('  - 6 Phase 2C shifts (korlap1×2, linmas×2, admin_data×1, kepala_rayon×1)');
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
