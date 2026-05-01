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
 * TEST USERS BY ROLE  (all passwords: password123)
 * Login via username OR phone number as identifier
 * =============================================================================
 *
 * | Role            | Username              | Phone          | Rayon        | Area / Notes                        |
 * |-----------------|---------------------- |----------------|--------------|-------------------------------------|
 * | superadmin      | admin                 | 081200000000   | —            | Full system access (Phase 1 admin)  |
 * | admin_system    | admin_system1         | 081234567898   | —            | System administration               |
 * | top_management  | top_management1       | 081234567890   | —            | City-wide read-only view            |
 * | admin_data      | admin_data1           | 081234567897   | Rayon Pusat  | Data entry & reporting              |
 * | kepala_rayon    | kepala_rayon_pusat    | 081300000001   | Rayon Pusat  | Manages Pusat sector                |
 * | korlap (multi)  | korlap_bungkul        | 081234567893   | Rayon Pusat  | Taman Bungkul + Jalan Raya Darmo    |
 * | korlap (single) | korlap_darmo          | 081234567896   | Rayon Pusat  | Jalan Raya Darmo                    |
 * | satgas (multi)  | satgas_pusat_1        | 081300000002   | Rayon Pusat  | Taman Pusat + Taman Bungkul (multi) |
 * | satgas          | satgas_pusat_2        | 081300000003   | Rayon Pusat  | Taman Pusat (outside_area status)   |
 * | linmas          | linmas_bungkul_1      | 081234567894   | Rayon Pusat  | Taman Bungkul (active status)       |
 * | linmas          | linmas_darmo_1        | 081234567895   | Rayon Pusat  | Jalan Raya Darmo                    |
 * | satgas          | satgas_timur1_2       | 081300000006   | Rayon Timur 1| Taman Timur 1 [INACTIVE status]     |
 * | satgas (miss.)  | satgas_timur1_1       | 081300000005   | Rayon Timur 1| Taman Timur 1 (missing status)      |
 * | satgas          | satgas_bungkul_1      | 081300000016   | Rayon Pusat  | Taman Bungkul (single area)         |
 * | satgas (multi)  | satgas_bungkul_2      | 081300000017   | Rayon Pusat  | Taman Bungkul + Jalan Raya Darmo    |
 *
 * RAYON PUSAT AREAS (for testing active+passive park scenario):
 *   - Taman Bungkul   → taman aktif  (park type)   — workers: korlap_bungkul, satgas_pusat_1, linmas_bungkul_1
 *   - Jalan Raya Darmo → taman pasif (pedestrian)  — workers: korlap_bungkul (2nd), korlap_darmo, linmas_darmo_1, satgas_bungkul_2 (2nd)
 *   - Taman Pusat     → taman aktif  (park type)   — workers: satgas_pusat_1, satgas_pusat_2
 *
 * RAYON SELATAN AREAS:
 *   - Taman Harmoni   → taman aktif  (park type)   — korlap: korlap_harmoni (understaffing test)
 *   - Taman Pelangi   → taman aktif  (park type, NEW) — empty, for boundary/understaffing testing
 *
 * RAYON UTARA AREAS:
 *   - Taman Utara     → taman aktif  (park type, NEW) — korlap: korlap_utara
 *
 * MONITORING STATUS SCENARIOS (Phase 2D):
 *   active       → satgas_pusat_1, linmas_bungkul_1  (recent GPS ping within boundary)
 *   inactive     → satgas_timur1_2                   (last ping 35 min ago)
 *   outside_area → satgas_pusat_2                    (GPS outside boundary polygon)
 *   missing      → satgas_timur1_1                   (no ping for 3+ hours)
 *   offline      → all others
 *
 * MULTI-AREA ASSIGNMENT (Phase 2E - user_areas table):
 *   korlap_bungkul  → Taman Bungkul (permanent) + Jalan Raya Darmo (permanent)  [both Rayon Pusat]
 *   korlap_darmo    → Jalan Raya Darmo (permanent)
 *   satgas_pusat_1  → Taman Pusat (permanent default) + Taman Bungkul (permanent extra)
 *   satgas_timur1_2 → Taman Timur 1 only (Rayon Timur 1)  [Timur 2 is a different rayon]
 *   satgas_bungkul_1 → Taman Bungkul (permanent, single area)
 *   satgas_bungkul_2 → Taman Bungkul (permanent default) + Jalan Raya Darmo (permanent extra)
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
const USER_NEW_1_ID = '3f7b4a2e-8c91-4d56-b3e7-9a1f2c4d6e8f'; // kepala_rayon_pusat
const USER_NEW_2_ID = '7a2e9d4f-1b3c-4e8a-9f7b-2c6d0e5f8a1b'; // satgas_pusat_1
const USER_NEW_3_ID = '5c8f3a1d-4e7b-4f2c-8a9d-1b6e0f4c7d2e'; // satgas_pusat_2
const USER_NEW_4_ID = '2d9b7e6f-3c4a-4d8e-b1f7-9e0c2a8b4d6f'; // kepala_rayon_timur1
const USER_NEW_5_ID = '8f1c4a7d-6e2b-4f9c-a3d8-7b0e5f1c3a9d'; // satgas_timur1_1 (missing scenario)
const USER_NEW_6_ID = '4a7d9e2f-8b1c-4a6d-b5e9-3f7c0a4d2b8e'; // satgas_timur1_2
const USER_NEW_7_ID = '6e3f1b9a-7c4d-4e2f-a8b5-1d9c7e3f0a6b'; // kepala_rayon_timur2
const USER_NEW_8_ID = '9b4e7c2f-1a8d-4b3e-a6f9-4d0b8e2c7f1a'; // satgas_timur2_1
const USER_NEW_9_ID = '1f8b5e3c-4d7a-4c9e-b2f8-6a1b5e9c4d7f'; // satgas_timur2_2
const USER_NEW_10_ID = '7c2a8f4d-9e1b-4d7c-a5a2-8e4c1f7b3d9a'; // kepala_rayon_barat1
const USER_NEW_11_ID = '3e9f6b1c-5d8a-4e4f-b7c1-9f3d6a0e8b5c'; // satgas_barat1_1
const USER_NEW_12_ID = 'a5d2e9f7-6b3c-4f1a-b8e5-2f7d4b9e0a6c'; // satgas_barat1_2
const USER_NEW_13_ID = 'd8c5f3a9-2e7b-4c8d-a1f6-5b3e9d2c7f4a'; // kepala_rayon_barat2
const USER_NEW_14_ID = '2f7a4d8e-9c1b-4d6f-b3a7-8c5e2f0d4b9e'; // satgas_barat2_1
const USER_NEW_15_ID = 'b4e8a3f1-7c2d-4b5e-a9f4-1d6a8e3b5f7c'; // satgas_barat2_2

