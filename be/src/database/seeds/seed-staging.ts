import { DataSource } from 'typeorm';
import '../../config/load-env';
import { seedPhase3Reference, seedPhase3ServiceCapacity } from './seed-phase3';
import { DEFAULT_PASSWORD_HASH } from './constants';
import { loadKmzAreas, loadTamanAktifAreas, loadSeedUsers } from './load-seed-data';
import {
  RAYON_BOUNDARIES,
  parseCoords,
  computeCentroidFromRings,
  computeAreaM2FromRings,
  toGeoJsonGeometry,
  surabayaOutlinePolygon,
  BUNGKUL_AREA_ID,
  BUNGKUL_COORD_STRINGS,
  TAMAN_FLORA_AREA_ID,
  TAMAN_FLORA_CENTER,
  RAYON_TAMAN_AKTIF_OFFICE,
  type RayonCode,
} from './kmz-areas';

/**
 * Staging / UAT Seed Script
 *
 * DESTRUCTIVE — wipes all tables first, then seeds clean UAT data.
 * Scoped to Rayon Pusat only.
 *
 * Policy: ESSENTIALS-ONLY. Staging carries reference data + users + the
 * minimum structural rows the app needs to boot (areas, user_areas,
 * area_staff_requirements, service_capacity grid). It does NOT carry
 * dummy transaction or sample workflow data — UAT testers create their
 * own pruning_requests, area_plants, plant_seeds, etc., mirroring how
 * production starts.
 *
 * Reference data seeded:
 *   - 4   area types       (park, pedestrian, mini_garden, street)
 *   - 3   shift definitions (SHIFT1/2/3)
 *   - 7   rayons            (all Surabaya sectors; only Pusat has areas)
 *   - 20  activity types
 *   - 4   special day overrides
 *   - 5+4 monitoring configs (Phase 2D + Phase 3)
 *   - 128 plant_species     (Phase 3 reference catalog)
 *   - service_capacity grid (7 rayons × 12 ISO weeks × pruning, units=5)
 *
 * UAT structural data seeded (NOT transaction data):
 *   - 13 areas  (1 Taman Bungkul + 12 Kawasan Darmo pedestrian, from KMZ)
 *   - users: 14 test + 30 per-rayon dummy + the full real roster (data/users.csv) + 31 staff_kecamatan
 *   - user_areas assignments (permanent)
 *   - shift_definition_id assignments (field workers → SHIFT1; non-field → NULL)
 *   - user_tracking_status  (all offline — testing starts clean)
 *   - schedules (TODAY's roster, materialized from templates + 1 demo leave)
 *   - schedule_areas (TODAY's area assignments, derived from user_areas)
 *   - area_staff_requirements (1 satgas + 1 linmas per area, SHIFT1/WEEKDAY)
 *
 * Empty tables (UAT writes its own rows):
 *   - shifts, activities, tasks, overtimes, location_logs, schedules
 *   - area_plants, notable_plants, pruning_requests, plant_seeds, seed_transactions
 *
 * Run: npm run db:seed:staging
 *
 * =============================================================================
 * TEST USERS (all passwords: Password123!)
 * Login via username OR phone number as "identifier"
 * =============================================================================
 *
 * | Role            | Username                | Phone          | Area/Rayon                             |
 * |-----------------|-------------------------|----------------|----------------------------------------|
 * | superadmin      | superadmin              | 081200000010   | —                                      |
 * | admin_system    | admin_system_1           | 081200000011   | —                                      |
 * | top_management  | top_management_1         | 081200000012   | —                                      |
 * | kepala_rayon    | kepala_rayon_pusat_1      | 081200000013   | Rayon Pusat                            |
 * | admin_data      | admin_data_pusat_1      | 081200000014   | Rayon Pusat                            |
 * | korlap          | korlap_pusat_1          | 081200000015   | 12 Rayon Pusat pedestrian (Darmo P3 primary) |
 * | korlap          | korlap_pusat_2          | 081200000016   | 12 Rayon Pusat pedestrian (Darmo P1 primary) |
 * | korlap          | korlap_pusat_3        | 081200000017   | Darmo Pulau 2 only                     |
 * | satgas          | satgas_pusat_1          | 081200000018   | 12 Rayon Pusat pedestrian (Darmo P1 primary) |
 * | satgas          | satgas_pusat_2          | 081200000019   | 12 Rayon Pusat pedestrian (Darmo P2 primary) |
 * | linmas          | linmas_pusat_1          | 081200000020   | 12 Rayon Pusat pedestrian (Darmo BCA primary) |
 * | linmas          | linmas_pusat_2          | 081200000021   | Darmo Pulau 5 only                     |
 * | satgas          | satgas_pusat_3        | 081200000022   | Darmo Pulau 4 only                     |
 * | satgas          | satgas_taman_bungkul_1  | 081200000060   | Taman Bungkul (Rayon Taman Aktif)      |
 * | korlap          | korlap_taman_aktif_1    | 081200000061   | Rayon Taman Aktif — Bungkul + Flora    |
 * | linmas          | linmas_taman_aktif_1    | 081200000062   | Rayon Taman Aktif — Taman Bungkul      |
 * | kepala_rayon    | kepala_rayon_taman_aktif_1 | 081200000063 | Rayon Taman Aktif                      |
 * | admin_data      | admin_data_taman_aktif_1 | 081200000064  | Rayon Taman Aktif                      |
 * | satgas          | satgas_taman_flora_1    | 081200000065   | Taman Flora (Rayon Taman Aktif)        |
 *
 * REAL USERS (all passwords: Password123!)
 *
 * | Role            | Username                | Phone          | Area/Rayon                             |
 * |-----------------|-------------------------|----------------|----------------------------------------|
 * | top_management  | pramudita_yustiani      | 08563302643    | —                                      |
 * | superadmin      | wahyu_tri_p             | 081232939377   | —                                      |
 * | kepala_rayon    | budi_setyo_utomo        | 081200000001   | Rayon Pusat                            |
 * | admin_data      | ponco_adi_prabowo       | 081200000002   | Rayon Pusat                            |
 * | satgas          | rakhmat_novianto        | 087825841818   | Jl. Raya Darmo Pulau 1                 |
 * | satgas          | roy_junaidi             | 083854355341   | Jl. Raya Darmo Pulau 2                 |
 * | satgas          | edi_santoso             | 085855434561   | Taman Bungkul (Rayon Taman Aktif)      |
 * | satgas          | jihan_nabila_safitri    | 08970900786    | Taman Bungkul (Rayon Taman Aktif)      |
 * | linmas          | deni_purwanto           | 081554017822   | Taman Bungkul (Rayon Taman Aktif)      |
 * | linmas          | agus_ramadhan           | 083831353889   | Taman Bungkul (Rayon Taman Aktif)      |
 * =============================================================================
 */

// ============================================================
// REFERENCE DATA UUIDs — reused from seed-reference.ts
// ============================================================
const RAYON_SELATAN_ID = '085a298f-d8e9-435c-8a3b-998ffa47a26e';
const RAYON_UTARA_ID = '861a7e7c-8bd5-4e73-8aa7-e92988959dca';
const RAYON_PUSAT_ID = 'd564809d-316f-4a2a-a1c6-671eebb49653';
const RAYON_TIMUR1_ID = '42934ad5-4ea0-4537-abb6-cf7e984e2d39';
const RAYON_TIMUR2_ID = '742a135b-ddeb-45ca-8d0a-88d7d08aa78a';
const RAYON_BARAT1_ID = 'bf040137-fce4-4016-b5e7-704ad82c1594';
const RAYON_BARAT2_ID = '7422e6ee-0693-4565-9016-d4f759bdeed2';
/** Logical (non-geographic) rayon for taman aktif parks city-wide. */
const RAYON_TAMAN_AKTIF_ID = '8a8a8a8a-1111-4222-9333-444444444444';

const SHIFT_1_ID = 'ca18ac41-2577-4f67-abfa-adaae27b75c8';
const SHIFT_2_ID = '28822613-65de-47e4-a9b4-7b9bfd437f8a';
const SHIFT_3_ID = '85860407-7b2d-425a-87cc-7a94bb47e5d8';

const AT_PERAWATAN_ID = 'ddc94ad6-a625-4c27-964f-10f3a79a6794';
const AT_PENANAMAN_ID = 'a8cf5d46-1435-413b-ae03-8ea135bd5fb3';
const AT_PERANTINGAN_ID = '8a890970-5fc8-4672-ae6f-b945cb80bba5';
const AT_PENYIRAMAN_ID = '2eaed437-c662-4285-b9a7-8c7d5d0755b7';
const AT_PENYULAMAN_ID = '70c75e9a-df48-4c71-89d5-91978112103f';
const AT_POTONG_RUMPUT_ID = '715b8196-8473-4afe-9103-adb6c2ee7c50';
const AT_ANGKUT_SAMPAH_ID = 'eef48fdc-e235-4a03-9fc4-517cff92c8bb';
const AT_LAINNYA_SATGAS_ID = '4153cd86-c6bf-4f06-b536-5016a74114d5';
const AT_PATROLI_ID = 'dd7efc02-36fe-4e70-b4b5-bfa163fc3bb0';
const AT_INSIDEN_ID = '3a37e00b-7702-4296-b387-96964b45e251';
const AT_PERIKSA_FASILITAS_ID = 'b4e7c1a2-3d5f-4e8a-9b0c-1d2e3f4a5b6c';
const AT_HALAU_PKL_ID = 'c5f8d2b3-4e6a-4f9b-8c1d-2e3f4a5b6c7d';
const AT_LAINNYA_LINMAS_ID = 'd6a9e3c4-5f7b-4a0c-9d2e-3f4a5b6c7d8e';
const AT_CEK_KENDARAAN_ID = 'e7b0f4d5-6a8c-4b1d-8e3f-4a5b6c7d8e9f';
const AT_PATROLI_KORLAP_ID = 'f8c1a5e6-7b9d-4c2e-9f4a-5b6c7d8e9f0a';
const AT_CEK_ALAT_ID = 'a9d2b6f7-8c0e-4d3f-8a5b-6c7d8e9f0a1b';
const AT_LAINNYA_KORLAP_ID = 'b0e3c7a8-9d1f-4e4a-9b6c-7d8e9f0a1b2c';
const AT_CEK_ABSENSI_ID = 'c1f4d8b9-0e2a-4f5b-8c7d-8e9f0a1b2c3d';
const AT_ENTRI_LAPORAN_ID = 'd2a5e9c0-1f3b-4a6c-9d8e-9f0a1b2c3d4e';
const AT_LAINNYA_ADMIN_DATA_ID = 'e3b6f0d1-2a4c-4b7d-8e9f-0a1b2c3d4e5f';

