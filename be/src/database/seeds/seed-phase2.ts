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

// New users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2) — 15 users total
const USER_NEW_1_ID = 'a1000000-1111-4000-8000-000000000001'; // kepala_rayon_pusat
const USER_NEW_2_ID = 'a2000000-2222-4000-8000-000000000002'; // satgas_pusat_1
const USER_NEW_3_ID = 'a3000000-3333-4000-8000-000000000003'; // satgas_pusat_2
const USER_NEW_4_ID = 'a4000000-4444-4000-8000-000000000004'; // kepala_rayon_timur1
const USER_NEW_5_ID = 'a5000000-5555-4000-8000-000000000005'; // satgas_timur1_1 (missing scenario)
const USER_NEW_6_ID = 'a6000000-6666-4000-8000-000000000006'; // satgas_timur1_2
const USER_NEW_7_ID = 'a7000000-7777-4000-8000-000000000007'; // kepala_rayon_timur2
const USER_NEW_8_ID = 'a8000000-8888-4000-8000-000000000008'; // satgas_timur2_1
const USER_NEW_9_ID = 'a9000000-9999-4000-8000-000000000009'; // satgas_timur2_2
const USER_NEW_10_ID = 'aa000000-aaaa-4000-8000-00000000000a'; // kepala_rayon_barat1
const USER_NEW_11_ID = 'ab000000-bbbb-4000-8000-00000000000b'; // satgas_barat1_1
const USER_NEW_12_ID = 'ac000000-cccc-4000-8000-00000000000c'; // satgas_barat1_2
const USER_NEW_13_ID = 'ad000000-dddd-4000-8000-00000000000d'; // kepala_rayon_barat2
const USER_NEW_14_ID = 'ae000000-eeee-4000-8000-00000000000e'; // satgas_barat2_1
const USER_NEW_15_ID = 'af000000-ffff-4000-8000-00000000000f'; // satgas_barat2_2

// New areas for 5 missing rayons
const AREA_PUSAT_ID = 'b1000000-1111-4000-8000-000000000001';
const AREA_TIMUR1_ID = 'b2000000-2222-4000-8000-000000000002';
const AREA_TIMUR2_ID = 'b3000000-3333-4000-8000-000000000003';
const AREA_BARAT1_ID = 'b4000000-4444-4000-8000-000000000004';
const AREA_BARAT2_ID = 'b5000000-5555-4000-8000-000000000005';

// Notification token IDs
const NOTIF_TOKEN_1_ID = 'c1000000-1111-4000-8000-000000000001'; // satgas1
const NOTIF_TOKEN_2_ID = 'c2000000-2222-4000-8000-000000000002'; // satgas2
const NOTIF_TOKEN_3_ID = 'c3000000-3333-4000-8000-000000000003'; // linmas1

// Activity IDs for Section C (50 activities)
// Satgas recent (12)
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
// Linmas recent (5)
const ACT_LIN_1_ID = '11111111-bbbb-1111-bbbb-111111111111';
const ACT_LIN_2_ID = '22222222-bbbb-2222-bbbb-222222222222';
const ACT_LIN_3_ID = '33333333-bbbb-3333-bbbb-333333333333';
const ACT_LIN_4_ID = '44444444-bbbb-4444-bbbb-444444444444';
const ACT_LIN_5_ID = '55555555-bbbb-5555-bbbb-555555555555';
// Korlap recent (3)
const ACT_KOR_1_ID = '11111111-cccc-1111-cccc-111111111111';
const ACT_KOR_2_ID = '22222222-cccc-2222-cccc-222222222222';
const ACT_KOR_3_ID = '33333333-cccc-3333-cccc-333333333333';
// Extended (30)
const ACT_X1_ID = 'a1000000-dddd-a100-dddd-a10000000001';
const ACT_X2_ID = 'a2000000-dddd-a200-dddd-a20000000002';
const ACT_X3_ID = 'a3000000-dddd-a300-dddd-a30000000003';
const ACT_X4_ID = 'a4000000-dddd-a400-dddd-a40000000004';
const ACT_X5_ID = 'a5000000-dddd-a500-dddd-a50000000005';
const ACT_X6_ID = 'a6000000-dddd-a600-dddd-a60000000006';
const ACT_X7_ID = 'a7000000-dddd-a700-dddd-a70000000007';
const ACT_X8_ID = 'a8000000-dddd-a800-dddd-a80000000008';
const ACT_X9_ID = 'a9000000-dddd-a900-dddd-a90000000009';
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