// New users replacing legacy linmas1 / linmas2 / satgas4
const USER_LINMAS_BUNGKUL_1_ID = 'c6d1f4b8-3a7e-4c9d-a5f2-7b4a1e6d9c3f'; // linmas_bungkul_1
const USER_LINMAS_DARMO_1_ID = 'e9b3a7f2-6d4c-4e1b-b8a5-3c7d0b9e2a6f'; // linmas_darmo_1
const USER_KORLAP_DARMO_ID = 'f1d4e7a3-2b8c-4f5d-a9e6-4c1b7e3f0d8a'; // korlap_darmo

// Bungkul satgas users (Phase 2E+ demo users)
const USER_SATGAS_BUNGKUL_1_ID = 'a3c9e7f2-1d5b-4a8e-b6c4-9f2e7a3c5d1b'; // satgas_bungkul_1
const USER_SATGAS_BUNGKUL_2_ID = 'd7b4f1e9-3c6a-4d2f-a8e5-2b9f4d7c1e6a'; // satgas_bungkul_2

// Taman Utara area (Rayon Utara has no area yet)
const AREA_UTARA_ID = '8b3e6f1d-4a9c-4b7e-92f8-5d1c9e3b6f4a';

// Admin data per rayon — 6 new users (excluding Pusat which already has admin_data1)
const USER_ADMIN_DATA_SELATAN_ID = '1a4c7e9b-2d5f-4a8c-93e6-7f9a1c4e7b2d';
const USER_ADMIN_DATA_UTARA_ID   = '2b5d8f0c-3e6a-4b9d-a4f7-8a0b2d5f8c3e';
const USER_ADMIN_DATA_TIMUR1_ID  = '3c6e9a1d-4f7b-4c0e-b5a8-9b1c3e6a9d4f';
const USER_ADMIN_DATA_TIMUR2_ID  = '4d7f0b2e-5a8c-4d1f-86b9-0c2d4f7b0e5a';
const USER_ADMIN_DATA_BARAT1_ID  = '5e8a1c3f-6b9d-4e2a-97c0-1d3e5a8c1f6b';
const USER_ADMIN_DATA_BARAT2_ID  = '6f9b2d4a-7c0e-4f3b-a8d1-2e4f6b9d2a7c';

// Korlap per rayon — 6 new users (excluding Pusat which already has korlap_bungkul/korlap_darmo)
const USER_KORLAP_HARMONI_ID = '7a0c3e5b-8d1f-4a4c-b9e2-3f5a7c0e3b8d';
const USER_KORLAP_UTARA_ID   = '8b1d4f6c-9e2a-4b5d-a0f3-4a6b8d1f4c9e';
const USER_KORLAP_TIMUR1_ID  = '9c2e5a7d-0f3b-4c6e-b1a4-5b7c9e2a5d0f';
const USER_KORLAP_TIMUR2_ID  = 'ad3f6b8e-1a4c-4d7f-82b5-6c8d0f3b6e1a';
const USER_KORLAP_BARAT1_ID  = 'be4a7c9f-2b5d-4e8a-93c6-7d9e1a4c7f2b';
const USER_KORLAP_BARAT2_ID  = 'cf5b8d0a-3c6e-4f9b-a4d7-8e0f2b5d8a3c';

// New areas for 5 missing rayons + Taman Pelangi (Selatan)
const AREA_PUSAT_ID = 'f4e9b2d6-1c7a-4f3e-a8b5-6d2c9f4e1b7a';
const AREA_TIMUR1_ID = 'a8d3f7e1-9b4c-4a6d-92f9-4e1b8d7f3a9c';
const AREA_TIMUR2_ID = 'c2f8e4b7-5d1a-4c8f-b6e3-9a5d2c1f8e4b';
const AREA_BARAT1_ID = '7d5c9f3e-2a8b-4d1c-a7e4-1f6b3e9d5c2f';
const AREA_BARAT2_ID = '5b1e8d4c-7f3a-4b6e-89c2-8a4f7b1e5d3c';
const AREA_PELANGI_ID = '6a5b4c3d-2e1f-4a9b-8c7d-6e5f4a3b2c1d'; // Taman Pelangi, Rayon Selatan