const SPECIAL_DAY_1_ID = 'aee11144-0a99-458f-90b2-3df456f5bdf0';
const SPECIAL_DAY_2_ID = 'd2bb4962-0d2e-46fb-b45d-c3038254f5c4';
const SPECIAL_DAY_3_ID = '72bfe1fd-6285-4853-a4a9-d75e8edc65e6';
const SPECIAL_DAY_4_ID = '8a8ff3d8-8c45-461e-b66c-8563c04cbbd5';

// ============================================================
// STAGING AREA UUIDs — re-exported from ./kmz-areas for backward compat.
// Real polygon coordinates + the 13 Rayon Pusat AreaDef[] live in kmz-areas.ts;
// Rayon Timur 2 (25 areas) was added 2026-05-18 from KORLAP BERLIAN SABRINA
// MAZAYA.kmz. Rayon Pusat user_area assignments below still scope only to
// the 13 Pusat areas — Timur 2 has its own staffing.
// ============================================================
const AREA_BUNGKUL_ID = BUNGKUL_AREA_ID;

// ============================================================
// STAGING USER UUIDs
// ============================================================
// Test users
const USER_SUPERADMIN_ID = '53b4c5d6-e7f8-4690-1234-567879809102'; // superadmin
const USER_ADMIN_SYS_ID = '53c5d6e7-f8a9-4701-2345-678980910213'; // admin_system_1
const USER_TOP_MGMT_ID = '53d6e7f8-a9b0-4812-3456-789091021324'; // top_management_1
const USER_KEPALA_RAYON_ID = '53e7f8a9-b0c1-4923-4567-890102132435'; // kepala_rayon_pusat_1
const USER_ADMIN_DATA_ID = '53f8a9b0-c1d2-4a34-5678-901213243546'; // admin_data_pusat_1
const USER_KORLAP_PUSAT1_ID = '54a9b0c1-d2e3-4b45-6789-012324354657'; // korlap_pusat_1
const USER_KORLAP_PUSAT2_ID = '54b0c1d2-e3f4-4c56-7890-123435465768'; // korlap_pusat_2
const USER_KORLAP_BUNGKUL_ID = '54c1d2e3-f4a5-4d67-8901-234546576879'; // korlap_pusat_3
const USER_SATGAS_PUSAT1_ID = '54d2e3f4-a5b6-4e78-9012-345657687980'; // satgas_pusat_1
const USER_SATGAS_PUSAT2_ID = '54e3f4a5-b6c7-4f89-0123-456768798091'; // satgas_pusat_2
const USER_LINMAS_PUSAT1_ID = '54f4a5b6-c7d8-4090-1234-567879809102'; // linmas_pusat_1
const USER_LINMAS_PUSAT2_ID = '55a5b6c7-d8e9-4101-2345-678980910213'; // linmas_pusat_2
const USER_SATGAS_BUNGKUL_ID = '55b6c7d8-e9f0-4212-3456-789091021324'; // satgas_pusat_3
const USER_STAFF_KECAMATAN_PUSAT_ID = '55b6c7d8-e9f0-4212-3456-789091021325'; // staff_kecamatan_pusat_1 (Phase 3 — public intake)
// Real users
const USER_PRAMUDITA_ID = '55c7d8e9-f0a1-4323-4567-890102132435'; // pramudita_yustiani
const USER_WAHYU_ID = '55d8e9f0-a1b2-4434-5678-901213243546'; // wahyu_tri_p
const USER_BUDI_ID = '55e9f0a1-b2c3-4545-6789-012324354657'; // budi_setyo_utomo
const USER_PONCO_ID = '55f0a1b2-c3d4-4656-7890-123435465768'; // ponco_adi_prabowo
const USER_RAKHMAT_ID = '56a1b2c3-d4e5-4767-8901-234546576879'; // rakhmat_novianto
const USER_ROY_ID = '56b2c3d4-e5f6-4878-9012-345657687980'; // roy_junaidi
const USER_EDI_ID = '56c3d4e5-f6a7-4989-0123-456768798091'; // edi_santoso
const USER_JIHAN_ID = '56d4e5f6-a7b8-4090-1234-567879809102'; // jihan_nabila_safitri
const USER_DENI_ID = '56e5f6a7-b8c9-4101-2345-678980910213'; // deni_purwanto
const USER_AGUS_ID = '56f6a7b8-c9d0-4212-3456-789091021324'; // agus_ramadhan

// Default account password hash (bcrypt of "Password123!") — shared across all seeders.
const PASSWORD_HASH = DEFAULT_PASSWORD_HASH;

// Rayon ID → code lookup so the boundary-update loop can hit the right row.
const RAYON_ID_BY_CODE: Record<RayonCode, string> = {
  SELATAN: RAYON_SELATAN_ID,
  UTARA: RAYON_UTARA_ID,
  PUSAT: RAYON_PUSAT_ID,
  TIMUR1: RAYON_TIMUR1_ID,
  TIMUR2: RAYON_TIMUR2_ID,
  BARAT1: RAYON_BARAT1_ID,
  BARAT2: RAYON_BARAT2_ID,
  TAMAN_AKTIF: RAYON_TAMAN_AKTIF_ID,
};

// ============================================================
// MAIN SEEDER
// ============================================================

