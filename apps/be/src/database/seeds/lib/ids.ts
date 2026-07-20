/**
 * Shared deterministic UUIDs referenced by more than one entity seeder.
 *
 * Single-entity ids stay local to their `entities/<name>.ts`; anything crossing
 * a file boundary lives here so demo/staging profiles and the entity seeders all
 * agree (e.g. `notification.ts` deep-links the task/activity/overtime ids that
 * `task.ts`/`activity.ts`/`overtime.ts` create).
 */

/** Canonical superadmin (username `superadmin`); referenced by users + notifications. */
export const ADMIN_USER_ID = 'e8f9a0b1-c2d3-4e5f-a6b7-c8d9e0f1a2b3';
/** Dummy account exercising the forced password-change flow (demo only). */
export const RESET_TEST_USER_ID = 'a0000000-0000-4000-8000-000000000099';

/** Rayon UUIDs — must match data/districts.snapshot.json (district.ts, area.ts, user.ts, kecamatan.ts). */
export const DISTRICT_SELATAN_ID = '085a298f-d8e9-435c-8a3b-998ffa47a26e';
export const RAYON_UTARA_ID = '861a7e7c-8bd5-4e73-8aa7-e92988959dca';
export const RAYON_PUSAT_ID = 'd564809d-316f-4a2a-a1c6-671eebb49653';
export const RAYON_TIMUR1_ID = '42934ad5-4ea0-4537-abb6-cf7e984e2d39';
export const RAYON_TIMUR2_ID = '742a135b-ddeb-45ca-8d0a-88d7d08aa78a';
export const RAYON_BARAT1_ID = 'bf040137-fce4-4016-b5e7-704ad82c1594';
export const RAYON_BARAT2_ID = '7422e6ee-0693-4565-9016-d4f759bdeed2';
export const RAYON_TAMAN_AKTIF_ID = '8a8a8a8a-1111-4222-9333-444444444444';

/** district code → id (stable internal keys; codes stay fixed even after the
 * staging Barat 1 ↔ Barat 2 rename, preserving downstream membership). */
export const RAYON_ID_BY_CODE: Record<string, string> = {
  SELATAN: DISTRICT_SELATAN_ID,
  UTARA: RAYON_UTARA_ID,
  PUSAT: RAYON_PUSAT_ID,
  TIMUR1: RAYON_TIMUR1_ID,
  TIMUR2: RAYON_TIMUR2_ID,
  BARAT1: RAYON_BARAT1_ID,
  BARAT2: RAYON_BARAT2_ID,
  TAMAN_AKTIF: RAYON_TAMAN_AKTIF_ID,
};

/**
 * Demo-scenario anchor areas — REAL staging areas the demo assigns its Rayon
 * Pusat crew + Taman Aktif crew to (they replaced the old synthetic "Darmo"
 * playground when areas started coming from the live-staging snapshot). All ids
 * exist in `data/areas.snapshot.json`.
 */
export const DEMO_PUSAT_AREA_1 = 'c186271e-1b04-51b2-a6d8-4bc64f68476a'; // Air Mancur Pemuda
export const DEMO_PUSAT_AREA_2 = '94e55ffb-d4e1-4922-b11c-6c703d7464aa'; // Area Rayon Taman Pusat
export const DEMO_PUSAT_AREA_3 = '104f946f-d772-576d-acc0-662f9f88fb68'; // Depan Grand City
export const DEMO_PUSAT_AREA_4 = '64e83f99-1576-571e-b85d-b92495715e46'; // Jl. Ahmad Jaiz
export const DEMO_PUSAT_AREA_5 = '3c5aad5c-600a-5134-8bc5-c8ffc9e4926e'; // Jl. Alun Alun Contong
/** Real "TAMAN BUK TONG" (Rayon Timur 2) — the Timur demo anchor. */
export const DEMO_BUK_TONG_ID = '6d803476-9542-5a39-ab4c-fcd9550f23dd';
/** Real Taman Bungkul + Taman Flora (Rayon Taman Aktif) — present in staging. */
export const BUNGKUL_AREA_ID = '51a1b2c3-d4e5-4f67-8901-2a3b4c5d6e7f';
export const TAMAN_FLORA_AREA_ID = '5f100a00-0000-4000-8000-000000000001';

/** Shift-definition UUIDs (shift-definition.ts, user.ts default-shift, shift.ts). */
export const SHIFT_1_ID = 'ca18ac41-2577-4f67-abfa-adaae27b75c8';
export const SHIFT_2_ID = '28822613-65de-47e4-a9b4-7b9bfd437f8a';
export const SHIFT_3_ID = '85860407-7b2d-425a-87cc-7a94bb47e5d8';

/** Demo transactional ids that notifications deep-link to (task.ts/activity.ts/overtime.ts). */
export const TASK_1_ID = '099757d2-ab32-4384-83e7-22a35b0510ec';
export const ACT_SAT_2_ID = 'b2c3d4e5-f6a7-4b8c-9d0e-f1a2b3c4d5e6';
export const ACT_LIN_1_ID = 'a3b4c5d6-e7f8-4a9b-8c1d-e2f3a4b5c6d7';
export const OVERTIME_2_ID = 'f1a2b3c4-d5e6-4f7a-ab9c-9d0e1f2a3b4c';
