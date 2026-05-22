import { DataSource } from 'typeorm';
import { config } from 'dotenv';
import {
  seedPhase3Reference,
  seedPhase3ServiceCapacity,
} from './seed-phase3';
import {
  RAYON_BOUNDARIES,
  RAYON_PUSAT_AREAS,
  TIMUR2_AREAS,
  parseCoords,
  computeCentroidFromRings,
  computeAreaM2FromRings,
  toGeoJsonGeometry,
  BUNGKUL_AREA_ID,
  DARMO_P1_AREA_ID,
  DARMO_P2_AREA_ID,
  TAMAN_BUK_TONG_ID,
  type AreaDef,
  type RayonCode,
} from './kmz-areas';

config();

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
 *   - 54 users  (14 test + 30 per-rayon dummy + 10 real, incl. staff_kecamatan_pusat_1)
 *   - user_areas assignments (permanent)
 *   - user_tracking_status  (all offline — testing starts clean)
 *   - area_staff_requirements (1 satgas + 1 linmas per area, SHIFT1/WEEKDAY)
 *
 * Empty tables (UAT writes its own rows):
 *   - shifts, activities, tasks, overtimes, location_logs, schedules
 *   - area_plants, notable_plants, pruning_requests, plant_seeds, seed_transactions
 *
 * Run: npm run db:seed:staging
 *
 * =============================================================================
 * TEST USERS (all passwords: password123)
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
 * | korlap          | korlap_pusat_1          | 081200000015   | All 13 areas (Bungkul + 12 pedestrian) |
 * | korlap          | korlap_pusat_2          | 081200000016   | All 13 areas (Bungkul + 12 pedestrian) |
 * | korlap          | korlap_pusat_3        | 081200000017   | Taman Bungkul only                     |
 * | satgas          | satgas_pusat_1          | 081200000018   | All 13 areas                           |
 * | satgas          | satgas_pusat_2          | 081200000019   | 12 pedestrian only (no Taman Bungkul)  |
 * | linmas          | linmas_pusat_1          | 081200000020   | All 13 areas                           |
 * | linmas          | linmas_pusat_2          | 081200000021   | Taman Bungkul only                     |
 * | satgas          | satgas_pusat_3        | 081200000022   | Taman Bungkul only                     |
 *
 * REAL USERS (all passwords: password123)
 *
 * | Role            | Username                | Phone          | Area/Rayon                             |
 * |-----------------|-------------------------|----------------|----------------------------------------|
 * | top_management  | pramudita_yustiani      | 08563302643    | —                                      |
 * | superadmin      | wahyu_tri_p             | 081232939377   | —                                      |
 * | kepala_rayon    | budi_setyo_utomo        | 081200000001   | Rayon Pusat                            |
 * | admin_data      | ponco_adi_prabowo       | 081200000002   | Rayon Pusat                            |
 * | satgas          | rakhmat_novianto        | 087825841818   | Jl. Raya Darmo Pulau 1                 |
 * | satgas          | roy_junaidi             | 083854355341   | Jl. Raya Darmo Pulau 2                 |
 * | satgas          | edi_santoso             | 085855434561   | Taman Bungkul                          |
 * | satgas          | jihan_nabila_safitri    | 08970900786    | Taman Bungkul                          |
 * | linmas          | deni_purwanto           | 081554017822   | Taman Bungkul                          |
 * | linmas          | agus_ramadhan           | 083831353889   | Taman Bungkul                          |
 * =============================================================================
 */

// ============================================================
// REFERENCE DATA UUIDs — reused from seed-reference.ts
// ============================================================
const RAYON_SELATAN_ID = '085a298f-d8e9-435c-8a3b-998ffa47a26e';
const RAYON_UTARA_ID   = '861a7e7c-8bd5-4e73-8aa7-e92988959dca';
const RAYON_PUSAT_ID   = 'd564809d-316f-4a2a-a1c6-671eebb49653';
const RAYON_TIMUR1_ID  = '42934ad5-4ea0-4537-abb6-cf7e984e2d39';
const RAYON_TIMUR2_ID  = '742a135b-ddeb-45ca-8d0a-88d7d08aa78a';
const RAYON_BARAT1_ID  = 'bf040137-fce4-4016-b5e7-704ad82c1594';
const RAYON_BARAT2_ID  = '7422e6ee-0693-4565-9016-d4f759bdeed2';
/** Logical (non-geographic) rayon for taman aktif parks city-wide. */
const RAYON_TAMAN_AKTIF_ID = '8a8a8a8a-1111-4222-9333-444444444444';

const SHIFT_1_ID = 'ca18ac41-2577-4f67-abfa-adaae27b75c8';
const SHIFT_2_ID = '28822613-65de-47e4-a9b4-7b9bfd437f8a';
const SHIFT_3_ID = '85860407-7b2d-425a-87cc-7a94bb47e5d8';

