import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import { seedPhase3Reference, seedPhase3ServiceCapacity } from './seed-phase3';

config();

/**
 * Reference Data Seeder — Production Safe
 *
 * Seeds ONLY idempotent reference/config data using ON CONFLICT DO NOTHING.
 * Safe to run in staging and production — will NOT wipe any existing data.
 * Safe to re-run multiple times with no side effects.
 *
 * Seeded:
 *   - 4   area types         (park, pedestrian, mini_garden, street)
 *   - 3   shift definitions  (SHIFT1, SHIFT2, SHIFT3)
 *   - 7   rayons             (7 Surabaya geographic sectors)
 *   - 20  activity types     (8 satgas, 5 linmas, 4 korlap, 3 admin_data)
 *   - 4   special day overrides (Indonesian holidays)
 *   - 5   monitoring configs (Phase 2D)
 *   - 4   monitoring configs (Phase 3 — plants/capacity/pruning/seeds)
 *   - 128 plant_species      (Phase 3)
 *   - service_capacity grid  (Phase 3 — 7 rayons × 12 ISO weeks ahead, capacity_units=0)
 *   - 1   default superadmin user (for initial prod login)
 *
 * NOT seeded (dev/demo data):
 *   Users (other than superadmin), areas, tasks, activities, location_logs,
 *   shifts, schedules, area_plants, pruning_requests, plant_seeds.
 *
 * Run (dev):  npm run db:seed:reference
 * Run (prod): npm run db:seed:prod
 */

const RAYON_1_ID = '085a298f-d8e9-435c-8a3b-998ffa47a26e'; // SELATAN
const RAYON_2_ID = '861a7e7c-8bd5-4e73-8aa7-e92988959dca'; // UTARA
const RAYON_3_ID = 'd564809d-316f-4a2a-a1c6-671eebb49653'; // PUSAT
const RAYON_4_ID = '42934ad5-4ea0-4537-abb6-cf7e984e2d39'; // TIMUR1
const RAYON_5_ID = '742a135b-ddeb-45ca-8d0a-88d7d08aa78a'; // TIMUR2
const RAYON_6_ID = 'bf040137-fce4-4016-b5e7-704ad82c1594'; // BARAT1
const RAYON_7_ID = '7422e6ee-0693-4565-9016-d4f759bdeed2'; // BARAT2
const RAYON_TAMAN_AKTIF_ID = '8a8a8a8a-1111-4222-9333-444444444444'; // logical bucket for taman aktif parks (no boundary)

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

// Pre-computed bcrypt hash for "password123"
const PASSWORD_HASH = '$2b$10$gF9qXRA.0ZtNWgbrwoYHMOmdUFUbaL4AkGdxAEMDMrMZtFexnH.H.';

