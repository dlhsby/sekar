import { DataSource } from 'typeorm';
import '../../config/load-env';
import { DEFAULT_PASSWORD_HASH } from './constants';
import { loadKmzAreas, loadTamanAktifAreas } from './load-seed-data';
import {
  RAYON_BOUNDARIES,
  RAYON_PUSAT_AREAS,
  TIMUR2_AREAS,
  parseCoords,
  computeCentroidFromRings,
  computeAreaM2FromRings,
  toGeoJsonGeometry,
  surabayaOutlinePolygon,
  hullPolygonFromRings,
  BUNGKUL_AREA_ID,
  BUNGKUL_COORD_STRINGS,
  DARMO_P1_AREA_ID,
  DARMO_P2_AREA_ID,
  DARMO_P3_AREA_ID,
  DARMO_P4_AREA_ID,
  DARMO_P5_AREA_ID,
  DARMO_BCA_AREA_ID,
  TAMAN_BUK_TONG_ID,
  TAMAN_FLORA_AREA_ID,
  TAMAN_FLORA_CENTER,
  RAYON_TAMAN_AKTIF_OFFICE,
  type AreaDef,
  type RayonCode,
} from './kmz-areas';

// Load environment variables

/**
 * Phase 2 Seed Script
 *
 * Seeds the Phase 2 database tables:
 * - Rayons (7 geographic sectors)
 * - Shift Definitions (3 fixed shifts)
 * - Activity Types (20 work activities across 4 roles)
 * - Special Day Overrides (4 initial holidays)
 * - Users (39 total: admin + 23 Phase2C/rayon-admin + 15 rayon-field)
 * - Areas (10 total: 3 Phase1 + 5 new for missing rayons + Taman Pelangi + Taman Utara)
 * - Area Staff Requirements (32 requirements)
 * - Notification Tokens, Overtimes, Shifts
 * - Tasks (42 total), Activities (50 total)
 * - Monitoring configs + user_tracking_status (Phase 2D)
 * - phone_number + user_areas (Phase 2E)
 *
 * Also updates existing data:
 * - Area Types: Set category (ACTIVE/PASSIVE)
 * - Areas: Assign to Rayons
 *
 * Usage: npm run db:seed
 *
 * =============================================================================
 * TEST USERS BY ROLE  (all passwords: 12345678)
 * Login via username OR phone number as identifier
 * =============================================================================
 *
 * | Role            | Username              | Phone          | Rayon        | Area / Notes                        |
 * |-----------------|---------------------- |----------------|--------------|-------------------------------------|
 * | superadmin      | superadmin            | 081200000000   | —            | Full system access (Phase 1 admin)  |
 * | admin_system    | admin_system_1         | 081234567898   | —            | System administration               |
 * | top_management  | top_management_1       | 081234567890   | —            | City-wide read-only view            |
 * | admin_data      | admin_data_pusat_1           | 081234567897   | Rayon Pusat  | Data entry & reporting              |
 * | kepala_rayon    | kepala_rayon_pusat_1    | 081300000001   | Rayon Pusat  | Manages Pusat sector                |
 * | korlap (multi)  | korlap_pusat_1        | 081234567893   | Rayon Pusat  | Taman Bungkul + Jalan Raya Darmo    |
 * | korlap (single) | korlap_pusat_2          | 081234567896   | Rayon Pusat  | Jalan Raya Darmo                    |
 * | satgas (multi)  | satgas_pusat_1        | 081300000002   | Rayon Pusat  | Taman Pusat + Taman Bungkul (multi) |
 * | satgas          | satgas_pusat_2        | 081300000003   | Rayon Pusat  | Taman Pusat (outside_area status)   |
 * | linmas          | linmas_pusat_1      | 081234567894   | Rayon Pusat  | Taman Bungkul (active status)       |
 * | linmas          | linmas_pusat_2        | 081234567895   | Rayon Pusat  | Jalan Raya Darmo                    |
 * | satgas          | satgas_timur_1_2       | 081300000006   | Rayon Timur 1| Taman Timur 1 [INACTIVE status]     |
 * | satgas (miss.)  | satgas_timur_1_1       | 081300000005   | Rayon Timur 1| Taman Timur 1 (missing status)      |
 * | satgas          | satgas_pusat_3      | 081300000016   | Rayon Pusat  | Taman Bungkul (single area)         |
 * | satgas (multi)  | satgas_pusat_4      | 081300000017   | Rayon Pusat  | Taman Bungkul + Jalan Raya Darmo    |
 *
 * RAYON PUSAT AREAS (for testing active+passive park scenario):
 *   - Taman Bungkul   → taman aktif  (park type)   — workers: korlap_pusat_1, satgas_pusat_1, linmas_pusat_1
 *   - Jalan Raya Darmo → taman pasif (pedestrian)  — workers: korlap_pusat_1 (2nd), korlap_pusat_2, linmas_pusat_2, satgas_pusat_4 (2nd)
 *   - Taman Pusat     → taman aktif  (park type)   — workers: satgas_pusat_1, satgas_pusat_2
 *
 * RAYON SELATAN AREAS:
 *   - Taman Harmoni   → taman aktif  (park type)   — korlap: korlap_selatan_1 (understaffing test)
 *   - Taman Pelangi   → taman aktif  (park type, NEW) — empty, for boundary/understaffing testing
 *
 * RAYON UTARA AREAS:
 *   - Taman Utara     → taman aktif  (park type, NEW) — korlap: korlap_utara_1
 *
 * MONITORING STATUS SCENARIOS (Phase 2D):
 *   active       → satgas_pusat_1, linmas_pusat_1  (recent GPS ping within boundary)
 *   inactive     → satgas_timur_1_2                   (last ping 35 min ago)
 *   outside_area → satgas_pusat_2                    (GPS outside boundary polygon)
 *   missing      → satgas_timur_1_1                   (no ping for 3+ hours)
 *   offline      → all others
 *
 * MULTI-AREA ASSIGNMENT (Phase 2E - user_areas table):
 *   korlap_pusat_1  → Taman Bungkul (permanent) + Jalan Raya Darmo (permanent)  [both Rayon Pusat]
 *   korlap_pusat_2    → Jalan Raya Darmo (permanent)
 *   satgas_pusat_1  → Taman Pusat (permanent default) + Taman Bungkul (permanent extra)
 *   satgas_timur_1_2 → Taman Timur 1 only (Rayon Timur 1)  [Timur 2 is a different rayon]
 *   satgas_pusat_3 → Taman Bungkul (permanent, single area)
 *   satgas_pusat_4 → Taman Bungkul (permanent default) + Jalan Raya Darmo (permanent extra)
 * =============================================================================
 */

// Real UUID v4 IDs for consistent references
const RAYON_1_ID = '085a298f-d8e9-435c-8a3b-998ffa47a26e';
const RAYON_2_ID = '861a7e7c-8bd5-4e73-8aa7-e92988959dca';
const RAYON_3_ID = 'd564809d-316f-4a2a-a1c6-671eebb49653';
const RAYON_4_ID = '42934ad5-4ea0-4537-abb6-cf7e984e2d39';
const RAYON_5_ID = '742a135b-ddeb-45ca-8d0a-88d7d08aa78a';
const RAYON_6_ID = 'bf040137-fce4-4016-b5e7-704ad82c1594';
const RAYON_7_ID = '7422e6ee-0693-4565-9016-d4f759bdeed2';
/** Rayon Taman Aktif — logical city-wide bucket for taman aktif parks (no geographic boundary). */
const RAYON_TAMAN_AKTIF_ID = '8a8a8a8a-1111-4222-9333-444444444444';

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
const USER_PHASE2_8_ID = '9da22bbf-ea00-4e7a-b2fb-f22339690eb9';
const USER_PHASE2_9_ID = 'b8c6c6a4-7270-4790-8b2f-ba5e8aec5a7a';

// Real UUID v4 IDs for 5 missing-rayon users
const USER_NEW_1_ID = '3f7b4a2e-8c91-4d56-b3e7-9a1f2c4d6e8f'; // kepala_rayon_pusat_1
const USER_NEW_2_ID = '7a2e9d4f-1b3c-4e8a-9f7b-2c6d0e5f8a1b'; // satgas_pusat_1
const USER_NEW_3_ID = '5c8f3a1d-4e7b-4f2c-8a9d-1b6e0f4c7d2e'; // satgas_pusat_2
const USER_NEW_4_ID = '2d9b7e6f-3c4a-4d8e-b1f7-9e0c2a8b4d6f'; // kepala_rayon_timur_1_1
const USER_NEW_5_ID = '8f1c4a7d-6e2b-4f9c-a3d8-7b0e5f1c3a9d'; // satgas_timur_1_1 (missing scenario)
const USER_NEW_6_ID = '4a7d9e2f-8b1c-4a6d-b5e9-3f7c0a4d2b8e'; // satgas_timur_1_2
const USER_NEW_7_ID = '6e3f1b9a-7c4d-4e2f-a8b5-1d9c7e3f0a6b'; // kepala_rayon_timur_2_1
const USER_NEW_8_ID = '9b4e7c2f-1a8d-4b3e-a6f9-4d0b8e2c7f1a'; // satgas_timur_2_1
const USER_NEW_9_ID = '1f8b5e3c-4d7a-4c9e-b2f8-6a1b5e9c4d7f'; // satgas_timur_2_2
const USER_NEW_10_ID = '7c2a8f4d-9e1b-4d7c-a5a2-8e4c1f7b3d9a'; // kepala_rayon_barat_1_1
const USER_NEW_11_ID = '3e9f6b1c-5d8a-4e4f-b7c1-9f3d6a0e8b5c'; // satgas_barat_1_1
const USER_NEW_12_ID = 'a5d2e9f7-6b3c-4f1a-b8e5-2f7d4b9e0a6c'; // satgas_barat_1_2
const USER_NEW_13_ID = 'd8c5f3a9-2e7b-4c8d-a1f6-5b3e9d2c7f4a'; // kepala_rayon_barat_2_1
const USER_NEW_14_ID = '2f7a4d8e-9c1b-4d6f-b3a7-8c5e2f0d4b9e'; // satgas_barat_2_1
const USER_NEW_15_ID = 'b4e8a3f1-7c2d-4b5e-a9f4-1d6a8e3b5f7c'; // satgas_barat_2_2

// New users replacing legacy linmas1 / linmas2 / satgas4
const USER_LINMAS_BUNGKUL_1_ID = 'c6d1f4b8-3a7e-4c9d-a5f2-7b4a1e6d9c3f'; // linmas_pusat_1
const USER_LINMAS_DARMO_1_ID = 'e9b3a7f2-6d4c-4e1b-b8a5-3c7d0b9e2a6f'; // linmas_pusat_2
const USER_KORLAP_DARMO_ID = 'f1d4e7a3-2b8c-4f5d-a9e6-4c1b7e3f0d8a'; // korlap_pusat_2

// Bungkul satgas users (Phase 2E+ demo users)
const USER_SATGAS_BUNGKUL_1_ID = 'a3c9e7f2-1d5b-4a8e-b6c4-9f2e7a3c5d1b'; // satgas_pusat_3
const USER_SATGAS_BUNGKUL_2_ID = 'd7b4f1e9-3c6a-4d2f-a8e5-2b9f4d7c1e6a'; // satgas_pusat_4