const AT_PERAWATAN_ID          = 'ddc94ad6-a625-4c27-964f-10f3a79a6794';
const AT_PENANAMAN_ID          = 'a8cf5d46-1435-413b-ae03-8ea135bd5fb3';
const AT_PERANTINGAN_ID        = '8a890970-5fc8-4672-ae6f-b945cb80bba5';
const AT_PENYIRAMAN_ID         = '2eaed437-c662-4285-b9a7-8c7d5d0755b7';
const AT_PENYULAMAN_ID         = '70c75e9a-df48-4c71-89d5-91978112103f';
const AT_POTONG_RUMPUT_ID      = '715b8196-8473-4afe-9103-adb6c2ee7c50';
const AT_ANGKUT_SAMPAH_ID      = 'eef48fdc-e235-4a03-9fc4-517cff92c8bb';
const AT_LAINNYA_SATGAS_ID     = '4153cd86-c6bf-4f06-b536-5016a74114d5';
const AT_PATROLI_ID            = 'dd7efc02-36fe-4e70-b4b5-bfa163fc3bb0';
const AT_INSIDEN_ID            = '3a37e00b-7702-4296-b387-96964b45e251';
const AT_PERIKSA_FASILITAS_ID  = 'b4e7c1a2-3d5f-4e8a-9b0c-1d2e3f4a5b6c';
const AT_HALAU_PKL_ID          = 'c5f8d2b3-4e6a-4f9b-8c1d-2e3f4a5b6c7d';
const AT_LAINNYA_LINMAS_ID     = 'd6a9e3c4-5f7b-4a0c-9d2e-3f4a5b6c7d8e';
const AT_CEK_KENDARAAN_ID      = 'e7b0f4d5-6a8c-4b1d-8e3f-4a5b6c7d8e9f';
const AT_PATROLI_KORLAP_ID     = 'f8c1a5e6-7b9d-4c2e-9f4a-5b6c7d8e9f0a';
const AT_CEK_ALAT_ID           = 'a9d2b6f7-8c0e-4d3f-8a5b-6c7d8e9f0a1b';
const AT_LAINNYA_KORLAP_ID     = 'b0e3c7a8-9d1f-4e4a-9b6c-7d8e9f0a1b2c';
const AT_CEK_ABSENSI_ID        = 'c1f4d8b9-0e2a-4f5b-8c7d-8e9f0a1b2c3d';
const AT_ENTRI_LAPORAN_ID      = 'd2a5e9c0-1f3b-4a6c-9d8e-9f0a1b2c3d4e';
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
const AREA_BUNGKUL_ID    = BUNGKUL_AREA_ID;
const AREA_DARMO_P1_ID   = DARMO_P1_AREA_ID;
const AREA_DARMO_P2_ID   = DARMO_P2_AREA_ID;

// ============================================================
// STAGING USER UUIDs
// ============================================================
// Test users
const USER_SUPERADMIN_ID       = '53b4c5d6-e7f8-4690-1234-567879809102'; // superadmin
const USER_ADMIN_SYS_ID        = '53c5d6e7-f8a9-4701-2345-678980910213'; // admin_system_1
const USER_TOP_MGMT_ID         = '53d6e7f8-a9b0-4812-3456-789091021324'; // top_management_1
const USER_KEPALA_RAYON_ID     = '53e7f8a9-b0c1-4923-4567-890102132435'; // kepala_rayon_pusat_1
const USER_ADMIN_DATA_ID       = '53f8a9b0-c1d2-4a34-5678-901213243546'; // admin_data_pusat_1
const USER_KORLAP_PUSAT1_ID    = '54a9b0c1-d2e3-4b45-6789-012324354657'; // korlap_pusat_1
const USER_KORLAP_PUSAT2_ID    = '54b0c1d2-e3f4-4c56-7890-123435465768'; // korlap_pusat_2
const USER_KORLAP_BUNGKUL_ID   = '54c1d2e3-f4a5-4d67-8901-234546576879'; // korlap_pusat_3
const USER_SATGAS_PUSAT1_ID    = '54d2e3f4-a5b6-4e78-9012-345657687980'; // satgas_pusat_1
const USER_SATGAS_PUSAT2_ID    = '54e3f4a5-b6c7-4f89-0123-456768798091'; // satgas_pusat_2
const USER_LINMAS_PUSAT1_ID    = '54f4a5b6-c7d8-4090-1234-567879809102'; // linmas_pusat_1
const USER_LINMAS_PUSAT2_ID    = '55a5b6c7-d8e9-4101-2345-678980910213'; // linmas_pusat_2
const USER_SATGAS_BUNGKUL_ID   = '55b6c7d8-e9f0-4212-3456-789091021324'; // satgas_pusat_3
const USER_STAFF_KECAMATAN_PUSAT_ID  = '55b6c7d8-e9f0-4212-3456-789091021325'; // staff_kecamatan_pusat_1 (Phase 3 — public intake)
// Real users
const USER_PRAMUDITA_ID        = '55c7d8e9-f0a1-4323-4567-890102132435'; // pramudita_yustiani
const USER_WAHYU_ID            = '55d8e9f0-a1b2-4434-5678-901213243546'; // wahyu_tri_p
const USER_BUDI_ID             = '55e9f0a1-b2c3-4545-6789-012324354657'; // budi_setyo_utomo
const USER_PONCO_ID            = '55f0a1b2-c3d4-4656-7890-123435465768'; // ponco_adi_prabowo
const USER_RAKHMAT_ID          = '56a1b2c3-d4e5-4767-8901-234546576879'; // rakhmat_novianto
const USER_ROY_ID              = '56b2c3d4-e5f6-4878-9012-345657687980'; // roy_junaidi
const USER_EDI_ID              = '56c3d4e5-f6a7-4989-0123-456768798091'; // edi_santoso
const USER_JIHAN_ID            = '56d4e5f6-a7b8-4090-1234-567879809102'; // jihan_nabila_safitri
const USER_DENI_ID             = '56e5f6a7-b8c9-4101-2345-678980910213'; // deni_purwanto
const USER_AGUS_ID             = '56f6a7b8-c9d0-4212-3456-789091021324'; // agus_ramadhan