async function seedReference() {
  console.log('🔧 Reference Data Seeder (Production-Safe) Started...');

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: false,
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // ============================================================
    // 1. AREA TYPES (4) — idempotent
    // ============================================================
    console.log('\n🏷️  Seeding area types...');
    await queryRunner.query(`
      INSERT INTO area_types (code, name, description, category) VALUES
        ('park',        'Taman',      'Taman kota dan ruang terbuka hijau publik',                'ACTIVE'),
        ('pedestrian',  'Trotoar',    'Jalur pejalan kaki di sepanjang jalan raya',               'PASSIVE'),
        ('mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan',             'ACTIVE'),
        ('street',      'Jalanan',    'Jalanan umum yang memerlukan pemeliharaan kebersihan',      'PASSIVE')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 4 area types (idempotent)');

    // ============================================================
    // 2. SHIFT DEFINITIONS (3) — idempotent
    // ============================================================
    console.log('\n⏰ Seeding shift definitions...');
    await queryRunner.query(`
      INSERT INTO shift_definitions (id, name, code, start_time, end_time, crosses_midnight, is_active) VALUES
        ('${SHIFT_1_ID}', 'Shift 1', 'SHIFT1', '06:00:00', '15:00:00', FALSE, TRUE),
        ('${SHIFT_2_ID}', 'Shift 2', 'SHIFT2', '15:00:00', '23:00:00', FALSE, TRUE),
        ('${SHIFT_3_ID}', 'Shift 3', 'SHIFT3', '21:00:00', '05:00:00', TRUE,  TRUE)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 3 shift definitions (SHIFT1/2/3)');

    // ============================================================
    // 3. RAYONS (7) — idempotent
    // ============================================================
    console.log('\n🗺️  Seeding rayons...');
    await queryRunner.query(`
      INSERT INTO rayons (id, name, code, description) VALUES
        ('${RAYON_1_ID}', 'Rayon Selatan', 'SELATAN', 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan'),
        ('${RAYON_2_ID}', 'Rayon Utara',   'UTARA',   'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak'),
        ('${RAYON_3_ID}', 'Rayon Pusat',   'PUSAT',   'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto'),
        ('${RAYON_4_ID}', 'Rayon Timur 1', 'TIMUR1',  'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo'),
        ('${RAYON_5_ID}', 'Rayon Timur 2', 'TIMUR2',  'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar'),
        ('${RAYON_6_ID}', 'Rayon Barat 1', 'BARAT1',  'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo'),
        ('${RAYON_7_ID}', 'Rayon Barat 2', 'BARAT2',  'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep'),
        ('${RAYON_TAMAN_AKTIF_ID}', 'Rayon Taman Aktif', 'TAMAN_AKTIF', 'Bucket logis untuk taman aktif (active parks) lintas-rayon — tidak punya batas geografis')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 8 rayons (7 geographic + Rayon Taman Aktif)');

    // ============================================================
    // 3b. KECAMATANS (31) — idempotent — May 2026
    // ============================================================
    console.log('\n🏘️  Seeding kecamatans...');
    await queryRunner.query(`
      INSERT INTO kecamatans (name, code, rayon_id, region) VALUES
        -- Surabaya Pusat (4)
        ('Bubutan',          'bubutan',          '${RAYON_3_ID}', 'pusat'),
        ('Genteng',          'genteng',          '${RAYON_3_ID}', 'pusat'),
        ('Simokerto',        'simokerto',        '${RAYON_3_ID}', 'pusat'),
        ('Tegalsari',        'tegalsari',        '${RAYON_3_ID}', 'pusat'),
        -- Surabaya Timur — Rayon Timur 1 (3) + Rayon Timur 2 (4)
        ('Tambaksari',       'tambaksari',       '${RAYON_4_ID}', 'timur'),
        ('Gubeng',           'gubeng',           '${RAYON_4_ID}', 'timur'),
        ('Sukolilo',         'sukolilo',         '${RAYON_4_ID}', 'timur'),
        ('Mulyorejo',        'mulyorejo',        '${RAYON_5_ID}', 'timur'),
        ('Rungkut',          'rungkut',          '${RAYON_5_ID}', 'timur'),
        ('Tenggilis Mejoyo', 'tenggilis_mejoyo', '${RAYON_5_ID}', 'timur'),
        ('Gunung Anyar',     'gunung_anyar',     '${RAYON_5_ID}', 'timur'),
        -- Surabaya Barat — Rayon Barat 1 (5) + Rayon Barat 2 (2)
        ('Sukomanunggal',    'sukomanunggal',    '${RAYON_6_ID}', 'barat'),
        ('Tandes',           'tandes',           '${RAYON_6_ID}', 'barat'),
        ('Asemrowo',         'asemrowo',         '${RAYON_6_ID}', 'barat'),
        ('Benowo',           'benowo',           '${RAYON_6_ID}', 'barat'),
        ('Pakal',            'pakal',            '${RAYON_6_ID}', 'barat'),
        ('Sambikerep',       'sambikerep',       '${RAYON_7_ID}', 'barat'),
        ('Lakarsantri',      'lakarsantri',      '${RAYON_7_ID}', 'barat'),
        -- Surabaya Utara — Rayon Utara (5)
        ('Krembangan',       'krembangan',       '${RAYON_2_ID}', 'utara'),
        ('Pabean Cantian',   'pabean_cantian',   '${RAYON_2_ID}', 'utara'),
        ('Semampir',         'semampir',         '${RAYON_2_ID}', 'utara'),
        ('Kenjeran',         'kenjeran',         '${RAYON_2_ID}', 'utara'),
        ('Bulak',            'bulak',            '${RAYON_2_ID}', 'utara'),
        -- Surabaya Selatan — Rayon Selatan (8)
        ('Wonokromo',        'wonokromo',        '${RAYON_1_ID}', 'selatan'),
        ('Wonocolo',         'wonocolo',         '${RAYON_1_ID}', 'selatan'),
        ('Gayungan',         'gayungan',         '${RAYON_1_ID}', 'selatan'),
        ('Jambangan',        'jambangan',        '${RAYON_1_ID}', 'selatan'),
        ('Sawahan',          'sawahan',          '${RAYON_1_ID}', 'selatan'),
        ('Dukuh Pakis',      'dukuh_pakis',      '${RAYON_1_ID}', 'selatan'),
        ('Wiyung',           'wiyung',           '${RAYON_1_ID}', 'selatan'),
        ('Karang Pilang',    'karang_pilang',    '${RAYON_1_ID}', 'selatan')
      ON CONFLICT (code) DO UPDATE
        SET rayon_id = EXCLUDED.rayon_id,
            region   = EXCLUDED.region,
            name     = EXCLUDED.name
    `);
    console.log('  ✓ 31 kecamatans (4 Pusat + 7 Timur + 7 Barat + 5 Utara + 8 Selatan)');

    // ============================================================
    // 4. ACTIVITY TYPES (20) — idempotent
    // ============================================================
    console.log('\n🔧 Seeding activity types...');

    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('${AT_PERAWATAN_ID}',    'Perawatan',                 'perawatan',          'Perawatan tanaman dan area',             ARRAY['satgas'], TRUE),
        ('${AT_PENANAMAN_ID}',    'Penanaman',                 'penanaman',          'Penanaman tanaman baru',                 ARRAY['satgas'], TRUE),
        ('${AT_PERANTINGAN_ID}',  'Perantingan',               'perantingan',        'Pemangkasan ranting pohon',              ARRAY['satgas'], TRUE),
        ('${AT_PENYIRAMAN_ID}',   'Penyiraman',                'penyiraman',         'Penyiraman tanaman',                     ARRAY['satgas'], TRUE),
        ('${AT_PENYULAMAN_ID}',   'Penyulaman',                'penyulaman',         'Penggantian tanaman mati',               ARRAY['satgas'], TRUE),
        ('${AT_POTONG_RUMPUT_ID}','Potong Rumput',             'potong_rumput',      'Pemotongan rumput',                      ARRAY['satgas'], TRUE),
        ('${AT_ANGKUT_SAMPAH_ID}','Angkut Sampah',             'angkut_sampah',      'Pengangkutan sampah',                    ARRAY['satgas'], TRUE),
        ('${AT_LAINNYA_SATGAS_ID}','Lainnya',                  'lainnya_satgas',     'Aktivitas satgas lainnya',               ARRAY['satgas'], TRUE),
        ('${AT_PATROLI_ID}',      'Patroli',                   'patroli',            'Patroli keamanan area',                  ARRAY['linmas'], TRUE),
        ('${AT_INSIDEN_ID}',      'Insiden',                   'insiden',            'Pelaporan insiden keamanan',             ARRAY['linmas'], TRUE),
        ('${AT_PERIKSA_FASILITAS_ID}','Memeriksa Kondisi Fasilitas','periksa_fasilitas','Pemeriksaan kondisi fasilitas',       ARRAY['linmas'], TRUE),
        ('${AT_HALAU_PKL_ID}',    'Halau PKL',                 'halau_pkl',          'Penertiban pedagang kaki lima',          ARRAY['linmas'], TRUE),
        ('${AT_LAINNYA_LINMAS_ID}','Lainnya',                  'lainnya_linmas',     'Aktivitas linmas lainnya',              ARRAY['linmas'], TRUE),
        ('${AT_CEK_KENDARAAN_ID}','Pengecekan Kendaraan',      'cek_kendaraan',      'Pemeriksaan kendaraan operasional',      ARRAY['korlap'], TRUE),
        ('${AT_PATROLI_KORLAP_ID}','Patroli',                  'patroli_korlap',     'Patroli area kerja',                     ARRAY['korlap'], TRUE),
        ('${AT_CEK_ALAT_ID}',     'Pengecekan Alat',           'cek_alat',           'Pemeriksaan peralatan kerja',            ARRAY['korlap'], TRUE),
        ('${AT_LAINNYA_KORLAP_ID}','Lainnya',                  'lainnya_korlap',     'Aktivitas korlap lainnya',              ARRAY['korlap'], TRUE),
        ('${AT_CEK_ABSENSI_ID}',  'Cek Absensi',               'cek_absensi',        'Pengecekan data absensi',                ARRAY['admin_data'], TRUE),
        ('${AT_ENTRI_LAPORAN_ID}','Cek dan Entri Laporan',     'entri_laporan',      'Pengecekan dan entri laporan',           ARRAY['admin_data'], TRUE),
        ('${AT_LAINNYA_ADMIN_DATA_ID}','Lainnya',              'lainnya_admin_data', 'Aktivitas admin data lainnya',           ARRAY['admin_data'], TRUE)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 20 activity types (8 satgas, 5 linmas, 4 korlap, 3 admin_data)');

    // ============================================================
    // 5. SPECIAL DAY OVERRIDES (4 holidays) — idempotent
    // ============================================================
    console.log('\n📅 Seeding special day overrides...');
    await queryRunner.query(`
      INSERT INTO special_day_overrides (id, date, day_type, name) VALUES
        ('${SPECIAL_DAY_1_ID}', '2026-08-17', 'HOLIDAY', 'Hari Kemerdekaan'),
        ('${SPECIAL_DAY_2_ID}', '2026-12-25', 'HOLIDAY', 'Natal'),
        ('${SPECIAL_DAY_3_ID}', '2026-01-01', 'HOLIDAY', 'Tahun Baru'),
        ('${SPECIAL_DAY_4_ID}', '2026-05-01', 'HOLIDAY', 'Hari Buruh')
      ON CONFLICT (date) DO NOTHING
    `);
    console.log('  ✓ 4 special day overrides (Indonesian holidays)');

    // ============================================================
    // 6. MONITORING CONFIGS (5) — idempotent
    // ============================================================
    console.log('\n📡 Seeding monitoring configs...');
    const configs = [
      {
        key: 'status_thresholds',
        value: JSON.stringify({
          active_max_age_seconds: 300,
          inactive_threshold_seconds: 900,
          missing_threshold_seconds: 3600,
          location_ping_interval_seconds: 60,
        }),
        description: 'Status calculation thresholds',
      },
      {
        key: 'geofencing',
        value: JSON.stringify({
          tolerance_meters: 50,
          outside_area_grace_seconds: 120,
        }),
        description: 'Geofencing tolerance settings',
      },
      {
        key: 'map_defaults',
        value: JSON.stringify({
          center_lat: -7.2575,
          center_lng: 112.7521,
          zoom: 12,
          cluster_zoom_threshold: 14,
          cluster_threshold: 30,
        }),
        description: 'Map default view settings (Surabaya)',
      },
      {
        key: 'alerts',
        value: JSON.stringify({
          missing_user_notify: true,
          understaffed_notify: true,
          low_battery_threshold: 20,
        }),
        description: 'Alert configuration',
      },
      {
        key: 'location_ping',
        value: JSON.stringify({
          interval_seconds: 60,
          batch_size: 10,
        }),
        description: 'Mobile location ping settings',
      },
    ];

    for (const cfg of configs) {
      await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
    }
    console.log('  ✓ 5 monitoring configs');

    // ============================================================
    // 6b. PHASE 3 REFERENCE DATA (idempotent)
    // ============================================================
    const phase3SchemaCheck = await queryRunner.query(
      `SELECT to_regclass('public.plant_species') AS exists`,
    );
    if (phase3SchemaCheck[0]?.exists) {
      console.log('\n🌳 Seeding Phase 3 reference data...');
      await seedPhase3Reference(queryRunner);
      await seedPhase3ServiceCapacity(queryRunner, 0); // capacity_units=0 in prod; admins set per-rayon
    } else {
      console.log('\n⚠️  Phase 3 tables not found — skipping Phase 3 reference seed.');
      console.log('   Run `npm run migration:run` first, then re-run the seeder.');
    }

    // ============================================================
    // 7. DEFAULT SUPERADMIN (1) — idempotent, for initial prod login
    // ============================================================
    console.log('\n👤 Seeding default superadmin...');
    await queryRunner.query(
      `INSERT INTO users (username, password_hash, full_name, role, is_active)
       VALUES ('admin', $1, 'System Administrator', 'superadmin', TRUE)
       ON CONFLICT (username) DO NOTHING`,
      [PASSWORD_HASH],
    );
    console.log(
      '  ✓ Default superadmin (admin / password123) — change password after first login!',
    );

    console.log('\n✅ Reference Data Seeding Completed!');
    console.log(
      '\n⚠️  Production note: Change the default admin password immediately after first login.',
    );
    console.log('\nSummary:');
    console.log('  - 4   area types');
    console.log('  - 3   shift definitions');
    console.log('  - 7   rayons');
    console.log('  - 20  activity types');
    console.log('  - 4   special day overrides');
    console.log('  - 5   monitoring configs (Phase 2D)');
    console.log('  - 4   monitoring configs (Phase 3)');
    console.log('  - 128 plant_species (Phase 3)');
    console.log('  - service_capacity grid (Phase 3, 7 × 12 weeks)');
    console.log('  - 1   default superadmin');
  } catch (error) {
    console.error('❌ Reference data seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedReference()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