// Task IDs for Section B
const TASK_1_ID = '099757d2-ab32-4384-83e7-22a35b0510ec';
const TASK_2_ID = 'f69ce06b-d253-4455-bf11-6e695eb028f3';
const TASK_3_ID = '809869e9-6ffd-4015-bb02-45d0ff71f344';
const TASK_4_ID = '63abcff4-3294-4643-9eb4-c25127d5bfd0';
const TASK_5_ID = 'a94b846b-ebbf-41df-bcbf-340187c50b5a';
const TASK_6_ID = 'a1de5361-6619-454d-af2a-360fe5cc18bc';
const TASK_7_ID = 'cee9877b-5d88-4528-b339-9bed9a8fb06b';
const TASK_8_ID = '8ec6c9c4-981c-412d-a1e8-a6c2c80ed189';
const LINMAS_TASK_1_ID = '11111111-1111-1111-1111-111111111111';
const LINMAS_TASK_2_ID = '22222222-2222-2222-2222-222222222222';
const LINMAS_TASK_3_ID = '33333333-3333-3333-3333-333333333333';
const LINMAS_TASK_4_ID = '44444444-4444-4444-4444-444444444444';
const KORLAP_TASK_1_ID = '55555555-5555-5555-5555-555555555555';
const KORLAP_TASK_2_ID = '66666666-6666-6666-6666-666666666666';
const KORLAP_TASK_3_ID = '77777777-7777-7777-7777-777777777777';
const TASK_E1_ID = 'e1000000-e100-e100-e100-e10000000001';
const TASK_E2_ID = 'e2000000-e200-e200-e200-e20000000002';
const TASK_E3_ID = 'e3000000-e300-e300-e300-e30000000003';
const TASK_E4_ID = 'e4000000-e400-e400-e400-e40000000004';
const TASK_E5_ID = 'e5000000-e500-e500-e500-e50000000005';
const TASK_E6_ID = 'e6000000-e600-e600-e600-e60000000006';
const TASK_E7_ID = 'e7000000-e700-e700-e700-e70000000007';
const TASK_E8_ID = 'e8000000-e800-e800-e800-e80000000008';
const TASK_E9_ID = 'e9000000-e900-e900-e900-e90000000009';
const TASK_E10_ID = 'ea000000-ea00-ea00-ea00-ea0000000010';
const TASK_E11_ID = 'eb000000-eb00-eb00-eb00-eb0000000011';
const TASK_E12_ID = 'ec000000-ec00-ec00-ec00-ec0000000012';
const TASK_E13_ID = 'ed000000-ed00-ed00-ed00-ed0000000013';
const TASK_E14_ID = 'ee000000-ee00-ee00-ee00-ee0000000014';
const TASK_E15_ID = 'ef000000-ef00-ef00-ef00-ef0000000015';
const TASK_E16_ID = 'f0000000-f000-f000-f000-f00000000016';
const TASK_E17_ID = 'f1000000-f100-f100-f100-f10000000017';
const TASK_E18_ID = 'f2000000-f200-f200-f200-f20000000018';
const TASK_E19_ID = 'f3000000-f300-f300-f300-f30000000019';
const TASK_E20_ID = 'f4000000-f400-f400-f400-f40000000020';
const TASK_E21_ID = 'f5000000-f500-f500-f500-f50000000021';
const TASK_E22_ID = 'f6000000-f600-f600-f600-f60000000022';
const TASK_E23_ID = 'f7000000-f700-f700-f700-f70000000023';
const TASK_E24_ID = 'f8000000-f800-f800-f800-f80000000024';
const TASK_E25_ID = 'f9000000-f900-f900-f900-f90000000025';

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

    // Add 15 more users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)
    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone, role, rayon_id, area_id, is_active) VALUES
        ('${USER_NEW_1_ID}',  'kepala_rayon_pusat',  '${passwordHash}', 'Kepala Rayon Pusat',   '081300000001', 'kepala_rayon', '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_NEW_2_ID}',  'satgas_pusat_1',      '${passwordHash}', 'Satgas Pusat Satu',    '081300000002', 'satgas',       '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_NEW_3_ID}',  'satgas_pusat_2',      '${passwordHash}', 'Satgas Pusat Dua',     '081300000003', 'satgas',       '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_NEW_4_ID}',  'kepala_rayon_timur1', '${passwordHash}', 'Kepala Rayon Timur 1', '081300000004', 'kepala_rayon', '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_NEW_5_ID}',  'satgas_timur1_1',     '${passwordHash}', 'Satgas Timur1 Satu',   '081300000005', 'satgas',       '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_NEW_6_ID}',  'satgas_timur1_2',     '${passwordHash}', 'Satgas Timur1 Dua',    '081300000006', 'satgas',       '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_NEW_7_ID}',  'kepala_rayon_timur2', '${passwordHash}', 'Kepala Rayon Timur 2', '081300000007', 'kepala_rayon', '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_NEW_8_ID}',  'satgas_timur2_1',     '${passwordHash}', 'Satgas Timur2 Satu',   '081300000008', 'satgas',       '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_NEW_9_ID}',  'satgas_timur2_2',     '${passwordHash}', 'Satgas Timur2 Dua',    '081300000009', 'satgas',       '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_NEW_10_ID}', 'kepala_rayon_barat1', '${passwordHash}', 'Kepala Rayon Barat 1', '081300000010', 'kepala_rayon', '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_NEW_11_ID}', 'satgas_barat1_1',     '${passwordHash}', 'Satgas Barat1 Satu',   '081300000011', 'satgas',       '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_NEW_12_ID}', 'satgas_barat1_2',     '${passwordHash}', 'Satgas Barat1 Dua',    '081300000012', 'satgas',       '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_NEW_13_ID}', 'kepala_rayon_barat2', '${passwordHash}', 'Kepala Rayon Barat 2', '081300000013', 'kepala_rayon', '${RAYON_7_ID}', NULL, TRUE),
        ('${USER_NEW_14_ID}', 'satgas_barat2_1',     '${passwordHash}', 'Satgas Barat2 Satu',   '081300000014', 'satgas',       '${RAYON_7_ID}', NULL, TRUE),
        ('${USER_NEW_15_ID}', 'satgas_barat2_2',     '${passwordHash}', 'Satgas Barat2 Dua',    '081300000015', 'satgas',       '${RAYON_7_ID}', NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('  ✓ Created 15 additional users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)');

    // ==========================================
    // STEP 8.1: Create Areas for 5 Missing Rayons + Staff Requirements
    // ==========================================
    console.log('🌳 Creating areas for 5 missing rayons...');

    const parkTypeResult = await queryRunner.query(
      `SELECT id FROM area_types WHERE code = 'park' LIMIT 1`,
    );
    const parkTypeId = parkTypeResult[0]?.id;

    if (parkTypeId) {
      await queryRunner.query(`
        INSERT INTO areas (id, name, area_type_id, rayon_id, gps_lat, gps_lng, boundary_polygon, is_active) VALUES
          ('${AREA_PUSAT_ID}',  'Taman Pusat',   '${parkTypeId}', '${RAYON_3_ID}', -7.2580, 112.7340,
           '{"type":"Polygon","coordinates":[[[112.733,-7.257],[112.735,-7.257],[112.735,-7.259],[112.733,-7.259],[112.733,-7.257]]]}',
           TRUE),
          ('${AREA_TIMUR1_ID}', 'Taman Timur 1', '${parkTypeId}', '${RAYON_4_ID}', -7.2450, 112.7600,
           '{"type":"Polygon","coordinates":[[[112.759,-7.244],[112.761,-7.244],[112.761,-7.246],[112.759,-7.246],[112.759,-7.244]]]}',
           TRUE),
          ('${AREA_TIMUR2_ID}', 'Taman Timur 2', '${parkTypeId}', '${RAYON_5_ID}', -7.2700, 112.7800,
           '{"type":"Polygon","coordinates":[[[112.779,-7.269],[112.781,-7.269],[112.781,-7.271],[112.779,-7.271],[112.779,-7.269]]]}',
           TRUE),
          ('${AREA_BARAT1_ID}', 'Taman Barat 1', '${parkTypeId}', '${RAYON_6_ID}', -7.2500, 112.6900,
           '{"type":"Polygon","coordinates":[[[112.689,-7.249],[112.691,-7.249],[112.691,-7.251],[112.689,-7.251],[112.689,-7.249]]]}',
           TRUE),
          ('${AREA_BARAT2_ID}', 'Taman Barat 2', '${parkTypeId}', '${RAYON_7_ID}', -7.2800, 112.6700,
           '{"type":"Polygon","coordinates":[[[112.669,-7.279],[112.671,-7.279],[112.671,-7.281],[112.669,-7.281],[112.669,-7.279]]]}',
           TRUE)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('  ✓ Created 5 areas for missing rayons');

      // Assign area_id to new satgas users
      await queryRunner.query(`
        UPDATE users SET area_id = '${AREA_PUSAT_ID}'
        WHERE username IN ('satgas_pusat_1', 'satgas_pusat_2') AND area_id IS NULL;
      `);
      await queryRunner.query(`
        UPDATE users SET area_id = '${AREA_TIMUR1_ID}'
        WHERE username IN ('satgas_timur1_1', 'satgas_timur1_2') AND area_id IS NULL;
      `);
      await queryRunner.query(`
        UPDATE users SET area_id = '${AREA_TIMUR2_ID}'
        WHERE username IN ('satgas_timur2_1', 'satgas_timur2_2') AND area_id IS NULL;
      `);
      await queryRunner.query(`
        UPDATE users SET area_id = '${AREA_BARAT1_ID}'
        WHERE username IN ('satgas_barat1_1', 'satgas_barat1_2') AND area_id IS NULL;
      `);
      await queryRunner.query(`
        UPDATE users SET area_id = '${AREA_BARAT2_ID}'
        WHERE username IN ('satgas_barat2_1', 'satgas_barat2_2') AND area_id IS NULL;
      `);
      console.log('  ✓ Assigned area_id to 10 new satgas users');

      // Staff requirements for new areas (3 entries each)
      await queryRunner.query(`
        INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type) VALUES
          ('${AREA_PUSAT_ID}',  '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_PUSAT_ID}',  '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
          ('${AREA_PUSAT_ID}',  '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_TIMUR1_ID}', '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_TIMUR1_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
          ('${AREA_TIMUR1_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_TIMUR2_ID}', '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_TIMUR2_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
          ('${AREA_TIMUR2_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_BARAT1_ID}', '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_BARAT1_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
          ('${AREA_BARAT1_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_BARAT2_ID}', '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_BARAT2_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
          ('${AREA_BARAT2_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY')
        ON CONFLICT DO NOTHING;
      `);
      console.log('  ✓ Created 15 staff requirements for 5 new areas');
    } else {
      console.log('  ⚠ Park area type not found, skipping new areas');
    }

    // ==========================================
    // STEP 8.2: Seed Notification Tokens
    // ==========================================
    console.log('📱 Seeding Notification Tokens...');
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_1_ID}', u.id,
        'ExponentPushToken[satgas1_ABCDEF12345_test]', 'device_satgas1_abc123', 'android', TRUE, NOW() - INTERVAL '7 days'
      FROM users u WHERE u.username = 'satgas1' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_2_ID}', u.id,
        'ExponentPushToken[satgas2_GHIJKL67890_test]', 'device_satgas2_xyz789', 'android', TRUE, NOW() - INTERVAL '5 days'
      FROM users u WHERE u.username = 'satgas2' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_3_ID}', u.id,
        'ExponentPushToken[linmas1_MNOPQR11223_test]', 'device_linmas1_mnp345', 'android', TRUE, NOW() - INTERVAL '3 days'
      FROM users u WHERE u.username = 'linmas1' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('  ✓ Created 3 notification tokens (satgas1, satgas2, linmas1)');

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

    // ==========================================
    // SECTION B: Tasks
    // ==========================================
    console.log('');
    console.log('📋 ======== SECTION B: Tasks ========');
    console.log('🗑️  Clearing existing tasks...');
    await queryRunner.query(`DELETE FROM task_tags`);
    await queryRunner.query(`DELETE FROM tasks`);
    console.log('  ✓ Cleared tasks and task_tags');

    const taskCreator = await queryRunner.query(`SELECT id FROM users WHERE role = 'korlap' LIMIT 1`);
    const taskSatgas = await queryRunner.query(`SELECT id FROM users WHERE role = 'satgas' ORDER BY username LIMIT 3`);
    const taskLinmas  = await queryRunner.query(`SELECT id FROM users WHERE role = 'linmas'  ORDER BY username LIMIT 2`);
    const taskKepala  = await queryRunner.query(`SELECT id FROM users WHERE role = 'kepala_rayon' LIMIT 1`);
    const taskTopMgmt = await queryRunner.query(`SELECT id FROM users WHERE role = 'top_management' LIMIT 1`);
    const taskAreas   = await queryRunner.query(`SELECT id FROM areas ORDER BY name LIMIT 5`);

    if (taskCreator.length === 0 || taskSatgas.length === 0 || taskAreas.length === 0) {
      console.log('  ⚠ Required users/areas not found, skipping tasks');
    } else {
      const cId  = taskCreator[0].id;
      const s1Id = taskSatgas[0]?.id;
      const s2Id = taskSatgas[1]?.id ?? s1Id;
      const s3Id = taskSatgas[2]?.id ?? s1Id;
      const l1Id = taskLinmas[0]?.id ?? null;
      const l2Id = taskLinmas[1]?.id ?? l1Id;
      const kId  = taskKepala[0]?.id  ?? null;
      const tmId = taskTopMgmt[0]?.id ?? null;
      const a1   = taskAreas[0]?.id;
      const a2   = taskAreas[1]?.id ?? a1;
      const a3   = taskAreas[2]?.id ?? a1;
      const a4   = taskAreas[3]?.id ?? a1;
      const a5   = taskAreas[4]?.id ?? a1;

      // 8 core satgas tasks — covers all 8 statuses after UPDATE pass below
      await queryRunner.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, created_at, updated_at) VALUES
          ('${TASK_1_ID}', 'Penyiraman Taman Pagi', 'Menyiram seluruh area taman pada pagi hari. Fokus tanaman baru.', 'pending', 'high', NOW() + INTERVAL '1 day', '${a1}', NULL, '${cId}', NOW(), NOW()),
          ('${TASK_7_ID}', 'Pembersihan Jalur Jogging', 'Membersihkan jalur jogging dari dedaunan dan sampah.', 'pending', 'high', NOW() + INTERVAL '1 day', '${a1}', NULL, '${cId}', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await queryRunner.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
          ('${TASK_2_ID}', 'Penanaman Bunga Musiman', 'Menanam bunga musiman. Total 50 pot bunga.', 'assigned', 'medium', NOW() + INTERVAL '7 days', '${a2}', '${s1Id}', '${cId}', NOW() - INTERVAL '1 hour', NOW(), NOW()),
          ('${TASK_3_ID}', 'Pemangkasan Pohon Tinggi', 'Memangkas dahan pohon yang menghalangi jalur pejalan kaki.', 'assigned', 'urgent', NOW() + INTERVAL '1 day', '${a3}', '${s2Id}', '${cId}', NOW() - INTERVAL '2 hours', NOW(), NOW()),
          ('${TASK_8_ID}', 'Perawatan Rumput Taman', 'Memeriksa dan merawat kondisi rumput di area taman.', 'assigned', 'low', NOW() + INTERVAL '7 days', '${a2}', '${s3Id}', '${cId}', NOW() - INTERVAL '30 minutes', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await queryRunner.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, started_at, created_at, updated_at) VALUES
          ('${TASK_4_ID}', 'Pembersihan Area Playground', 'Membersihkan area playground dari sampah dan dedaunan.', 'in_progress', 'medium', NOW(), '${a1}', '${s3Id}', '${cId}', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '30 minutes', NOW(), NOW()),
          ('${TASK_6_ID}', 'Pemangkasan Semak Belukar', 'Memangkas semak belukar di area belakang taman.', 'in_progress', 'low', NOW() + INTERVAL '7 days', '${a3}', '${s2Id}', '${cId}', NOW() - INTERVAL '4 hours', NOW() - INTERVAL '1 hour', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      await queryRunner.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, started_at, completed_at, completion_notes, completion_photo_urls, created_at, updated_at) VALUES
          ('${TASK_5_ID}', 'Penyiraman Taman Sore', 'Menyiram taman pada sore hari.', 'completed', 'low', NOW() - INTERVAL '1 day', '${a2}', '${s1Id}', '${cId}', NOW() - INTERVAL '5 hours', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', 'Penyiraman selesai. Semua tanaman sudah disiram dengan baik.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/sat-watering-complete.jpg'], NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('  ✓ Created 8 satgas core tasks');

      // Update tasks to cover all 8 statuses
      await queryRunner.query(`
        UPDATE tasks SET status = 'accepted', accepted_at = NOW() - INTERVAL '1 hour'
        WHERE id = '${TASK_3_ID}'
      `);
      await queryRunner.query(`
        UPDATE tasks SET status = 'declined', declined_at = NOW() - INTERVAL '2 hours',
          decline_reason = 'Alat pemangkas tidak tersedia saat ini, perlu diservis terlebih dahulu'
        WHERE id = '${TASK_6_ID}'
      `);
      await queryRunner.query(`
        UPDATE tasks SET status = 'verified', verified_by = '${cId}', verified_at = NOW() - INTERVAL '1 hour'
        WHERE id = '${TASK_5_ID}'
      `);
      await queryRunner.query(`
        UPDATE tasks SET
          status = 'revision_needed',
          assigned_to = '${s2Id}',
          assigned_at = NOW() - INTERVAL '3 days',
          accepted_at = NOW() - INTERVAL '2 days',
          started_at = NOW() - INTERVAL '1 day',
          completed_at = NOW() - INTERVAL '6 hours',
          completion_notes = 'Jalur jogging sudah dibersihkan dari dedaunan',
          completion_photo_urls = ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/jogging-cleanup.jpg'],
          revision_reason = 'Masih ada sampah di area tikungan, perlu dibersihkan ulang'
        WHERE id = '${TASK_7_ID}'
      `);
      console.log('  ✓ Updated 4 tasks to cover statuses: accepted, declined, verified, revision_needed');

      // Linmas tasks (4)
      if (l1Id) {
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, created_at, updated_at) VALUES
            ('${LINMAS_TASK_1_ID}', 'Patroli Keamanan Malam', 'Patroli area taman 20:00-22:00. Cek lampu dan parkir.', 'pending', 'high', NOW() + INTERVAL '2 days', '${a1}', NULL, '${cId}', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
            ('${LINMAS_TASK_2_ID}', 'Pengecekan Fasilitas Taman', 'Cek kondisi lampu, bangku, pagar, dan fasilitas umum.', 'assigned', 'medium', NOW() + INTERVAL '1 day', '${a1}', '${l1Id}', '${cId}', NOW() - INTERVAL '1 day', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, started_at, created_at, updated_at) VALUES
            ('${LINMAS_TASK_3_ID}', 'Pengawasan Event Weekend', 'Jaga keamanan selama event komunitas. Atur lalu lintas pengunjung.', 'in_progress', 'urgent', NOW(), '${a2}', '${l2Id ?? l1Id}', '${cId}', NOW() - INTERVAL '2 hours', NOW() - INTERVAL '1 hour', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, started_at, completed_at, completion_notes, completion_photo_urls, created_at, updated_at) VALUES
            ('${LINMAS_TASK_4_ID}', 'Laporan Insiden PKL', 'Dokumentasi dan pelaporan PKL ilegal di area taman.', 'completed', 'high', NOW() - INTERVAL '1 day', '${a3}', '${l1Id}', '${cId}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW() - INTERVAL '12 hours', 'Laporan insiden PKL selesai. Sudah dikoordinasikan dengan satpol PP.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/linmas-incident.jpg'], NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('  ✓ Created 4 linmas tasks');
      }

      // Korlap tasks (3)
      if (kId) {
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
            ('${KORLAP_TASK_1_ID}', 'Koordinasi Tim Mingguan', 'Meeting koordinasi dengan satgas dan linmas. Review progress minggu ini.', 'assigned', 'medium', NOW() + INTERVAL '3 days', '${a1}', '${cId}', '${kId}', NOW() - INTERVAL '1 day', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, started_at, created_at, updated_at) VALUES
            ('${KORLAP_TASK_2_ID}', 'Pengecekan Kendaraan Operasional', 'Cek kondisi kendaraan dan perlengkapan operasional.', 'in_progress', 'medium', NOW(), NULL, '${cId}', '${kId}', NOW() - INTERVAL '3 hours', NOW() - INTERVAL '2 hours', NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, assigned_at, started_at, completed_at, completion_notes, completion_photo_urls, created_at, updated_at) VALUES
            ('${KORLAP_TASK_3_ID}', 'Supervisi Penanaman Pohon', 'Supervisi kegiatan penanaman 50 pohon di area taman.', 'completed', 'high', NOW() - INTERVAL '1 day', '${a2}', '${cId}', '${kId}', NOW() - INTERVAL '3 days', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', 'Supervisi selesai. Penanaman 50 pohon berhasil.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/tasks/korlap-supervision.jpg'], NOW(), NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('  ✓ Created 3 korlap tasks');
      }

      // Rayon-scoped + kepala_rayon tasks (2+2)
      await queryRunner.query(`
        INSERT INTO tasks (id, title, description, status, priority, deadline, rayon_id, area_id, assigned_to, created_by, created_at, updated_at) VALUES
          ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Audit Semua Area di Rayon Selatan', 'Periksa kondisi fasilitas di seluruh area dalam rayon.', 'pending', 'medium', NOW() + INTERVAL '7 days', '${RAYON_1_ID}', NULL, NULL, '${cId}', NOW(), NOW()),
          ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Koordinasi Event Weekend Rayon', 'Persiapan event di semua taman dalam rayon.', 'pending', 'medium', NOW() + INTERVAL '3 days', '${RAYON_1_ID}', NULL, NULL, '${cId}', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      if (kId && tmId) {
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, rayon_id, area_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
            ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'Laporan Bulanan Rayon Selatan', 'Compile laporan bulanan dari semua area di rayon.', 'assigned', 'high', NOW() + INTERVAL '5 days', '${RAYON_1_ID}', NULL, '${kId}', '${tmId}', NOW() - INTERVAL '1 day', NOW(), NOW()),
            ('dddddddd-dddd-dddd-dddd-dddddddddddd', 'Review Kinerja Korlap', 'Evaluasi kinerja korlap di rayon untuk kuartal ini.', 'in_progress', 'medium', NOW() + INTERVAL '5 days', '${RAYON_1_ID}', NULL, '${kId}', '${tmId}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('  ✓ Created 4 rayon-scoped tasks (2 plain + 2 kepala_rayon)');
      } else {
        console.log('  ✓ Created 2 rayon-scoped tasks');
      }

      // 25 extended tasks for scroll/filter testing
      await queryRunner.query(
        `
        INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, created_at, updated_at)
        VALUES
          ('${TASK_E1_ID}',  'Pemangkasan Pohon Minggu Lalu',   'Pemangkasan pohon di jalur pedestrian.',         'completed',   'medium', $1,  '${a1}', '${s1Id}', '${cId}', $1,  $1 ),
          ('${TASK_E2_ID}',  'Pengecatan Pagar Taman',           'Pengecatan pagar area bermain anak.',            'completed',   'low',    $2,  '${a1}', '${s2Id}', '${cId}', $2,  $2 ),
          ('${TASK_E3_ID}',  'Pembersihan Kolam',                'Pembersihan dan pergantian air kolam hias.',     'completed',   'high',   $3,  '${a1}', '${s1Id}', '${cId}', $3,  $3 ),
          ('${TASK_E4_ID}',  'Perbaikan Jalan Setapak',          'Perbaikan jalan setapak yang rusak.',            'completed',   'urgent', $4,  '${a2}', '${s2Id}', '${cId}', $4,  $4 ),
          ('${TASK_E5_ID}',  'Pemasangan Papan Informasi',       'Pemasangan papan informasi baru di pintu masuk.','in_progress', 'medium', $5,  '${a2}', '${s2Id}', '${cId}', $5,  $5 ),
          ('${TASK_E6_ID}',  'Penyemprotan Hama',                'Penyemprotan hama pada semua tanaman.',          'in_progress', 'high',   $6,  '${a1}', '${s1Id}', '${cId}', $6,  $6 ),
          ('${TASK_E7_ID}',  'Inventarisasi Peralatan',          'Cek dan catat seluruh peralatan taman.',         'assigned',    'low',    $7,  '${a1}', '${s2Id}', '${cId}', $7,  $7 ),
          ('${TASK_E8_ID}',  'Pemupukan Tanaman Hias',           'Pemupukan rutin seluruh tanaman hias.',          'assigned',    'medium', $7,  '${a2}', '${s3Id}', '${cId}', $7,  $7 ),
          ('${TASK_E9_ID}',  'Perbaikan Saluran Air',            'Perbaikan saluran drainase yang tersumbat.',     'pending',     'urgent', $7,  '${a1}', NULL,      '${cId}', $7,  $7 ),
          ('${TASK_E10_ID}', 'Pemasangan Tanaman Merambat',      'Pemasangan tanaman merambat di pagar depan.',   'pending',     'low',    $7,  '${a2}', NULL,      '${cId}', $7,  $7 ),
          ('${TASK_E11_ID}', 'Patroli Subuh',                    'Patroli keamanan pukul 04:00-06:00.',           'completed',   'high',   $1,  '${a1}', '${l1Id ?? s1Id}', '${cId}', $1, $1),
          ('${TASK_E12_ID}', 'Pengamanan Car Free Day',          'Pengamanan area taman saat car free day.',      'completed',   'urgent', $2,  '${a1}', '${l2Id ?? s1Id}', '${cId}', $2, $2),
          ('${TASK_E13_ID}', 'Laporan Keamanan Harian',          'Dokumentasi laporan keamanan harian.',          'in_progress', 'medium', $6,  '${a2}', '${l1Id ?? s1Id}', '${cId}', $6, $6),
          ('${TASK_E14_ID}', 'Patroli Sore Hari',                'Patroli area taman pukul 17:00-19:00.',         'assigned',    'high',   $7,  '${a1}', '${l2Id ?? s1Id}', '${cId}', $7, $7),
          ('${TASK_E15_ID}', 'Penertiban Pedagang Liar',         'Koordinasi dengan satpol PP untuk penertiban.',  'pending',     'urgent', $7,  '${a3}', NULL,      '${cId}', $7,  $7 ),
          ('${TASK_E16_ID}', 'Evaluasi Kinerja Tim',             'Evaluasi kinerja seluruh tim lapangan.',         'completed',   'high',   $3,  '${a1}', '${cId}',  '${kId ?? cId}', $3, $3),
          ('${TASK_E17_ID}', 'Briefing Prosedur Keselamatan',    'Briefing SOP keselamatan kerja tim.',            'in_progress', 'medium', $6,  '${a2}', '${cId}',  '${kId ?? cId}', $6, $6),
          ('${TASK_E18_ID}', 'Koordinasi Event Bulanan',         'Persiapan dan koordinasi event bulanan.',        'assigned',    'high',   $7,  '${a1}', '${cId}',  '${kId ?? cId}', $7, $7),
          ('${TASK_E19_ID}', 'Audit Penggunaan Anggaran',        'Review penggunaan anggaran operasional.',        'pending',     'low',    $7,  '${a3}', NULL,      '${kId ?? cId}', $7, $7),
          ('${TASK_E20_ID}', 'Perawatan Taman Tema',             'Perawatan khusus taman tema mini.',              'pending',     'medium', $7,  '${a1}', NULL,      '${cId}', $7,  $7 ),
          ('${TASK_E21_ID}', 'Pengadaan Benih Tanaman',          'Koordinasi pengadaan benih untuk bulan depan.', 'assigned',    'low',    $7,  '${a2}', '${s1Id}', '${cId}', $7,  $7 ),
          ('${TASK_E22_ID}', 'Renovasi Tempat Duduk',            'Pengecatan dan perbaikan tempat duduk.',         'in_progress', 'medium', $7,  '${a1}', '${s2Id}', '${cId}', $7,  $7 ),
          ('${TASK_E23_ID}', 'Dokumentasi Kondisi Taman',        'Foto dan dokumentasi kondisi taman.',            'completed',   'low',    $1,  '${a3}', '${s1Id}', '${cId}', $1,  $1 ),
          ('${TASK_E24_ID}', 'Pembersihan Pasca Event',          'Pembersihan area taman setelah event.',          'completed',   'high',   $2,  '${a1}', '${s2Id}', '${cId}', $2,  $2 ),
          ('${TASK_E25_ID}', 'Pengecatan Mural Taman',           'Pengecatan mural seni pada dinding taman.',     'pending',     'medium', $7,  '${a2}', NULL,      '${cId}', $7,  $7 )
        ON CONFLICT (id) DO NOTHING;
        `,
        [
          new Date(Date.now() - 30 * 86400000).toISOString(), // $1 30 days ago
          new Date(Date.now() - 21 * 86400000).toISOString(), // $2 21 days ago
          new Date(Date.now() - 14 * 86400000).toISOString(), // $3 14 days ago
          new Date(Date.now() -  7 * 86400000).toISOString(), // $4  7 days ago
          new Date(Date.now() -  3 * 86400000).toISOString(), // $5  3 days ago
          new Date(Date.now() -  1 * 86400000).toISOString(), // $6  1 day ago
          new Date(Date.now() +  7 * 86400000).toISOString(), // $7  7 days from now
        ],
      );
      console.log('  ✓ Created 25 extended tasks for scroll/filter testing');
    }

    // ==========================================
    // SECTION C: Activities
    // ==========================================
    console.log('');
    console.log('📸 ======== SECTION C: Activities ========');
    console.log('🗑️  Clearing existing activities...');
    await queryRunner.query(`DELETE FROM activities`);
    console.log('  ✓ Cleared activities table');

    // Fetch user + shift + area refs for activities
    const actSatgas1  = await queryRunner.query(`SELECT id FROM users WHERE username = 'satgas1' LIMIT 1`);
    const actSatgas2  = await queryRunner.query(`SELECT id FROM users WHERE username = 'satgas2' LIMIT 1`);
    const actLinmas1  = await queryRunner.query(`SELECT id FROM users WHERE username = 'linmas1' LIMIT 1`);
    const actLinmas2  = await queryRunner.query(`SELECT id FROM users WHERE username = 'linmas2' LIMIT 1`);
    const actKorlap   = await queryRunner.query(`SELECT id FROM users WHERE role = 'korlap' LIMIT 1`);
    const actShift    = await queryRunner.query(`SELECT id FROM shifts LIMIT 1`);
    const actArea     = await queryRunner.query(`SELECT id FROM areas WHERE name ILIKE '%bungkul%' LIMIT 1`);

    if (actSatgas1.length === 0 || actLinmas1.length === 0 || actKorlap.length === 0 || actShift.length === 0 || actArea.length === 0) {
      console.log('  ⚠ Required refs not found, skipping activities');
    } else {
      const aS1 = actSatgas1[0].id;
      const aS2 = actSatgas2.length > 0 ? actSatgas2[0].id : aS1;
      const aL1 = actLinmas1[0].id;
      const aL2 = actLinmas2.length > 0 ? actLinmas2[0].id : aL1;
      const aK  = actKorlap[0].id;
      const aSh = actShift[0].id;
      const aAr = actArea[0].id;

      // Helper function to get GPS variants around Taman Bungkul center
      const lat = (o: number) => (-7.2905 + o * 0.0005).toFixed(6);
      const lng = (o: number) => (112.7395 + o * 0.0005).toFixed(6);
      const dAgo = (d: number) => `NOW() - INTERVAL '${d} days'`;

      // Get activity type IDs by code
      const atypes = await queryRunner.query(`SELECT id, code FROM activity_types`);
      const at = (code: string) => atypes.find((a: any) => a.code === code)?.id ?? null;

      const perawatanId    = at('perawatan');
      const penanamanId    = at('penanaman');
      const penyiramanId   = at('penyiraman');
      const potongRumputId = at('potong_rumput');
      const angkutSampahId = at('angkut_sampah');
      const lainnySatgasId = at('lainnya_satgas');
      const patroliId      = at('patroli');
      const insidenId      = at('insiden');
      const periksaFasId   = at('periksa_fasilitas');
      const halauPklId     = at('halau_pkl');
      const lainnasLinmasId= at('lainnya_linmas');
      const cekKendaraanId = at('cek_kendaraan');
      const patroliKorlapId= at('patroli_korlap');
      const cekAlatId      = at('cek_alat');
      const lainnyaKorlapId= at('lainnya_korlap');

      if (perawatanId && patroliId && cekKendaraanId) {
        // 12 Satgas activities spanning 4 weeks
        await queryRunner.query(`
          INSERT INTO activities (id, user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at) VALUES
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
        console.log('  ✓ Created 12 satgas activities');

        // 5 Linmas activities
        await queryRunner.query(`
          INSERT INTO activities (id, user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at) VALUES
            ('${ACT_LIN_1_ID}', '${aL1}', '${aSh}', '${aAr}', '${patroliId}',       'Patroli keamanan malam - area jogging track dan playground.',       ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin1-patroli.jpg'],         ${lat(8)},  ${lng(8)},  ${dAgo(26)}),
            ('${ACT_LIN_2_ID}', '${aL2}', '${aSh}', '${aAr}', '${insidenId}',       'Laporan insiden: PKL masuk area taman - sudah ditangani.',          ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin2-insiden-1.jpg','https://sekar-media-dev.s3.amazonaws.com/activities/lin2-insiden-2.jpg'], ${lat(-6)}, ${lng(-6)}, ${dAgo(19)}),
            ('${ACT_LIN_3_ID}', '${aL1}', '${aSh}', '${aAr}', '${periksaFasId}',    'Pengecekan fasilitas: lampu, bangku, pagar - kondisi baik.',        ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin3-periksa-fasilitas.jpg'], ${lat(9)}, ${lng(9)}, ${dAgo(14)}),
            ('${ACT_LIN_4_ID}', '${aL2}', '${aSh}', '${aAr}', '${halauPklId}',      'Menghalau PKL di area parkir taman.',                              ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin4-halau-pkl.jpg'],        ${lat(-7)}, ${lng(-7)}, ${dAgo(7)}),
            ('${ACT_LIN_5_ID}', '${aL1}', '${aSh}', '${aAr}', '${lainnasLinmasId}', 'Koordinasi dengan satpol PP terkait penertiban area taman.',        ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/lin5-koordinasi.jpg'],      ${lat(10)}, ${lng(10)}, ${dAgo(3)})
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('  ✓ Created 5 linmas activities');

        // 3 Korlap activities
        await queryRunner.query(`
          INSERT INTO activities (id, user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at) VALUES
            ('${ACT_KOR_1_ID}', '${aK}', '${aSh}', '${aAr}', '${cekKendaraanId}',  'Pengecekan kendaraan operasional - semua dalam kondisi baik.',  ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/kor1-kendaraan.jpg'],  ${lat(-8)}, ${lng(-8)}, ${dAgo(21)}),
            ('${ACT_KOR_2_ID}', '${aK}', '${aSh}', '${aAr}', '${patroliKorlapId}', 'Patroli area kerja dan koordinasi dengan satgas.',               ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/kor2-patroli.jpg'],    ${lat(11)}, ${lng(11)}, ${dAgo(11)}),
            ('${ACT_KOR_3_ID}', '${aK}', '${aSh}', '${aAr}', '${cekAlatId}',       'Pengecekan alat kerja - menemukan 2 cangkul yang perlu diganti.', ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/kor3-alat.jpg'],     ${lat(-9)}, ${lng(-9)}, ${dAgo(4)})
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('  ✓ Created 3 korlap activities');

        // 30 extended activities for scroll testing (batched)
        await queryRunner.query(`
          INSERT INTO activities (id, user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at)
          SELECT
            CASE gs.n
              WHEN  1 THEN '${ACT_X1_ID}'  WHEN  2 THEN '${ACT_X2_ID}'  WHEN  3 THEN '${ACT_X3_ID}'
              WHEN  4 THEN '${ACT_X4_ID}'  WHEN  5 THEN '${ACT_X5_ID}'  WHEN  6 THEN '${ACT_X6_ID}'
              WHEN  7 THEN '${ACT_X7_ID}'  WHEN  8 THEN '${ACT_X8_ID}'  WHEN  9 THEN '${ACT_X9_ID}'
              WHEN 10 THEN '${ACT_X10_ID}' WHEN 11 THEN '${ACT_X11_ID}' WHEN 12 THEN '${ACT_X12_ID}'
              WHEN 13 THEN '${ACT_X13_ID}' WHEN 14 THEN '${ACT_X14_ID}' WHEN 15 THEN '${ACT_X15_ID}'
              WHEN 16 THEN '${ACT_X16_ID}' WHEN 17 THEN '${ACT_X17_ID}' WHEN 18 THEN '${ACT_X18_ID}'
              WHEN 19 THEN '${ACT_X19_ID}' WHEN 20 THEN '${ACT_X20_ID}' WHEN 21 THEN '${ACT_X21_ID}'
              WHEN 22 THEN '${ACT_X22_ID}' WHEN 23 THEN '${ACT_X23_ID}' WHEN 24 THEN '${ACT_X24_ID}'
              WHEN 25 THEN '${ACT_X25_ID}' WHEN 26 THEN '${ACT_X26_ID}' WHEN 27 THEN '${ACT_X27_ID}'
              WHEN 28 THEN '${ACT_X28_ID}' WHEN 29 THEN '${ACT_X29_ID}' ELSE '${ACT_X30_ID}'
            END::UUID,
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
        console.log('  ✓ Created 30 extended activities (scroll test coverage)');
      } else {
        console.log('  ⚠ Activity types not found, skipping activities');
      }
    }

    // ==========================================
    // SECTION D: Monitoring (Phase 2D)
    // ==========================================
    console.log('');
    console.log('📡 ======== SECTION D: Monitoring (Phase 2D) ========');

    // D.1: Monitoring configs (idempotent)
    console.log('  [D.1] Seeding monitoring configs...');
    const monitoringConfigs = [
      { key: 'status_thresholds', value: JSON.stringify({ active_max_age_seconds: 300, inactive_threshold_seconds: 900, missing_threshold_seconds: 3600, location_ping_interval_seconds: 60 }), description: 'Status calculation thresholds' },
      { key: 'geofencing', value: JSON.stringify({ tolerance_meters: 50, outside_area_grace_seconds: 120 }), description: 'Geofencing tolerance settings' },
      { key: 'map_defaults', value: JSON.stringify({ center_lat: -7.2575, center_lng: 112.7521, zoom: 12, cluster_zoom_threshold: 14, cluster_threshold: 30 }), description: 'Map default view (Surabaya)' },
      { key: 'alerts', value: JSON.stringify({ missing_user_notify: true, understaffed_notify: true, low_battery_threshold: 15 }), description: 'Alert configuration' },
      { key: 'location_ping', value: JSON.stringify({ interval_seconds: 60, batch_size: 10 }), description: 'Mobile location ping settings' },
    ];
    for (const cfg of monitoringConfigs) {
      await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
    }
    console.log(`    ✓ ${monitoringConfigs.length} monitoring configs inserted`);

    // D.2: Backfill user_tracking_status for all clockable users (offline default)
    console.log('  [D.2] Backfilling user_tracking_status...');
    const clockableUsers = await queryRunner.query(
      `SELECT id, area_id FROM users
       WHERE role IN ('satgas', 'linmas', 'korlap', 'admin_data') AND deleted_at IS NULL`,
    );
    for (const user of clockableUsers) {
      await queryRunner.query(
        `INSERT INTO user_tracking_status (user_id, status, area_id, updated_at)
         VALUES ($1, 'offline', $2, NOW())
         ON CONFLICT (user_id) DO NOTHING`,
        [user.id, user.area_id],
      );
    }
    console.log(`    ✓ ${clockableUsers.length} users backfilled as offline`);

    // D.3: Set varied status scenarios for monitoring dashboard testing
    console.log('  [D.3] Setting monitoring status variants...');

    // active: satgas1 + linmas1 (has active shift + recent location from Phase 1)
    await queryRunner.query(`
      UPDATE user_tracking_status uts SET
        status = 'active',
        shift_id = s.id,
        is_within_area = TRUE,
        last_location_at = NOW() - INTERVAL '2 minutes',
        updated_at = NOW()
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE u.username IN ('satgas1', 'linmas1')
        AND s.user_id = uts.user_id
        AND s.clock_out_time IS NULL
    `);

    // inactive: satgas2 (active shift but last ping 35min ago — between 15min and 60min threshold)
    await queryRunner.query(`
      UPDATE user_tracking_status uts SET
        status = 'inactive',
        shift_id = s.id,
        is_within_area = TRUE,
        last_location_at = NOW() - INTERVAL '35 minutes',
        updated_at = NOW()
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE u.username = 'satgas2'
        AND s.user_id = uts.user_id
        AND s.clock_out_time IS NULL
    `);

    // outside_area: satgas3 (shift active, but location logs outside boundary — seeded in Phase 1)
    await queryRunner.query(`
      UPDATE user_tracking_status uts SET
        status = 'outside_area',
        shift_id = s.id,
        is_within_area = FALSE,
        last_location_at = NOW() - INTERVAL '5 minutes',
        updated_at = NOW()
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE u.username = 'satgas3'
        AND s.user_id = uts.user_id
        AND s.clock_out_time IS NULL
    `);

    // missing: satgas_timur1_1 — give active shift with no recent location (>60min gap)
    // First create the shift for satgas_timur1_1
    await queryRunner.query(`
      INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng, clock_in_photo_url, clock_out_time, created_at, updated_at)
      SELECT u.id, COALESCE(u.area_id, (SELECT id FROM areas LIMIT 1)),
        NOW() - INTERVAL '5 hours', -7.2450, 112.7600,
        'https://sekar-media-dev.s3.amazonaws.com/clock-in/satgas-timur1-001.jpg',
        NULL, NOW() - INTERVAL '5 hours', NOW() - INTERVAL '5 hours'
      FROM users u WHERE u.username = 'satgas_timur1_1' LIMIT 1
      ON CONFLICT DO NOTHING;
    `);
    // Then set missing status (shift exists, but no location ping for 3+ hours)
    await queryRunner.query(`
      UPDATE user_tracking_status uts SET
        status = 'missing',
        shift_id = s.id,
        is_within_area = FALSE,
        last_location_at = NOW() - INTERVAL '3 hours 15 minutes',
        updated_at = NOW()
      FROM shifts s
      JOIN users u ON s.user_id = u.id
      WHERE u.username = 'satgas_timur1_1'
        AND s.user_id = uts.user_id
        AND s.clock_out_time IS NULL
    `);

    console.log('    ✓ Status variants set:');
    console.log('      active:       satgas1, linmas1 (recent location within boundary)');
    console.log('      inactive:     satgas2 (last ping 35 min ago)');
    console.log('      outside_area: satgas3 (location outside boundary)');
    console.log('      missing:      satgas_timur1_1 (no ping for 3h+)');
    console.log('      offline:      all others');

    console.log('');
    console.log('✅ Phase 2 Seeding Completed Successfully!');
    console.log('');
    console.log('Summary:');
    console.log('  Section A (Core Phase 2 Data):');
    console.log('    - 7 Rayons, 3 Shift Definitions, 20 Activity Types, 4 Special Day Overrides');
    console.log('    - ~30 Users (9 Phase2C roles + 15 new rayon coverage + Phase1 users)');
    console.log('    - 8 Areas (3 Phase1 + 5 new for missing rayons)');
    console.log('    - 29 Staff Requirements (14 Taman Bungkul + 15 new areas)');
    console.log('    - 3 Notification Tokens (satgas1, satgas2, linmas1)');
    console.log('    - 10 Overtime records, Phase 2C shifts');
    console.log('  Section B (Tasks):');
    console.log('    - 8 satgas core tasks (all 8 statuses covered)');
    console.log('    - 4 linmas tasks, 3 korlap tasks, 4 rayon-scoped tasks');
    console.log('    - 25 extended tasks for scroll/filter testing');
    console.log('  Section C (Activities):');
    console.log('    - 12 satgas + 5 linmas + 3 korlap = 20 core activities');
    console.log('    - 30 extended activities for scroll testing');
    console.log('    - Total: 50 activities spanning 60-day date range');
    console.log('  Section D (Monitoring Phase 2D):');
    console.log('    - 5 monitoring configs (thresholds, geofencing, map, alerts, ping)');
    console.log('    - user_tracking_status backfilled for all clockable users');
    console.log('    - Status variants: active×2, inactive×1, outside_area×1, missing×1, offline×rest');
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