// Notification token IDs
const NOTIF_TOKEN_1_ID = '9f4e2d8b-1c7a-4f9e-b3d6-7a2c5e1f4b8d'; // → satgas_pusat_1
const NOTIF_TOKEN_2_ID = '3b8f6e2d-5a9c-4b3f-87d1-4c8a3f6b2e9d'; // → satgas_timur1_2
const NOTIF_TOKEN_3_ID = '7e3c1f9b-4d8a-4e7c-92f6-9b5e3c0f1d7a'; // → linmas_bungkul_1

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

    // Update rayon boundary polygons + center coordinates (dummy — will be replaced with real data)
    console.log('📐 Seeding Rayon boundaries...');
    await queryRunner.query(`
      UPDATE rayons SET
        center_lat = -7.3200, center_lng = 112.7350,
        boundary_polygon = '{"type":"Polygon","coordinates":[[[112.72,  -7.30],[112.75,  -7.30],[112.75,  -7.34],[112.72,  -7.34],[112.72,  -7.30]]]}',
        boundary_computed_at = NOW()
      WHERE id = '${RAYON_1_ID}';
      UPDATE rayons SET
        center_lat = -7.2200, center_lng = 112.7450,
        boundary_polygon = '{"type":"Polygon","coordinates":[[[112.73,  -7.20],[112.76,  -7.20],[112.76,  -7.24],[112.73,  -7.24],[112.73,  -7.20]]]}',
        boundary_computed_at = NOW()
      WHERE id = '${RAYON_2_ID}';
      UPDATE rayons SET
        center_lat = -7.2650, center_lng = 112.7400,
        boundary_polygon = '{"type":"Polygon","coordinates":[[[112.72,  -7.25],[112.76,  -7.25],[112.76,  -7.28],[112.72,  -7.28],[112.72,  -7.25]]]}',
        boundary_computed_at = NOW()
      WHERE id = '${RAYON_3_ID}';
      UPDATE rayons SET
        center_lat = -7.2500, center_lng = 112.7650,
        boundary_polygon = '{"type":"Polygon","coordinates":[[[112.75,  -7.23],[112.78,  -7.23],[112.78,  -7.27],[112.75,  -7.27],[112.75,  -7.23]]]}',
        boundary_computed_at = NOW()
      WHERE id = '${RAYON_4_ID}';
      UPDATE rayons SET
        center_lat = -7.2750, center_lng = 112.7850,
        boundary_polygon = '{"type":"Polygon","coordinates":[[[112.77,  -7.26],[112.80,  -7.26],[112.80,  -7.29],[112.77,  -7.29],[112.77,  -7.26]]]}',
        boundary_computed_at = NOW()
      WHERE id = '${RAYON_5_ID}';
      UPDATE rayons SET
        center_lat = -7.2550, center_lng = 112.6950,
        boundary_polygon = '{"type":"Polygon","coordinates":[[[112.68,  -7.24],[112.71,  -7.24],[112.71,  -7.27],[112.68,  -7.27],[112.68,  -7.24]]]}',
        boundary_computed_at = NOW()
      WHERE id = '${RAYON_6_ID}';
      UPDATE rayons SET
        center_lat = -7.2850, center_lng = 112.6750,
        boundary_polygon = '{"type":"Polygon","coordinates":[[[112.66,  -7.27],[112.69,  -7.27],[112.69,  -7.30],[112.66,  -7.30],[112.66,  -7.27]]]}',
        boundary_computed_at = NOW()
      WHERE id = '${RAYON_7_ID}';
    `);
    console.log('  ✓ Updated 7 Rayon boundaries (dummy)');

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
    // Assign Taman Bungkul to Rayon Pusat
    await queryRunner.query(`
      UPDATE areas SET rayon_id = '${RAYON_3_ID}'
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
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active) VALUES
        ('${USER_PHASE2_1_ID}', 'top_management1', '${passwordHash}', 'Kepala Dinas RTH', '081234567890', 'top_management', NULL, NULL, TRUE),
        ('${USER_PHASE2_2_ID}', 'kepala_rayon_selatan', '${passwordHash}', 'Kepala Rayon Selatan', '081234567891', 'kepala_rayon', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_PHASE2_3_ID}', 'kepala_rayon_utara', '${passwordHash}', 'Kepala Rayon Utara', '081234567892', 'kepala_rayon', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_PHASE2_4_ID}', 'korlap_bungkul', '${passwordHash}', 'Korlap Taman Bungkul', '081234567893', 'korlap', NULL, '${tamanBungkulId}', TRUE),
        ('${USER_LINMAS_BUNGKUL_1_ID}', 'linmas_bungkul_1', '${passwordHash}', 'Linmas Bungkul Satu', '081234567894', 'linmas', NULL, NULL, TRUE),
        ('${USER_LINMAS_DARMO_1_ID}',   'linmas_darmo_1',   '${passwordHash}', 'Linmas Darmo Satu',   '081234567895', 'linmas', NULL, NULL, TRUE),
        ('${USER_KORLAP_DARMO_ID}',     'korlap_darmo',     '${passwordHash}', 'Korlap Jalan Darmo',  '081234567896', 'korlap', NULL, NULL, TRUE),
        ('${USER_PHASE2_8_ID}', 'admin_data1', '${passwordHash}', 'Admin Data Satu', '081234567897', 'admin_data', '${RAYON_3_ID}', NULL, TRUE),
        ('${USER_PHASE2_9_ID}', 'admin_system1', '${passwordHash}', 'Admin Sistem Satu', '081234567898', 'admin_system', NULL, NULL, TRUE),
        ('${USER_SATGAS_BUNGKUL_1_ID}', 'satgas_bungkul_1', '${passwordHash}', 'Satgas Bungkul Satu', '081300000016', 'satgas', '${RAYON_3_ID}', '${tamanBungkulId}', TRUE),
        ('${USER_SATGAS_BUNGKUL_2_ID}', 'satgas_bungkul_2', '${passwordHash}', 'Satgas Bungkul Dua',  '081300000017', 'satgas', '${RAYON_3_ID}', '${tamanBungkulId}', TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('  ✓ Created 11 additional users with Phase 2C roles (incl. linmas_bungkul_1, linmas_darmo_1, korlap_darmo, satgas_bungkul_1, satgas_bungkul_2)');

    // Add 15 more users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)
    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active) VALUES
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
    console.log(
      '  ✓ Created 15 additional users for 5 missing rayons (PUSAT, TIMUR1, TIMUR2, BARAT1, BARAT2)',
    );

    // Add admin_data + korlap for the 6 remaining rayons (Selatan, Utara, Timur1, Timur2, Barat1, Barat2)
    // area_id for korlap is set to NULL here and assigned via UPDATE in STEP 8.5 (after areas are created)
    await queryRunner.query(`
      INSERT INTO users (id, username, password_hash, full_name, phone_number, role, rayon_id, area_id, is_active) VALUES
        ('${USER_ADMIN_DATA_SELATAN_ID}', 'admin_data_selatan', '${passwordHash}', 'Admin Data Selatan', '081300000018', 'admin_data', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_UTARA_ID}',   'admin_data_utara',   '${passwordHash}', 'Admin Data Utara',   '081300000019', 'admin_data', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_TIMUR1_ID}',  'admin_data_timur1',  '${passwordHash}', 'Admin Data Timur 1', '081300000020', 'admin_data', '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_TIMUR2_ID}',  'admin_data_timur2',  '${passwordHash}', 'Admin Data Timur 2', '081300000021', 'admin_data', '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_BARAT1_ID}',  'admin_data_barat1',  '${passwordHash}', 'Admin Data Barat 1', '081300000022', 'admin_data', '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_ADMIN_DATA_BARAT2_ID}',  'admin_data_barat2',  '${passwordHash}', 'Admin Data Barat 2', '081300000023', 'admin_data', '${RAYON_7_ID}', NULL, TRUE),
        ('${USER_KORLAP_HARMONI_ID}', 'korlap_harmoni', '${passwordHash}', 'Korlap Taman Harmoni', '081300000024', 'korlap', '${RAYON_1_ID}', NULL, TRUE),
        ('${USER_KORLAP_UTARA_ID}',   'korlap_utara',   '${passwordHash}', 'Korlap Taman Utara',   '081300000025', 'korlap', '${RAYON_2_ID}', NULL, TRUE),
        ('${USER_KORLAP_TIMUR1_ID}',  'korlap_timur1',  '${passwordHash}', 'Korlap Taman Timur 1', '081300000026', 'korlap', '${RAYON_4_ID}', NULL, TRUE),
        ('${USER_KORLAP_TIMUR2_ID}',  'korlap_timur2',  '${passwordHash}', 'Korlap Taman Timur 2', '081300000027', 'korlap', '${RAYON_5_ID}', NULL, TRUE),
        ('${USER_KORLAP_BARAT1_ID}',  'korlap_barat1',  '${passwordHash}', 'Korlap Taman Barat 1', '081300000028', 'korlap', '${RAYON_6_ID}', NULL, TRUE),
        ('${USER_KORLAP_BARAT2_ID}',  'korlap_barat2',  '${passwordHash}', 'Korlap Taman Barat 2', '081300000029', 'korlap', '${RAYON_7_ID}', NULL, TRUE)
      ON CONFLICT (username) DO NOTHING;
    `);
    console.log('  ✓ Created 12 users: admin_data + korlap for Selatan, Utara, Timur1, Timur2, Barat1, Barat2');

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
           TRUE),
          ('${AREA_PELANGI_ID}', 'Taman Pelangi', '${parkTypeId}', '${RAYON_1_ID}', -7.3450, 112.7250,
           '{"type":"Polygon","coordinates":[[[112.724,-7.344],[112.726,-7.344],[112.726,-7.346],[112.724,-7.346],[112.724,-7.344]]]}',
           TRUE),
          ('${AREA_UTARA_ID}',   'Taman Utara',   '${parkTypeId}', '${RAYON_2_ID}', -7.2100, 112.7450,
           '{"type":"Polygon","coordinates":[[[112.744,-7.209],[112.746,-7.209],[112.746,-7.211],[112.744,-7.211],[112.744,-7.209]]]}',
           TRUE)
        ON CONFLICT (id) DO NOTHING;
      `);
      console.log('  ✓ Created 7 areas for missing rayons + Taman Pelangi (Selatan) + Taman Utara');

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
          ('${AREA_BARAT2_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY'),
          ('${AREA_PELANGI_ID}', '${SHIFT_1_ID}', 'satgas', 4, 'WEEKDAY'),
          ('${AREA_PELANGI_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
          ('${AREA_PELANGI_ID}', '${SHIFT_2_ID}', 'satgas', 2, 'WEEKDAY')
        ON CONFLICT DO NOTHING;
      `);
      console.log('  ✓ Created 18 staff requirements for 6 new areas (incl. Taman Pelangi)');

      // Staff requirements for Taman Harmoni (Selatan) and Taman Utara
      await queryRunner.query(`
        INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
        SELECT a.id, '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY' FROM areas a WHERE a.name = 'Taman Harmoni'
        ON CONFLICT DO NOTHING;
      `);
      await queryRunner.query(`
        INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
        SELECT a.id, '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY' FROM areas a WHERE a.name = 'Taman Harmoni'
        ON CONFLICT DO NOTHING;
      `);
      await queryRunner.query(`
        INSERT INTO area_staff_requirements (area_id, shift_definition_id, role, required_count, day_type)
        VALUES ('${AREA_UTARA_ID}', '${SHIFT_1_ID}', 'satgas', 3, 'WEEKDAY'),
               ('${AREA_UTARA_ID}', '${SHIFT_1_ID}', 'linmas', 1, 'WEEKDAY'),
               ('${AREA_UTARA_ID}', '${SHIFT_2_ID}', 'satgas', 3, 'WEEKDAY')
        ON CONFLICT DO NOTHING;
      `);
      console.log('  ✓ Added staff requirements for Taman Harmoni and Taman Utara');
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
        'ExponentPushToken[satgas_pusat_1_ABCDEF12345_test]', 'device_satgas_pusat1_abc123', 'android', TRUE, NOW() - INTERVAL '7 days'
      FROM users u WHERE u.username = 'satgas_pusat_1' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_2_ID}', u.id,
        'ExponentPushToken[satgas_timur1_2_GHIJKL67890_test]', 'device_satgas_timur12_xyz789', 'android', TRUE, NOW() - INTERVAL '5 days'
      FROM users u WHERE u.username = 'satgas_timur1_2' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO notification_tokens (id, user_id, fcm_token, device_id, platform, is_active, created_at)
      SELECT '${NOTIF_TOKEN_3_ID}', u.id,
        'ExponentPushToken[linmas_bungkul_1_MNOPQR11223_test]', 'device_linmas_bungkul1_mnp345', 'android', TRUE, NOW() - INTERVAL '3 days'
      FROM users u WHERE u.username = 'linmas_bungkul_1' LIMIT 1
      ON CONFLICT (id) DO NOTHING;
    `);
    console.log('  ✓ Created 3 notification tokens (satgas_pusat_1, satgas_timur1_2, linmas_bungkul_1)');

    // ==========================================
    // STEP 8.5: Assign area_id + rayon_id to field workers
    // Phase 1 users (satgas1/2/3, korlap1/2) had no area/rayon; Phase 2 users
    // (linmas1/2, satgas4) were inserted with NULL area/rayon above.
    // ==========================================
    console.log('📍 Assigning area_id and rayon_id to field workers...');

    // Taman Bungkul workers → Rayon Pusat
    await queryRunner.query(`
      UPDATE users
      SET area_id = (SELECT id FROM areas WHERE name = 'Taman Bungkul' LIMIT 1)
      WHERE username IN ('korlap_bungkul', 'linmas_bungkul_1')
        AND area_id IS NULL;
    `);
    // Jalan Raya Darmo workers → Rayon Pusat
    await queryRunner.query(`
      UPDATE users
      SET area_id = (SELECT id FROM areas WHERE name = 'Jalan Raya Darmo' LIMIT 1)
      WHERE username IN ('korlap_darmo', 'linmas_darmo_1')
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

    // Assign area_id to new per-rayon korlap users (areas exist now after STEP 8.1)
    await queryRunner.query(`
      UPDATE users SET area_id = (SELECT id FROM areas WHERE name = 'Taman Harmoni' LIMIT 1)
      WHERE username = 'korlap_harmoni' AND area_id IS NULL;
    `);
    await queryRunner.query(`
      UPDATE users SET area_id = '${AREA_UTARA_ID}'
      WHERE username = 'korlap_utara' AND area_id IS NULL;
    `);
    await queryRunner.query(`
      UPDATE users SET area_id = '${AREA_TIMUR1_ID}'
      WHERE username = 'korlap_timur1' AND area_id IS NULL;
    `);
    await queryRunner.query(`
      UPDATE users SET area_id = '${AREA_TIMUR2_ID}'
      WHERE username = 'korlap_timur2' AND area_id IS NULL;
    `);
    await queryRunner.query(`
      UPDATE users SET area_id = '${AREA_BARAT1_ID}'
      WHERE username = 'korlap_barat1' AND area_id IS NULL;
    `);
    await queryRunner.query(`
      UPDATE users SET area_id = '${AREA_BARAT2_ID}'
      WHERE username = 'korlap_barat2' AND area_id IS NULL;
    `);
    console.log('  ✓ Assigned area_id to 6 new per-rayon korlap users');

    // ==========================================
    // STEP 9: Seed Schedules
    // ==========================================
    console.log('📅 Seeding Schedules...');

    // Get ALL clockable worker IDs with their assigned area
    // Phase 2C: korlap is CLOCKABLE but needs schedule entries too!
    const workerResult = await queryRunner.query(`
      SELECT u.id, u.username, COALESCE(u.area_id, (SELECT id FROM areas LIMIT 1)) AS area_id
      FROM users u WHERE u.role IN ('satgas', 'linmas', 'korlap');
    `);

    if (workerResult.length > 0) {
      // Create schedules for ALL workers using their own area
      for (let i = 0; i < workerResult.length; i++) {
        const shiftId = i % 3 === 0 ? SHIFT_1_ID : i % 3 === 1 ? SHIFT_2_ID : SHIFT_3_ID;
        await queryRunner.query(`
          INSERT INTO schedules (user_id, area_id, shift_definition_id, effective_date, end_date, created_by)
          VALUES ('${workerResult[i].id}', '${workerResult[i].area_id}', '${shiftId}', '2026-02-01', NULL, NULL)
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
      SELECT id FROM users WHERE username = 'satgas_pusat_1' LIMIT 1
    `);
    const linmasOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'linmas_bungkul_1' LIMIT 1
    `);
    const korlapDarmoOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'korlap_darmo' LIMIT 1
    `);

    const kepalaRayonOtResult = await queryRunner.query(`
      SELECT id FROM users WHERE username = 'kepala_rayon_selatan' LIMIT 1
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
          SELECT id, area_id FROM users WHERE username = 'admin_data1' LIMIT 1
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
      `SELECT id, area_id FROM users WHERE username = 'linmas_bungkul_1' LIMIT 1`,
    );
    const shiftKorlap1 = await queryRunner.query(
      `SELECT id, area_id FROM users WHERE username = 'korlap_bungkul' LIMIT 1`,
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
        console.log('  ✓ Created 1 completed shift for linmas_bungkul_1 (clocked-out, ready for live clock-in)');
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
        console.log('  ✓ Created 1 completed shift for korlap_bungkul (clocked-out, ready for live clock-in)');
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

    const taskCreator = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'korlap' LIMIT 1`,
    );
    const taskSatgas = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'satgas' ORDER BY username LIMIT 3`,
    );
    const taskLinmas = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'linmas'  ORDER BY username LIMIT 2`,
    );
    const taskKepala = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'kepala_rayon' LIMIT 1`,
    );
    const taskTopMgmt = await queryRunner.query(
      `SELECT id FROM users WHERE role = 'top_management' LIMIT 1`,
    );
    const taskAreas = await queryRunner.query(`SELECT id FROM areas ORDER BY name LIMIT 5`);

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
      `SELECT id FROM users WHERE username = 'satgas_timur1_2' LIMIT 1`,
    );
    const actLinmas1 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'linmas_bungkul_1' LIMIT 1`,
    );
    const actLinmas2 = await queryRunner.query(
      `SELECT id FROM users WHERE username = 'linmas_darmo_1' LIMIT 1`,
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

    // D.3: Monitoring status variants — DISABLED for Phase 3 plant-monitoring review.
    //
    // Previously this block forced 5 demo users (satgas_pusat_1, linmas_bungkul_1,
    // satgas_timur1_2, satgas_pusat_2, satgas_timur1_1) into open shifts (clock_out_time
    // NULL) and varied user_tracking_status to active/inactive/outside_area/missing
    // so the worker monitoring map had ready-made markers.
    //
    // After the Phase 3 monitoring component refactor (token compliance + plant-status
    // overlays), seeded open shifts produce stale state that crashes BoundaryDetailModal
    // / UserDetailSheet on mobile (see CLAUDE.md Apr 27 sweep) and leaves users
    // unable to live-clock-in via the app (SHIFT_ALREADY_ACTIVE conflict).
    //
    // Per Phase 3 review directive: do NOT seed active shifts. All clockable users
    // remain `offline` (set by D.2 above). Worker-monitoring scenarios are exercised
    // via real mobile clock-in during UAT; plant-monitoring data is fully populated
    // by seed-phase3.ts (areas, area_plants, notable_plants, pruning_requests).
    //
    // Defensive guard: re-assert offline + clear any latent open shift left from a
    // prior seed run (should already be a no-op when DB was wiped).
    console.log('  [D.3] Monitoring tracking — leaving all clockable users offline (Phase 3 directive)');
    await queryRunner.query(`
      UPDATE user_tracking_status SET
        status = 'offline',
        shift_id = NULL,
        is_within_area = FALSE,
        last_location_at = NULL,
        updated_at = NOW()
      WHERE status <> 'offline'
    `);
    await queryRunner.query(`
      UPDATE shifts SET
        clock_out_time = clock_in_time + INTERVAL '8 hours',
        updated_at = NOW()
      WHERE clock_out_time IS NULL
    `);
    console.log('    ✓ All user_tracking_status reset to offline (live clock-in via mobile to test worker monitoring)');

    // ==========================================
    // SECTION E: Phase 2E Data (Client Feedback II)
    // ==========================================
    console.log('\n📌 Section E: Phase 2E Data (Client Feedback II)...');

    // E1: Add phone_number as safety-net UPDATE (already set in INSERT above for new users)
    console.log('  📱 Ensuring phone_number set for all users...');
    await queryRunner.query(`
      UPDATE users SET phone_number = '081200000000' WHERE username = 'admin' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567890' WHERE username = 'top_management1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567891' WHERE username = 'kepala_rayon_selatan' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567892' WHERE username = 'kepala_rayon_utara' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567893' WHERE username = 'korlap_bungkul' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567894' WHERE username = 'linmas_bungkul_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567895' WHERE username = 'linmas_darmo_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567896' WHERE username = 'korlap_darmo' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567897' WHERE username = 'admin_data1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081234567898' WHERE username = 'admin_system1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000001' WHERE username = 'kepala_rayon_pusat' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000002' WHERE username = 'satgas_pusat_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000003' WHERE username = 'satgas_pusat_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000004' WHERE username = 'kepala_rayon_timur1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000005' WHERE username = 'satgas_timur1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000006' WHERE username = 'satgas_timur1_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000007' WHERE username = 'kepala_rayon_timur2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000008' WHERE username = 'satgas_timur2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000009' WHERE username = 'satgas_timur2_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000010' WHERE username = 'kepala_rayon_barat1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000011' WHERE username = 'satgas_barat1_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000012' WHERE username = 'satgas_barat1_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000013' WHERE username = 'kepala_rayon_barat2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000014' WHERE username = 'satgas_barat2_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000015' WHERE username = 'satgas_barat2_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000016' WHERE username = 'satgas_bungkul_1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000017' WHERE username = 'satgas_bungkul_2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000018' WHERE username = 'admin_data_selatan' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000019' WHERE username = 'admin_data_utara' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000020' WHERE username = 'admin_data_timur1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000021' WHERE username = 'admin_data_timur2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000022' WHERE username = 'admin_data_barat1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000023' WHERE username = 'admin_data_barat2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000024' WHERE username = 'korlap_harmoni' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000025' WHERE username = 'korlap_utara' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000026' WHERE username = 'korlap_timur1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000027' WHERE username = 'korlap_timur2' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000028' WHERE username = 'korlap_barat1' AND phone_number IS NULL;
      UPDATE users SET phone_number = '081300000029' WHERE username = 'korlap_barat2' AND phone_number IS NULL;
    `);
    console.log('    ✓ phone_number ensured for all 39 users (1 admin + 11 phase2c + 12 per-rayon admin_data/korlap + 15 rayon-based)');

    // E2: user_areas — korlap multi-area + satgas multi-area assignments
    console.log('  🗺️ Creating user_areas assignments...');

    // korlap_bungkul → Taman Bungkul (primary permanent area)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_bungkul' AND a.name = 'Taman Bungkul'
      ON CONFLICT DO NOTHING;
    `);
    // korlap_bungkul also → Jalan Raya Darmo (same Rayon Pusat — korlap must stay within one rayon)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_bungkul' AND a.name = 'Jalan Raya Darmo'
      ON CONFLICT DO NOTHING;
    `);
    // korlap_darmo → Jalan Raya Darmo (primary permanent area)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'korlap_darmo' AND a.name = 'Jalan Raya Darmo'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_pusat_1 → Taman Pusat (default area) + Taman Bungkul (extra permanent assignment)
    // This tests: satgas with default area_id can also be assigned to extra areas via user_areas
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_pusat_1' AND a.name = 'Taman Pusat'
      ON CONFLICT DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_pusat_1' AND a.name = 'Taman Bungkul'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_bungkul_1 → Taman Bungkul (default area, no extra assignments)
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_bungkul_1' AND a.name = 'Taman Bungkul'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_bungkul_2 → Taman Bungkul (default area_id) + Jalan Raya Darmo (secondary permanent area)
    // This tests: satgas with two permanent areas in the same rayon
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_bungkul_2' AND a.name = 'Taman Bungkul'
      ON CONFLICT DO NOTHING;
    `);
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_bungkul_2' AND a.name = 'Jalan Raya Darmo'
      ON CONFLICT DO NOTHING;
    `);

    // satgas_timur1_2 → Taman Timur 1 only (single rayon — Rayon Timur 1)
    // Taman Timur 2 is in Rayon Timur 2 (different rayon), so cross-rayon task_based removed
    await queryRunner.query(`
      INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
      SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
      FROM users u, areas a
      WHERE u.username = 'satgas_timur1_2' AND a.name = 'Taman Timur 1'
      ON CONFLICT DO NOTHING;
    `);

    console.log('    ✓ user_areas: korlap_bungkul→Bungkul+Darmo (same rayon), korlap_darmo→Darmo');
    console.log('    ✓ user_areas: satgas_pusat_1→Pusat+Bungkul (permanent), satgas_timur1_2→Timur1 (single, same rayon)');
    console.log('    ✓ user_areas: satgas_bungkul_1→Bungkul, satgas_bungkul_2→Bungkul+Darmo (permanent multi-area)');

    // Per-rayon korlap single-area assignments
    for (const [username, areaName] of [
      ['korlap_harmoni', 'Taman Harmoni'],
      ['korlap_utara',   'Taman Utara'],
      ['korlap_timur1',  'Taman Timur 1'],
      ['korlap_timur2',  'Taman Timur 2'],
      ['korlap_barat1',  'Taman Barat 1'],
      ['korlap_barat2',  'Taman Barat 2'],
    ] as const) {
      await queryRunner.query(`
        INSERT INTO user_areas (user_id, area_id, assignment_type, assigned_by)
        SELECT u.id, a.id, 'permanent', (SELECT id FROM users WHERE username = 'admin' LIMIT 1)
        FROM users u, areas a
        WHERE u.username = $1 AND a.name = $2
        ON CONFLICT DO NOTHING
      `, [username, areaName]);
    }
    console.log('    ✓ user_areas: korlap assigned to primary area for all 7 rayons');

    console.log('  ✓ Section E (Phase 2E) complete');

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅  Phase 2 Seeding Completed Successfully                                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  [A] Core Data');
    console.log('      7 Rayons · 3 Shifts · 20 Activity Types · 4 Special Day Overrides');
    console.log('      40 Users (admin + 23 Phase2C/rayon-admin + 15 rayon-field) · 10 Areas · ~50 Staff Reqs');
    console.log('      3 Notification Tokens · 10 Overtime records · Phase 2C shifts');
    console.log('');
    console.log('  [B] Tasks');
    console.log('      8 satgas (all statuses) · 4 linmas · 3 korlap · 4 rayon-scoped');
    console.log('      25 extended tasks for scroll/filter testing');
    console.log('');
    console.log('  [C] Activities');
    console.log('      20 core (12 satgas + 5 linmas + 3 korlap) + 30 extended = 50 total');
    console.log('      Date range: last 60 days');
    console.log('');
    console.log('  [D] Monitoring (Phase 2D)');
    console.log('      5 configs · user_tracking_status backfilled for all clockable users');
    console.log('      active×2  inactive×1  outside_area×1  missing×1  offline×rest');
    console.log('');
    console.log('  [E] Phase 2E (Client Feedback II)');
    console.log('      phone_number set for all 40 users');
    console.log('      user_areas: korlap_bungkul → Bungkul + Darmo (permanent, same rayon)');
    console.log('      user_areas: satgas_pusat_1 → Pusat + Bungkul (permanent multi-area)');
    console.log('      user_areas: satgas_timur1_2 → Timur 1 (single area)');
    console.log('      user_areas: satgas_bungkul_2 → Bungkul + Darmo (permanent multi-area)');
    console.log('      user_areas: korlap_harmoni/utara/timur1/timur2/barat1/barat2 → primary area each');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    console.log('🧪  TEST USERS — all passwords: password123');
    console.log('    Login with username OR phone number as "identifier"');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  ── SYSTEM-WIDE ROLES (no area scope) ──────────────────────────────────────────────');
    console.log('  Role            Username           Phone          Notes');
    console.log('  superadmin      admin              081200000000   Full system access (Phase 1 admin)');
    console.log('  admin_system    admin_system1      081234567898   System administration');
    console.log('  top_management  top_management1    081234567890   City-wide read-only view');
    console.log('');
    console.log('  ── RAYON PUSAT ─────────────────────────────────────────────────────────────────────');
    console.log('  Areas: Taman Bungkul (aktif) · Jalan Raya Darmo (pasif) · Taman Pusat (aktif)');
    console.log('');
    console.log('  Role            Username           Phone          Area');
    console.log('  admin_data      admin_data1        081234567897   Rayon Pusat — data entry & reports');
    console.log('  kepala_rayon    kepala_rayon_pusat 081300000001   Rayon Pusat head');
    console.log('  korlap          korlap_bungkul     081234567893   Taman Bungkul + Jalan Raya Darmo (multi, same rayon)');
    console.log('  korlap          korlap_darmo       081234567896   Jalan Raya Darmo');
    console.log('  satgas          satgas_pusat_1     081300000002   Taman Pusat + Taman Bungkul (multi) [ACTIVE]');
    console.log('  satgas          satgas_pusat_2     081300000003   Taman Pusat [OUTSIDE_AREA status]');
    console.log('  linmas          linmas_bungkul_1   081234567894   Taman Bungkul [ACTIVE status]');
    console.log('  linmas          linmas_darmo_1     081234567895   Jalan Raya Darmo');
    console.log('  satgas          satgas_bungkul_1   081300000016   Taman Bungkul (single area)');
    console.log('  satgas          satgas_bungkul_2   081300000017   Taman Bungkul + Jalan Raya Darmo (multi)');
    console.log('');
    console.log('  ── RAYON SELATAN ───────────────────────────────────────────────────────────────────');
    console.log('  Areas: Taman Harmoni (aktif) · Taman Pelangi (aktif, empty — understaffing test)');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_selatan  081234567891   Rayon Selatan head');
    console.log('  admin_data      admin_data_selatan    081300000018   Rayon Selatan — data entry & reports');
    console.log('  korlap          korlap_harmoni        081300000024   Taman Harmoni');
    console.log('');
    console.log('  ── RAYON UTARA ─────────────────────────────────────────────────────────────────────');
    console.log('  Area: Taman Utara (NEW)');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_utara    081234567892   Rayon Utara head');
    console.log('  admin_data      admin_data_utara      081300000019   Rayon Utara — data entry & reports');
    console.log('  korlap          korlap_utara          081300000025   Taman Utara');
    console.log('');
    console.log('  ── RAYON TIMUR 1 ───────────────────────────────────────────────────────────────────');
    console.log('  Area: Taman Timur 1');
    console.log('');
    console.log('  Role            Username              Phone          Area / Monitoring Status');
    console.log('  kepala_rayon    kepala_rayon_timur1   081300000004   Rayon Timur 1 head');
    console.log('  admin_data      admin_data_timur1     081300000020   Rayon Timur 1 — data entry & reports');
    console.log('  korlap          korlap_timur1         081300000026   Taman Timur 1');
    console.log('  satgas          satgas_timur1_1       081300000005   Taman Timur 1 [MISSING — no ping 3h+]');
    console.log('  satgas          satgas_timur1_2       081300000006   Taman Timur 1 [INACTIVE 35min]');
    console.log('');
    console.log('  ── RAYON TIMUR 2 ───────────────────────────────────────────────────────────────────');
    console.log('  Area: Taman Timur 2');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_timur2   081300000007   Rayon Timur 2 head');
    console.log('  admin_data      admin_data_timur2     081300000021   Rayon Timur 2 — data entry & reports');
    console.log('  korlap          korlap_timur2         081300000027   Taman Timur 2');
    console.log('  satgas          satgas_timur2_1       081300000008   Taman Timur 2');
    console.log('  satgas          satgas_timur2_2       081300000009   Taman Timur 2');
    console.log('');
    console.log('  ── RAYON BARAT 1 ───────────────────────────────────────────────────────────────────');
    console.log('  Area: Taman Barat 1');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_barat1   081300000010   Rayon Barat 1 head');
    console.log('  admin_data      admin_data_barat1     081300000022   Rayon Barat 1 — data entry & reports');
    console.log('  korlap          korlap_barat1         081300000028   Taman Barat 1');
    console.log('  satgas          satgas_barat1_1       081300000011   Taman Barat 1');
    console.log('  satgas          satgas_barat1_2       081300000012   Taman Barat 1');
    console.log('');
    console.log('  ── RAYON BARAT 2 ───────────────────────────────────────────────────────────────────');
    console.log('  Area: Taman Barat 2');
    console.log('');
    console.log('  Role            Username              Phone          Area');
    console.log('  kepala_rayon    kepala_rayon_barat2   081300000013   Rayon Barat 2 head');
    console.log('  admin_data      admin_data_barat2     081300000023   Rayon Barat 2 — data entry & reports');
    console.log('  korlap          korlap_barat2         081300000029   Taman Barat 2');
    console.log('  satgas          satgas_barat2_1       081300000014   Taman Barat 2');
    console.log('  satgas          satgas_barat2_2       081300000015   Taman Barat 2');
    console.log('');
    console.log('  ── MONITORING STATUS SCENARIOS (Phase 2D) ──────────────────────────────────────────');
    console.log('  ACTIVE       satgas_pusat_1, linmas_bungkul_1   recent GPS ping within boundary');
    console.log('  INACTIVE     satgas_timur1_2                    last ping 35 min ago');
    console.log('  OUTSIDE_AREA satgas_pusat_2                     GPS outside boundary polygon');
    console.log('  MISSING      satgas_timur1_1                    no ping for 3+ hours');
    console.log('  OFFLINE      all remaining users');
    console.log('');
    console.log('  ── MULTI-AREA ASSIGNMENTS (Phase 2E — user_areas table) ────────────────────────────');
    console.log('  korlap_bungkul  Taman Bungkul (permanent) + Taman Harmoni (permanent)');
    console.log('  satgas_pusat_1  Taman Pusat (permanent default) + Taman Bungkul (permanent extra)');
    console.log('  satgas_timur1_2 Taman Timur 1 (permanent default) + Taman Timur 2 (task_based)');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
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