async function seedStaging() {
  console.log('');
  console.log(
    '╔══════════════════════════════════════════════════════════════════════════════════╗',
  );
  console.log('║  🚀 Staging / UAT Seeder — Rayon Pusat                                         ║');
  console.log(
    '╚══════════════════════════════════════════════════════════════════════════════════╝',
  );
  console.log('');
  console.log('⚠️  DESTRUCTIVE — all tables will be wiped before seeding.');
  console.log('');

  // Check schema state (same pattern as seed-phase1)
  const probeSource = new DataSource({
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
  await probeSource.initialize();
  const [{ count }] = await probeSource.query<[{ count: string }]>(
    `SELECT COUNT(*) AS count FROM information_schema.tables WHERE table_schema = 'public'`,
  );
  await probeSource.destroy();
  const schemaIsEmpty = parseInt(count, 10) === 0;

  const dataSource = new DataSource({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
    synchronize: schemaIsEmpty,
    entities: schemaIsEmpty ? [__dirname + '/../../**/*.entity{.ts,.js}'] : [],
    logging: false,
  });

  await dataSource.initialize();
  const queryRunner = dataSource.createQueryRunner();

  try {
    // ============================================================
    // STEP 1: TRUNCATE ALL TABLES
    // ============================================================
    console.log('🗑️  Clearing all tables...');

    const tablesToClear = [
      'audit_logs',
      // Phase 3 tables (truncated first to avoid FK conflicts)
      'seed_transactions',
      'plant_seeds',
      'service_capacity',
      'activity_plant_items',
      'pruning_requests',
      'notable_plants',
      'area_plants',
      'plant_species',
      // Daily roster tables
      'schedule_areas',
      'schedules',
      // Phase 1/2 tables
      'user_areas',
      'user_tracking_status',
      'monitoring_configs',
      'notification_tokens',
      'notifications',
      'task_tags',
      'overtimes',
      'schedules',
      'special_day_overrides',
      'area_staff_requirements',
      'tasks',
      'location_logs',
      'activities',
      'shifts',
      'shift_definitions',
      'areas',
      'area_types',
      'activity_types',
      'rayons',
      'users',
    ];

    const existingTables: string[] = [];
    for (const table of tablesToClear) {
      const result = (await queryRunner.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public' AND table_name = $1
        ) AS exists`,
        [table],
      )) as { exists: boolean }[];
      if (result[0].exists) existingTables.push(table);
    }

    if (existingTables.length > 0) {
      await queryRunner.query(
        `TRUNCATE TABLE ${existingTables.map((t) => `"${t}"`).join(', ')} RESTART IDENTITY CASCADE`,
      );
    }
    console.log(`  ✓ Cleared ${existingTables.length} tables`);

    // ============================================================
    // STEP 2: AREA TYPES
    // ============================================================
    console.log('\n🏷️  Seeding area types...');
    await queryRunner.query(`
      INSERT INTO area_types (code, name, description, category) VALUES
        ('park',        'Taman',      'Taman kota dan ruang terbuka hijau publik',             'ACTIVE'),
        ('pedestrian',  'Trotoar',    'Jalur pejalan kaki di sepanjang jalan raya',             'PASSIVE'),
        ('mini_garden', 'Taman Mini', 'Taman kecil di area pemukiman atau perumahan',           'ACTIVE'),
        ('street',      'Jalanan',    'Jalanan umum yang memerlukan pemeliharaan kebersihan',   'PASSIVE')
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 4 area types');

    // ============================================================
    // STEP 3: SHIFT DEFINITIONS
    // ============================================================
    console.log('\n⏰ Seeding shift definitions...');
    await queryRunner.query(`
      INSERT INTO shift_definitions (id, name, code, start_time, end_time, crosses_midnight, is_active) VALUES
        ('${SHIFT_1_ID}', 'Shift 1', 'SHIFT1', '06:00:00', '15:00:00', FALSE, TRUE),
        ('${SHIFT_2_ID}', 'Shift 2', 'SHIFT2', '15:00:00', '23:00:00', FALSE, TRUE),
        ('${SHIFT_3_ID}', 'Shift 3', 'SHIFT3', '21:00:00', '05:00:00', TRUE,  TRUE)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 3 shift definitions (SHIFT1 / SHIFT2 / SHIFT3)');

    // ============================================================
    // STEP 4: RAYONS (all 7 + set Pusat boundary/center)
    // ============================================================
    console.log('\n🗺️  Seeding rayons...');
    await queryRunner.query(`
      INSERT INTO rayons (id, name, description) VALUES
        ('${RAYON_SELATAN_ID}', 'Rayon Selatan', 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan'),
        ('${RAYON_UTARA_ID}',   'Rayon Utara',   'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak'),
        ('${RAYON_PUSAT_ID}',   'Rayon Pusat',   'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto'),
        ('${RAYON_TIMUR1_ID}',  'Rayon Timur 1', 'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo'),
        ('${RAYON_TIMUR2_ID}',  'Rayon Timur 2', 'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar'),
        ('${RAYON_BARAT1_ID}',  'Rayon Barat 1', 'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo'),
        ('${RAYON_BARAT2_ID}',  'Rayon Barat 2', 'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep'),
        ('${RAYON_TAMAN_AKTIF_ID}', 'Rayon Taman Aktif', 'Bucket logis untuk taman aktif (active parks) lintas-rayon — tidak punya batas geografis')
      ON CONFLICT (id) DO NOTHING
    `);

    // Set real polygon boundaries on every rayon from KMZ
    // (data/Batas Wilayah Kerja Rayon (24Juni2023).kmz.kml — see kmz-areas.ts).
    // Centroid of the polygon doubles as `center_lat/lng`. The Rayon Pusat
    // office override (Taman Surya) is applied after the loop so map_defaults
    // still lands on the office, not the centroid of the polygon.
    for (const code of Object.keys(RAYON_BOUNDARIES) as RayonCode[]) {
      const polygon = RAYON_BOUNDARIES[code];
      if (!polygon) continue;
      const ring = polygon.coordinates[0].map(([lng, lat]) => [lng, lat] as [number, number]);
      const centroid = computeCentroidFromRings([ring]);
      const rayonId = RAYON_ID_BY_CODE[code];
      await queryRunner.query(
        `UPDATE rayons SET
          center_lat            = $1,
          center_lng            = $2,
          boundary_polygon      = $3::jsonb,
          boundary_computed_at  = NOW()
         WHERE id = $4`,
        [centroid.lat, centroid.lng, JSON.stringify(polygon), rayonId],
      );
    }
    // Override Rayon Pusat center to the actual office (Taman Surya) so the
    // mobile/web map opens on something useful — the polygon centroid lands
    // further south.
    await queryRunner.query(`UPDATE rayons SET center_lat = $1, center_lng = $2 WHERE id = $3`, [
      -7.2745614,
      112.7579174,
      RAYON_ID_BY_CODE.PUSAT,
    ]);
    // Rayon Taman Aktif has no geographic boundary — anchor its center marker
    // on its office, which sits inside Taman Flora.
    await queryRunner.query(`UPDATE rayons SET center_lat = $1, center_lng = $2 WHERE id = $3`, [
      RAYON_TAMAN_AKTIF_OFFICE.lat,
      RAYON_TAMAN_AKTIF_OFFICE.lng,
      RAYON_ID_BY_CODE.TAMAN_AKTIF,
    ]);
    console.log('  ✓ 8 rayons (7 geographic + Rayon Taman Aktif logical bucket)');
    console.log('  ✓ Rayon Pusat: center (-7.2745614, 112.7579174) — office override');
    console.log('  ✓ Rayon Taman Aktif: center on its office (Taman Flora)');

    // ============================================================
    // STEP 4b: KECAMATANS (31) — May 2026
    // ============================================================
    console.log('\n🏘️  Seeding kecamatans...');
    await queryRunner.query(`
      INSERT INTO kecamatans (name, code, rayon_id, region) VALUES
        -- Surabaya Pusat (4)
        ('Bubutan',          'bubutan',          '${RAYON_PUSAT_ID}',   'pusat'),
        ('Genteng',          'genteng',          '${RAYON_PUSAT_ID}',   'pusat'),
        ('Simokerto',        'simokerto',        '${RAYON_PUSAT_ID}',   'pusat'),
        ('Tegalsari',        'tegalsari',        '${RAYON_PUSAT_ID}',   'pusat'),
        -- Surabaya Timur (7)
        ('Tambaksari',       'tambaksari',       '${RAYON_TIMUR1_ID}',  'timur'),
        ('Gubeng',           'gubeng',           '${RAYON_TIMUR1_ID}',  'timur'),
        ('Sukolilo',         'sukolilo',         '${RAYON_TIMUR1_ID}',  'timur'),
        ('Mulyorejo',        'mulyorejo',        '${RAYON_TIMUR2_ID}',  'timur'),
        ('Rungkut',          'rungkut',          '${RAYON_TIMUR2_ID}',  'timur'),
        ('Tenggilis Mejoyo', 'tenggilis_mejoyo', '${RAYON_TIMUR2_ID}',  'timur'),
        ('Gunung Anyar',     'gunung_anyar',     '${RAYON_TIMUR2_ID}',  'timur'),
        -- Surabaya Barat (7)
        ('Sukomanunggal',    'sukomanunggal',    '${RAYON_BARAT1_ID}',  'barat'),
        ('Tandes',           'tandes',           '${RAYON_BARAT1_ID}',  'barat'),
        ('Asemrowo',         'asemrowo',         '${RAYON_BARAT1_ID}',  'barat'),
        ('Benowo',           'benowo',           '${RAYON_BARAT1_ID}',  'barat'),
        ('Pakal',            'pakal',            '${RAYON_BARAT1_ID}',  'barat'),
        ('Sambikerep',       'sambikerep',       '${RAYON_BARAT2_ID}',  'barat'),
        ('Lakarsantri',      'lakarsantri',      '${RAYON_BARAT2_ID}',  'barat'),
        -- Surabaya Utara (5)
        ('Krembangan',       'krembangan',       '${RAYON_UTARA_ID}',   'utara'),
        ('Pabean Cantian',   'pabean_cantian',   '${RAYON_UTARA_ID}',   'utara'),
        ('Semampir',         'semampir',         '${RAYON_UTARA_ID}',   'utara'),
        ('Kenjeran',         'kenjeran',         '${RAYON_UTARA_ID}',   'utara'),
        ('Bulak',            'bulak',            '${RAYON_UTARA_ID}',   'utara'),
        -- Surabaya Selatan (8) — all in Rayon Selatan
        ('Wonokromo',        'wonokromo',        '${RAYON_SELATAN_ID}', 'selatan'),
        ('Wonocolo',         'wonocolo',         '${RAYON_SELATAN_ID}', 'selatan'),
        ('Gayungan',         'gayungan',         '${RAYON_SELATAN_ID}', 'selatan'),
        ('Jambangan',        'jambangan',        '${RAYON_SELATAN_ID}', 'selatan'),
        ('Sawahan',          'sawahan',          '${RAYON_SELATAN_ID}', 'selatan'),
        ('Dukuh Pakis',      'dukuh_pakis',      '${RAYON_SELATAN_ID}', 'selatan'),
        ('Wiyung',           'wiyung',           '${RAYON_SELATAN_ID}', 'selatan'),
        ('Karang Pilang',    'karang_pilang',    '${RAYON_SELATAN_ID}', 'selatan')
      ON CONFLICT (code) DO UPDATE
        SET rayon_id = EXCLUDED.rayon_id,
            region   = EXCLUDED.region,
            name     = EXCLUDED.name
    `);
    console.log('  ✓ 31 kecamatans (4 Pusat + 7 Timur + 7 Barat + 5 Utara + 8 Selatan)');

    // ============================================================
    // STEP 5: ACTIVITY TYPES
    // ============================================================
    console.log('\n🔧 Seeding activity types...');
    await queryRunner.query(`
      INSERT INTO activity_types (id, name, code, description, applicable_roles, is_active) VALUES
        ('${AT_PERAWATAN_ID}',           'Perawatan',                  'perawatan',          'Perawatan tanaman dan area',           ARRAY['satgas'],      TRUE),
        ('${AT_PENANAMAN_ID}',           'Penanaman',                  'penanaman',          'Penanaman tanaman baru',               ARRAY['satgas'],      TRUE),
        ('${AT_PERANTINGAN_ID}',         'Perantingan',                'perantingan',        'Pemangkasan ranting pohon',            ARRAY['satgas'],      TRUE),
        ('${AT_PENYIRAMAN_ID}',          'Penyiraman',                 'penyiraman',         'Penyiraman tanaman',                   ARRAY['satgas'],      TRUE),
        ('${AT_PENYULAMAN_ID}',          'Penyulaman',                 'penyulaman',         'Penggantian tanaman mati',             ARRAY['satgas'],      TRUE),
        ('${AT_POTONG_RUMPUT_ID}',       'Potong Rumput',              'potong_rumput',      'Pemotongan rumput',                    ARRAY['satgas'],      TRUE),
        ('${AT_ANGKUT_SAMPAH_ID}',       'Angkut Sampah',              'angkut_sampah',      'Pengangkutan sampah',                  ARRAY['satgas'],      TRUE),
        ('${AT_LAINNYA_SATGAS_ID}',      'Lainnya',                    'lainnya_satgas',     'Aktivitas satgas lainnya',             ARRAY['satgas'],      TRUE),
        ('${AT_PATROLI_ID}',             'Patroli',                    'patroli',            'Patroli keamanan area',                ARRAY['linmas'],      TRUE),
        ('${AT_INSIDEN_ID}',             'Insiden',                    'insiden',            'Pelaporan insiden keamanan',           ARRAY['linmas'],      TRUE),
        ('${AT_PERIKSA_FASILITAS_ID}',   'Memeriksa Kondisi Fasilitas','periksa_fasilitas',  'Pemeriksaan kondisi fasilitas',        ARRAY['linmas'],      TRUE),
        ('${AT_HALAU_PKL_ID}',           'Halau PKL',                  'halau_pkl',          'Penertiban pedagang kaki lima',        ARRAY['linmas'],      TRUE),
        ('${AT_LAINNYA_LINMAS_ID}',      'Lainnya',                    'lainnya_linmas',     'Aktivitas linmas lainnya',             ARRAY['linmas'],      TRUE),
        ('${AT_CEK_KENDARAAN_ID}',       'Pengecekan Kendaraan',       'cek_kendaraan',      'Pemeriksaan kendaraan operasional',    ARRAY['korlap'],      TRUE),
        ('${AT_PATROLI_KORLAP_ID}',      'Patroli',                    'patroli_korlap',     'Patroli area kerja',                   ARRAY['korlap'],      TRUE),
        ('${AT_CEK_ALAT_ID}',            'Pengecekan Alat',            'cek_alat',           'Pemeriksaan peralatan kerja',          ARRAY['korlap'],      TRUE),
        ('${AT_LAINNYA_KORLAP_ID}',      'Lainnya',                    'lainnya_korlap',     'Aktivitas korlap lainnya',             ARRAY['korlap'],      TRUE),
        ('${AT_CEK_ABSENSI_ID}',         'Cek Absensi',                'cek_absensi',        'Pengecekan data absensi',              ARRAY['admin_data'],  TRUE),
        ('${AT_ENTRI_LAPORAN_ID}',       'Cek dan Entri Laporan',      'entri_laporan',      'Pengecekan dan entri laporan',         ARRAY['admin_data'],  TRUE),
        ('${AT_LAINNYA_ADMIN_DATA_ID}',  'Lainnya',                    'lainnya_admin_data', 'Aktivitas admin data lainnya',         ARRAY['admin_data'],  TRUE)
      ON CONFLICT (code) DO NOTHING
    `);
    console.log('  ✓ 20 activity types (8 satgas · 5 linmas · 4 korlap · 3 admin_data)');

    // ============================================================
    // STEP 6: SPECIAL DAY OVERRIDES
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
    console.log('  ✓ 4 special day overrides');

    // ============================================================
    // STEP 7: MONITORING CONFIGS
    // ============================================================
    console.log('\n📡 Seeding monitoring configs...');
    const monitoringConfigs = [
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
        value: JSON.stringify({ tolerance_meters: 50, outside_area_grace_seconds: 120 }),
        description: 'Geofencing tolerance settings',
      },
      {
        key: 'map_defaults',
        value: JSON.stringify({
          center_lat: -7.2745614,
          center_lng: 112.7579174,
          zoom: 14,
          cluster_zoom_threshold: 16,
          cluster_threshold: 20,
        }),
        description: 'Map default view (Rayon Pusat office)',
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
        value: JSON.stringify({ interval_seconds: 60, batch_size: 10 }),
        description: 'Mobile location ping settings',
      },
    ];

    for (const cfg of monitoringConfigs) {
      await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
    }
    console.log('  ✓ 5 monitoring configs (map_defaults centered on Rayon Pusat office)');

    // ============================================================
    // STEP 8: AREAS (13 Rayon Pusat + 25 Rayon Timur 2 from KMZ = 38)
    // ============================================================
    console.log('\n📍 Seeding areas from KMZ...');

    // Helper: insert one area row (boundary + coverage may be null).
    const insertArea = async (
      id: string,
      name: string,
      typeCode: string,
      lat: number,
      lng: number,
      boundaryJson: string | null,
      coverage: number | null,
      rayonId: string,
    ): Promise<void> => {
      await queryRunner.query(
        `INSERT INTO areas (
          id, name, area_type_id, gps_lat, gps_lng, radius_meters,
          boundary_polygon, coverage_area, rayon_id, is_active
        )
        SELECT
          $1, $2,
          (SELECT id FROM area_types WHERE code = $3 LIMIT 1),
          $4, $5, 100,
          $6::jsonb, $7,
          $8, TRUE
        ON CONFLICT (id) DO NOTHING`,
        [id, name, typeCode, lat, lng, boundaryJson, coverage, rayonId],
      );
    };

    // (a) Geographic coverage areas — per-rayon KMZ committed under data/kmz/.
    //     Regenerate after new KMZ with `npm run seed:extract-kmz`.
    const kmzAreas = loadKmzAreas();
    const kmzByRayon: Record<string, number> = {};
    for (const a of kmzAreas) {
      const rings = a.coordStrings.map((s) => parseCoords(s));
      const { lat, lng } = computeCentroidFromRings(rings);
      const coverage = computeAreaM2FromRings(rings);
      const boundary = JSON.stringify(toGeoJsonGeometry(a.coordStrings));
      await insertArea(
        a.id,
        a.name,
        a.typeCode,
        lat,
        lng,
        boundary,
        coverage,
        RAYON_ID_BY_CODE[a.rayonCode],
      );
      kmzByRayon[a.rayonCode] = (kmzByRayon[a.rayonCode] ?? 0) + 1;
    }
    console.log(
      `  ✓ ${kmzAreas.length} KMZ coverage areas → ` +
        Object.entries(kmzByRayon)
          .map(([r, n]) => `${r}:${n}`)
          .join('  '),
    );

    // (b) Taman Aktif parks from the client sheet. Most have no geometry yet, so
    //     they get a placeholder centroid (Rayon Taman Aktif office) and no
    //     boundary → clock-in falls back to "allow when no boundary defined".
    //     Taman Bungkul keeps its real geofence; Taman Flora is seeded below.
    const tamanAktif = loadTamanAktifAreas();
    let tamanAktifSeeded = 0;
    let tamanAktifGeocoded = 0;
    for (const a of tamanAktif) {
      if (a.name === 'Taman Flora') continue; // city-wide boundary seeded below
      if (a.name === 'Taman Bungkul') {
        const rings = BUNGKUL_COORD_STRINGS.map((s) => parseCoords(s));
        const { lat, lng } = computeCentroidFromRings(rings);
        await insertArea(
          AREA_BUNGKUL_ID,
          a.name,
          'park',
          lat,
          lng,
          JSON.stringify(toGeoJsonGeometry(BUNGKUL_COORD_STRINGS)),
          computeAreaM2FromRings(rings),
          RAYON_TAMAN_AKTIF_ID,
        );
      } else {
        // Geocoded park centre where available; else the Rayon Taman Aktif
        // office as a placeholder pin. No boundary polygon → no geofence.
        await insertArea(
          a.id,
          a.name,
          'park',
          a.gps_lat ?? RAYON_TAMAN_AKTIF_OFFICE.lat,
          a.gps_lng ?? RAYON_TAMAN_AKTIF_OFFICE.lng,
          null,
          null,
          RAYON_TAMAN_AKTIF_ID,
        );
        if (a.gps_lat != null) tamanAktifGeocoded += 1;
      }
      tamanAktifSeeded += 1;
    }
    console.log(
      `  ✓ ${tamanAktifSeeded} Taman Aktif parks (Bungkul geofenced; ${tamanAktifGeocoded} geocoded pins; rest placeholder)`,
    );

    // Taman Flora (Rayon Taman Aktif) — GPS pin on the park itself, but its
    // boundary spans the whole-Surabaya outline (hull of all rayon polygons).
    const floraPolygon = surabayaOutlinePolygon();
    const floraRing = floraPolygon.coordinates[0].map(
      ([lng, lat]) => [lng, lat] as [number, number],
    );
    await queryRunner.query(
      `INSERT INTO areas (
        id, name, area_type_id, gps_lat, gps_lng, radius_meters,
        boundary_polygon, coverage_area, rayon_id, is_active
      )
      SELECT
        $1, $2,
        (SELECT id FROM area_types WHERE code = 'park' LIMIT 1),
        $3, $4, 100,
        $5::jsonb, $6,
        $7, TRUE
      ON CONFLICT (id) DO NOTHING`,
      [
        TAMAN_FLORA_AREA_ID,
        'Taman Flora',
        TAMAN_FLORA_CENTER.lat,
        TAMAN_FLORA_CENTER.lng,
        JSON.stringify(floraPolygon),
        computeAreaM2FromRings([floraRing]),
        RAYON_TAMAN_AKTIF_ID,
      ],
    );
    console.log('  ✓ Taman Flora (Rayon Taman Aktif, city-wide boundary)');

    // Resolve a few real Pusat + Timur 2 areas for the synthetic dummy
    // assignments below — decoupled from specific KMZ ids so the assignments
    // stay valid across re-extracts/reseeds.
    const pusatDummyAreaIds: string[] = (
      (await queryRunner.query(
        `SELECT id FROM areas WHERE rayon_id = $1 AND deleted_at IS NULL ORDER BY name LIMIT 12`,
        [RAYON_PUSAT_ID],
      )) as Array<{ id: string }>
    ).map((r) => r.id);
    const pusatDummyAreaId = pusatDummyAreaIds[0] ?? null;
    const timur2DummyAreaId =
      (
        (await queryRunner.query(
          `SELECT id FROM areas WHERE rayon_id = $1 AND deleted_at IS NULL ORDER BY name LIMIT 1`,
          [RAYON_TIMUR2_ID],
        )) as Array<{ id: string }>
      )[0]?.id ?? null;

    // ============================================================
    // STEP 9: USERS — system + per-rayon dummies + real roster (from sheet)
    // ============================================================
    console.log('\n👥 Seeding users (verbose — every row is announced)...');
    console.log('  ─────────────────────────────────────────────────────────────────────────────');
    console.log(
      `  ${'Marker'.padEnd(7)} ${'Username'.padEnd(34)} ${'Role'.padEnd(15)} ${'Phone'.padEnd(13)} Rayon`,
    );
    console.log('  ─────────────────────────────────────────────────────────────────────────────');

    // Cache rayon names for verbose log lines so we don't N×SELECT inside the
    // user-insert loop. Falls back to '—' when rayonId is null (system-wide).
    const insertUserRayonRows = (await queryRunner.query(`SELECT id, name FROM rayons`)) as Array<{
      id: string;
      name: string;
    }>;
    const insertUserRayonName = new Map(insertUserRayonRows.map((r) => [r.id, r.name]));

    let usersInserted = 0;
    let usersExisting = 0;

    // Helper: insert a user row
    // Phase 3 Apr 27 — accepts optional `kecamatanName` for staff_kecamatan users.
    // May 9, 2026 — verbose log line per row (✚ inserted / · already existed).
    const insertUser = async (
      id: string,
      username: string,
      fullName: string,
      role: string,
      phone: string,
      rayonId: string | null = null,
      areaId: string | null = null,
      kecamatanName: string | null = null,
    ) => {
      const result = await queryRunner.query(
        `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, kecamatan_name, is_active, password_must_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE, TRUE)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [id, username, PASSWORD_HASH, fullName, phone, role, rayonId, areaId, kecamatanName],
      );
      const inserted = Array.isArray(result) && result.length > 0;
      if (inserted) usersInserted += 1;
      else usersExisting += 1;
      const marker = inserted ? '  ✚    ' : '  ·    ';
      const rayonName = rayonId ? (insertUserRayonName.get(rayonId) ?? '—') : '—';
      console.log(
        `${marker} ${username.padEnd(34)} ${role.padEnd(15)} ${phone.padEnd(13)} ${rayonName}`,
      );
    };

    // ── System-wide (no area/rayon scope) ──────────────────────
    await insertUser(USER_SUPERADMIN_ID, 'superadmin', 'Super Admin', 'superadmin', '081200000010');
    await insertUser(
      USER_ADMIN_SYS_ID,
      'admin_system_1',
      'Admin Sistem Satu',
      'admin_system',
      '081200000011',
    );
    await insertUser(
      USER_TOP_MGMT_ID,
      'top_management_1',
      'Top Management Satu',
      'top_management',
      '081200000012',
    );

    // ── Rayon Pusat — management ───────────────────────────────
    await insertUser(
      USER_KEPALA_RAYON_ID,
      'kepala_rayon_pusat_1',
      'Kepala Rayon Pusat Satu',
      'kepala_rayon',
      '081200000013',
      RAYON_PUSAT_ID,
    );
    await insertUser(
      USER_ADMIN_DATA_ID,
      'admin_data_pusat_1',
      'Admin Data Pusat Satu',
      'admin_data',
      '081200000014',
      RAYON_PUSAT_ID,
    );

    // ── Rayon Pusat — korlap (primary area in Rayon Pusat; extras via user_areas) ──
    // Taman Bungkul is Rayon Taman Aktif, so Pusat workers anchor on Darmo areas;
    // satgas_taman_bungkul_1 covers the park.
    await insertUser(
      USER_KORLAP_PUSAT1_ID,
      'korlap_pusat_1',
      'Korlap Pusat Satu',
      'korlap',
      '081200000015',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_KORLAP_PUSAT2_ID,
      'korlap_pusat_2',
      'Korlap Pusat Dua',
      'korlap',
      '081200000016',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_KORLAP_BUNGKUL_ID,
      'korlap_pusat_3',
      'Korlap Pusat Tiga',
      'korlap',
      '081200000017',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );

    // ── Rayon Pusat — satgas / linmas ──────────────────────────
    // satgas_pusat_1: 12 Pusat pedestrian areas → primary = Darmo Pulau 1
    await insertUser(
      USER_SATGAS_PUSAT1_ID,
      'satgas_pusat_1',
      'Satgas Pusat Satu',
      'satgas',
      '081200000018',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    // satgas_pusat_2: 12 pedestrian areas → primary = Darmo Pulau 2
    await insertUser(
      USER_SATGAS_PUSAT2_ID,
      'satgas_pusat_2',
      'Satgas Pusat Dua',
      'satgas',
      '081200000019',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    // linmas_pusat_1: 12 Pusat pedestrian areas → primary = Darmo (Bank BCA)
    await insertUser(
      USER_LINMAS_PUSAT1_ID,
      'linmas_pusat_1',
      'Linmas Pusat Satu',
      'linmas',
      '081200000020',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    // linmas_pusat_2: Rayon Pusat → primary = Darmo Pulau 5
    await insertUser(
      USER_LINMAS_PUSAT2_ID,
      'linmas_pusat_2',
      'Linmas Pusat Dua',
      'linmas',
      '081200000021',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    // satgas_pusat_3: Rayon Pusat → primary = Darmo Pulau 4
    await insertUser(
      USER_SATGAS_BUNGKUL_ID,
      'satgas_pusat_3',
      'Satgas Pusat Tiga',
      'satgas',
      '081200000022',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    // ── Rayon Taman Aktif — full role matrix for testing the logical-bucket rayon ──
    // satgas_taman_bungkul_1: primary = Taman Bungkul (park worker)
    await insertUser(
      '5a0b0001-0000-4002-8003-000000000002',
      'satgas_taman_bungkul_1',
      'Satgas Taman Bungkul Satu',
      'satgas',
      '081200000060',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000001',
      'korlap_taman_aktif_1',
      'Korlap Taman Aktif Satu',
      'korlap',
      '081200000061',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000002',
      'linmas_taman_aktif_1',
      'Linmas Taman Aktif Satu',
      'linmas',
      '081200000062',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000003',
      'kepala_rayon_taman_aktif_1',
      'Kepala Rayon Taman Aktif Satu',
      'kepala_rayon',
      '081200000063',
      RAYON_TAMAN_AKTIF_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000004',
      'admin_data_taman_aktif_1',
      'Admin Data Taman Aktif Satu',
      'admin_data',
      '081200000064',
      RAYON_TAMAN_AKTIF_ID,
    );
    await insertUser(
      '5a0b0002-0000-4002-8003-000000000005',
      'satgas_taman_flora_1',
      'Satgas Taman Flora Satu',
      'satgas',
      '081200000065',
      RAYON_TAMAN_AKTIF_ID,
      TAMAN_FLORA_AREA_ID,
    );

    // ── Phase 3 — public intake (staff_kecamatan) ──────────────
    // staff_kecamatan_pusat_1: scoped to Rayon Pusat for testing pruning_requests workflow.
    // Apr 27 redesign: kecamatan_name attribution added so the redesigned mobile
    // submit form can preset rayon + kecamatan from the user profile.
    await insertUser(
      USER_STAFF_KECAMATAN_PUSAT_ID,
      'staff_kecamatan_pusat_1',
      'Staff Kecamatan Pusat Satu',
      'staff_kecamatan',
      '081200000023',
      RAYON_PUSAT_ID,
      null,
      'Tegalsari',
    );

    // ── Per-rayon dummy users (5 roles × 6 non-Pusat rayons = 30 users) ──
    // 2026-05-18 — added so UAT can exercise every rayon (Selatan / Utara /
    // Timur 1 / Timur 2 / Barat 1 / Barat 2) with the full role matrix.
    // Only Rayon Timur 2 has KMZ areas in staging, so satgas/linmas/korlap
    // there get Taman Buk Tong as primary; everywhere else area_id = NULL
    // (intentional — exercises the "rayon with no areas" UI path).
    //
    // Phone block: 081200000030 → 081200000059 (deterministic, never collides
    // with the kecamatan block 081200000100+).
    const perRayonRoster: Array<{
      slug: string;
      rayonId: string;
      label: string;
      defaultAreaId: string | null;
    }> = [
      { slug: 'selatan', rayonId: RAYON_SELATAN_ID, label: 'Selatan', defaultAreaId: null },
      { slug: 'utara', rayonId: RAYON_UTARA_ID, label: 'Utara', defaultAreaId: null },
      { slug: 'timur_1', rayonId: RAYON_TIMUR1_ID, label: 'Timur 1', defaultAreaId: null },
      {
        slug: 'timur_2',
        rayonId: RAYON_TIMUR2_ID,
        label: 'Timur 2',
        defaultAreaId: timur2DummyAreaId,
      },
      { slug: 'barat_1', rayonId: RAYON_BARAT1_ID, label: 'Barat 1', defaultAreaId: null },
      { slug: 'barat_2', rayonId: RAYON_BARAT2_ID, label: 'Barat 2', defaultAreaId: null },
    ];
    const PER_RAYON_ROLES: Array<{
      role: string;
      usernamePrefix: string;
      fullNamePrefix: string;
      assignArea: boolean;
    }> = [
      {
        role: 'kepala_rayon',
        usernamePrefix: 'kepala_rayon',
        fullNamePrefix: 'Kepala Rayon',
        assignArea: false,
      },
      {
        role: 'admin_data',
        usernamePrefix: 'admin_data',
        fullNamePrefix: 'Admin Data',
        assignArea: false,
      },
      { role: 'korlap', usernamePrefix: 'korlap', fullNamePrefix: 'Korlap', assignArea: true },
      { role: 'satgas', usernamePrefix: 'satgas', fullNamePrefix: 'Satgas', assignArea: true },
      { role: 'linmas', usernamePrefix: 'linmas', fullNamePrefix: 'Linmas', assignArea: true },
    ];
    // Pre-allocated UUIDs — stable across re-seeds. 5 roles × 6 rayons = 30.
    const PER_RAYON_USER_IDS = [
      '5a010101-0000-4001-8001-000000000001',
      '5a010102-0000-4001-8001-000000000002',
      '5a010103-0000-4001-8001-000000000003',
      '5a010104-0000-4001-8001-000000000004',
      '5a010105-0000-4001-8001-000000000005',
      '5a010106-0000-4001-8001-000000000006',
      '5a010201-0000-4001-8002-000000000007',
      '5a010202-0000-4001-8002-000000000008',
      '5a010203-0000-4001-8002-000000000009',
      '5a010204-0000-4001-8002-00000000000a',
      '5a010205-0000-4001-8002-00000000000b',
      '5a010206-0000-4001-8002-00000000000c',
      '5a010301-0000-4001-8003-00000000000d',
      '5a010302-0000-4001-8003-00000000000e',
      '5a010303-0000-4001-8003-00000000000f',
      '5a010304-0000-4001-8003-000000000010',
      '5a010305-0000-4001-8003-000000000011',
      '5a010306-0000-4001-8003-000000000012',
      '5a010401-0000-4001-8004-000000000013',
      '5a010402-0000-4001-8004-000000000014',
      '5a010403-0000-4001-8004-000000000015',
      '5a010404-0000-4001-8004-000000000016',
      '5a010405-0000-4001-8004-000000000017',
      '5a010406-0000-4001-8004-000000000018',
      '5a010501-0000-4001-8005-000000000019',
      '5a010502-0000-4001-8005-00000000001a',
      '5a010503-0000-4001-8005-00000000001b',
      '5a010504-0000-4001-8005-00000000001c',
      '5a010505-0000-4001-8005-00000000001d',
      '5a010506-0000-4001-8005-00000000001e',
    ];
    let perRayonIdx = 0;
    let perRayonPhone = 30; // → 081200000030
    for (const roleDef of PER_RAYON_ROLES) {
      for (const r of perRayonRoster) {
        const username = `${roleDef.usernamePrefix}_${r.slug}_1`;
        const fullName = `${roleDef.fullNamePrefix} ${r.label} Satu`;
        const phone = `0812000${String(perRayonPhone).padStart(5, '0')}`;
        const areaId = roleDef.assignArea ? r.defaultAreaId : null;
        await insertUser(
          PER_RAYON_USER_IDS[perRayonIdx],
          username,
          fullName,
          roleDef.role,
          phone,
          r.rayonId,
          areaId,
        );
        perRayonIdx += 1;
        perRayonPhone += 1;
      }
    }

    // ── Real users ─────────────────────────────────────────────
    await insertUser(
      USER_PRAMUDITA_ID,
      'pramudita_yustiani',
      'Pramudita Yustiani',
      'top_management',
      '08563302643',
    );
    await insertUser(USER_WAHYU_ID, 'wahyu_tri_p', 'Wahyu Tri P', 'superadmin', '081232939377');
    await insertUser(
      USER_BUDI_ID,
      'budi_setyo_utomo',
      'Budi Setyo Utomo',
      'kepala_rayon',
      '081200000001',
      RAYON_PUSAT_ID,
    );
    await insertUser(
      USER_PONCO_ID,
      'ponco_adi_prabowo',
      'Ponco Adi Prabowo',
      'admin_data',
      '081200000002',
      RAYON_PUSAT_ID,
    );
    await insertUser(
      USER_RAKHMAT_ID,
      'rakhmat_novianto',
      'RAKHMAT NOVIANTO',
      'satgas',
      '087825841818',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_ROY_ID,
      'roy_junaidi',
      'ROY JUNAIDI',
      'satgas',
      '083854355341',
      RAYON_PUSAT_ID,
      pusatDummyAreaId,
    );
    await insertUser(
      USER_EDI_ID,
      'edi_santoso',
      'EDI SANTOSO',
      'satgas',
      '085855434561',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      USER_JIHAN_ID,
      'jihan_nabila_safitri',
      'JIHAN NABILA SAFITRI',
      'satgas',
      '08970900786',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      USER_DENI_ID,
      'deni_purwanto',
      'DENI PURWANTO',
      'linmas',
      '081554017822',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );
    await insertUser(
      USER_AGUS_ID,
      'agus_ramadhan',
      'AGUS RAMADHAN',
      'linmas',
      '083831353889',
      RAYON_TAMAN_AKTIF_ID,
      AREA_BUNGKUL_ID,
    );

    console.log(`  ─────────────────────────────────────────────────────────────────────────────`);
    console.log(
      `  ✓ ${usersInserted} system/dummy users inserted, ${usersExisting} already existed (idempotent)`,
    );

    // ── Real roster from the client sheet (data/users.csv) ─────────
    // Re-export the sheet → regenerate users.csv → reseed. Login is by phone
    // (where present) or username slug; password Password123! + forced reset.
    console.log('\n👤 Loading real roster from data/users.csv ...');
    const roster = loadSeedUsers();
    if (roster.length === 0) {
      console.warn(
        '  ⚠️  users.csv is missing/empty (it is gitignored — contains PII). ' +
          'Run `npm run sheet:pull` to regenerate it from the client sheet, then reseed. ' +
          'Continuing with system + dummy users only.',
      );
    }
    const existingPhones = new Set(
      (
        (await queryRunner.query(
          `SELECT phone_number FROM users WHERE phone_number IS NOT NULL`,
        )) as Array<{ phone_number: string }>
      ).map((r) => r.phone_number),
    );
    // Taman Aktif park name → id, for resolving multi-area assignments.
    const tamanAktifAreaIdByName = new Map<string, string>(
      (
        (await queryRunner.query(`SELECT id, name FROM areas WHERE rayon_id = $1`, [
          RAYON_TAMAN_AKTIF_ID,
        ])) as Array<{ id: string; name: string }>
      ).map((r) => [r.name, r.id]),
    );
    let rosterInserted = 0;
    let rosterSkipped = 0;
    let rosterAreaLinks = 0;
    let rosterNoPhone = 0;
    for (const u of roster) {
      const rayonId = RAYON_ID_BY_CODE[u.rayon_code as RayonCode] ?? null;
      let phone: string | null = u.phone || null;
      if (!phone) rosterNoPhone += 1;
      if (phone && existingPhones.has(phone)) phone = null; // avoid UNIQUE collision
      if (phone) existingPhones.add(phone);
      const areaIds = u.area_names
        .map((n) => tamanAktifAreaIdByName.get(n))
        .filter((x): x is string => Boolean(x));
      const primaryAreaId = areaIds[0] ?? null;
      const res = await queryRunner.query(
        `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active, password_must_change)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, TRUE, TRUE)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [u.id, u.username, PASSWORD_HASH, u.full_name, phone, u.role, rayonId, primaryAreaId],
      );
      if (Array.isArray(res) && res.length > 0) rosterInserted += 1;
      else rosterSkipped += 1;
      // Resolve the real id (handles username-conflict dedupe vs. system rows).
      const uidRows = (await queryRunner.query(`SELECT id FROM users WHERE username = $1`, [
        u.username,
      ])) as Array<{ id: string }>;
      const uid = uidRows[0]?.id;
      if (uid) {
        for (const aid of areaIds) {
          await queryRunner.query(
            `INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
             VALUES ($1, $2, 'permanent', $3) ON CONFLICT DO NOTHING`,
            [uid, aid, USER_SUPERADMIN_ID],
          );
          rosterAreaLinks += 1;
        }
      }
    }
    console.log(
      `  ✓ roster: ${rosterInserted} inserted, ${rosterSkipped} skipped (dup) · ` +
        `${rosterAreaLinks} area links · ${rosterNoPhone} username-only logins (no phone)`,
    );

    // ── May 2026 — staff_kecamatan_<code>_1 per kecamatan (31) ──────
    // The redesigned mobile submit form pre-fills rayon + kecamatan from the
    // logged-in user, so each kecamatan must have its own login. Idempotent.
    console.log('\n🧑‍💼 Seeding per-kecamatan staff_kecamatan users…');
    const kecRows = (await queryRunner.query(
      `SELECT id, name, code, rayon_id FROM kecamatans ORDER BY name`,
    )) as Array<{ id: string; name: string; code: string; rayon_id: string }>;

    // Map rayon_id → human-readable rayon name so the verbose log shows the
    // pairing each kecamatan user lands in. Saves UAT testers from having to
    // cross-reference a separate rayons table.
    const stagingRayonRows = (await queryRunner.query(`SELECT id, name FROM rayons`)) as Array<{
      id: string;
      name: string;
    }>;
    const stagingRayonNameById = new Map(stagingRayonRows.map((r) => [r.id, r.name]));

    let kecPhoneSeq = 100;
    let kecInserted = 0;
    let kecExisting = 0;

    console.log(`  Pattern: staff_kecamatan_<code>_1   (e.g. staff_kecamatan_tegalsari_1)`);
    console.log('  ─────────────────────────────────────────────────────────────────────────────');
    console.log(
      `  ${'#'.padStart(2)}  ${'Username'.padEnd(34)} ${'Phone'.padEnd(13)} ${'Kecamatan'.padEnd(20)} Rayon`,
    );
    console.log('  ─────────────────────────────────────────────────────────────────────────────');
    let kIdx = 0;
    for (const k of kecRows) {
      kIdx += 1;
      // May 9 standardization — `staff_kecamatan_<code>_1` to match the
      // numeric-suffix convention used by every other multi-instance role.
      const username = `staff_kecamatan_${k.code}_1`;
      const phone = `0812000${String(kecPhoneSeq).padStart(5, '0')}`;
      kecPhoneSeq += 1;
      const result = await queryRunner.query(
        `INSERT INTO users (username, password_hash, full_name, phone_number,
                            role, rayon_id, area_id, kecamatan_name, kecamatan_id, is_active, password_must_change)
         VALUES ($1, $2, $3, $4, 'staff_kecamatan', $5, NULL, $6, $7, TRUE, TRUE)
         ON CONFLICT (username) DO NOTHING
         RETURNING id`,
        [
          username,
          PASSWORD_HASH,
          `Staff Kecamatan ${k.name} Satu`,
          phone,
          k.rayon_id,
          k.name,
          k.id,
        ],
      );
      const inserted = Array.isArray(result) && result.length > 0;
      if (inserted) kecInserted += 1;
      else kecExisting += 1;

      const marker = inserted ? '✚' : '·';
      const rayonName = stagingRayonNameById.get(k.rayon_id) ?? '—';
      console.log(
        `  ${String(kIdx).padStart(2)} ${marker} ${username.padEnd(34)} ${phone.padEnd(13)} ${k.name.padEnd(20)} ${rayonName}`,
      );
    }
    console.log(`  ✓ ${kecInserted} inserted, ${kecExisting} already existed (idempotent)`);
    await queryRunner.query(`
      UPDATE users u SET kecamatan_id = k.id
      FROM kecamatans k
      WHERE u.role = 'staff_kecamatan'
        AND u.kecamatan_id IS NULL
        AND u.kecamatan_name IS NOT NULL
        AND lower(k.name) = lower(u.kecamatan_name)
    `);
    // Heal staff_kecamatan rayon_id whenever the kecamatan's rayon assignment
    // changes (e.g. May 9 realignment moving Wiyung from BARAT2 to SELATAN).
    await queryRunner.query(`
      UPDATE users u
      SET rayon_id = k.rayon_id
      FROM kecamatans k
      WHERE u.role = 'staff_kecamatan'
        AND u.kecamatan_id = k.id
        AND (u.rayon_id IS DISTINCT FROM k.rayon_id)
    `);
    console.log(
      `  ✓ 31 per-kecamatan staff users seeded; rayon_id realigned to current kecamatan mapping`,
    );

    // ============================================================
    // STEP 9b: SET SHIFT_DEFINITION_ID (field workers → SHIFT1; others → NULL)
    // ============================================================
    console.log('\n⏰ Assigning shift templates to users...');
    await queryRunner.query(
      `UPDATE users SET shift_definition_id = $1
       WHERE role IN ('satgas', 'linmas', 'korlap') AND deleted_at IS NULL`,
      [SHIFT_1_ID],
    );
    // Non-field roles (admin_data, kepala_rayon, top_management, admin_system,
    // superadmin, staff_kecamatan) stay NULL — they are still clockable but not shift-bound.
    const shiftAssignedCount = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM users WHERE shift_definition_id = $1 AND deleted_at IS NULL`,
      [SHIFT_1_ID],
    )) as Array<{ count: string }>;
    console.log(
      `  ✓ ${shiftAssignedCount[0].count} field workers (satgas/linmas/korlap) assigned to Shift 1`,
    );

    // ============================================================
    // STEP 10: DERIVE rayon_id FOR FIELD WORKERS (from area.rayon_id)
    // ============================================================
    console.log('\n📌 Deriving rayon_id for field workers...');
    await queryRunner.query(`
      UPDATE users u
      SET rayon_id = a.rayon_id
      FROM areas a
      WHERE u.area_id = a.id
        AND u.rayon_id IS NULL
        AND u.role IN ('satgas', 'linmas', 'korlap')
    `);
    console.log('  ✓ rayon_id derived for all field workers');

    // ============================================================
    // STEP 11: USER_AREAS (permanent assignments)
    // ============================================================
    console.log('\n🗺️  Seeding user_areas assignments...');

    const superadminId = USER_SUPERADMIN_ID;

    // Helper: insert a single user_area assignment
    const assignArea = async (userId: string, areaId: string) => {
      await queryRunner.query(
        `INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
         VALUES ($1, $2, 'permanent', $3)
         ON CONFLICT DO NOTHING`,
        [userId, areaId, superadminId],
      );
    };

    // korlap_pusat_1 → 12 Rayon Pusat pedestrian areas (Taman Bungkul is Taman Aktif)
    for (const areaId of pusatDummyAreaIds) await assignArea(USER_KORLAP_PUSAT1_ID, areaId);
    console.log('  ✓ korlap_pusat_1 → 12 Rayon Pusat pedestrian areas');

    // korlap_pusat_2 → 12 Rayon Pusat pedestrian areas
    for (const areaId of pusatDummyAreaIds) await assignArea(USER_KORLAP_PUSAT2_ID, areaId);
    console.log('  ✓ korlap_pusat_2 → 12 Rayon Pusat pedestrian areas');

    // korlap_pusat_3 → Darmo Pulau 2 only
    await assignArea(USER_KORLAP_BUNGKUL_ID, pusatDummyAreaId);
    console.log('  ✓ korlap_pusat_3 → Darmo Pulau 2');

    // satgas_pusat_1 → 12 Rayon Pusat pedestrian areas
    for (const areaId of pusatDummyAreaIds) await assignArea(USER_SATGAS_PUSAT1_ID, areaId);
    console.log('  ✓ satgas_pusat_1 → 12 Rayon Pusat pedestrian areas');

    // satgas_pusat_2 → 12 Rayon Pusat pedestrian areas
    for (const areaId of pusatDummyAreaIds) await assignArea(USER_SATGAS_PUSAT2_ID, areaId);
    console.log('  ✓ satgas_pusat_2 → 12 Rayon Pusat pedestrian areas');

    // linmas_pusat_1 → 12 Rayon Pusat pedestrian areas
    for (const areaId of pusatDummyAreaIds) await assignArea(USER_LINMAS_PUSAT1_ID, areaId);
    console.log('  ✓ linmas_pusat_1 → 12 Rayon Pusat pedestrian areas');

    // linmas_pusat_2 → Darmo Pulau 5 only
    await assignArea(USER_LINMAS_PUSAT2_ID, pusatDummyAreaId);
    console.log('  ✓ linmas_pusat_2 → Darmo Pulau 5');

    // satgas_pusat_3 → Darmo Pulau 4 only
    await assignArea(USER_SATGAS_BUNGKUL_ID, pusatDummyAreaId);
    console.log('  ✓ satgas_pusat_3 → Darmo Pulau 4');

    // Rayon Taman Aktif role matrix
    await assignArea('5a0b0001-0000-4002-8003-000000000002', AREA_BUNGKUL_ID);
    console.log('  ✓ satgas_taman_bungkul_1 → Taman Bungkul');
    // korlap_taman_aktif_1 → Taman Bungkul + Taman Flora (multi-area within rayon)
    await assignArea('5a0b0002-0000-4002-8003-000000000001', AREA_BUNGKUL_ID);
    await assignArea('5a0b0002-0000-4002-8003-000000000001', TAMAN_FLORA_AREA_ID);
    console.log('  ✓ korlap_taman_aktif_1 → Taman Bungkul + Taman Flora');
    // linmas_taman_aktif_1 → Taman Bungkul
    await assignArea('5a0b0002-0000-4002-8003-000000000002', AREA_BUNGKUL_ID);
    console.log('  ✓ linmas_taman_aktif_1 → Taman Bungkul');
    // satgas_taman_flora_1 → Taman Flora
    await assignArea('5a0b0002-0000-4002-8003-000000000005', TAMAN_FLORA_AREA_ID);
    console.log('  ✓ satgas_taman_flora_1 → Taman Flora');

    // Real users
    await assignArea(USER_RAKHMAT_ID, pusatDummyAreaId);
    console.log('  ✓ rakhmat_novianto → Jl. Raya Darmo Pulau 1');
    await assignArea(USER_ROY_ID, pusatDummyAreaId);
    console.log('  ✓ roy_junaidi → Jl. Raya Darmo Pulau 2');
    for (const uid of [USER_EDI_ID, USER_JIHAN_ID, USER_DENI_ID, USER_AGUS_ID]) {
      await assignArea(uid, AREA_BUNGKUL_ID);
    }
    console.log(
      '  ✓ edi_santoso, jihan_nabila_safitri, deni_purwanto, agus_ramadhan → Taman Bungkul',
    );

    // ============================================================
    // STEP 12: USER_TRACKING_STATUS (all clockable → offline)
    // ============================================================
    console.log('\n📡 Seeding user_tracking_status (all offline)...');
    await queryRunner.query(`
      INSERT INTO user_tracking_status (user_id, status, is_within_area, area_id, rayon_id, updated_at)
      SELECT u.id, 'offline', FALSE, u.area_id, u.rayon_id, NOW()
      FROM users u
      WHERE u.role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon')
      ON CONFLICT (user_id) DO UPDATE SET
        status     = 'offline',
        updated_at = NOW()
    `);

    const countResult = (await queryRunner.query(`
      SELECT COUNT(*) AS clockable_count FROM users
      WHERE role IN ('satgas', 'linmas', 'korlap', 'admin_data', 'kepala_rayon')
    `)) as { clockable_count: string }[];
    const clockable_count = countResult[0].clockable_count;
    console.log(`  ✓ ${clockable_count} clockable users set to offline`);

    // ============================================================
    // STEP 13: AREA STAFF REQUIREMENTS (minimal: 1 satgas + 1 linmas per area, SHIFT1/WEEKDAY)
    // ============================================================
    console.log('\n📋 Seeding area staff requirements...');

    // Scoped to the rayons that actually carry field workers (Taman Aktif parks
    // + Timur 2). The geographic coverage areas don't need per-area requirements
    // for UAT, which keeps the staffing-gap dashboards meaningful.
    await queryRunner.query(
      `INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
       SELECT a.id, $1, r.role, 1, 'WEEKDAY'
       FROM areas a
       CROSS JOIN (VALUES ('satgas'), ('linmas')) AS r(role)
       WHERE a.deleted_at IS NULL AND a.rayon_id IN ($2, $3)`,
      [SHIFT_1_ID, RAYON_TAMAN_AKTIF_ID, RAYON_TIMUR2_ID],
    );
    const reqCountRows = (await queryRunner.query(
      `SELECT COUNT(*) AS c FROM area_staff_requirements`,
    )) as Array<{ c: string }>;
    console.log(
      `  ✓ ${reqCountRows[0].c} area staff requirements (satgas + linmas per Taman Aktif / Timur 2 area, SHIFT1/WEEKDAY)`,
    );

    // ============================================================
    // STEP 14: MATERIALIZE TODAY'S DAILY ROSTER (from shift templates)
    // ============================================================
    console.log("\n📅 Materializing TODAY's daily schedule (for immediate demo data)...");
    await queryRunner.query(`
      INSERT INTO schedules (user_id, schedule_date, rayon_id, shift_definition_id, status, source)
      SELECT u.id, (now() AT TIME ZONE 'Asia/Jakarta')::date, u.rayon_id, u.shift_definition_id,
             CASE WHEN u.shift_definition_id IS NOT NULL THEN 'planned' ELSE 'off' END, 'template'
      FROM users u
      WHERE u.is_active = TRUE AND u.deleted_at IS NULL
    `);
    const dailyScheduleCount = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM schedules WHERE schedule_date = (now() AT TIME ZONE 'Asia/Jakarta')::date`,
    )) as Array<{ count: string }>;
    console.log(`  ✓ ${dailyScheduleCount[0].count} daily schedule rows materialized`);

    // Populate schedule_areas from user_areas (today's assignments)
    await queryRunner.query(`
      INSERT INTO schedule_areas (schedule_id, area_id)
      SELECT DISTINCT ds.id, ua.area_id
      FROM schedules ds
      JOIN user_areas ua ON ua.user_id = ds.user_id AND ua.assignment_type = 'permanent'
      WHERE ds.schedule_date = (now() AT TIME ZONE 'Asia/Jakarta')::date
    `);
    const dailyAreaCount = (await queryRunner.query(
      `SELECT COUNT(*) AS count FROM schedule_areas`,
    )) as Array<{ count: string }>;
    console.log(`  ✓ ${dailyAreaCount[0].count} daily schedule area assignments seeded`);

    // Demo exception: mark satgas_pusat_1 as sick leave (for UI variety)
    const demoLeaveUser = (await queryRunner.query(
      `SELECT id FROM users WHERE username = 'satgas_pusat_1' AND deleted_at IS NULL LIMIT 1`,
    )) as Array<{ id: string }>;
    if (demoLeaveUser.length > 0) {
      await queryRunner.query(
        `UPDATE schedules SET status = 'leave_sick', notes = 'Demam (demo)', source = 'manual'
         WHERE user_id = $1 AND schedule_date = (now() AT TIME ZONE 'Asia/Jakarta')::date`,
        [demoLeaveUser[0].id],
      );
      console.log(`  ✓ Demo exception: satgas_pusat_1 marked as sick leave`);
    }

    // ============================================================
    // STEP 15: PHASE 3 DATA (plants, capacity, pruning, seeds)
    // ============================================================
    const phase3Check = await queryRunner.query(
      `SELECT to_regclass('public.plant_species') AS exists`,
    );
    if (phase3Check[0]?.exists) {
      console.log('\n🌳 Seeding Phase 3 reference data...');
      await seedPhase3Reference(queryRunner);
      // Staging gets capacity_units=5 so testers can actually book pruning slots.
      // The capacity grid is a reference baseline (rayon × ISO week × pruning),
      // not transaction data — empty cells would break the booking UI on day one.
      await seedPhase3ServiceCapacity(queryRunner, 5);
      // NOTE: `seedPhase3SampleData` deliberately NOT called for staging.
      // Per project policy, the staging seed should contain only essentials
      // (reference data + users) — no dummy area_plants, notable_plants,
      // pruning_requests, plant_seeds, or seed_transactions. UAT testers
      // start from an empty state and create their own data, mirroring how
      // production starts. Sample/dummy rows live in `db:seed:phase3` (dev only).
    } else {
      console.log('\n⚠️  Phase 3 tables not found — skipping Phase 3 seed.');
      console.log('   Run `npm run migration:run` first, then re-run the seeder.');
    }

    // ============================================================
    // SUMMARY
    // ============================================================
    // ====================================================================
    // SUMMARY (May 9 2026 refresh — kecamatan + Phase 3 visibility)
    // ====================================================================
    const stagingCounts = await queryRunner.query(`
      SELECT
        (SELECT count(*)::int FROM kecamatans)                              AS kecamatans,
        (SELECT count(*)::int FROM users WHERE role = 'staff_kecamatan')    AS staff_kec_users,
        (SELECT count(*)::int FROM service_capacity)                        AS service_capacity
    `);
    const sc = stagingCounts[0] ?? {};
    const kecSamples = (await queryRunner.query(`
      SELECT u.username, u.phone_number, k.name AS kecamatan, r.name AS rayon
      FROM users u
      LEFT JOIN kecamatans k ON k.id = u.kecamatan_id
      LEFT JOIN rayons r     ON r.id = u.rayon_id
      WHERE u.role = 'staff_kecamatan'
      ORDER BY r.name, k.name
      LIMIT 5
    `)) as Array<{ username: string; phone_number: string; kecamatan: string; rayon: string }>;

    console.log('');
    console.log(
      '╔══════════════════════════════════════════════════════════════════════════════════╗',
    );
    console.log(
      '║  ✅  Staging Seeding Completed Successfully                                     ║',
    );
    console.log(
      '╚══════════════════════════════════════════════════════════════════════════════════╝',
    );
    console.log('');
    console.log('  📦 Reference Data');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('       4 area_types ·  3 shift_definitions ·  7 rayons ·  20 activity_types');
    console.log('       4 special_day_overrides ·  5 + 4 monitoring_configs (Phase 2D + Phase 3)');
    console.log('     128 plant_species');
    console.log(
      `     ${String(sc.kecamatans).padStart(3)} kecamatans (FK to rayons) — NEW May 2026`,
    );
    console.log(
      `     ${String(sc.service_capacity).padStart(3)} service_capacity rows (7 rayons × 12 ISO weeks × pruning, capacity_units=5)`,
    );
    console.log('');
    console.log('  🏞️  Rayon Pusat UAT Footprint');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log(
      '      13 Pusat areas — 1 Taman Bungkul (aktif) + 12 Kawasan Darmo pedestrian (pasif)',
    );
    console.log(
      '      25 Timur 2 areas — 1 Taman Buk Tong (aktif) + 24 pedestrian (Kawasan Kertajaya / Pucang / Ngagel Utara / Menur-Manyar)',
    );
    console.log(
      `      ${44 + rosterInserted + (sc.staff_kec_users ?? 0)} users — 14 test + 30 per-rayon dummy + ${rosterInserted} real + ${sc.staff_kec_users ?? 0} staff_kecamatan`,
    );
    console.log(`      ${clockable_count} clockable users — user_tracking_status set to offline`);
    console.log('      76 area_staff_requirements (38 areas × satgas + linmas, SHIFT1/WEEKDAY)');
    console.log('      user_areas — permanent multi-area assignments per spec (Rayon Pusat only)');
    console.log('');
    console.log('  📆 Daily Roster (TODAY materialized for immediate demo)');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log("      schedules — TODAY's schedule entries (field workers: planned, others: off)");
    console.log("      schedule_areas — TODAY's area assignments from user_areas");
    console.log('      1 demo leave exception (satgas_pusat_1: sick leave)');
    console.log('');
    console.log('  📭 Empty by Design (essentials-only — UAT starts from scratch)');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('      0 shifts · 0 activities · 0 tasks · 0 overtimes · 0 location_logs');
    console.log('      0 area_plants · 0 notable_plants · 0 pruning_requests');
    console.log('      0 plant_seeds · 0 seed_transactions');
    console.log('');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    console.log('🧪  TEST USERS  (all passwords: Password123! · login with username OR phone)');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    console.log('');
    console.log(
      '  ── System-wide ─────────────────────────────────────────────────────────────────',
    );
    console.log('  Role            Username             Phone           Notes');
    console.log('  superadmin      superadmin           081200000010    Full access');
    console.log('  admin_system    admin_system_1        081200000011    System administration');
    console.log('  top_management  top_management_1      081200000012    City-wide read-only');
    console.log('');
    console.log(
      '  ── Rayon Pusat ─────────────────────────────────────────────────────────────────',
    );
    console.log('  Role            Username             Phone           Area / Notes');
    console.log('  kepala_rayon    kepala_rayon_pusat_1   081200000013    Rayon Pusat head');
    console.log(
      '  admin_data      admin_data_pusat_1   081200000014    Rayon Pusat — review/convert',
    );
    console.log('  korlap          korlap_pusat_1       081200000015    All 13 areas');
    console.log('  korlap          korlap_pusat_2       081200000016    All 13 areas');
    console.log('  korlap          korlap_pusat_3     081200000017    Taman Bungkul');
    console.log('  satgas          satgas_pusat_1       081200000018    All 13 areas');
    console.log('  satgas          satgas_pusat_2       081200000019    12 pedestrian only');
    console.log('  linmas          linmas_pusat_1       081200000020    All 13 areas');
    console.log('  linmas          linmas_pusat_2       081200000021    Taman Bungkul');
    console.log('  satgas          satgas_pusat_3     081200000022    Taman Bungkul');
    console.log('');
    console.log(
      '  ── Staff Kecamatan (NEW — Phase 3 public intake) ───────────────────────────────',
    );
    console.log('  Username pattern: staff_kecamatan_<code>_<n>  (e.g. staff_kecamatan_wiyung_1)');
    console.log('  Each user is auto-linked to their kecamatan_id + rayon_id; the mobile submit');
    console.log('  form pre-fills + locks both fields on login.');
    console.log('');
    console.log('  Username                       Phone          Kecamatan         Rayon');
    console.log(
      '  ──────────────────────────────────────────────────────────────────────────────────',
    );
    for (const u of kecSamples) {
      console.log(
        `  ${u.username.padEnd(30)} ${(u.phone_number ?? '').padEnd(14)} ${(u.kecamatan ?? '—').padEnd(17)} ${u.rayon ?? '—'}`,
      );
    }
    console.log(
      `  … plus ${Math.max(0, (sc.staff_kec_users ?? 0) - kecSamples.length)} more — one user per kecamatan, all 31 covered.`,
    );
    console.log('');
    console.log(
      '  Legacy single-rayon staff_kecamatan_pusat_1 is also retained (081200000023) for back-compat.',
    );
    console.log('');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    console.log('👤  REAL USERS  (production-bound, all passwords: Password123!)');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    console.log('');
    console.log('  Role            Username             Phone          Area');
    console.log('  top_management  pramudita_yustiani   08563302643    —');
    console.log('  superadmin      wahyu_tri_p          081232939377   —');
    console.log('  kepala_rayon    budi_setyo_utomo     081200000001   Rayon Pusat');
    console.log('  admin_data      ponco_adi_prabowo    081200000002   Rayon Pusat');
    console.log('  satgas          rakhmat_novianto     087825841818   Darmo Pulau 1');
    console.log('  satgas          roy_junaidi          083854355341   Darmo Pulau 2');
    console.log('  satgas          edi_santoso          085855434561   Taman Bungkul');
    console.log('  satgas          jihan_nabila_safitri 08970900786    Taman Bungkul');
    console.log('  linmas          deni_purwanto        081554017822   Taman Bungkul');
    console.log('  linmas          agus_ramadhan        083831353889   Taman Bungkul');
    console.log('');
    console.log('  💡 UAT walkthrough tip — keep all three actors in the SAME rayon so the');
    console.log("     permohonan actually lands in the admin's queue:");
    console.log('     1. Log in as `staff_kecamatan_tegalsari_1` (Rayon Pusat) → submit a pruning');
    console.log('        request (rayon + kecamatan are pre-filled and locked).');
    console.log('     2. Switch to `admin_data_pusat_1`   (Rayon Pusat) → review + convert.');
    console.log('     3. Switch to `satgas_pusat_1`       (Rayon Pusat) → accept and execute.');
    console.log('     For other rayons pair the matching trio, e.g.');
    console.log('       staff_kecamatan_wiyung_1 → admin_data_selatan_1 → satgas_selatan_1');
    console.log('       staff_kecamatan_tambaksari_1 → admin_data_timur_1_1 → satgas_timur_1_1');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
  } catch (error) {
    console.error('\n❌ Staging seeding failed:', error);
    throw error;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

seedStaging()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