// Pre-computed bcrypt hash for "password123" (10 salt rounds)
const PASSWORD_HASH = '$2b$10$gF9qXRA.0ZtNWgbrwoYHMOmdUFUbaL4AkGdxAEMDMrMZtFexnH.H.';

// Rayon Pusat area IDs and helpers — the user_areas assignment matrix below
// is scoped to these 13 areas only. Rayon Timur 2 (25 areas from KORLAP KMZ)
// has its own staffing baseline; per-user multi-area assignment for Timur 2
// is left for UAT testers to configure as needed.
const PUSAT_AREA_DEFS: AreaDef[] = RAYON_PUSAT_AREAS;
const PEDESTRIAN_AREA_IDS = PUSAT_AREA_DEFS
  .filter((a) => a.typeCode === 'pedestrian')
  .map((a) => a.id);
const ALL_AREA_IDS = PUSAT_AREA_DEFS.map((a) => a.id);

// Rayon ID → code lookup so the boundary-update loop can hit the right row.
const RAYON_ID_BY_CODE: Record<RayonCode, string> = {
  SELATAN: RAYON_SELATAN_ID,
  UTARA:   RAYON_UTARA_ID,
  PUSAT:   RAYON_PUSAT_ID,
  TIMUR1:  RAYON_TIMUR1_ID,
  TIMUR2:  RAYON_TIMUR2_ID,
  BARAT1:  RAYON_BARAT1_ID,
  BARAT2:  RAYON_BARAT2_ID,
  TAMAN_AKTIF: RAYON_TAMAN_AKTIF_ID,
};

// ============================================================
// MAIN SEEDER
// ============================================================