// Admin data per rayon — 6 new users (excluding Pusat which already has admin_data_pusat_1)
const USER_ADMIN_DATA_SELATAN_ID = '1a4c7e9b-2d5f-4a8c-93e6-7f9a1c4e7b2d';
const USER_ADMIN_DATA_UTARA_ID = '2b5d8f0c-3e6a-4b9d-a4f7-8a0b2d5f8c3e';
const USER_ADMIN_DATA_TIMUR1_ID = '3c6e9a1d-4f7b-4c0e-b5a8-9b1c3e6a9d4f';
const USER_ADMIN_DATA_TIMUR2_ID = '4d7f0b2e-5a8c-4d1f-86b9-0c2d4f7b0e5a';
const USER_ADMIN_DATA_BARAT1_ID = '5e8a1c3f-6b9d-4e2a-97c0-1d3e5a8c1f6b';
const USER_ADMIN_DATA_BARAT2_ID = '6f9b2d4a-7c0e-4f3b-a8d1-2e4f6b9d2a7c';

// Korlap per rayon — 6 new users (excluding Pusat which already has korlap_pusat_1/korlap_pusat_2)
const USER_KORLAP_HARMONI_ID = '7a0c3e5b-8d1f-4a4c-b9e2-3f5a7c0e3b8d';
const USER_KORLAP_UTARA_ID = '8b1d4f6c-9e2a-4b5d-a0f3-4a6b8d1f4c9e';
const USER_KORLAP_TIMUR1_ID = '9c2e5a7d-0f3b-4c6e-b1a4-5b7c9e2a5d0f';
const USER_KORLAP_TIMUR2_ID = 'ad3f6b8e-1a4c-4d7f-82b5-6c8d0f3b6e1a';
const USER_KORLAP_BARAT1_ID = 'be4a7c9f-2b5d-4e8a-93c6-7d9e1a4c7f2b';
const USER_KORLAP_BARAT2_ID = 'cf5b8d0a-3c6e-4f9b-a4d7-8e0f2b5d8a3c';

// Notification token IDs
const NOTIF_TOKEN_1_ID = '9f4e2d8b-1c7a-4f9e-b3d6-7a2c5e1f4b8d'; // → satgas_pusat_1
const NOTIF_TOKEN_2_ID = '3b8f6e2d-5a9c-4b3f-87d1-4c8a3f6b2e9d'; // → satgas_timur_1_2
const NOTIF_TOKEN_3_ID = '7e3c1f9b-4d8a-4e7c-92f6-9b5e3c0f1d7a'; // → linmas_pusat_1

// Activity IDs for Section C
// Satgas recent (12)
const ACT_SAT_1_ID = 'a1b2c3d4-e5f6-4a7b-8c9d-e0f1a2b3c4d5';
const ACT_SAT_2_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6';
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
// Linmas recent (5)
const ACT_LIN_1_ID = 'a3b4c5d6-e7f8-4a9b-8c1d-e2f3a4b5c6d7';
const ACT_LIN_2_ID = 'b4c5d6e7-f8a9-4b0c-9d2e-f3a4b5c6d7e8';
const ACT_LIN_3_ID = 'c5d6e7f8-a9b0-4c1d-ae3f-a4b5c6d7e8f9';
const ACT_LIN_4_ID = 'd6e7f8a9-b0c1-4d2e-bf4a-b5c6d7e8f9a0';
const ACT_LIN_5_ID = 'e7f8a9b0-c1d2-4e3f-9a5b-c6d7e8f9a0b1';
// Korlap recent (3)
const ACT_KOR_1_ID = 'f8a9b0c1-d2e3-4f4a-8b6c-d7e8f9a0b1c2';
const ACT_KOR_2_ID = 'a9b0c1d2-e3f4-4a5b-9c7d-e8f9a0b1c2d3';
const ACT_KOR_3_ID = 'b0c1d2e3-f4a5-4b6c-ae8d-f9a0b1c2d3e4';
// Extended activities (30) — IDs generated via gen_random_uuid() in SQL (Section C DELETE clears first)

// Task IDs for Section B
const TASK_1_ID = '099757d2-ab32-4384-83e7-22a35b0510ec';
const TASK_2_ID = 'f69ce06b-d253-4455-bf11-6e695eb028f3';
const TASK_3_ID = '809869e9-6ffd-4015-bb02-45d0ff71f344';
const TASK_4_ID = '63abcff4-3294-4643-9eb4-c25127d5bfd0';
const TASK_5_ID = 'a94b846b-ebbf-41df-bcbf-340187c50b5a';
const TASK_6_ID = 'a1de5361-6619-454d-af2a-360fe5cc18bc';
const TASK_7_ID = 'cee9877b-5d88-4528-b339-9bed9a8fb06b';
const TASK_8_ID = '8ec6c9c4-981c-412d-a1e8-a6c2c80ed189';
const LINMAS_TASK_1_ID = 'f5e4d3c2-b1a0-4f9e-8d7c-6b5a4c3d2e1f';
const LINMAS_TASK_2_ID = 'a0b1c2d3-e4f5-4a6b-9c7d-8e9f0a1b2c3d';
const LINMAS_TASK_3_ID = 'b1c2d3e4-f5a6-4b7c-8d9e-9f0a1b2c3d4e';
const LINMAS_TASK_4_ID = 'c2d3e4f5-a6b7-4c8d-ae0f-0a1b2c3d4e5f';
const KORLAP_TASK_1_ID = 'd3e4f5a6-b7c8-4d9e-bf1a-1b2c3d4e5f6a';
const KORLAP_TASK_2_ID = 'e4f5a6b7-c8d9-4e0f-9a2b-2c3d4e5f6a7b';
const KORLAP_TASK_3_ID = 'f5a6b7c8-d9e0-4f1a-8b3c-3d4e5f6a7b8c';
// Rayon-scoped tasks (replaces hardcoded aaa... UUIDs in Section B)
const RAYON_TASK_1_ID = 'a6b7c8d9-e0f1-4a2b-9c4d-4e5f6a7b8c9d';
const RAYON_TASK_2_ID = 'b7c8d9e0-f1a2-4b3c-8d5e-5f6a7b8c9d0e';
const RAYON_TASK_3_ID = 'c8d9e0f1-a2b3-4c4d-ae6f-6a7b8c9d0e1f';
const RAYON_TASK_4_ID = 'd9e0f1a2-b3c4-4d5e-bf7a-7b8c9d0e1f2a';