async function seedStaging() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
  console.log('║  🚀 Staging / UAT Seeder — Rayon Pusat                                         ║');
  console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
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
      INSERT INTO rayons (id, name, code, description) VALUES
        ('${RAYON_SELATAN_ID}', 'Rayon Selatan', 'SELATAN', 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan'),
        ('${RAYON_UTARA_ID}',   'Rayon Utara',   'UTARA',   'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak'),
        ('${RAYON_PUSAT_ID}',   'Rayon Pusat',   'PUSAT',   'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto'),
        ('${RAYON_TIMUR1_ID}',  'Rayon Timur 1', 'TIMUR1',  'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo'),
        ('${RAYON_TIMUR2_ID}',  'Rayon Timur 2', 'TIMUR2',  'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar'),
        ('${RAYON_BARAT1_ID}',  'Rayon Barat 1', 'BARAT1',  'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo'),
        ('${RAYON_BARAT2_ID}',  'Rayon Barat 2', 'BARAT2',  'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep'),
        ('${RAYON_TAMAN_AKTIF_ID}', 'Rayon Taman Aktif', 'TAMAN_AKTIF', 'Bucket logis untuk taman aktif (active parks) lintas-rayon — tidak punya batas geografis')
      ON CONFLICT (code) DO NOTHING
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
      await queryRunner.query(
        `UPDATE rayons SET
          center_lat            = $1,
          center_lng            = $2,
          boundary_polygon      = $3::jsonb,
          boundary_computed_at  = NOW()
         WHERE code = $4`,
        [centroid.lat, centroid.lng, JSON.stringify(polygon), code],
      );
    }
    // Override Rayon Pusat center to the actual office (Taman Surya) so the
    // mobile/web map opens on something useful — the polygon centroid lands
    // further south.
    await queryRunner.query(
      `UPDATE rayons SET center_lat = $1, center_lng = $2 WHERE code = 'PUSAT'`,
      [-7.2745614, 112.7579174],
    );
    // Rayon Taman Aktif has no geographic boundary — anchor its center marker
    // on Taman Bungkul so the mobile/web rayon pin lands somewhere meaningful.
    await queryRunner.query(
      `UPDATE rayons SET center_lat = $1, center_lng = $2 WHERE code = 'TAMAN_AKTIF'`,
      [-7.291347, 112.739764],
    );
    console.log('  ✓ 8 rayons (7 geographic + Rayon Taman Aktif logical bucket)');
    console.log('  ✓ Rayon Pusat: center (-7.2745614, 112.7579174) — office override');
    console.log('  ✓ Rayon Taman Aktif: center anchored on Taman Bungkul');

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

    const ALL_AREA_DEFS: AreaDef[] = [...PUSAT_AREA_DEFS, ...TIMUR2_AREAS];
    let pusatSeeded = 0;
    let timur2Seeded = 0;
    for (const areaDef of ALL_AREA_DEFS) {
      const rings = areaDef.coordStrings.map((s) => parseCoords(s));
      const { lat, lng } = computeCentroidFromRings(rings);
      const coverageArea = computeAreaM2FromRings(rings);
      const boundaryPolygon = JSON.stringify(toGeoJsonGeometry(areaDef.coordStrings));
      const rayonId = RAYON_ID_BY_CODE[areaDef.rayonCode];

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
        [
          areaDef.id,
          areaDef.name,
          areaDef.typeCode,
          lat,
          lng,
          boundaryPolygon,
          coverageArea,
          rayonId,
        ],
      );
      if (areaDef.rayonCode === 'PUSAT') pusatSeeded += 1;
      else if (areaDef.rayonCode === 'TIMUR2') timur2Seeded += 1;
      console.log(
        `  ✓ [${areaDef.rayonCode.padEnd(6)}] ${areaDef.name.substring(0, 55).padEnd(55)} | ` +
          `lat: ${lat.toFixed(6)}  lng: ${lng.toFixed(6)}  area: ${Math.round(coverageArea)} m²`,
      );
    }
    console.log(
      `  → ${ALL_AREA_DEFS.length} areas seeded: ${pusatSeeded} Rayon Pusat (1 park + 12 pedestrian) + ${timur2Seeded} Rayon Timur 2 (1 park 'Taman Buk Tong' + 24 pedestrian)`,
    );

    // ============================================================
    // STEP 9: USERS (13 test + 10 real = 23 total)
    // ============================================================
    console.log('\n👥 Seeding users (verbose — every row is announced)...');
    console.log(
      '  ─────────────────────────────────────────────────────────────────────────────',
    );
    console.log(
      `  ${'Marker'.padEnd(7)} ${'Username'.padEnd(34)} ${'Role'.padEnd(15)} ${'Phone'.padEnd(13)} Rayon`,
    );
    console.log(
      '  ─────────────────────────────────────────────────────────────────────────────',
    );

    // Cache rayon names for verbose log lines so we don't N×SELECT inside the
    // user-insert loop. Falls back to '—' when rayonId is null (system-wide).
    const insertUserRayonRows = (await queryRunner.query(
      `SELECT id, name FROM rayons`,
    )) as Array<{ id: string; name: string }>;
    const insertUserRayonName = new Map(
      insertUserRayonRows.map((r) => [r.id, r.name]),
    );

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
        `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, kecamatan_name, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [id, username, PASSWORD_HASH, fullName, phone, role, rayonId, areaId, kecamatanName],
      );
      const inserted = result && (result as any).rowCount > 0;
      if (inserted) usersInserted += 1;
      else usersExisting += 1;
      const marker = inserted ? '  ✚    ' : '  ·    ';
      const rayonName = rayonId ? insertUserRayonName.get(rayonId) ?? '—' : '—';
      console.log(
        `${marker} ${username.padEnd(34)} ${role.padEnd(15)} ${phone.padEnd(13)} ${rayonName}`,
      );
    };

    // ── System-wide (no area/rayon scope) ──────────────────────
    await insertUser(USER_SUPERADMIN_ID, 'superadmin',       'Super Admin',          'superadmin',    '081200000010');
    await insertUser(USER_ADMIN_SYS_ID,  'admin_system_1',    'Admin Sistem Satu',    'admin_system',  '081200000011');
    await insertUser(USER_TOP_MGMT_ID,   'top_management_1',  'Top Management Satu',  'top_management','081200000012');

    // ── Rayon Pusat — management ───────────────────────────────
    await insertUser(USER_KEPALA_RAYON_ID, 'kepala_rayon_pusat_1',  'Kepala Rayon Pusat Satu',   'kepala_rayon', '081200000013', RAYON_PUSAT_ID);
    await insertUser(USER_ADMIN_DATA_ID,   'admin_data_pusat_1',  'Admin Data Pusat Satu',   'admin_data',   '081200000014', RAYON_PUSAT_ID);

    // ── Rayon Pusat — korlap (primary area = Taman Bungkul; extras via user_areas) ──
    await insertUser(USER_KORLAP_PUSAT1_ID,  'korlap_pusat_1',  'Korlap Pusat Satu',  'korlap', '081200000015', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_KORLAP_PUSAT2_ID,  'korlap_pusat_2',  'Korlap Pusat Dua',  'korlap', '081200000016', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_KORLAP_BUNGKUL_ID, 'korlap_pusat_3',  'Korlap Pusat Tiga', 'korlap', '081200000017', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);

    // ── Rayon Pusat — satgas / linmas ──────────────────────────
    // satgas_pusat_1: all 13 areas → primary = Taman Bungkul
    await insertUser(USER_SATGAS_PUSAT1_ID,  'satgas_pusat_1',   'Satgas Pusat Satu',   'satgas', '081200000018', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    // satgas_pusat_2: 12 pedestrian only → primary = Darmo Pulau 1
    await insertUser(USER_SATGAS_PUSAT2_ID,  'satgas_pusat_2',   'Satgas Pusat Dua',    'satgas', '081200000019', RAYON_PUSAT_ID, AREA_DARMO_P1_ID);
    // linmas_pusat_1: all 13 areas → primary = Taman Bungkul
    await insertUser(USER_LINMAS_PUSAT1_ID,  'linmas_pusat_1',   'Linmas Pusat Satu',   'linmas', '081200000020', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    // linmas_pusat_2: Taman Bungkul only
    await insertUser(USER_LINMAS_PUSAT2_ID,  'linmas_pusat_2',   'Linmas Pusat Dua',    'linmas', '081200000021', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    // satgas_pusat_3: Taman Bungkul only
    await insertUser(USER_SATGAS_BUNGKUL_ID, 'satgas_pusat_3',   'Satgas Pusat Tiga',   'satgas', '081200000022', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);

    // ── Phase 3 — public intake (staff_kecamatan) ──────────────
    // staff_kecamatan_pusat_1: scoped to Rayon Pusat for testing pruning_requests workflow.
    // Apr 27 redesign: kecamatan_name attribution added so the redesigned mobile
    // submit form can preset rayon + kecamatan from the user profile.
    await insertUser(USER_STAFF_KECAMATAN_PUSAT_ID, 'staff_kecamatan_pusat_1', 'Staff Kecamatan Pusat Satu', 'staff_kecamatan', '081200000023', RAYON_PUSAT_ID, null, 'Tegalsari');

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
      { slug: 'selatan',  rayonId: RAYON_SELATAN_ID, label: 'Selatan',  defaultAreaId: null              },
      { slug: 'utara',    rayonId: RAYON_UTARA_ID,   label: 'Utara',    defaultAreaId: null              },
      { slug: 'timur_1',  rayonId: RAYON_TIMUR1_ID,  label: 'Timur 1',  defaultAreaId: null              },
      { slug: 'timur_2',  rayonId: RAYON_TIMUR2_ID,  label: 'Timur 2',  defaultAreaId: TAMAN_BUK_TONG_ID },
      { slug: 'barat_1',  rayonId: RAYON_BARAT1_ID,  label: 'Barat 1',  defaultAreaId: null              },
      { slug: 'barat_2',  rayonId: RAYON_BARAT2_ID,  label: 'Barat 2',  defaultAreaId: null              },
    ];
    const PER_RAYON_ROLES: Array<{
      role: string;
      usernamePrefix: string;
      fullNamePrefix: string;
      assignArea: boolean;
    }> = [
      { role: 'kepala_rayon', usernamePrefix: 'kepala_rayon', fullNamePrefix: 'Kepala Rayon', assignArea: false },
      { role: 'admin_data',   usernamePrefix: 'admin_data',   fullNamePrefix: 'Admin Data',   assignArea: false },
      { role: 'korlap',       usernamePrefix: 'korlap',       fullNamePrefix: 'Korlap',       assignArea: true  },
      { role: 'satgas',       usernamePrefix: 'satgas',       fullNamePrefix: 'Satgas',       assignArea: true  },
      { role: 'linmas',       usernamePrefix: 'linmas',       fullNamePrefix: 'Linmas',       assignArea: true  },
    ];
    // Pre-allocated UUIDs — stable across re-seeds. 5 roles × 6 rayons = 30.
    const PER_RAYON_USER_IDS = [
      '5a010101-0000-4001-8001-000000000001', '5a010102-0000-4001-8001-000000000002',
      '5a010103-0000-4001-8001-000000000003', '5a010104-0000-4001-8001-000000000004',
      '5a010105-0000-4001-8001-000000000005', '5a010106-0000-4001-8001-000000000006',
      '5a010201-0000-4001-8002-000000000007', '5a010202-0000-4001-8002-000000000008',
      '5a010203-0000-4001-8002-000000000009', '5a010204-0000-4001-8002-00000000000a',
      '5a010205-0000-4001-8002-00000000000b', '5a010206-0000-4001-8002-00000000000c',
      '5a010301-0000-4001-8003-00000000000d', '5a010302-0000-4001-8003-00000000000e',
      '5a010303-0000-4001-8003-00000000000f', '5a010304-0000-4001-8003-000000000010',
      '5a010305-0000-4001-8003-000000000011', '5a010306-0000-4001-8003-000000000012',
      '5a010401-0000-4001-8004-000000000013', '5a010402-0000-4001-8004-000000000014',
      '5a010403-0000-4001-8004-000000000015', '5a010404-0000-4001-8004-000000000016',
      '5a010405-0000-4001-8004-000000000017', '5a010406-0000-4001-8004-000000000018',
      '5a010501-0000-4001-8005-000000000019', '5a010502-0000-4001-8005-00000000001a',
      '5a010503-0000-4001-8005-00000000001b', '5a010504-0000-4001-8005-00000000001c',
      '5a010505-0000-4001-8005-00000000001d', '5a010506-0000-4001-8005-00000000001e',
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
    await insertUser(USER_PRAMUDITA_ID, 'pramudita_yustiani',   'Pramudita Yustiani',   'top_management', '08563302643');
    await insertUser(USER_WAHYU_ID,     'wahyu_tri_p',          'Wahyu Tri P',          'superadmin',     '081232939377');
    await insertUser(USER_BUDI_ID,      'budi_setyo_utomo',     'Budi Setyo Utomo',     'kepala_rayon',   '081200000001', RAYON_PUSAT_ID);
    await insertUser(USER_PONCO_ID,     'ponco_adi_prabowo',    'Ponco Adi Frabowo',    'admin_data',     '081200000002', RAYON_PUSAT_ID);
    await insertUser(USER_RAKHMAT_ID,   'rakhmat_novianto',     'RAKHMAT NOVIANTO',     'satgas',         '087825841818', RAYON_PUSAT_ID, AREA_DARMO_P1_ID);
    await insertUser(USER_ROY_ID,       'roy_junaidi',          'ROY JUNAIDI',          'satgas',         '083854355341', RAYON_PUSAT_ID, AREA_DARMO_P2_ID);
    await insertUser(USER_EDI_ID,       'edi_santoso',          'EDI SANTOSO',          'satgas',         '085855434561', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_JIHAN_ID,     'jihan_nabila_safitri', 'JIHAN NABILA SAFITRI', 'satgas',         '08970900786',  RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_DENI_ID,      'deni_purwanto',        'DENI PURWANTO',        'linmas',         '081554017822', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);
    await insertUser(USER_AGUS_ID,      'agus_ramadhan',        'AGUS RAMADHAN',        'linmas',         '083831353889', RAYON_PUSAT_ID, AREA_BUNGKUL_ID);

    console.log(
      `  ─────────────────────────────────────────────────────────────────────────────`,
    );
    console.log(
      `  ✓ ${usersInserted} users inserted, ${usersExisting} already existed (idempotent)`,
    );
    console.log(
      `    54 expected = 14 test (system + Pusat trio + staff_kecamatan_pusat_1) + 30 per-rayon dummy (5 roles × 6 non-Pusat rayons) + 10 real-name pilots.`,
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
    const stagingRayonRows = (await queryRunner.query(
      `SELECT id, name FROM rayons`,
    )) as Array<{ id: string; name: string }>;
    const stagingRayonNameById = new Map(
      stagingRayonRows.map((r) => [r.id, r.name]),
    );

    let kecPhoneSeq = 100;
    let kecInserted = 0;
    let kecExisting = 0;

    console.log(
      `  Pattern: staff_kecamatan_<code>_1   (e.g. staff_kecamatan_tegalsari_1)`,
    );
    console.log(
      '  ─────────────────────────────────────────────────────────────────────────────',
    );
    console.log(
      `  ${'#'.padStart(2)}  ${'Username'.padEnd(34)} ${'Phone'.padEnd(13)} ${'Kecamatan'.padEnd(20)} Rayon`,
    );
    console.log(
      '  ─────────────────────────────────────────────────────────────────────────────',
    );
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
                            role, rayon_id, area_id, kecamatan_name, kecamatan_id, is_active)
         VALUES ($1, $2, $3, $4, 'staff_kecamatan', $5, NULL, $6, $7, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [username, PASSWORD_HASH, `Staff Kecamatan ${k.name} Satu`, phone, k.rayon_id, k.name, k.id],
      );
      const inserted = result && (result as any).rowCount > 0;
      if (inserted) kecInserted += 1;
      else kecExisting += 1;

      const marker = inserted ? '✚' : '·';
      const rayonName = stagingRayonNameById.get(k.rayon_id) ?? '—';
      console.log(
        `  ${String(kIdx).padStart(2)} ${marker} ${username.padEnd(34)} ${phone.padEnd(13)} ${k.name.padEnd(20)} ${rayonName}`,
      );
    }
    console.log(
      `  ✓ ${kecInserted} inserted, ${kecExisting} already existed (idempotent)`,
    );
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
    console.log(`  ✓ 31 per-kecamatan staff users seeded; rayon_id realigned to current kecamatan mapping`);

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

    // korlap_pusat_1 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_KORLAP_PUSAT1_ID, areaId);
    console.log('  ✓ korlap_pusat_1 → all 13 areas');

    // korlap_pusat_2 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_KORLAP_PUSAT2_ID, areaId);
    console.log('  ✓ korlap_pusat_2 → all 13 areas');

    // korlap_pusat_3 → Taman Bungkul only
    await assignArea(USER_KORLAP_BUNGKUL_ID, AREA_BUNGKUL_ID);
    console.log('  ✓ korlap_pusat_3 → Taman Bungkul');

    // satgas_pusat_1 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_SATGAS_PUSAT1_ID, areaId);
    console.log('  ✓ satgas_pusat_1 → all 13 areas');

    // satgas_pusat_2 → 12 pedestrian only (no Taman Bungkul)
    for (const areaId of PEDESTRIAN_AREA_IDS) await assignArea(USER_SATGAS_PUSAT2_ID, areaId);
    console.log('  ✓ satgas_pusat_2 → 12 pedestrian areas (no Taman Bungkul)');

    // linmas_pusat_1 → all 13 areas
    for (const areaId of ALL_AREA_IDS) await assignArea(USER_LINMAS_PUSAT1_ID, areaId);
    console.log('  ✓ linmas_pusat_1 → all 13 areas');

    // linmas_pusat_2 → Taman Bungkul only
    await assignArea(USER_LINMAS_PUSAT2_ID, AREA_BUNGKUL_ID);
    console.log('  ✓ linmas_pusat_2 → Taman Bungkul');

    // satgas_pusat_3 → Taman Bungkul only
    await assignArea(USER_SATGAS_BUNGKUL_ID, AREA_BUNGKUL_ID);
    console.log('  ✓ satgas_pusat_3 → Taman Bungkul');

    // Real users
    await assignArea(USER_RAKHMAT_ID, AREA_DARMO_P1_ID);
    console.log('  ✓ rakhmat_novianto → Jl. Raya Darmo Pulau 1');
    await assignArea(USER_ROY_ID, AREA_DARMO_P2_ID);
    console.log('  ✓ roy_junaidi → Jl. Raya Darmo Pulau 2');
    for (const uid of [USER_EDI_ID, USER_JIHAN_ID, USER_DENI_ID, USER_AGUS_ID]) {
      await assignArea(uid, AREA_BUNGKUL_ID);
    }
    console.log('  ✓ edi_santoso, jihan_nabila_safitri, deni_purwanto, agus_ramadhan → Taman Bungkul');

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

    for (const areaDef of ALL_AREA_DEFS) {
      // 1 satgas per area — Shift 1, Weekday
      await queryRunner.query(
        `INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
         VALUES ($1, $2, 'satgas', 1, 'WEEKDAY')`,
        [areaDef.id, SHIFT_1_ID],
      );
      // 1 linmas per area — Shift 1, Weekday (linmas primarily in parks, but include all for coverage)
      await queryRunner.query(
        `INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
         VALUES ($1, $2, 'linmas', 1, 'WEEKDAY')`,
        [areaDef.id, SHIFT_1_ID],
      );
    }
    console.log(
      `  ✓ ${ALL_AREA_DEFS.length * 2} requirements (${ALL_AREA_DEFS.length} areas × 2 roles: satgas + linmas, SHIFT1/WEEKDAY)`,
    );

    // ============================================================
    // STEP 14: PHASE 3 DATA (plants, capacity, pruning, seeds)
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
    console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅  Staging Seeding Completed Successfully                                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  📦 Reference Data');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('       4 area_types ·  3 shift_definitions ·  7 rayons ·  20 activity_types');
    console.log('       4 special_day_overrides ·  5 + 4 monitoring_configs (Phase 2D + Phase 3)');
    console.log('     128 plant_species');
    console.log(`     ${String(sc.kecamatans).padStart(3)} kecamatans (FK to rayons) — NEW May 2026`);
    console.log(`     ${String(sc.service_capacity).padStart(3)} service_capacity rows (7 rayons × 12 ISO weeks × pruning, capacity_units=5)`);
    console.log('');
    console.log('  🏞️  Rayon Pusat UAT Footprint');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('      13 Pusat areas — 1 Taman Bungkul (aktif) + 12 Kawasan Darmo pedestrian (pasif)');
    console.log('      25 Timur 2 areas — 1 Taman Buk Tong (aktif) + 24 pedestrian (Kawasan Kertajaya / Pucang / Ngagel Utara / Menur-Manyar)');
    console.log(`      ${54 + (sc.staff_kec_users ?? 0)} users — 14 test + 30 per-rayon dummy + 10 real + ${sc.staff_kec_users ?? 0} staff_kecamatan`);
    console.log(`      ${clockable_count} clockable users — user_tracking_status set to offline`);
    console.log('      76 area_staff_requirements (38 areas × satgas + linmas, SHIFT1/WEEKDAY)');
    console.log('      user_areas — permanent multi-area assignments per spec (Rayon Pusat only)');
    console.log('');
    console.log('  📭 Empty by Design (essentials-only — UAT starts from scratch)');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('      0 shifts · 0 activities · 0 tasks · 0 overtimes · 0 location_logs');
    console.log('      0 area_plants · 0 notable_plants · 0 pruning_requests');
    console.log('      0 plant_seeds · 0 seed_transactions');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    console.log('🧪  TEST USERS  (all passwords: password123 · login with username OR phone)');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  ── System-wide ─────────────────────────────────────────────────────────────────');
    console.log('  Role            Username             Phone           Notes');
    console.log('  superadmin      superadmin           081200000010    Full access');
    console.log('  admin_system    admin_system_1        081200000011    System administration');
    console.log('  top_management  top_management_1      081200000012    City-wide read-only');
    console.log('');
    console.log('  ── Rayon Pusat ─────────────────────────────────────────────────────────────────');
    console.log('  Role            Username             Phone           Area / Notes');
    console.log('  kepala_rayon    kepala_rayon_pusat_1   081200000013    Rayon Pusat head');
    console.log('  admin_data      admin_data_pusat_1   081200000014    Rayon Pusat — review/convert');
    console.log('  korlap          korlap_pusat_1       081200000015    All 13 areas');
    console.log('  korlap          korlap_pusat_2       081200000016    All 13 areas');
    console.log('  korlap          korlap_pusat_3     081200000017    Taman Bungkul');
    console.log('  satgas          satgas_pusat_1       081200000018    All 13 areas');
    console.log('  satgas          satgas_pusat_2       081200000019    12 pedestrian only');
    console.log('  linmas          linmas_pusat_1       081200000020    All 13 areas');
    console.log('  linmas          linmas_pusat_2       081200000021    Taman Bungkul');
    console.log('  satgas          satgas_pusat_3     081200000022    Taman Bungkul');
    console.log('');
    console.log('  ── Staff Kecamatan (NEW — Phase 3 public intake) ───────────────────────────────');
    console.log('  Username pattern: staff_kecamatan_<code>_<n>  (e.g. staff_kecamatan_wiyung_1)');
    console.log('  Each user is auto-linked to their kecamatan_id + rayon_id; the mobile submit');
    console.log('  form pre-fills + locks both fields on login.');
    console.log('');
    console.log('  Username                       Phone          Kecamatan         Rayon');
    console.log('  ──────────────────────────────────────────────────────────────────────────────────');
    for (const u of kecSamples) {
      console.log(
        `  ${u.username.padEnd(30)} ${(u.phone_number ?? '').padEnd(14)} ${(u.kecamatan ?? '—').padEnd(17)} ${u.rayon ?? '—'}`,
      );
    }
    console.log(`  … plus ${Math.max(0, (sc.staff_kec_users ?? 0) - kecSamples.length)} more — one user per kecamatan, all 31 covered.`);
    console.log('');
    console.log('  Legacy single-rayon staff_kecamatan_pusat_1 is also retained (081200000023) for back-compat.');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    console.log('👤  REAL USERS  (production-bound, all passwords: password123)');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
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
    console.log('     permohonan actually lands in the admin\'s queue:');
    console.log('     1. Log in as `staff_kecamatan_tegalsari_1` (Rayon Pusat) → submit a pruning');
    console.log('        request (rayon + kecamatan are pre-filled and locked).');
    console.log('     2. Switch to `admin_data_pusat_1`   (Rayon Pusat) → review + convert.');
    console.log('     3. Switch to `satgas_pusat_1`       (Rayon Pusat) → accept and execute.');
    console.log('     For other rayons pair the matching trio, e.g.');
    console.log('       staff_kecamatan_wiyung_1 → admin_data_selatan_1 → satgas_selatan_1');
    console.log('       staff_kecamatan_tambaksari_1 → admin_data_timur_1_1 → satgas_timur_1_1');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
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