async function seedPhase2() {
  console.log('🌱 Phase 2 Seeding Started...');
  console.log('');

  // Check if schema exists before deciding to synchronize
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

  // Create a direct connection using TypeORM
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
    // ==========================================
    // STEP 1: Seed Rayons
    // ==========================================
    console.log('📍 Seeding Rayons...');
    await queryRunner.query(`
      INSERT INTO rayons (id, name, description) VALUES
        ('${RAYON_1_ID}', 'Rayon Selatan', 'Wilayah Surabaya Selatan - Wonokromo, Wonocolo, Gayungan, Jambangan'),
        ('${RAYON_2_ID}', 'Rayon Utara', 'Wilayah Surabaya Utara - Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak'),
        ('${RAYON_3_ID}', 'Rayon Pusat', 'Wilayah Surabaya Pusat - Tegalsari, Genteng, Bubutan, Simokerto'),
        ('${RAYON_4_ID}', 'Rayon Timur 1', 'Wilayah Surabaya Timur bagian 1 - Tambaksari, Gubeng, Sukolilo'),
        ('${RAYON_5_ID}', 'Rayon Timur 2', 'Wilayah Surabaya Timur bagian 2 - Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar'),
        ('${RAYON_6_ID}', 'Rayon Barat 1', 'Wilayah Surabaya Barat bagian 1 - Sukomanunggal, Tandes, Asemrowo, Benowo'),
        ('${RAYON_7_ID}', 'Rayon Barat 2', 'Wilayah Surabaya Barat bagian 2 - Sawahan, Dukuh Pakis, Wiyung, Karang Pilang, Lakarsantri, Sambikerep'),
        ('${RAYON_TAMAN_AKTIF_ID}', 'Rayon Taman Aktif', 'Bucket logis untuk taman aktif lintas-rayon — tidak punya batas geografis')
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('  ✓ Created 7 Rayons');

    // Map code (internal reference) to rayon ID for boundary updates
    const codeToRayonId: Record<string, string> = {
      SELATAN: RAYON_1_ID,
      UTARA: RAYON_2_ID,
      PUSAT: RAYON_3_ID,
      TIMUR1: RAYON_4_ID,
      TIMUR2: RAYON_5_ID,
      BARAT1: RAYON_6_ID,
      BARAT2: RAYON_7_ID,
      TAMAN_AKTIF: RAYON_TAMAN_AKTIF_ID,
    };

    // Update rayon boundary polygons with REAL KMZ data (2026-05-18 import).
    // Polygons come from `data/Batas Wilayah Kerja Rayon (24Juni2023).kmz.kml`
    // via the shared `./kmz-areas` module. Centroid of each polygon is used
    // as `center_lat/lng` so the map opens correctly per rayon.
    console.log('📐 Seeding Rayon boundaries (real KMZ polygons)...');
    for (const code of Object.keys(RAYON_BOUNDARIES) as RayonCode[]) {
      const polygon = RAYON_BOUNDARIES[code];
      if (!polygon) continue;
      const ring = polygon.coordinates[0].map(([lng, lat]) => [lng, lat] as [number, number]);
      const centroid = computeCentroidFromRings([ring]);
      const rayonId = codeToRayonId[code];
      await queryRunner.query(
        `UPDATE rayons SET
          center_lat = $1,
          center_lng = $2,
          boundary_polygon = $3::jsonb
         WHERE id = $4`,
        [centroid.lat, centroid.lng, JSON.stringify(polygon), rayonId],
      );
    }
    // Rayon Taman Aktif has no single geographic outline in the KMZ — derive one
    // as the convex hull of its member park polygons (from `Rayon TAMAN AKTIF.kmz`);
    // keep the office center override so the map opens on Taman Flora.
    const tamanRings = loadKmzAreas()
      .filter((a) => a.rayonCode === 'TAMAN_AKTIF')
      .flatMap((a) => a.coordStrings.map((s) => parseCoords(s)));
    const tamanHull = hullPolygonFromRings(tamanRings);
    await queryRunner.query(
      `UPDATE rayons SET center_lat = $1, center_lng = $2,
        boundary_polygon = COALESCE($3::jsonb, boundary_polygon)
       WHERE id = $4`,
      [
        RAYON_TAMAN_AKTIF_OFFICE.lat,
        RAYON_TAMAN_AKTIF_OFFICE.lng,
        tamanHull ? JSON.stringify(tamanHull) : null,
        RAYON_TAMAN_AKTIF_ID,
      ],
    );
    console.log(
      '  ✓ Updated 7 Rayon boundaries (real KMZ polygons) + Taman Aktif (hull boundary + office center)',
    );

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
    // STEP 5: Seed Areas from KMZ (38 areas: 13 Rayon Pusat + 25 Rayon Timur 2)
    // ==========================================
    // 2026-05-18: phase1 no longer inserts areas. Real KMZ-derived polygons
    // for Bungkul + 12 Kawasan Darmo (Rayon Pusat) and 25 Rayon Timur 2
    // placemarks (KORLAP BERLIAN SABRINA MAZAYA.kmz) come from `./kmz-areas`.
    // Empty rayons (Selatan / Utara / Timur 1 / Barat 1 / Barat 2) intentionally
    // have no areas — they exercise the "rayon with no areas" supervisor view.
    console.log('📍 Seeding Areas from KMZ...');
    const RAYON_ID_BY_CODE: Record<RayonCode, string> = {
      SELATAN: RAYON_1_ID,
      UTARA: RAYON_2_ID,
      PUSAT: RAYON_3_ID,
      TIMUR1: RAYON_4_ID,
      TIMUR2: RAYON_5_ID,
      BARAT1: RAYON_6_ID,
      BARAT2: RAYON_7_ID,
      TAMAN_AKTIF: RAYON_TAMAN_AKTIF_ID,
    };
    // One area row (boundary + coverage may be null).
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
    const insertAreaDef = async (areaDef: AreaDef, coordStrings: string[]): Promise<void> => {
      const rings = coordStrings.map((s) => parseCoords(s));
      const { lat, lng } = computeCentroidFromRings(rings);
      await insertArea(
        areaDef.id,
        areaDef.name,
        areaDef.typeCode,
        lat,
        lng,
        JSON.stringify(toGeoJsonGeometry(coordStrings)),
        computeAreaM2FromRings(rings),
        RAYON_ID_BY_CODE[areaDef.rayonCode],
      );
    };

    // Curated Pusat + Timur 2 demo areas, geometry refreshed from the latest KMZ
    // (matched by deterministic id) so ids + dummy assignments stay stable.
    const kmzAll = loadKmzAreas();
    const freshCoordsById = new Map(kmzAll.map((a) => [a.id, a.coordStrings]));
    const ALL_AREA_DEFS: AreaDef[] = [...RAYON_PUSAT_AREAS, ...TIMUR2_AREAS];
    for (const areaDef of ALL_AREA_DEFS) {
      await insertAreaDef(areaDef, freshCoordsById.get(areaDef.id) ?? areaDef.coordStrings);
    }
    console.log(`  ✓ Seeded ${ALL_AREA_DEFS.length} areas (13 Rayon Pusat + 25 Rayon Timur 2)`);

    // Rayon Timur 1 coverage areas — full set from the KMZ so local testing has
    // Timur 1 boundaries (staging seeds these too).
    const timur1Areas = kmzAll.filter((a) => a.rayonCode === 'TIMUR1');
    for (const a of timur1Areas) await insertAreaDef(a, a.coordStrings);
    console.log(`  ✓ Seeded ${timur1Areas.length} Rayon Timur 1 coverage areas (KMZ)`);

    // Taman Aktif parks with real geofences — match the client park list to the
    // taman-aktif KMZ polygons by normalized name (+ alias bridge for label
    // drift); unmatched parks get a center pin. Flora/Bungkul handled specially.
    const normParkName = (s: string): string =>
      s
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, ' ')
        .trim();
    const tamanBoundaryByName = new Map<string, string[]>();
    for (const a of kmzAll) {
      if (a.rayonCode !== 'TAMAN_AKTIF') continue;
      const key = normParkName(a.name);
      if (!tamanBoundaryByName.has(key)) tamanBoundaryByName.set(key, a.coordStrings);
    }
    const TAMAN_NAME_ALIASES: Record<string, string> = {
      'taman insenerator': 'taman incinerator',
      'taman kb wonorejo': 'taman kebun bibit wonorejo',
      'taman kombes': 'taman kombes pol m duryat',
      'taman kunang2': 'taman kunang kunang',
      'taman tais': 'taman ais nasution',
    };
    for (const [csvNorm, kmzNorm] of Object.entries(TAMAN_NAME_ALIASES)) {
      const coords = tamanBoundaryByName.get(kmzNorm);
      if (coords && !tamanBoundaryByName.has(csvNorm)) tamanBoundaryByName.set(csvNorm, coords);
    }
    let tamanSeeded = 0;
    let tamanWithBoundary = 0;
    for (const a of loadTamanAktifAreas()) {
      if (a.name === 'Taman Flora') continue; // city-wide boundary seeded below
      if (a.name === 'Taman Bungkul') {
        const rings = BUNGKUL_COORD_STRINGS.map((s) => parseCoords(s));
        const { lat, lng } = computeCentroidFromRings(rings);
        await insertArea(
          BUNGKUL_AREA_ID,
          a.name,
          'park',
          lat,
          lng,
          JSON.stringify(toGeoJsonGeometry(BUNGKUL_COORD_STRINGS)),
          computeAreaM2FromRings(rings),
          RAYON_TAMAN_AKTIF_ID,
        );
        tamanWithBoundary += 1;
      } else {
        const coordStrings = tamanBoundaryByName.get(normParkName(a.name));
        if (coordStrings && coordStrings.length > 0) {
          const rings = coordStrings.map((s) => parseCoords(s));
          const { lat, lng } = computeCentroidFromRings(rings);
          await insertArea(
            a.id,
            a.name,
            'park',
            lat,
            lng,
            JSON.stringify(toGeoJsonGeometry(coordStrings)),
            computeAreaM2FromRings(rings),
            RAYON_TAMAN_AKTIF_ID,
          );
          tamanWithBoundary += 1;
        } else {
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
        }
      }
      tamanSeeded += 1;
    }
    console.log(
      `  ✓ Seeded ${tamanSeeded} Taman Aktif parks (${tamanWithBoundary} with KMZ geofences)`,
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
    console.log('  ✓ Seeded Taman Flora (Rayon Taman Aktif, city-wide boundary)');

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

    // Default account password hash (bcrypt of "12345678") — shared across all seeders.
    const passwordHash = DEFAULT_PASSWORD_HASH;

    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active) VALUES
        ('${USER_PHASE2_1_ID}', 'top_management_1', '${passwordHash}', 'Top Management Satu', '081234567890', 'top_management', NULL, NULL, TRUE),
        ('${USER_PHASE2_2_ID}', 'kepala_rayon_selatan_1', '${passwordHash}', 'Kepala Rayon Selatan Satu', '081234567891', 'kepala_rayon', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_PHASE2_3_ID}', 'kepala_rayon_utara_1', '${passwordHash}', 'Kepala Rayon Utara Satu', '081234567892', 'kepala_rayon', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_PHASE2_4_ID}', 'korlap_pusat_1', '${passwordHash}', 'Korlap Pusat Satu', '081234567893', 'korlap', NULL, '${DARMO_P3_AREA_ID}', TRUE),
        ('${USER_LINMAS_BUNGKUL_1_ID}', 'linmas_pusat_1', '${passwordHash}', 'Linmas Pusat Satu', '081234567894', 'linmas', NULL, NULL, TRUE),
        ('${USER_LINMAS_DARMO_1_ID}',   'linmas_pusat_2',   '${passwordHash}', 'Linmas Pusat Dua',   '081234567895', 'linmas', NULL, NULL, TRUE),
        ('${USER_KORLAP_DARMO_ID}',     'korlap_pusat_2',     '${passwordHash}', 'Korlap Pusat Dua',  '081234567896', 'korlap', NULL, NULL, TRUE),
        ('${USER_PHASE2_8_ID}', 'admin_data_pusat_1', '${passwordHash}', 'Admin Data Pusat Satu', '081234567897', 'admin_data', '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_PHASE2_9_ID}', 'admin_system_1', '${passwordHash}', 'Admin Sistem Satu', '081234567898', 'admin_system', NULL, NULL, TRUE),
        ('${USER_SATGAS_BUNGKUL_1_ID}', 'satgas_pusat_3', '${passwordHash}', 'Satgas Pusat Tiga', '081300000016', 'satgas', '${RAYON_3_ID}', '${DARMO_P4_AREA_ID}', TRUE),
        ('${USER_SATGAS_BUNGKUL_2_ID}', 'satgas_pusat_4', '${passwordHash}', 'Satgas Pusat Empat',  '081300000017', 'satgas', '${RAYON_3_ID}', '${DARMO_P5_AREA_ID}', TRUE),
        ('5a0b0001-0000-4002-8003-000000000001', 'satgas_taman_bungkul_1', '${passwordHash}', 'Satgas Taman Bungkul Satu', '081300000040', 'satgas', '${RAYON_TAMAN_AKTIF_ID}', '${BUNGKUL_AREA_ID}', TRUE),
        -- Rayon Taman Aktif — full role matrix for testing the logical-bucket rayon
        ('5a0b0001-0000-4002-8003-000000000003', 'korlap_taman_aktif_1', '${passwordHash}', 'Korlap Taman Aktif Satu', '081300000041', 'korlap', '${RAYON_TAMAN_AKTIF_ID}', '${BUNGKUL_AREA_ID}', TRUE),
        ('5a0b0001-0000-4002-8003-000000000004', 'linmas_taman_aktif_1', '${passwordHash}', 'Linmas Taman Aktif Satu', '081300000042', 'linmas', '${RAYON_TAMAN_AKTIF_ID}', '${BUNGKUL_AREA_ID}', TRUE),
        ('5a0b0001-0000-4002-8003-000000000005', 'kepala_rayon_taman_aktif_1', '${passwordHash}', 'Kepala Rayon Taman Aktif Satu', '081300000043', 'kepala_rayon', '${RAYON_TAMAN_AKTIF_ID}', NULL, TRUE),
        ('5a0b0001-0000-4002-8003-000000000006', 'admin_data_taman_aktif_1', '${passwordHash}', 'Admin Data Taman Aktif Satu', '081300000044', 'admin_data', '${RAYON_TAMAN_AKTIF_ID}', NULL, TRUE),
        ('5a0b0001-0000-4002-8003-000000000007', 'satgas_taman_flora_1', '${passwordHash}', 'Satgas Taman Flora Satu', '081300000045', 'satgas', '${RAYON_TAMAN_AKTIF_ID}', '${TAMAN_FLORA_AREA_ID}', TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log(
      '  ✓ Created 11 additional users with Phase 2C roles (incl. linmas_pusat_1, linmas_pusat_2, korlap_pusat_2, satgas_pusat_3, satgas_pusat_4)',
    );

    // Add 15 more users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)
    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active) VALUES
        ('${USER_NEW_1_ID}',  'kepala_rayon_pusat_1',  '${passwordHash}', 'Kepala Rayon Pusat Satu',   '081300000001', 'kepala_rayon', '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_NEW_2_ID}',  'satgas_pusat_1',      '${passwordHash}', 'Satgas Pusat Satu',    '081300000002', 'satgas',       '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_NEW_3_ID}',  'satgas_pusat_2',      '${passwordHash}', 'Satgas Pusat Dua',     '081300000003', 'satgas',       '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_NEW_4_ID}',  'kepala_rayon_timur_1_1', '${passwordHash}', 'Kepala Rayon Timur 1 Satu', '081300000004', 'kepala_rayon', '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_NEW_5_ID}',  'satgas_timur_1_1',     '${passwordHash}', 'Satgas Timur 1 Satu',   '081300000005', 'satgas',       '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_NEW_6_ID}',  'satgas_timur_1_2',     '${passwordHash}', 'Satgas Timur 1 Dua',    '081300000006', 'satgas',       '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_NEW_7_ID}',  'kepala_rayon_timur_2_1', '${passwordHash}', 'Kepala Rayon Timur 2 Satu', '081300000007', 'kepala_rayon', '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_NEW_8_ID}',  'satgas_timur_2_1',     '${passwordHash}', 'Satgas Timur 2 Satu',   '081300000008', 'satgas',       '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_NEW_9_ID}',  'satgas_timur_2_2',     '${passwordHash}', 'Satgas Timur 2 Dua',    '081300000009', 'satgas',       '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_NEW_10_ID}', 'kepala_rayon_barat_1_1', '${passwordHash}', 'Kepala Rayon Barat 1 Satu', '081300000010', 'kepala_rayon', '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_NEW_11_ID}', 'satgas_barat_1_1',     '${passwordHash}', 'Satgas Barat 1 Satu',   '081300000011', 'satgas',       '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_NEW_12_ID}', 'satgas_barat_1_2',     '${passwordHash}', 'Satgas Barat 1 Dua',    '081300000012', 'satgas',       '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_NEW_13_ID}', 'kepala_rayon_barat_2_1', '${passwordHash}', 'Kepala Rayon Barat 2 Satu', '081300000013', 'kepala_rayon', '${RAYON_7_ID}', NULL, TRUE),
        ('${USER_NEW_14_ID}', 'satgas_barat_2_1',     '${passwordHash}', 'Satgas Barat 2 Satu',   '081300000014', 'satgas',       '${RAYON_7_ID}', NULL, TRUE),
        ('${USER_NEW_15_ID}', 'satgas_barat_2_2',     '${passwordHash}', 'Satgas Barat 2 Dua',    '081300000015', 'satgas',       '${RAYON_7_ID}', NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log(
      '  ✓ Created 15 additional users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)',
    );

    // Add admin_data + korlap for the 6 remaining rayons (Selatan, Utara, Timur1, Timur2, Barat1, Barat2)
    // area_id for korlap is set to NULL here and assigned via UPDATE in STEP 8.5 (after areas are created)
    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active) VALUES
        ('${USER_ADMIN_DATA_SELATAN_ID}', 'admin_data_selatan_1', '${passwordHash}', 'Admin Data Selatan Satu', '081300000018', 'admin_data', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_UTARA_ID}',   'admin_data_utara_1',   '${passwordHash}', 'Admin Data Utara Satu',   '081300000019', 'admin_data', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_TIMUR1_ID}',  'admin_data_timur_1_1',  '${passwordHash}', 'Admin Data Timur 1 Satu', '081300000020', 'admin_data', '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_TIMUR2_ID}',  'admin_data_timur_2_1',  '${passwordHash}', 'Admin Data Timur 2 Satu', '081300000021', 'admin_data', '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_BARAT1_ID}',  'admin_data_barat_1_1',  '${passwordHash}', 'Admin Data Barat 1 Satu', '081300000022', 'admin_data', '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_BARAT2_ID}',  'admin_data_barat_2_1',  '${passwordHash}', 'Admin Data Barat 2 Satu', '081300000023', 'admin_data', '${RAYON_7_ID}', NULL, TRUE),
        ('${USER_KORLAP_HARMONI_ID}', 'korlap_selatan_1', '${passwordHash}', 'Korlap Selatan Satu', '081300000024', 'korlap', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_KORLAP_UTARA_ID}',   'korlap_utara_1',   '${passwordHash}', 'Korlap Utara Satu',   '081300000025', 'korlap', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_KORLAP_TIMUR1_ID}',  'korlap_timur_1_1',  '${passwordHash}', 'Korlap Timur 1 Satu', '081300000026', 'korlap', '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_KORLAP_TIMUR2_ID}',  'korlap_timur_2_1',  '${passwordHash}', 'Korlap Timur 2 Satu', '081300000027', 'korlap', '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_KORLAP_BARAT1_ID}',  'korlap_barat_1_1',  '${passwordHash}', 'Korlap Barat 1 Satu', '081300000028', 'korlap', '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_KORLAP_BARAT2_ID}',  'korlap_barat_2_1',  '${passwordHash}', 'Korlap Barat 2 Satu', '081300000029', 'korlap', '${RAYON_7_ID}', NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log(
      '  ✓ Created 12 users: admin_data + korlap for Selatan, Utara, Timur1, Timur2, Barat1, Barat2',
    );

    // 2026-05-18 — top-up: 8 users so every rayon has the full 5-role matrix.
    // Selatan/Utara had no satgas; only Pusat had linmas. Phones 030–037.
    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active) VALUES
        ('5a020001-0000-4002-8001-000000000001', 'satgas_selatan_1',  '${passwordHash}', 'Satgas Selatan Satu',  '081300000030', 'satgas', '${RAYON_1_ID}', NULL, TRUE),
        ('5a020002-0000-4002-8001-000000000002', 'satgas_utara_1',    '${passwordHash}', 'Satgas Utara Satu',    '081300000031', 'satgas', '${RAYON_2_ID}', NULL, TRUE),
        ('5a020003-0000-4002-8002-000000000003', 'linmas_selatan_1',  '${passwordHash}', 'Linmas Selatan Satu',  '081300000032', 'linmas', '${RAYON_1_ID}', NULL, TRUE),
        ('5a020004-0000-4002-8002-000000000004', 'linmas_utara_1',    '${passwordHash}', 'Linmas Utara Satu',    '081300000033', 'linmas', '${RAYON_2_ID}', NULL, TRUE),
        ('5a020005-0000-4002-8002-000000000005', 'linmas_timur_1_1',  '${passwordHash}', 'Linmas Timur 1 Satu',  '081300000034', 'linmas', '${RAYON_4_ID}', NULL, TRUE),
        ('5a020006-0000-4002-8002-000000000006', 'linmas_timur_2_1',  '${passwordHash}', 'Linmas Timur 2 Satu',  '081300000035', 'linmas', '${RAYON_5_ID}', '${TAMAN_BUK_TONG_ID}', TRUE),
        ('5a020007-0000-4002-8002-000000000007', 'linmas_barat_1_1',  '${passwordHash}', 'Linmas Barat 1 Satu',  '081300000036', 'linmas', '${RAYON_6_ID}', NULL, TRUE),
        ('5a020008-0000-4002-8002-000000000008', 'linmas_barat_2_1',  '${passwordHash}', 'Linmas Barat 2 Satu',  '081300000037', 'linmas', '${RAYON_7_ID}', NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log(
      '  ✓ Created 8 fill-in users: satgas Selatan/Utara + linmas for all 6 non-Pusat rayons (linmas_timur_2_1 → Taman Buk Tong)',
    );

    // ==========================================
    // STEP 8.1: Scenario remap — repoint legacy "Taman Pusat / Timur / Barat /
    // Pelangi / Utara / Harmoni" users onto real KMZ areas. 2026-05-18 swap.
    // ==========================================
    console.log('🌳 Remapping legacy dev users onto KMZ areas...');
    // satgas_pusat_1 + satgas_pusat_2 are Rayon Pusat workers → Darmo Pulau 1 / 2.
    // (Taman Bungkul belongs to Rayon Taman Aktif, so Pusat workers no longer
    // anchor there — satgas_taman_bungkul_1 covers the park.)
    // satgas_pusat_2 also drives the outside_area scenario (GPS-driven, area-agnostic).
    await queryRunner.query(
      `UPDATE users SET area_id = '${DARMO_P1_AREA_ID}' WHERE username = 'satgas_pusat_1';`,
    );
    await queryRunner.query(
      `UPDATE users SET area_id = '${DARMO_P2_AREA_ID}' WHERE username = 'satgas_pusat_2';`,
    );
    // Rayon Timur 1 has no KMZ areas, but we still want every rayon to keep
    // a full role matrix. Keep satgas_timur_1_1 in Rayon Timur 1 (area_id = NULL
    // — exercises the "satgas without default area" path) and only move
    // satgas_timur_1_2 over to Rayon Timur 2 / Taman Buk Tong so the
    // INACTIVE-status + missing-status scenarios still have a real area.
    await queryRunner.query(`
      UPDATE users SET rayon_id = '${RAYON_5_ID}', area_id = '${TAMAN_BUK_TONG_ID}'
      WHERE username = 'satgas_timur_1_2';
    `);
    await queryRunner.query(`
      UPDATE users SET area_id = NULL
      WHERE username = 'satgas_timur_1_1';
    `);
    // satgas_timur_2_1/_2 already live in Rayon Timur 2 — give them TAMAN BUK TONG too.
    await queryRunner.query(`
      UPDATE users SET area_id = '${TAMAN_BUK_TONG_ID}'
      WHERE username IN ('satgas_timur_2_1', 'satgas_timur_2_2');
    `);
    // Rayon Barat 1/2 still have no KMZ areas — satgas_barat_*_* keep area_id = NULL.
    // They exercise the "satgas with no default area" / understaffing UI path.
    console.log(
      '  ✓ Scenario remap done — Pusat users → Bungkul/Darmo, Timur 1 users → Rayon Timur 2 (Taman Buk Tong)',
    );

    // Extra staff requirements for the real park areas that anchor scenarios.
    // Taman Bungkul already has 14 requirements (STEP 7). Mirror that for the
    // ACTIVE-park scenario in Rayon Timur 2 so understaffing alerts have inputs.
    await queryRunner.query(`
      INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type) VALUES
        ('${TAMAN_BUK_TONG_ID}', '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
        ('${TAMAN_BUK_TONG_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
        ('${TAMAN_BUK_TONG_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY')
      ON CONFLICT DO NOTHING;
    `);
    console.log('  ✓ Added 3 staff requirements for Taman Buk Tong (Rayon Timur 2 anchor)');

    // ==========================================
    // STEP 8.2: Seed Notification Tokens
    // ==========================================
    console.log('📱 Seeding Notification Tokens...');
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_1_ID}', u.id,
        'ExponentPushToken[satgas_pusat_1_ABCDEF12345_test]', 'device_satgas_pusat1_abc123', 'android', TRUE, NOW() - INTERVAL '7 days'
      FROM users u WHERE u.username = 'satgas_pusat_1' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_2_ID}', u.id,
        'ExponentPushToken[satgas_timur_1_2_GHIJKL67890_test]', 'device_satgas_timur_1_2_xyz789', 'android', TRUE, NOW() - INTERVAL '5 days'
      FROM users u WHERE u.username = 'satgas_timur_1_2' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_3_ID}', u.id,
        'ExponentPushToken[linmas_pusat_1_MNOPQR11223_test]', 'device_linmas_pusat_1_mnp345', 'android', TRUE, NOW() - INTERVAL '3 days'
      FROM users u WHERE u.username = 'linmas_pusat_1' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log(
      '  ✓ Created 3 notification tokens (satgas_pusat_1, satgas_timur_1_2, linmas_pusat_1)',
    );

    // ==========================================
    // STEP 8.5: Assign area_id + rayon_id to field workers
    // Phase 1 users (satgas1/2/3, korlap1/2) had no area/rayon; Phase 2 users
    // (linmas1/2, satgas4) were inserted with NULL area/rayon above.
    // ==========================================
    console.log('📍 Assigning area_id and rayon_id to field workers...');

    // Rayon Pusat field workers without a default area → a Rayon Pusat area
    // (Darmo Pulau). Taman Bungkul is Rayon Taman Aktif, so Pusat workers do
    // not anchor there.
    await queryRunner.query(
      `UPDATE users SET area_id = $1
       WHERE username IN ('korlap_pusat_1', 'linmas_pusat_1')
         AND area_id IS NULL`,
      [DARMO_BCA_AREA_ID],
    );
    // Darmo workers → Rayon Pusat (Pulau 1 stands in for the old single "Jalan Raya Darmo" area).
    await queryRunner.query(
      `UPDATE users SET area_id = $1
       WHERE username IN ('korlap_pusat_2', 'linmas_pusat_2')
         AND area_id IS NULL`,
      [DARMO_P1_AREA_ID],
    );
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

    // Per-rayon korlap area_id assignment. Rayons without KMZ areas (Selatan,
    // Utara, Timur 1, Barat 1, Barat 2) leave the korlap with area_id = NULL —
    // this exercises the "korlap without a default area" UI path. Only Timur 2
    // gets a real area (Taman Buk Tong is the park-type anchor).
    await queryRunner.query(
      `UPDATE users SET area_id = $1
       WHERE username = 'korlap_timur_2_1' AND area_id IS NULL`,
      [TAMAN_BUK_TONG_ID],
    );
    console.log(
      '  ✓ Assigned korlap_timur_2_1 → Taman Buk Tong; other rayon korlap stay area_id NULL (no KMZ areas)',
    );

    // ==========================================
    // STEP 9: Assign each worker a default shift
    // ==========================================
    // (ADR-013) A worker's shift lives on the user now (`users.shift_definition_id`);
    // the daily roster is materialized from that + `user_areas`. There is no
    // separate schedule-template table anymore.
    console.log('📅 Assigning worker shifts...');

    // ALL clockable workers (korlap is clockable too).
    const workerResult = await queryRunner.query(`
      SELECT id FROM users WHERE role IN ('satgas', 'linmas', 'korlap');
    `);

    if (workerResult.length > 0) {
      for (let i = 0; i < workerResult.length; i++) {
        const shiftId = i % 3 === 0 ? SHIFT_1_ID : i % 3 === 1 ? SHIFT_2_ID : SHIFT_3_ID;
        await queryRunner.query(`
          UPDATE users SET shift_definition_id = '${shiftId}' WHERE id = '${workerResult[i].id}';
        `);
      }
      console.log(`  ✓ Assigned shifts to ${workerResult.length} workers (satgas, linmas, korlap)`);
    } else {
      console.log('  ⚠ No workers found, skipping shift assignment');
    }

    // ==========================================
    // STEP 10: Seed Overtimes (Phase 2C)
    // ==========================================
    console.log('⏰ Seeding Overtime records...');

    // Get test users for overtime
    const korlapOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'korlap_pusat_1' LIMIT 1
    `);
    const satgasOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'satgas_pusat_1' LIMIT 1
    `);
    const linmasOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'linmas_pusat_1' LIMIT 1
    `);
    const korlapDarmoOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'korlap_pusat_2' LIMIT 1
    `);

    const kepalaRayonOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'kepala_rayon_selatan_1' LIMIT 1
    `);

    if (korlapOtResult.length > 0 && satgasOtResult.length > 0 && tamanBungkulId) {
      const korlapOtId = korlapOtResult[0].id;
      const satgasOtId = satgasOtResult[0].id;
      const linmasOtId = linmasOtResult.length > 0 ? linmasOtResult[0].id : null;
      const korlap1OtId = korlapDarmoOtResult.length > 0 ? korlapDarmoOtResult[0].id : null;
      const kepalaRayonOtId = kepalaRayonOtResult.length > 0 ? kepalaRayonOtResult[0].id : null;

      // Get activity type IDs for varied overtime
      const otActivityTypes = await queryRunner.query(`
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
          SELECT id, area_id FROM users WHERE username = 'admin_data_pusat_1' LIMIT 1
        `);
        if (adminDataOtResult.length > 0) {
          const OVERTIME_9_ID = 'a8b9c0d1-e2f3-4a4b-8b6d-6e7f8a9b0c1d';
          const OVERTIME_10_ID = 'b9c0d1e2-f3a4-4b5c-8d7e-7f8a9b0c1d2e';
          const adminDataOtId = adminDataOtResult[0].id;
          // admin_data is in Rayon Pusat but has no area_id; use tamanBungkulId as fallback
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
      `SELECT id, area_id FROM users WHERE username = 'linmas_pusat_1' LIMIT 1`,
    );
    const shiftKorlap1 = await queryRunner.query(
      `SELECT id, area_id FROM users WHERE username = 'korlap_pusat_1' LIMIT 1`,
    );
    const shiftAdminData = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'admin_data_pusat_1' LIMIT 1`,
    );
    const shiftKepalaRayon = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'kepala_rayon_selatan_1' LIMIT 1`,
    );
    const shiftArea = await queryRunner.query(`SELECT id FROM areas LIMIT 1`);

    if (shiftArea.length > 0) {
      const areaId = shiftArea[0].id;
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
        const linmasAreaId = shiftLinmas[0].area_id || areaId;
        await queryRunner.query(`
          INSERT INTO shifts (user_id, area_id, clock_in_time, clock_in_gps_lat, clock_in_gps_lng,
            clock_in_photo_url, clock_out_time, clock_out_gps_lat, clock_out_gps_lng, created_at, updated_at)
          VALUES
            ('${linmasId}', '${linmasAreaId}', NOW() - INTERVAL '1 day 8 hours', -7.2905, 112.7398,
              'https://sekar-media.s3.ap-southeast-1.amazonaws.com/clock-in/linmas1-001.jpg',
              NOW() - INTERVAL '1 day', -7.2906, 112.7399, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day')
        `);
        shiftCount += 1;
        console.log(
          '  ✓ Created 1 completed shift for linmas_pusat_1 (clocked-out, ready for live clock-in)',
        );
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
              NOW() - INTERVAL '1 day', -7.2906, 112.7399, NOW() - INTERVAL '1 day 8 hours', NOW() - INTERVAL '1 day')
        `);
        shiftCount += 1;
        console.log(
          '  ✓ Created 1 completed shift for korlap_pusat_1 (clocked-out, ready for live clock-in)',
        );
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
        console.log('  ✓ Created 1 shift for admin_data_pusat_1 (completed)');
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
        console.log('  ✓ Created 1 shift for kepala_rayon_selatan_1 (completed)');
      }

      console.log(`  ✓ Total: ${shiftCount} Phase 2C shifts created`);

      // ── satgas_pusat_1: rich shift history for mobile RiwayatShift testing ──
      // Spreads shifts across: this week, last week, this month, last month,
      // and 2 months ago — so date-range filters (this week / this month / etc.)
      // and the scrollable list all have meaningful data to display.
      await queryRunner.query(`
        INSERT INTO shifts (
          user_id, area_id,
          clock_in_time, clock_in_gps_lat, clock_in_gps_lng, clock_in_photo_url,
          clock_out_time, clock_out_gps_lat, clock_out_gps_lng,
          created_at, updated_at
        )
        SELECT
          u.id,
          u.area_id,
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
      console.log(
        '  ✓ Created 19 shifts for satgas_pusat_1 (spread across 2+ months for filter/scroll testing)',
      );
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

    // May 9, 2026 — bias the seeded tasks to Rayon Pusat so the
    // korlap_pusat_1 / satgas_pusat_* / linmas_pusat_* users (the canonical
    // UAT actors documented in seed-staging) actually have inboxes to work
    // through. Falls back to any user if Pusat isn't populated yet (e.g.
    // someone runs phase2 in isolation against a stripped DB).
    const taskCreator = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'korlap_pusat_1'
       UNION ALL SELECT id FROM users WHERE role = 'korlap' LIMIT 1`,
    );
    const taskSatgas = await queryRunner.query(
      `SELECT id FROM users
       WHERE username IN ('satgas_pusat_1','satgas_pusat_2','satgas_pusat_3','satgas_pusat_4')
       ORDER BY username
       LIMIT 3`,
    );
    const taskLinmas = await queryRunner.query(
      `SELECT id FROM users
       WHERE username IN ('linmas_pusat_1','linmas_pusat_2')
       ORDER BY username
       LIMIT 2`,
    );
    const taskKepala = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'kepala_rayon_pusat_1' LIMIT 1`,
    );
    const taskTopMgmt = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'top_management' LIMIT 1`,
    );
    const taskAreas = await queryRunner.query(
      `SELECT id FROM areas WHERE rayon_id = (SELECT id FROM rayons WHERE name = 'Rayon Pusat')
       ORDER BY name LIMIT 5`,
    );

    if (taskCreator.length === 0 || taskSatgas.length === 0 || taskAreas.length === 0) {
      console.log('  ⚠ Required users/areas not found, skipping tasks');
    } else {
      const cId = taskCreator[0].id;
      const s1Id = taskSatgas[0]?.id;
      const s2Id = taskSatgas[1]?.id ?? s1Id;
      const s3Id = taskSatgas[2]?.id ?? s1Id;
      const l1Id = taskLinmas[0]?.id ?? null;
      const l2Id = taskLinmas[1]?.id ?? l1Id;
      const kId = taskKepala[0]?.id ?? null;
      const tmId = taskTopMgmt[0]?.id ?? null;
      const a1 = taskAreas[0]?.id;
      const a2 = taskAreas[1]?.id ?? a1;
      const a3 = taskAreas[2]?.id ?? a1;

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
      console.log(
        '  ✓ Updated 4 tasks to cover statuses: accepted, declined, verified, revision_needed',
      );

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
          ('${RAYON_TASK_1_ID}', 'Audit Semua Area di Rayon Selatan', 'Periksa kondisi fasilitas di seluruh area dalam rayon.', 'pending', 'medium', NOW() + INTERVAL '7 days', '${RAYON_1_ID}', NULL, NULL, '${cId}', NOW(), NOW()),
          ('${RAYON_TASK_2_ID}', 'Koordinasi Event Weekend Rayon', 'Persiapan event di semua taman dalam rayon.', 'pending', 'medium', NOW() + INTERVAL '3 days', '${RAYON_1_ID}', NULL, NULL, '${cId}', NOW(), NOW())
        ON CONFLICT (id) DO NOTHING;
      `);
      if (kId && tmId) {
        await queryRunner.query(`
          INSERT INTO tasks (id, title, description, status, priority, deadline, rayon_id, area_id, assigned_to, created_by, assigned_at, created_at, updated_at) VALUES
            ('${RAYON_TASK_3_ID}', 'Laporan Bulanan Rayon Selatan', 'Compile laporan bulanan dari semua area di rayon.', 'assigned', 'high', NOW() + INTERVAL '5 days', '${RAYON_1_ID}', NULL, '${kId}', '${tmId}', NOW() - INTERVAL '1 day', NOW(), NOW()),
            ('${RAYON_TASK_4_ID}', 'Review Kinerja Korlap', 'Evaluasi kinerja korlap di rayon untuk kuartal ini.', 'in_progress', 'medium', NOW() + INTERVAL '5 days', '${RAYON_1_ID}', NULL, '${kId}', '${tmId}', NOW() - INTERVAL '2 days', NOW() - INTERVAL '1 day', NOW())
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log('  ✓ Created 4 rayon-scoped tasks (2 plain + 2 kepala_rayon)');
      } else {
        console.log('  ✓ Created 2 rayon-scoped tasks');
      }

      // 25 extended tasks for scroll/filter testing (IDs via gen_random_uuid — Section B DELETE clears first)
      await queryRunner.query(
        `
        INSERT INTO tasks (id, title, description, status, priority, deadline, area_id, assigned_to, created_by, created_at, updated_at)
        VALUES
          (gen_random_uuid(), 'Pemangkasan Pohon Minggu Lalu',   'Pemangkasan pohon di jalur pedestrian.',         'completed',   'medium', $1,  '${a1}', '${s1Id}', '${cId}', $1,  $1 ),
          (gen_random_uuid(), 'Pengecatan Pagar Taman',           'Pengecatan pagar area bermain anak.',            'completed',   'low',    $2,  '${a1}', '${s2Id}', '${cId}', $2,  $2 ),
          (gen_random_uuid(), 'Pembersihan Kolam',                'Pembersihan dan pergantian air kolam hias.',     'completed',   'high',   $3,  '${a1}', '${s1Id}', '${cId}', $3,  $3 ),
          (gen_random_uuid(), 'Perbaikan Jalan Setapak',          'Perbaikan jalan setapak yang rusak.',            'completed',   'urgent', $4,  '${a2}', '${s2Id}', '${cId}', $4,  $4 ),
          (gen_random_uuid(), 'Pemasangan Papan Informasi',       'Pemasangan papan informasi baru di pintu masuk.','in_progress', 'medium', $5,  '${a2}', '${s2Id}', '${cId}', $5,  $5 ),
          (gen_random_uuid(), 'Penyemprotan Hama',                'Penyemprotan hama pada semua tanaman.',          'in_progress', 'high',   $6,  '${a1}', '${s1Id}', '${cId}', $6,  $6 ),
          (gen_random_uuid(), 'Inventarisasi Peralatan',          'Cek dan catat seluruh peralatan taman.',         'assigned',    'low',    $7,  '${a1}', '${s2Id}', '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Pemupukan Tanaman Hias',           'Pemupukan rutin seluruh tanaman hias.',          'assigned',    'medium', $7,  '${a2}', '${s3Id}', '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Perbaikan Saluran Air',            'Perbaikan saluran drainase yang tersumbat.',     'pending',     'urgent', $7,  '${a1}', NULL,      '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Pemasangan Tanaman Merambat',      'Pemasangan tanaman merambat di pagar depan.',   'pending',     'low',    $7,  '${a2}', NULL,      '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Patroli Subuh',                    'Patroli keamanan pukul 04:00-06:00.',           'completed',   'high',   $1,  '${a1}', '${l1Id ?? s1Id}', '${cId}', $1, $1),
          (gen_random_uuid(), 'Pengamanan Car Free Day',          'Pengamanan area taman saat car free day.',      'completed',   'urgent', $2,  '${a1}', '${l2Id ?? s1Id}', '${cId}', $2, $2),
          (gen_random_uuid(), 'Laporan Keamanan Harian',          'Dokumentasi laporan keamanan harian.',          'in_progress', 'medium', $6,  '${a2}', '${l1Id ?? s1Id}', '${cId}', $6, $6),
          (gen_random_uuid(), 'Patroli Sore Hari',                'Patroli area taman pukul 17:00-19:00.',         'assigned',    'high',   $7,  '${a1}', '${l2Id ?? s1Id}', '${cId}', $7, $7),
          (gen_random_uuid(), 'Penertiban Pedagang Liar',         'Koordinasi dengan satpol PP untuk penertiban.',  'pending',     'urgent', $7,  '${a3}', NULL,      '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Evaluasi Kinerja Tim',             'Evaluasi kinerja seluruh tim lapangan.',         'completed',   'high',   $3,  '${a1}', '${cId}',  '${kId ?? cId}', $3, $3),
          (gen_random_uuid(), 'Briefing Prosedur Keselamatan',    'Briefing SOP keselamatan kerja tim.',            'in_progress', 'medium', $6,  '${a2}', '${cId}',  '${kId ?? cId}', $6, $6),
          (gen_random_uuid(), 'Koordinasi Event Bulanan',         'Persiapan dan koordinasi event bulanan.',        'assigned',    'high',   $7,  '${a1}', '${cId}',  '${kId ?? cId}', $7, $7),
          (gen_random_uuid(), 'Audit Penggunaan Anggaran',        'Review penggunaan anggaran operasional.',        'pending',     'low',    $7,  '${a3}', NULL,      '${kId ?? cId}', $7, $7),
          (gen_random_uuid(), 'Perawatan Taman Tema',             'Perawatan khusus taman tema mini.',              'pending',     'medium', $7,  '${a1}', NULL,      '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Pengadaan Benih Tanaman',          'Koordinasi pengadaan benih untuk bulan depan.', 'assigned',    'low',    $7,  '${a2}', '${s1Id}', '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Renovasi Tempat Duduk',            'Pengecatan dan perbaikan tempat duduk.',         'in_progress', 'medium', $7,  '${a1}', '${s2Id}', '${cId}', $7,  $7 ),
          (gen_random_uuid(), 'Dokumentasi Kondisi Taman',        'Foto dan dokumentasi kondisi taman.',            'completed',   'low',    $1,  '${a3}', '${s1Id}', '${cId}', $1,  $1 ),
          (gen_random_uuid(), 'Pembersihan Pasca Event',          'Pembersihan area taman setelah event.',          'completed',   'high',   $2,  '${a1}', '${s2Id}', '${cId}', $2,  $2 ),
          (gen_random_uuid(), 'Pengecatan Mural Taman',           'Pengecatan mural seni pada dinding taman.',     'pending',     'medium', $7,  '${a2}', NULL,      '${cId}', $7,  $7 )
        ;
        `,
        [
          new Date(Date.now() - 30 * 86400000).toISOString(), // $1 30 days ago
          new Date(Date.now() - 21 * 86400000).toISOString(), // $2 21 days ago
          new Date(Date.now() - 14 * 86400000).toISOString(), // $3 14 days ago
          new Date(Date.now() - 7 * 86400000).toISOString(), // $4  7 days ago
          new Date(Date.now() - 3 * 86400000).toISOString(), // $5  3 days ago
          new Date(Date.now() - 1 * 86400000).toISOString(), // $6  1 day ago
          new Date(Date.now() + 7 * 86400000).toISOString(), // $7  7 days from now
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
    const actSatgas1 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'satgas_pusat_1' LIMIT 1`,
    );
    const actSatgas2 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'satgas_timur_1_2' LIMIT 1`,
    );
    const actLinmas1 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'linmas_pusat_1' LIMIT 1`,
    );
    const actLinmas2 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'linmas_pusat_2' LIMIT 1`,
    );
    const actKorlap = await queryRunner.query(`SELECT id FROM users WHERE role = 'korlap' LIMIT 1`);
    const actShift = await queryRunner.query(`SELECT id FROM shifts LIMIT 1`);
    const actArea = await queryRunner.query(
      `SELECT id FROM areas WHERE name ILIKE '%bungkul%' LIMIT 1`,
    );

    if (
      actSatgas1.length === 0 ||
      actLinmas1.length === 0 ||
      actKorlap.length === 0 ||
      actShift.length === 0 ||
      actArea.length === 0
    ) {
      console.log('  ⚠ Required refs not found, skipping activities');
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
      const atypes = await queryRunner.query(`SELECT id, code FROM activity_types`);
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

        // 30 extended activities for scroll testing (IDs via gen_random_uuid — Section C DELETE clears first)
        await queryRunner.query(`
          INSERT INTO activities (id, user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at)
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
        console.log('  ✓ Created 30 extended activities (scroll test coverage)');

        // 10 activities for satgas_pusat_1 created TODAY — needed so the
        // "Ringkasan hari ini" tile shows a non-zero count on a fresh dev install
        // and the TodayActivitiesModal has enough rows to test sheet scrollability.
        await queryRunner.query(`
          INSERT INTO activities (id, user_id, shift_id, area_id, activity_type_id, description, photo_urls, gps_lat, gps_lng, created_at)
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
                WHEN 2 THEN 'pemangkasan rumput zona A.'
                ELSE 'penanaman bibit baru di area timur.'
              END,
            ARRAY['https://sekar-media-dev.s3.amazonaws.com/activities/today-' || gs.n || '.jpg'],
            -7.2905 + ((gs.n % 5) * 0.0003),
            112.7395 + ((gs.n % 5) * 0.0003),
            NOW() - (gs.n * INTERVAL '30 minutes')
          FROM generate_series(1, 10) AS gs(n)
          ON CONFLICT (id) DO NOTHING;
        `);
        console.log(
          '  ✓ Created 10 today-dated activities for satgas_pusat_1 (ringkasan hari ini)',
        );
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
          center_lat: -7.2575,
          center_lng: 112.7521,
          zoom: 12,
          cluster_zoom_threshold: 14,
          cluster_threshold: 30,
        }),
        description: 'Map default view (Surabaya)',
      },
      {
        key: 'alerts',
        value: JSON.stringify({
          missing_user_notify: true,
          understaffed_notify: true,
          low_battery_threshold: 15,
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

    // D.3: Monitoring status variants — EXTENDED for the 4-R web dashboard + monitoring demo
    //
    // Re-enabled for the Phase 4-R WEB review (was disabled under the Phase 3
    // mobile directive). Mobile-safe this time: we write ONLY user_tracking_status
    // (never an open shift) and leave shift_id NULL, so the stale open-shift state
    // that previously crashed the mobile BoundaryDetailModal / blocked live
    // clock-in (SHIFT_ALREADY_ACTIVE) cannot occur. Any latent open shift is also
    // closed defensively below.
    //
    // Seed realistic user_tracking_status rows with varied statuses so the web
    // dashboard + monitoring pages show non-zero KPI counts and worker pins
    // across multiple rayons/areas. Each user gets an entry with:
    // - status: one of ACTIVE/INACTIVE/OUTSIDE_AREA/MISSING/OFFLINE
    // - last_location_at: recent timestamp (within 30 mins for active)
    // - GPS coordinates near their assigned area
    // - rayon_id: for aggregation by rayon in snapshot
    //
    // Status rules:
    // - ACTIVE: last_location_at within 15 minutes, is_within_area = true
    // - INACTIVE: last_location_at 35+ minutes ago, is_within_area = true
    // - OUTSIDE_AREA: GPS coordinates outside assigned area boundary, is_within_area = false
    // - MISSING: last_location_at 3+ hours ago, is_within_area = NULL
    // - OFFLINE: no location data or last_location_at very old
    console.log('  [D.3] Seeding monitoring status variants for web dashboard + monitoring map...');

    // Get a sample of workers from different rayons to seed varied statuses
    const monitoringUsers = await queryRunner.query(`
      SELECT u.id, u.username, u.rayon_id, u.area_id, a.gps_lat, a.gps_lng
      FROM users u
      LEFT JOIN areas a ON u.area_id = a.id
      WHERE u.role IN ('satgas', 'linmas', 'korlap')
      AND u.is_active = TRUE
      AND u.deleted_at IS NULL
      ORDER BY u.rayon_id, u.username
      LIMIT 30
    `);

    // Track rayons to distribute statuses across multiple rayons
    const rayonWorkerMap: Record<string, typeof monitoringUsers> = {};
    for (const user of monitoringUsers) {
      if (user.rayon_id) {
        if (!rayonWorkerMap[user.rayon_id]) rayonWorkerMap[user.rayon_id] = [];
        rayonWorkerMap[user.rayon_id].push(user);
      }
    }

    // Assign status distribution across rayons (spread statuses)
    let statusIndex = 0;
    const statuses = ['active', 'active', 'inactive', 'outside_area', 'missing', 'offline'];

    for (const user of monitoringUsers) {
      const status = statuses[statusIndex % statuses.length];
      statusIndex++;

      // Derive last_location_at and GPS based on status
      let lastLocationAtExpr: string;
      let lat: number;
      let lng: number;
      let isWithinArea: boolean;

      switch (status) {
        case 'active':
          // Recent ping within 5 minutes
          lastLocationAtExpr = `NOW() - INTERVAL '${Math.floor(Math.random() * 5)} minutes'`;
          lat = user.gps_lat ? parseFloat(user.gps_lat) + (Math.random() - 0.5) * 0.002 : -7.25;
          lng = user.gps_lng ? parseFloat(user.gps_lng) + (Math.random() - 0.5) * 0.002 : 112.75;
          isWithinArea = true;
          break;

        case 'inactive':
          // Last ping 35+ minutes ago
          lastLocationAtExpr = `NOW() - INTERVAL '${35 + Math.floor(Math.random() * 60)} minutes'`;
          lat = user.gps_lat ? parseFloat(user.gps_lat) + (Math.random() - 0.5) * 0.001 : -7.25;
          lng = user.gps_lng ? parseFloat(user.gps_lng) + (Math.random() - 0.5) * 0.001 : 112.75;
          isWithinArea = true;
          break;

        case 'outside_area':
          // GPS outside assigned area (far away)
          lastLocationAtExpr = `NOW() - INTERVAL '${10 + Math.floor(Math.random() * 20)} minutes'`;
          lat = user.gps_lat ? parseFloat(user.gps_lat) + (Math.random() - 0.5) * 0.1 : -7.2;
          lng = user.gps_lng ? parseFloat(user.gps_lng) + (Math.random() - 0.5) * 0.1 : 112.8;
          isWithinArea = false;
          break;

        case 'missing':
          // No ping for 3+ hours
          lastLocationAtExpr = `NOW() - INTERVAL '${180 + Math.floor(Math.random() * 180)} minutes'`;
          lat = user.gps_lat ? parseFloat(user.gps_lat) : -7.25;
          lng = user.gps_lng ? parseFloat(user.gps_lng) : 112.75;
          isWithinArea = false;
          break;

        default: // offline
          lastLocationAtExpr = 'NULL';
          lat = 0;
          lng = 0;
          isWithinArea = false;
      }

      // Build INSERT query for this user's tracking status
      const latValue = lastLocationAtExpr === 'NULL' ? 'NULL' : lat.toString();
      const lngValue = lastLocationAtExpr === 'NULL' ? 'NULL' : lng.toString();

      await queryRunner.query(
        `INSERT INTO user_tracking_status
          (user_id, status, area_id, rayon_id, last_latitude, last_longitude,
           last_location_at, is_within_area, updated_at)
        VALUES
          ($1, $2, $3, $4, ${latValue}::decimal, ${lngValue}::decimal,
           (${lastLocationAtExpr})::timestamptz, $5, NOW())
        ON CONFLICT (user_id) DO UPDATE SET
          status = EXCLUDED.status,
          last_latitude = EXCLUDED.last_latitude,
          last_longitude = EXCLUDED.last_longitude,
          last_location_at = EXCLUDED.last_location_at,
          is_within_area = EXCLUDED.is_within_area,
          updated_at = NOW()`,
        [user.id, status, user.area_id, user.rayon_id, isWithinArea],
      );
    }

    console.log(
      `    ✓ Seeded ${monitoringUsers.length} user_tracking_status records with varied statuses (active/inactive/outside_area/missing/offline)`,
    );

    // Ensure all other clockable users remain offline (no monitoring data)
    // Only update users that were NOT in the 30-user sample above
    const seededUserIds = monitoringUsers.map((u: any) => `'${u.id}'`).join(',');
    if (seededUserIds) {
      await queryRunner.query(`
        UPDATE user_tracking_status SET
          status = 'offline',
          shift_id = NULL,
          is_within_area = FALSE,
          last_location_at = NULL,
          updated_at = NOW()
        WHERE status <> 'offline' AND user_id NOT IN (${seededUserIds})
      `);
    }
    console.log('    ✓ All other users remain offline (no seeded location data)');

    // Close any open shifts from previous runs (defensive)
    await queryRunner.query(`
      UPDATE shifts SET
        clock_out_time = clock_in_time + INTERVAL '8 hours',
        updated_at = NOW()
      WHERE clock_out_time IS NULL
    `);

    // ==========================================
    // SECTION E: Phase 2E Data (Client Feedback II)
    // ==========================================
    console.log('\n📌 Section E: Phase 2E Data (Client Feedback II)...');

    // E1: Add phone_number as safety-net UPDATE (already set in INSERT above for new users)
    console.log('  📱 Ensuring phone_number set for all users...');
    await queryRunner.query(`
      UPDATE users SET phone_number = '081200000000' WHERE username = 'superadmin' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567890' WHERE username = 'top_management_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567891' WHERE username = 'kepala_rayon_selatan_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567892' WHERE username = 'kepala_rayon_utara_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567893' WHERE username = 'korlap_pusat_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567894' WHERE username = 'linmas_pusat_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567895' WHERE username = 'linmas_pusat_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567896' WHERE username = 'korlap_pusat_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567897' WHERE username = 'admin_data_pusat_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567898' WHERE username = 'admin_system_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000001' WHERE username = 'kepala_rayon_pusat_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000002' WHERE username = 'satgas_pusat_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000003' WHERE username = 'satgas_pusat_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000004' WHERE username = 'kepala_rayon_timur_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000005' WHERE username = 'satgas_timur_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000006' WHERE username = 'satgas_timur_1_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000007' WHERE username = 'kepala_rayon_timur_2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000008' WHERE username = 'satgas_timur_2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000009' WHERE username = 'satgas_timur_2_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000010' WHERE username = 'kepala_rayon_barat_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000011' WHERE username = 'satgas_barat_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000012' WHERE username = 'satgas_barat_1_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000013' WHERE username = 'kepala_rayon_barat_2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000014' WHERE username = 'satgas_barat_2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000015' WHERE username = 'satgas_barat_2_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000016' WHERE username = 'satgas_pusat_3' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000017' WHERE username = 'satgas_pusat_4' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000018' WHERE username = 'admin_data_selatan_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000019' WHERE username = 'admin_data_utara_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000020' WHERE username = 'admin_data_timur_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000021' WHERE username = 'admin_data_timur_2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000022' WHERE username = 'admin_data_barat_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000023' WHERE username = 'admin_data_barat_2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000024' WHERE username = 'korlap_selatan_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000025' WHERE username = 'korlap_utara_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000026' WHERE username = 'korlap_timur_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000027' WHERE username = 'korlap_timur_2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000028' WHERE username = 'korlap_barat_1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000029' WHERE username = 'korlap_barat_2_1' AND phone_number IS NULL;
    `);
    console.log(
      '    ✓ phone_number ensured for all 39 users (1 admin + 11 phase2c + 12 per-rayon admin_data/korlap + 15 rayon-based)',
    );

    // E2: user_areas — korlap multi-area + satgas multi-area assignments
    console.log('  🗺️ Creating user_areas assignments...');

    // korlap_pusat_1 → Darmo Pulau 3 (primary permanent area, Rayon Pusat)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_pusat_1' AND a.id = '${DARMO_P3_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);
    // korlap_pusat_1 also → Jalan Raya Darmo (same Rayon Pusat — korlap must stay within one rayon)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_pusat_1' AND a.id = '${DARMO_P1_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);
    // korlap_pusat_2 → Jalan Raya Darmo (primary permanent area)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_pusat_2' AND a.id = '${DARMO_P1_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_pusat_1 → Darmo Pulau 1 (default area, post-remap) + Darmo Pulau 2 (extra permanent).
    // Tests: satgas with default area_id can also be assigned to extra areas via user_areas.
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_pusat_1' AND a.id = '${DARMO_P1_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_pusat_1' AND a.id = '${DARMO_P2_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_pusat_3 → Darmo Pulau 4 (default area, no extra assignments)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_pusat_3' AND a.id = '${DARMO_P4_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_taman_bungkul_1 → Taman Bungkul (Rayon Taman Aktif park worker)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_taman_bungkul_1' AND a.id = '${BUNGKUL_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);
    // korlap_taman_aktif_1 → Taman Bungkul + Taman Flora (multi-area within Rayon Taman Aktif)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_taman_aktif_1' AND a.id IN ('${BUNGKUL_AREA_ID}', '${TAMAN_FLORA_AREA_ID}')
      ON CONFLICT DO NOTHING;
    `);
    // linmas_taman_aktif_1 → Taman Bungkul
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'linmas_taman_aktif_1' AND a.id = '${BUNGKUL_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);
    // satgas_taman_flora_1 → Taman Flora
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_taman_flora_1' AND a.id = '${TAMAN_FLORA_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_pusat_4 → Darmo Pulau 5 (default area_id) + Jalan Raya Darmo Pulau 1 (secondary permanent area)
    // This tests: satgas with two permanent areas in the same rayon
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_pusat_4' AND a.id = '${DARMO_P5_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_pusat_4' AND a.id = '${DARMO_P1_AREA_ID}'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_timur_1_2 → Taman Buk Tong (post-remap, now in Rayon Timur 2).
    // The old "Taman Timur 1" dummy area is gone; user was moved in STEP 8.1.
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_timur_1_2' AND a.id = '${TAMAN_BUK_TONG_ID}'
      ON CONFLICT DO NOTHING;
    `);

    console.log(
      '    ✓ user_areas: korlap_pusat_1→Darmo P3+P1 (same rayon), korlap_pusat_2→Darmo P1',
    );
    console.log(
      '    ✓ user_areas: satgas_pusat_1→Darmo P1+P2, satgas_timur_1_2→Taman Buk Tong (Rayon Timur 2 after remap)',
    );
    console.log(
      '    ✓ user_areas: satgas_pusat_3→Darmo P4, satgas_pusat_4→Darmo P5+P1, satgas_taman_bungkul_1→Taman Bungkul',
    );

    // Per-rayon korlap area assignments. Only Rayon Timur 2 has a KMZ area
    // (Taman Buk Tong); the other rayons leave user_areas empty for korlap,
    // which exercises the "korlap with no assignments" supervisor view.
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'superadmin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_timur_2_1' AND a.id = '${TAMAN_BUK_TONG_ID}'
      ON CONFLICT DO NOTHING;
    `);
    console.log(
      '    ✓ user_areas: korlap_timur_2_1 → Taman Buk Tong; other rayon korlap have no user_areas (intentional)',
    );

    console.log('  ✓ Section E (Phase 2E) complete');

    console.log('');
    console.log(
      '╔══════════════════════════════════════════════════════════════════════════════════╗',
    );
    console.log(
      '║  ✅  Phase 2 Seeding Completed Successfully                                     ║',
    );
    console.log(
      '╚══════════════════════════════════════════════════════════════════════════════════╝',
    );
    console.log('');
    console.log('  📦 Reference Data');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('       7 rayons · 3 shifts · 20 activity types · 4 special day overrides');
    console.log('      10 areas · ~50 area_staff_requirements');
    console.log('');
    console.log('  👥 Users  (40 total — all passwords: 12345678)');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log(
      '       1 superadmin (Phase 1) ·  3 system-wide (superadmin / admin_system / top_management)',
    );
    console.log('       8 kepala_rayon  (1 per rayon)   ·  7 admin_data  (1 per rayon)');
    console.log('      ~7 korlap        (primary area)  · ~14 satgas/linmas (across all rayons)');
    console.log('       Login with username OR phone_number as the "identifier"');
    console.log('');
    console.log('  📋 Workflow Data');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log(
      '      Tasks       — 19 core (8 satgas + 4 linmas + 3 korlap + 4 rayon) + 25 extended',
    );
    console.log('      Activities  — 50 total (20 core + 30 extended), spanning the last 60 days');
    console.log('      Overtimes   — 10 records · Phase 2C shifts pre-populated');
    console.log('      Notifications — 3 device tokens registered');
    console.log('');
    console.log('  📡 Monitoring (Phase 2D)');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('      5 configs · user_tracking_status backfilled for all clockable users');
    console.log('      Live status mix → active ×2 · inactive ×1 · outside_area ×1 · missing ×1');
    console.log('');
    console.log('  🗺️  Multi-Area Assignments  (Phase 2E user_areas table)');
    console.log('     ──────────────────────────────────────────────────────────────────────────');
    console.log('      korlap_pusat_1   → Bungkul + Darmo  (permanent, same rayon)');
    console.log('      satgas_pusat_1   → Pusat + Bungkul  (permanent multi-area)');
    console.log('      satgas_timur_1_2  → Timur 1 default + Timur 2 (task_based)');
    console.log('      satgas_pusat_4 → Bungkul + Darmo  (permanent multi-area)');
    console.log(
      '      korlap_selatan_1 / utara / timur1 / timur2 / barat1 / barat2 → primary area each',
    );
    console.log('');
    console.log('  ▶  Next: Phase 3 seed adds 31 kecamatans + 31 staff_kecamatan users +');
    console.log(
      '     plant_species, area_plants, pruning_requests, plant_seeds, service_capacity.',
    );
    console.log('');

    // ─── Verbose live audit (May 9, 2026) ────────────────────────────────
    // Query the seeded users back from the DB and dump every row so the
    // operator can verify the username convention `<role>_<rayon>_<n>` is
    // in effect on this run. The existing static "TEST USERS" banner below
    // is a hand-curated reference; this block is the live ground truth.
    const userAudit = (await queryRunner.query(`
      SELECT u.username, u.role, u.phone_number, r.name AS rayon_name
      FROM users u
      LEFT JOIN rayons r ON r.id = u.rayon_id
      ORDER BY u.role, u.username
    `)) as Array<{
      username: string;
      role: string;
      phone_number: string | null;
      rayon_name: string | null;
    }>;
    console.log('🔎  USER AUDIT — every seeded row, grouped by role');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    let prevRole = '';
    for (const u of userAudit) {
      if (u.role !== prevRole) {
        console.log('');
        console.log(`  ── ${u.role} ──`);
        console.log(`  ${'Username'.padEnd(34)} ${'Phone'.padEnd(13)} Rayon`);
        prevRole = u.role;
      }
      console.log(
        `  ${u.username.padEnd(34)} ${(u.phone_number ?? '—').padEnd(13)} ${u.rayon_name ?? '—'}`,
      );
    }
    console.log('');
    console.log(`  Total users in DB: ${userAudit.length}`);
    console.log('');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    console.log('🧪  TEST USERS — all passwords: 12345678');
    console.log('    Login with username OR phone number as "identifier"');
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
    console.log('');
    console.log(
      '  ── SYSTEM-WIDE ROLES (no area scope) ──────────────────────────────────────────────',
    );
    console.log('  Role            Username           Phone          Notes');
    console.log(
      '  superadmin      admin              081200000000   Full system access (Phase 1 admin)',
    );
    console.log('  admin_system    admin_system_1      081234567898   System administration');
    console.log('  top_management  top_management_1    081234567890   City-wide read-only view');
    console.log('');
    console.log(
      '  ── RAYON PUSAT ─────────────────────────────────────────────────────────────────────',
    );
    console.log('  Areas: Taman Bungkul (aktif) · Jalan Raya Darmo (pasif) · Taman Pusat (aktif)');
    console.log('');
    console.log('  Role            Username           Phone          Area');
    console.log(
      '  admin_data      admin_data_pusat_1        081234567897   Rayon Pusat — data entry & reports',
    );
    console.log('  kepala_rayon    kepala_rayon_pusat_1 081300000001   Rayon Pusat head');
    console.log(
      '  korlap          korlap_pusat_1     081234567893   Taman Bungkul + Jalan Raya Darmo (multi, same rayon)',
    );
    console.log('  korlap          korlap_pusat_2       081234567896   Jalan Raya Darmo');
    console.log(
      '  satgas          satgas_pusat_1     081300000002   Taman Pusat + Taman Bungkul (multi) [ACTIVE]',
    );
    console.log(
      '  satgas          satgas_pusat_2     081300000003   Taman Pusat [OUTSIDE_AREA status]',
    );
    console.log('  linmas          linmas_pusat_1   081234567894   Taman Bungkul [ACTIVE status]');
    console.log('  linmas          linmas_pusat_2     081234567895   Jalan Raya Darmo');
    console.log('  satgas          satgas_pusat_3   081300000016   Taman Bungkul (single area)');
    console.log(
      '  satgas          satgas_pusat_4   081300000017   Taman Bungkul + Jalan Raya Darmo (multi)',
    );
    console.log('');
    console.log(
      '  ── RAYON SELATAN ───────────────────────────────────────────────────────────────────',
    );
    console.log(
      '  Areas: Taman Harmoni (aktif) · Taman Pelangi (aktif, empty — understaffing test)',
    );
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_selatan_1  081234567891   Rayon Selatan head');
    console.log(
      '  admin_data      admin_data_selatan_1    081300000018   Rayon Selatan — data entry & reports',
    );
    console.log('  korlap          korlap_selatan_1        081300000024   Taman Harmoni');
    console.log('');
    console.log(
      '  ── RAYON UTARA ─────────────────────────────────────────────────────────────────────',
    );
    console.log('  Area: Taman Utara (NEW)');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_utara_1    081234567892   Rayon Utara head');
    console.log(
      '  admin_data      admin_data_utara_1      081300000019   Rayon Utara — data entry & reports',
    );
    console.log('  korlap          korlap_utara_1          081300000025   Taman Utara');
    console.log('');
    console.log(
      '  ── RAYON TIMUR 1 ───────────────────────────────────────────────────────────────────',
    );
    console.log('  Area: Taman Timur 1');
    console.log('');
    console.log('  Role            Username              Phone          Area / Monitoring Status');
    console.log('  kepala_rayon    kepala_rayon_timur_1_1   081300000004   Rayon Timur 1 head');
    console.log(
      '  admin_data      admin_data_timur_1_1     081300000020   Rayon Timur 1 — data entry & reports',
    );
    console.log('  korlap          korlap_timur_1_1         081300000026   Taman Timur 1');
    console.log(
      '  satgas          satgas_timur_1_1       081300000005   Taman Timur 1 [MISSING — no ping 3h+]',
    );
    console.log(
      '  satgas          satgas_timur_1_2       081300000006   Taman Timur 1 [INACTIVE 35min]',
    );
    console.log('');
    console.log(
      '  ── RAYON TIMUR 2 ───────────────────────────────────────────────────────────────────',
    );
    console.log('  Area: Taman Timur 2');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_timur_2_1   081300000007   Rayon Timur 2 head');
    console.log(
      '  admin_data      admin_data_timur_2_1     081300000021   Rayon Timur 2 — data entry & reports',
    );
    console.log('  korlap          korlap_timur_2_1         081300000027   Taman Timur 2');
    console.log('  satgas          satgas_timur_2_1       081300000008   Taman Timur 2');
    console.log('  satgas          satgas_timur_2_2       081300000009   Taman Timur 2');
    console.log('');
    console.log(
      '  ── RAYON BARAT 1 ───────────────────────────────────────────────────────────────────',
    );
    console.log('  Area: Taman Barat 1');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_barat_1_1   081300000010   Rayon Barat 1 head');
    console.log(
      '  admin_data      admin_data_barat_1_1     081300000022   Rayon Barat 1 — data entry & reports',
    );
    console.log('  korlap          korlap_barat_1_1         081300000028   Taman Barat 1');
    console.log('  satgas          satgas_barat_1_1       081300000011   Taman Barat 1');
    console.log('  satgas          satgas_barat_1_2       081300000012   Taman Barat 1');
    console.log('');
    console.log(
      '  ── RAYON BARAT 2 ───────────────────────────────────────────────────────────────────',
    );
    console.log('  Area: Taman Barat 2');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_barat_2_1   081300000013   Rayon Barat 2 head');
    console.log(
      '  admin_data      admin_data_barat_2_1     081300000023   Rayon Barat 2 — data entry & reports',
    );
    console.log('  korlap          korlap_barat_2_1         081300000029   Taman Barat 2');
    console.log('  satgas          satgas_barat_2_1       081300000014   Taman Barat 2');
    console.log('  satgas          satgas_barat_2_2       081300000015   Taman Barat 2');
    console.log('');
    console.log(
      '  ── MONITORING STATUS SCENARIOS (Phase 2D) ──────────────────────────────────────────',
    );
    console.log('  ACTIVE       satgas_pusat_1, linmas_pusat_1   recent GPS ping within boundary');
    console.log('  INACTIVE     satgas_timur_1_2                    last ping 35 min ago');
    console.log('  OUTSIDE_AREA satgas_pusat_2                     GPS outside boundary polygon');
    console.log('  MISSING      satgas_timur_1_1                    no ping for 3+ hours');
    console.log('  OFFLINE      all remaining users');
    console.log('');
    console.log(
      '  ── MULTI-AREA ASSIGNMENTS (Phase 2E — user_areas table) ────────────────────────────',
    );
    console.log('  korlap_pusat_1  Taman Bungkul (permanent) + Taman Harmoni (permanent)');
    console.log(
      '  satgas_pusat_1  Taman Pusat (permanent default) + Taman Bungkul (permanent extra)',
    );
    console.log(
      '  satgas_timur_1_2 Taman Timur 1 (permanent default) + Taman Timur 2 (task_based)',
    );
    console.log(
      '══════════════════════════════════════════════════════════════════════════════════════',
    );
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
