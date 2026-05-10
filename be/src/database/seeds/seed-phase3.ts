import type { DataSource, QueryRunner } from 'typeorm';
import { config } from 'dotenv';

config();

/**
 * Inline ISO week helper so the seeder doesn't depend on the pruning module.
 * Returns the ISO calendar year + week (1..53) for a given date.
 */
function isoWeekOf(date: Date): { year: number; week: number } {
  const target = new Date(date);
  target.setUTCHours(0, 0, 0, 0);
  const dayNum = target.getUTCDay() || 7; // Monday=1..Sunday=7
  target.setUTCDate(target.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(target.getUTCFullYear(), 0, 1));
  const week = Math.ceil(
    ((target.getTime() - yearStart.getTime()) / 86400000 + 1) / 7,
  );
  return { year: target.getUTCFullYear(), week };
}

/**
 * Set of statuses where admin has confirmed a concrete work day. These rows
 * get `scheduled_date` populated; everything else leaves it NULL (the
 * kecamatan only expressed a week preference).
 */
const ADMIN_DATED_STATUSES = new Set([
  'approved',
  'assigned',
  'in_progress',
  'done',
]);

/**
 * Phase 3 Seed Script
 *
 * Seeds Phase 3 foundation data (additive — does NOT wipe existing data):
 * 1. plant_species      — 124 species (idempotent on name_id)
 * 2. monitoring_configs — 4 new config rows (idempotent on key)
 * 3. service_capacity   — 7 rayons × 12 ISO weeks × 'pruning' (idempotent on unique constraint)
 *
 * Usage: npm run db:seed:phase3
 */

export const PLANT_SPECIES: Array<{ nameId: string; category: string }> = [
  { nameId: 'AKASIA', category: 'tree' },
  { nameId: 'ALIANDER', category: 'shrub' },
  { nameId: 'ALPUKAT', category: 'tree' },
  { nameId: 'AMBAR', category: 'tree' },
  { nameId: 'ASEM', category: 'tree' },
  { nameId: 'ASEM LONDO', category: 'tree' },
  { nameId: 'AWAR - AWAR', category: 'shrub' },
  { nameId: 'BAMBU', category: 'shrub' },
  { nameId: 'BATTER CUP', category: 'flower' },
  { nameId: 'BERINGIN', category: 'tree' },
  { nameId: 'BIDARA', category: 'tree' },
  { nameId: 'BINTARO', category: 'tree' },
  { nameId: 'BIOLA CANTIK', category: 'tree' },
  { nameId: 'BISBUL', category: 'tree' },
  { nameId: 'BLIMBING', category: 'tree' },
  { nameId: 'BLIMBING WULO', category: 'tree' },
  { nameId: 'BOGENVIL', category: 'shrub' },
  { nameId: 'BOUBAB', category: 'tree' },
  { nameId: 'BUNGUR', category: 'tree' },
  { nameId: 'BUTTER CUP', category: 'flower' },
  { nameId: 'CEMARA', category: 'tree' },
  { nameId: 'CEMARA UDANG', category: 'tree' },
  { nameId: 'COOKTREE', category: 'tree' },
  { nameId: 'DADAP MERAH', category: 'tree' },
  { nameId: 'FLAMBOYANT', category: 'tree' },
  { nameId: 'GAMAL', category: 'tree' },
  { nameId: 'GAYAM', category: 'tree' },
  { nameId: 'GEMPOL', category: 'tree' },
  { nameId: 'GLODOKAN', category: 'tree' },
  { nameId: 'GLODOKAN TIYANG', category: 'tree' },
  { nameId: 'IPRIK', category: 'tree' },
  { nameId: 'JABON', category: 'tree' },
  { nameId: 'JAKARANDA', category: 'tree' },
  { nameId: 'JAMBU', category: 'tree' },
  { nameId: 'JAMBU AIR', category: 'tree' },
  { nameId: 'JAMBU DARSONO', category: 'tree' },
  { nameId: 'JARANAN', category: 'tree' },
  { nameId: 'JATI', category: 'tree' },
  { nameId: 'JATIMAS', category: 'tree' },
  { nameId: 'JERUK NIPIS', category: 'tree' },
  { nameId: 'JOHAR', category: 'tree' },
  { nameId: 'JUAR', category: 'tree' },
  { nameId: 'JUWET', category: 'tree' },
  { nameId: 'KAMBOJA', category: 'tree' },
  { nameId: 'KARET', category: 'tree' },
  { nameId: 'KAYAK', category: 'tree' },
  { nameId: 'KAYU HITAM', category: 'tree' },
  { nameId: 'KAYU PUTIH', category: 'tree' },
  { nameId: 'KECACIL', category: 'shrub' },
  { nameId: 'KEDINDING', category: 'shrub' },
  { nameId: 'KEDONDONG', category: 'tree' },
  { nameId: 'KELAPA', category: 'tree' },
  { nameId: 'KELAPA SAWIT', category: 'tree' },
  { nameId: 'KELENGKENG', category: 'tree' },
  { nameId: 'KELOR', category: 'tree' },
  { nameId: 'KEMIRI', category: 'tree' },
  { nameId: 'KENANGGA', category: 'tree' },
  { nameId: 'KENITU', category: 'tree' },
  { nameId: 'KEPOH', category: 'tree' },
  { nameId: 'KERES', category: 'tree' },
  { nameId: 'KERTAS', category: 'shrub' },
  { nameId: 'KESAMBI', category: 'tree' },
  { nameId: 'KETEPENG', category: 'shrub' },
  { nameId: 'KETEPENG KENCANA', category: 'shrub' },
  { nameId: 'KIGELIA PINNATA / SOSIS', category: 'tree' },
  { nameId: 'KINCAU', category: 'tree' },
  { nameId: 'KLUWEH', category: 'tree' },
  { nameId: 'KUPU KUPU', category: 'tree' },
  { nameId: 'KURMA', category: 'tree' },
  { nameId: 'LAMTORO', category: 'tree' },
  { nameId: 'MAHONI', category: 'tree' },
  { nameId: 'MANGGA', category: 'tree' },
  { nameId: 'MATOA', category: 'tree' },
  { nameId: 'MENGKUDU', category: 'tree' },
  { nameId: 'MIMBO', category: 'tree' },
  { nameId: 'MORES', category: 'tree' },
  { nameId: 'MURBEI', category: 'tree' },
  { nameId: 'NANGKA', category: 'tree' },
  { nameId: 'NYAMPLUNG', category: 'tree' },
  { nameId: 'PACE', category: 'tree' },
  { nameId: 'PALEM', category: 'tree' },
  { nameId: 'PALEM BISMAKIA', category: 'tree' },
  { nameId: 'PALEM EKOR TUPAI', category: 'tree' },
  { nameId: 'PALEM KIPAS', category: 'tree' },
  { nameId: 'PALEM KURMA', category: 'tree' },
  { nameId: 'PALEM PERAK', category: 'tree' },
  { nameId: 'PALEM PUTRI', category: 'tree' },
  { nameId: 'PALEM RAJA', category: 'tree' },
  { nameId: 'PALEM ROJO', category: 'tree' },
  { nameId: 'PALEM SELEDRI', category: 'tree' },
  { nameId: 'PALEM WASHINGTON', category: 'tree' },
  { nameId: 'PANDAN BALI', category: 'shrub' },
  { nameId: 'PINANG 10', category: 'tree' },
  { nameId: 'PISANG', category: 'shrub' },
  { nameId: 'PLOSO', category: 'tree' },
  { nameId: 'PUCUK MERAH', category: 'shrub' },
  { nameId: 'PULE', category: 'tree' },
  { nameId: 'RANDU', category: 'tree' },
  { nameId: 'SALAM', category: 'tree' },
  { nameId: 'SAPU TANGAN', category: 'tree' },
  { nameId: 'SAWIT', category: 'tree' },
  { nameId: 'SAWO', category: 'tree' },
  { nameId: 'SAWO KECIK', category: 'tree' },
  { nameId: 'SEMBIRIT', category: 'tree' },
  { nameId: 'SENGON', category: 'tree' },
  { nameId: 'SENGON LAUT', category: 'tree' },
  { nameId: 'SEPATU DEA', category: 'flower' },
  { nameId: 'SIKAT BOTOL', category: 'shrub' },
  { nameId: 'SOGO', category: 'tree' },
  { nameId: 'SOGO TELIK', category: 'tree' },
  { nameId: 'SONO', category: 'tree' },
  { nameId: 'SONO AIR', category: 'tree' },
  { nameId: 'SONO KELLING', category: 'tree' },
  { nameId: 'SRIKAYA', category: 'tree' },
  { nameId: 'SUKUN', category: 'tree' },
  { nameId: 'TABEBUYA', category: 'tree' },
  { nameId: 'TABEBUYA KUNING', category: 'tree' },
  { nameId: 'TABEBUYA MERAH', category: 'tree' },
  { nameId: 'TABEBUYA PINK', category: 'tree' },
  { nameId: 'TABEBUYA ROSELLA', category: 'tree' },
  { nameId: 'TANJUNG', category: 'tree' },
  { nameId: 'TIARA PAYUNG', category: 'tree' },
  { nameId: 'TREMBESI', category: 'tree' },
  { nameId: 'TRENGGULI', category: 'tree' },
  { nameId: 'TURI', category: 'tree' },
  { nameId: 'WALISONGO', category: 'shrub' },
  { nameId: 'WARU', category: 'tree' },
  { nameId: 'WUNI', category: 'tree' },
];

/**
 * Compute ISO week number for a given date.
 * Uses the standard ISO 8601 definition (week containing the first Thursday).
 */
export function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // 1=Mon ... 7=Sun
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // align to Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
}

async function seedPhase3(dataSource: DataSource): Promise<void> {
  // Guard: skip gracefully if Phase 3 migration hasn't been run yet
  const check = await dataSource.query(
    `SELECT to_regclass('public.plant_species') AS exists`,
  );
  if (!check[0]?.exists) {
    console.log('');
    console.log('⚠️  Phase 3 tables not found — skipping Phase 3 seed.');
    console.log('   Run `npm run migration:run` first, then re-run the seeder.');
    return;
  }

  const queryRunner: QueryRunner = dataSource.createQueryRunner();
  await queryRunner.connect();
  await queryRunner.startTransaction();

  try {
    console.log('');
    console.log('🌱 ======== Phase 3 Seed ========');

    // ==========================================
    // SECTION 1: plant_species
    // ==========================================
    console.log('');
    console.log('🌳 ======== SECTION 1: Plant Species ========');
    let inserted = 0;
    for (const species of PLANT_SPECIES) {
      const result = await queryRunner.query(
        `INSERT INTO plant_species (name_id, category)
         VALUES ($1, $2)
         ON CONFLICT (name_id) DO NOTHING`,
        [species.nameId, species.category],
      );
      if (result && (result as any).rowCount > 0) inserted++;
    }
    console.log(`  ✓ ${inserted} new plant_species inserted (${PLANT_SPECIES.length - inserted} already existed)`);

    // ==========================================
    // SECTION 2: monitoring_configs (new Phase 3 configs)
    // ==========================================
    console.log('');
    console.log('📡 ======== SECTION 2: Monitoring Configs ========');
    const phase3MonitoringConfigs = [
      {
        key: 'plants_forecast',
        value: JSON.stringify({
          default_pruning_cycle_days: 90,
          overdue_threshold_days: 30,
          due_soon_window_days: 14,
        }),
        description: 'Plant pruning forecast configuration (Phase 3)',
      },
      {
        key: 'service_capacity_defaults',
        value: JSON.stringify({
          default_capacity_per_week: 5,
          overbooking_tolerance: 10,
          booking_window_weeks: 12,
        }),
        description: 'Service capacity booking defaults (Phase 3)',
      },
      {
        key: 'pruning_request_workflow',
        value: JSON.stringify({
          auto_assign_to_rayon: false,
          review_deadline_days: 7,
          reference_code_prefix: 'PR',
        }),
        description: 'Pruning request workflow settings (Phase 3)',
      },
      {
        key: 'seed_inventory',
        value: JSON.stringify({
          low_stock_threshold_grams: 500,
          low_stock_threshold_pieces: 50,
          reorder_notification: true,
        }),
        description: 'Seed inventory alert thresholds (Phase 3)',
      },
    ];

    let configsInserted = 0;
    for (const cfg of phase3MonitoringConfigs) {
      const result = await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
      if (result && (result as any).rowCount > 0) configsInserted++;
    }
    console.log(`  ✓ ${configsInserted} monitoring_configs processed (idempotent)`);

    // ==========================================
    // SECTION 3: area_plants (Phase 3 plant monitoring showcase)
    // ==========================================
    // Deterministic per-area mix using real CSV species names and a varied
    // last_pruned_at / cycle so every area lands at a known status (ok /
    // due_soon / overdue). This replaces the previous random Section 3 + 3.6.
    // Re-running the seeder reasserts the showcase values via ON CONFLICT
    // DO UPDATE.
    console.log('');
    console.log('🌿 ======== SECTION 3: Area Plants (showcase) ========');

    type AreaPlantSeed = {
      species: string;
      count: number;
      lastPrunedDaysAgo: number;
      cycleDays: number;
      status: 'ok' | 'due_soon' | 'overdue';
    };
    /**
     * Phase 3 showcase plan (per area). The mix is intentional:
     *   - Bungkul/Pusat/Darmo (Rayon Pusat) carry the demo for korlap_pusat_1.
     *   - Other areas have at least one off-status row so admin views never
     *     look uniformly green.
     */
    const AREA_PLANT_PLAN: Record<string, AreaPlantSeed[]> = {
      'Taman Bungkul': [
        { species: 'TREMBESI',         count: 8,  lastPrunedDaysAgo: 200, cycleDays: 90,  status: 'overdue'  },
        { species: 'MAHONI',           count: 12, lastPrunedDaysAgo: 80,  cycleDays: 90,  status: 'due_soon' },
        { species: 'KETEPENG KENCANA', count: 6,  lastPrunedDaysAgo: 30,  cycleDays: 180, status: 'ok'       },
        { species: 'TABEBUYA',         count: 5,  lastPrunedDaysAgo: 25,  cycleDays: 240, status: 'ok'       },
        { species: 'GLODOKAN TIYANG',  count: 9,  lastPrunedDaysAgo: 15,  cycleDays: 180, status: 'ok'       },
      ],
      'Taman Pusat': [
        { species: 'TABEBUYA KUNING',  count: 14, lastPrunedDaysAgo: 240, cycleDays: 180, status: 'overdue'  },
        { species: 'GLODOKAN',         count: 10, lastPrunedDaysAgo: 95,  cycleDays: 100, status: 'due_soon' },
        { species: 'MAHONI',           count: 11, lastPrunedDaysAgo: 30,  cycleDays: 180, status: 'ok'       },
        { species: 'TANJUNG',          count: 6,  lastPrunedDaysAgo: 50,  cycleDays: 365, status: 'ok'       },
      ],
      'Jalan Raya Darmo': [
        { species: 'TABEBUYA PINK',    count: 18, lastPrunedDaysAgo: 220, cycleDays: 180, status: 'overdue'  },
        { species: 'TABEBUYA MERAH',   count: 16, lastPrunedDaysAgo: 110, cycleDays: 120, status: 'due_soon' },
        { species: 'PALEM RAJA',       count: 22, lastPrunedDaysAgo: 95,  cycleDays: 100, status: 'due_soon' },
        { species: 'BERINGIN',         count: 4,  lastPrunedDaysAgo: 25,  cycleDays: 365, status: 'ok'       },
      ],
      'Taman Harmoni': [
        { species: 'TREMBESI',         count: 6,  lastPrunedDaysAgo: 35,  cycleDays: 180, status: 'ok'       },
        { species: 'KAMBOJA',          count: 9,  lastPrunedDaysAgo: 22,  cycleDays: 240, status: 'ok'       },
        { species: 'PALEM PUTRI',      count: 12, lastPrunedDaysAgo: 18,  cycleDays: 180, status: 'ok'       },
      ],
      'Taman Pelangi': [
        { species: 'FLAMBOYANT',       count: 5,  lastPrunedDaysAgo: 210, cycleDays: 180, status: 'overdue'  },
        { species: 'KAYU PUTIH',       count: 7,  lastPrunedDaysAgo: 30,  cycleDays: 180, status: 'ok'       },
        { species: 'TANJUNG',          count: 4,  lastPrunedDaysAgo: 20,  cycleDays: 240, status: 'ok'       },
      ],
      'Taman Utara': [
        { species: 'CEMARA UDANG',     count: 10, lastPrunedDaysAgo: 100, cycleDays: 110, status: 'due_soon' },
        { species: 'PALEM EKOR TUPAI', count: 14, lastPrunedDaysAgo: 92,  cycleDays: 100, status: 'due_soon' },
        { species: 'WARU',             count: 6,  lastPrunedDaysAgo: 40,  cycleDays: 200, status: 'ok'       },
        { species: 'NYAMPLUNG',        count: 5,  lastPrunedDaysAgo: 28,  cycleDays: 240, status: 'ok'       },
      ],
      'Taman Timur 1': [
        { species: 'JATI',             count: 7,  lastPrunedDaysAgo: 250, cycleDays: 200, status: 'overdue'  },
        { species: 'KENANGGA',         count: 5,  lastPrunedDaysAgo: 95,  cycleDays: 100, status: 'due_soon' },
        { species: 'KAMBOJA',          count: 8,  lastPrunedDaysAgo: 30,  cycleDays: 240, status: 'ok'       },
      ],
      'Taman Timur 2': [
        { species: 'PALEM KIPAS',      count: 10, lastPrunedDaysAgo: 90,  cycleDays: 100, status: 'due_soon' },
        { species: 'SAWO KECIK',       count: 6,  lastPrunedDaysAgo: 25,  cycleDays: 240, status: 'ok'       },
        { species: 'GLODOKAN',         count: 9,  lastPrunedDaysAgo: 18,  cycleDays: 180, status: 'ok'       },
      ],
      'Taman Barat 1': [
        { species: 'AKASIA',           count: 12, lastPrunedDaysAgo: 230, cycleDays: 180, status: 'overdue'  },
        { species: 'SAPU TANGAN',      count: 4,  lastPrunedDaysAgo: 22,  cycleDays: 240, status: 'ok'       },
      ],
      'Taman Barat 2': [
        { species: 'BUNGUR',           count: 8,  lastPrunedDaysAgo: 35,  cycleDays: 180, status: 'ok'       },
        { species: 'KENANGGA',         count: 5,  lastPrunedDaysAgo: 28,  cycleDays: 240, status: 'ok'       },
      ],
    };

    const daysAgoIso = (n: number): string =>
      new Date(Date.now() - n * 86400000).toISOString();

    let areaPlantInserted = 0;
    let areaPlantUpdated = 0;
    let areaPlantSkippedSpecies = 0;

    // Cache species lookups so we hit plant_species at most once per name.
    const speciesIdCache = new Map<string, string | null>();
    const lookupSpeciesId = async (name: string): Promise<string | null> => {
      if (speciesIdCache.has(name)) return speciesIdCache.get(name) ?? null;
      const rows = await queryRunner.query(
        `SELECT id FROM plant_species WHERE name_id = $1 LIMIT 1`,
        [name],
      );
      const id = rows[0]?.id ?? null;
      speciesIdCache.set(name, id);
      return id;
    };

    for (const [areaName, plan] of Object.entries(AREA_PLANT_PLAN)) {
      const areaRow = await queryRunner.query(
        `SELECT id FROM areas WHERE name = $1 AND is_active = true LIMIT 1`,
        [areaName],
      );
      if (areaRow.length === 0) {
        console.log(`  ⚠ Area '${areaName}' not found, skipping`);
        continue;
      }
      const areaId = areaRow[0].id;

      for (const r of plan) {
        const speciesId = await lookupSpeciesId(r.species);
        if (!speciesId) {
          areaPlantSkippedSpecies += 1;
          console.log(`  ⚠ Species '${r.species}' missing from catalog, skipping`);
          continue;
        }
        const lastPruned = daysAgoIso(r.lastPrunedDaysAgo);
        const nextDue = new Date(
          new Date(lastPruned).getTime() + r.cycleDays * 86400000,
        ).toISOString();
        const result = await queryRunner.query(
          `INSERT INTO area_plants
             (area_id, species_id, count, last_pruned_at, override_cycle_days,
              next_due_at, status)
           VALUES ($1, $2, $3, $4, $5, $6, $7)
           ON CONFLICT (area_id, species_id) DO UPDATE SET
             count = EXCLUDED.count,
             last_pruned_at = EXCLUDED.last_pruned_at,
             override_cycle_days = EXCLUDED.override_cycle_days,
             next_due_at = EXCLUDED.next_due_at,
             status = EXCLUDED.status
           RETURNING (xmax = 0) AS inserted`,
          [areaId, speciesId, r.count, lastPruned, r.cycleDays, nextDue, r.status],
        );
        if (result[0]?.inserted) areaPlantInserted += 1;
        else areaPlantUpdated += 1;
      }
    }

    // Wipe stray rows from prior random seeds so each area's species list
    // matches the deterministic plan above (so the screen never shows a
    // legacy "AKASIA" left over from a prior random insert).
    const allowedAreaNames = Object.keys(AREA_PLANT_PLAN);
    const allowedSpeciesByArea = Object.entries(AREA_PLANT_PLAN).map(
      ([name, plan]) => ({ name, species: plan.map((r) => r.species) }),
    );
    let areaPlantPurged = 0;
    for (const { name, species } of allowedSpeciesByArea) {
      const areaRow = await queryRunner.query(
        `SELECT id FROM areas WHERE name = $1 LIMIT 1`,
        [name],
      );
      if (areaRow.length === 0) continue;
      const purge = await queryRunner.query(
        `DELETE FROM area_plants
         WHERE area_id = $1
           AND species_id NOT IN (
             SELECT id FROM plant_species WHERE name_id = ANY($2::text[])
           )`,
        [areaRow[0].id, species],
      );
      areaPlantPurged += (purge as any)[1] ?? 0;
    }
    console.log(
      `  ✓ ${areaPlantInserted} inserted, ${areaPlantUpdated} updated, ` +
      `${areaPlantPurged} stale rows purged across ${allowedAreaNames.length} areas` +
      (areaPlantSkippedSpecies > 0
        ? ` (skipped ${areaPlantSkippedSpecies} species missing from catalog)`
        : ''),
    );

    // notable_plants — Phase 3 heritage trees pinned on the map.
    // Idempotent via SELECT-then-INSERT on (area_id, species_id, label).
    type NotableSeed = {
      areaName: string;
      species: string;
      lat: number;
      lng: number;
      heritage: boolean;
      label: string;
      notes: string;
    };
    const notables: NotableSeed[] = [
      { areaName: 'Taman Bungkul', species: 'TREMBESI',
        lat: -7.2906, lng: 112.7378, heritage: true,
        label: 'Trembesi Heritage 1924',
        notes: 'Pohon trembesi peninggalan kolonial, lingkar batang ±4.2 m' },
      { areaName: 'Taman Bungkul', species: 'BERINGIN',
        lat: -7.2911, lng: 112.7382, heritage: true,
        label: 'Beringin Tua Selatan Bungkul',
        notes: 'Beringin tua dengan akar gantung, masuk daftar pohon dilindungi' },
      { areaName: 'Jalan Raya Darmo', species: 'TABEBUYA PINK',
        lat: -7.2901, lng: 112.7405, heritage: false,
        label: 'Tabebuya Pink Jalur Darmo',
        notes: 'Penanda musim semi Surabaya — mekar serentak sekitar Mei' },
    ];
    let notableInserted = 0;
    for (const n of notables) {
      const areaRow = await queryRunner.query(
        `SELECT id FROM areas WHERE name = $1 LIMIT 1`,
        [n.areaName],
      );
      if (areaRow.length === 0) continue;
      const speciesId = await lookupSpeciesId(n.species);
      if (!speciesId) continue;
      const existing = await queryRunner.query(
        `SELECT id FROM notable_plants
         WHERE area_id = $1 AND species_id = $2 AND label = $3 LIMIT 1`,
        [areaRow[0].id, speciesId, n.label],
      );
      if (existing.length > 0) continue;
      await queryRunner.query(
        `INSERT INTO notable_plants
           (area_id, species_id, gps_lat, gps_lng, label, heritage, notes, photo_urls)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [areaRow[0].id, speciesId, n.lat, n.lng, n.label, n.heritage, n.notes, []],
      );
      notableInserted += 1;
    }
    console.log(`  ✓ ${notableInserted} notable_plants inserted`);

    // ==========================================
    // SECTION 3.5: staff_kecamatan users (Phase 3 public intake — ADR-033)
    // ==========================================
    // One staff_kec per rayon so admin_data rayon-scoped review filters have
    // realistic data and `staff_kecamatan_tegalsari_1` (Rayon Pusat) is
    // available for local-dev login. Mirrors what `seed-staging.ts` does in production
    // demo data, but lifted into the dev `db:seed` flow because the
    // pruning_requests section below depends on these users existing.
    //
    // All passwords: `password123` (bcrypt 10 salt rounds, same hash as
    // seed-phase2). Idempotent via ON CONFLICT (username) DO NOTHING.
    console.log('');
    console.log('🏘️  ======== SECTION 3.4: Kecamatans (31 Surabaya) ========');
    // Idempotent — seeded here (rather than seed-reference) because db:seed
    // pipeline runs phase1 → phase2 → phase3, and rayons exist after phase2.
    const rayonIdByCode = await queryRunner.query(
      `SELECT id, code FROM rayons`,
    ) as Array<{ id: string; code: string }>;
    const rIdx: Record<string, string> = {};
    for (const r of rayonIdByCode) rIdx[r.code] = r.id;
    // Kecamatan → Rayon mapping (May 9, 2026 fix). The 4 administratively
    // "Surabaya Selatan" kecamatans (Sawahan, Dukuh Pakis, Wiyung, Karang
    // Pilang) now correctly live under Rayon Selatan so `rayon_id` and
    // `region` agree. Earlier they sat in Rayon Barat 2 to match the legacy
    // rayon description, which created the staff_kecamatan_wiyung_1 "rayon
    // says Barat / region says Selatan" contradiction.
    const kecBlueprint: Array<[string, string, string, string]> = [
      // [name, code, rayon_code, region]
      // ── Surabaya Pusat (4) ──
      ['Bubutan', 'bubutan', 'PUSAT', 'pusat'],
      ['Genteng', 'genteng', 'PUSAT', 'pusat'],
      ['Simokerto', 'simokerto', 'PUSAT', 'pusat'],
      ['Tegalsari', 'tegalsari', 'PUSAT', 'pusat'],
      // ── Surabaya Timur (7 — split across Rayon Timur 1 + Timur 2) ──
      ['Tambaksari', 'tambaksari', 'TIMUR1', 'timur'],
      ['Gubeng', 'gubeng', 'TIMUR1', 'timur'],
      ['Sukolilo', 'sukolilo', 'TIMUR1', 'timur'],
      ['Mulyorejo', 'mulyorejo', 'TIMUR2', 'timur'],
      ['Rungkut', 'rungkut', 'TIMUR2', 'timur'],
      ['Tenggilis Mejoyo', 'tenggilis_mejoyo', 'TIMUR2', 'timur'],
      ['Gunung Anyar', 'gunung_anyar', 'TIMUR2', 'timur'],
      // ── Surabaya Barat (7 — split across Rayon Barat 1 + Barat 2) ──
      ['Sukomanunggal', 'sukomanunggal', 'BARAT1', 'barat'],
      ['Tandes', 'tandes', 'BARAT1', 'barat'],
      ['Asemrowo', 'asemrowo', 'BARAT1', 'barat'],
      ['Benowo', 'benowo', 'BARAT1', 'barat'],
      ['Pakal', 'pakal', 'BARAT1', 'barat'],
      ['Sambikerep', 'sambikerep', 'BARAT2', 'barat'],
      ['Lakarsantri', 'lakarsantri', 'BARAT2', 'barat'],
      // ── Surabaya Utara (5) ──
      ['Krembangan', 'krembangan', 'UTARA', 'utara'],
      ['Pabean Cantian', 'pabean_cantian', 'UTARA', 'utara'],
      ['Semampir', 'semampir', 'UTARA', 'utara'],
      ['Kenjeran', 'kenjeran', 'UTARA', 'utara'],
      ['Bulak', 'bulak', 'UTARA', 'utara'],
      // ── Surabaya Selatan (8 — all in Rayon Selatan) ──
      ['Wonokromo', 'wonokromo', 'SELATAN', 'selatan'],
      ['Wonocolo', 'wonocolo', 'SELATAN', 'selatan'],
      ['Gayungan', 'gayungan', 'SELATAN', 'selatan'],
      ['Jambangan', 'jambangan', 'SELATAN', 'selatan'],
      ['Sawahan', 'sawahan', 'SELATAN', 'selatan'],
      ['Dukuh Pakis', 'dukuh_pakis', 'SELATAN', 'selatan'],
      ['Wiyung', 'wiyung', 'SELATAN', 'selatan'],
      ['Karang Pilang', 'karang_pilang', 'SELATAN', 'selatan'],
    ];
    let kecUpserted = 0;
    for (const [name, code, rcode, region] of kecBlueprint) {
      const rid = rIdx[rcode];
      if (!rid) continue;
      // ON CONFLICT DO UPDATE so the May 9 rayon-region realignment heals
      // existing rows that were written under the previous (mismatched)
      // mapping without requiring a destructive re-seed.
      const r = await queryRunner.query(
        `INSERT INTO kecamatans (name, code, rayon_id, region)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (code) DO UPDATE
           SET rayon_id = EXCLUDED.rayon_id,
               region   = EXCLUDED.region,
               name     = EXCLUDED.name`,
        [name, code, rid, region],
      );
      if (r && (r as any).rowCount > 0) kecUpserted++;
    }
    console.log(`  ✓ ${kecUpserted} kecamatans upserted (31 total when fresh)`);

    // Heal any staff_kecamatan users whose `rayon_id` no longer matches their
    // kecamatan after the realignment above (e.g. staff_kecamatan_wiyung_1 was
    // pinned to BARAT2 but should now reflect SELATAN).
    await queryRunner.query(`
      UPDATE users u
      SET rayon_id = k.rayon_id
      FROM kecamatans k
      WHERE u.role = 'staff_kecamatan'
        AND u.kecamatan_id = k.id
        AND (u.rayon_id IS DISTINCT FROM k.rayon_id)
    `);

    console.log('');
    console.log('🧑‍💼 ======== SECTION 3.5: Staff Kecamatan Users ========');
    const STAFF_KEC_PWD_HASH =
      '$2b$10$gF9qXRA.0ZtNWgbrwoYHMOmdUFUbaL4AkGdxAEMDMrMZtFexnH.H.';

    // May 2026 — one staff_kecamatan user per kecamatan (31 total) so the
    // submit form can pre-fill rayon + kecamatan from the logged-in user.
    // Username pattern: `staff_kecamatan_<code>_<n>` (e.g.
    // `staff_kecamatan_wiyung_1`) — May 9 standardization for parity with
    // the other roles (`korlap_pusat_1`, `satgas_pusat_1`, …). The `_1`
    // suffix lets us scale a kecamatan to multiple staff later without
    // breaking the convention.
    const allKec = (await queryRunner.query(
      `SELECT id, name, code, rayon_id FROM kecamatans ORDER BY name`,
    )) as Array<{ id: string; name: string; code: string; rayon_id: string }>;

    // Map rayon_id → human-readable rayon name so the verbose log shows the
    // pairing each staff_kecamatan user lands in. Saves the reader from having
    // to cross-reference a separate rayons table during UAT.
    const rayonNameRows = (await queryRunner.query(
      `SELECT id, name FROM rayons`,
    )) as Array<{ id: string; name: string }>;
    const rayonNameById = new Map(rayonNameRows.map((r) => [r.id, r.name]));

    let staffKecInserted = 0;
    let staffKecExisting = 0;
    let phoneSeq = 100; // base for unique phone numbers (08120000_____)

    console.log(
      `\n  Seeding ${allKec.length} per-kecamatan staff_kecamatan users — pattern: staff_kecamatan_<code>_1`,
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
    let i = 0;
    for (const k of allKec) {
      i += 1;
      const username = `staff_kecamatan_${k.code}_1`;
      const fullName = `Staff Kecamatan ${k.name}`;
      const phone = `0812000${String(phoneSeq).padStart(5, '0')}`;
      phoneSeq += 1;
      const result = await queryRunner.query(
        `INSERT INTO users
           (username, password_hash, full_name, phone_number,
            role, rayon_id, area_id, kecamatan_name, kecamatan_id, is_active)
         VALUES ($1, $2, $3, $4, 'staff_kecamatan', $5, NULL, $6, $7, TRUE)
         ON CONFLICT (username) DO NOTHING`,
        [username, STAFF_KEC_PWD_HASH, fullName, phone, k.rayon_id, k.name, k.id],
      );
      const inserted = result && (result as any).rowCount > 0;
      if (inserted) staffKecInserted += 1;
      else staffKecExisting += 1;

      const marker = inserted ? '✚' : '·';
      const rayonName = rayonNameById.get(k.rayon_id) ?? '—';
      console.log(
        `  ${String(i).padStart(2)} ${marker} ${username.padEnd(34)} ${phone.padEnd(13)} ${k.name.padEnd(20)} ${rayonName}`,
      );
    }
    console.log(
      `  ✓ ${staffKecInserted} staff_kecamatan users inserted, ${staffKecExisting} already existed (idempotent)`,
    );

    // Backfill kecamatan_id for any existing legacy staff_kec_* users
    // (idempotent — matches by kecamatan_name).
    await queryRunner.query(`
      UPDATE users u SET kecamatan_id = k.id
      FROM kecamatans k
      WHERE u.role = 'staff_kecamatan'
        AND u.kecamatan_id IS NULL
        AND u.kecamatan_name IS NOT NULL
        AND lower(k.name) = lower(u.kecamatan_name)
    `);

    console.log(`  ✓ ${staffKecInserted} new staff_kecamatan users seeded (one per kecamatan, password: password123)`);
    console.log(`     legacy staff_kec_* users backfilled with kecamatan_id`);

    // ==========================================
    // SECTION 4: pruning_requests (sample workflow data)
    // ==========================================
    console.log('');
    console.log('✂️  ======== SECTION 4: Pruning Requests ========');
    let pruningInserted = 0;

    // Cover every status chip so MyRequestsScreen + ReviewQueueScreen
    // have visible data on first login. 6 rows × distinct statuses.
    // Phase 3 Apr 27 redesign — sample rows now include the new tree-detail
    // and contact fields so MyRequestsScreen / RequestDetailScreen show realistic
    // data on first login.
    const sampleRequests = [
      { kec: 'Tegalsari', addr: 'Jl. Pemuda No. 1',         status: 'submitted',   photos: 3, count: 5,
        height: '5-7 meter',  diameter: '30-40 cm', reqName: 'Budi Santoso',  reqPhone: '081234567001', rtName: 'Pak Joko',  rtPhone: '081298765001' },
      { kec: 'Genteng',   addr: 'Jl. Tunjungan No. 12',     status: 'submitted',   photos: 4, count: 8,
        height: '8-10 meter', diameter: '40-60 cm', reqName: 'Siti Aminah',   reqPhone: '081234567002', rtName: 'Pak Hendra',rtPhone: '081298765002' },
      { kec: 'Wonokromo', addr: 'Jl. Raya Darmo No. 99',    status: 'approved',    photos: 5, count: 12,
        height: '10-12 meter',diameter: '50-70 cm', reqName: 'Andi Wijaya',   reqPhone: '081234567003', rtName: 'Pak Slamet',rtPhone: '081298765003' },
      { kec: 'Kenjeran',  addr: 'Jl. Raya Kenjeran No. 50', status: 'rejected',    photos: 3, count: 4,
        height: '4-5 meter',  diameter: '20-30 cm', reqName: 'Dewi Lestari',  reqPhone: '081234567004', rtName: 'Pak Budi',  rtPhone: '081298765004' },
      { kec: 'Krembangan',addr: 'Jl. Tanjungsari No. 100',  status: 'assigned',   photos: 4, count: 10,
        height: '7-9 meter',  diameter: '35-50 cm', reqName: 'Rina Susanti',  reqPhone: '081234567005', rtName: 'Pak Wahyu', rtPhone: '081298765005' },
      { kec: 'Tegalsari', addr: 'Jl. Embong Malang No. 7',  status: 'in_progress', photos: 5, count: 6,
        height: '6-8 meter',  diameter: '30-45 cm', reqName: 'Eko Pranoto',   reqPhone: '081234567006', rtName: 'Pak Agus',  rtPhone: '081298765006' },
    ];

    // Prefer all staff_kecamatan users so each user has some requests in their
    // `mine=true` view; fall back to admin_data if none exist.
    const staffKecUsers = await queryRunner.query(
      `SELECT id, rayon_id, username FROM users
       WHERE role = 'staff_kecamatan' AND is_active = true
       ORDER BY username`,
    ) as Array<{ id: string; rayon_id: string | null; username: string }>;
    const fallbackAdmin = staffKecUsers.length === 0
      ? await queryRunner.query(`SELECT id, rayon_id FROM users WHERE role = 'admin_data' LIMIT 1`)
      : [];
    const submitterId = staffKecUsers.length > 0
      ? staffKecUsers[0].id
      : fallbackAdmin[0]?.id;
    // Pick the canonical Pusat staff_kecamatan user for the original 6 sample
    // requests so the demo login still sees varied statuses. After the May 9
    // username standardization the Pusat-Tegalsari user is
    // `staff_kecamatan_tegalsari_1`; the legacy staging-only `staff_kecamatan_pusat_1`
    // is the secondary fallback.
    const pusatStaff =
      staffKecUsers.find((s) => s.username === 'staff_kecamatan_tegalsari_1') ??
      staffKecUsers.find((s) => s.username === 'staff_kecamatan_pusat_1');
    const sampleSubmitterId = pusatStaff?.id ?? submitterId;
    const reviewer = await queryRunner.query(
      `SELECT id FROM users WHERE role IN ('admin_data','kepala_rayon','superadmin') LIMIT 1`,
    );
    const reviewerId = reviewer.length > 0 ? reviewer[0].id : null;
    const rayonForRequests = await queryRunner.query(`SELECT id FROM rayons ORDER BY name LIMIT 1`);
    const rayonIdForReq = rayonForRequests[0]?.id ?? null;

    if (!submitterId) {
      console.log('  ⚠ No staff_kecamatan or admin_data users found, skipping pruning_requests');
    } else {
      for (let i = 0; i < sampleRequests.length; i++) {
        const r = sampleRequests[i];
        const refCode = `PR-${Date.now()}-${i}`;
        const photoUrls = Array.from({ length: r.photos }, (_, n) =>
          `https://placehold.co/600x400?text=PR-${i}-${n + 1}`,
        );
        const expectedDate = new Date(Date.now() + (i + 1) * 86400000)
          .toISOString().split('T')[0];
        const reviewedAt = ['approved', 'rejected', 'assigned', 'in_progress'].includes(r.status)
          ? new Date().toISOString() : null;

        const result = await queryRunner.query(
          `INSERT INTO pruning_requests
             (reference_code, submitted_by, kecamatan_name, address, gps_lat, gps_lng,
              expected_date, estimated_plant_count, tree_count,
              tree_height_estimate, tree_diameter_estimate,
              requester_name, requester_phone, rt_leader_name, rt_leader_phone,
              photo_urls, status, rayon_id,
              reviewed_by, reviewed_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16::text[],$17,$18,$19,$20)
           ON CONFLICT (reference_code) DO NOTHING`,
          [refCode, sampleSubmitterId, r.kec, r.addr,
           -7.2575 + (i * 0.001), 112.7521 + (i * 0.001),
           expectedDate, r.count, r.count,
           r.height, r.diameter,
           r.reqName, r.reqPhone, r.rtName, r.rtPhone,
           photoUrls, r.status, rayonIdForReq,
           reviewedAt ? reviewerId : null, reviewedAt],
        );
        if (result && (result as any).rowCount > 0) pruningInserted++;
      }

      // ── Bulk volume rows for list-screen UX testing (scroll + filter + sort).
      // Generates ~25 additional requests across all statuses + kecamatan +
      // calendar dates so PerantinganListScreen / ReviewQueueScreen exercise
      // every chip and both sort orders without being seeded against a single
      // status bucket. Stays idempotent via reference_code.
      const STATUSES = ['submitted', 'under_review', 'approved', 'rejected',
                         'assigned', 'in_progress', 'done', 'cancelled'] as const;
      const KECS = ['Tegalsari', 'Genteng', 'Wonokromo', 'Kenjeran',
                    'Krembangan', 'Sukolilo', 'Mulyorejo', 'Gubeng', 'Bulak'];
      const STREETS = ['Jl. Mawar', 'Jl. Anggrek', 'Jl. Melati', 'Jl. Cendana',
                       'Jl. Cemara', 'Jl. Jati', 'Jl. Kenanga', 'Jl. Flamboyan',
                       'Jl. Beringin', 'Jl. Kamboja', 'Jl. Kemuning', 'Jl. Mahoni'];
      const REQ_NAMES = ['Bagas', 'Citra', 'Dimas', 'Endah', 'Fajar', 'Galuh',
                         'Hanif', 'Indra', 'Jihan', 'Kemal', 'Laras', 'Maharani'];
      const RT_NAMES = ['Pak Hamid', 'Pak Yusuf', 'Pak Rahmat', 'Pak Bambang',
                        'Pak Subagyo', 'Pak Maulana', 'Pak Iwan', 'Pak Darto'];
      const HEIGHTS = ['3-5 meter', '5-7 meter', '7-9 meter', '9-12 meter',
                       '12-15 meter', '15-18 meter'];
      const DIAMETERS = ['15-25 cm', '25-35 cm', '35-50 cm', '50-70 cm',
                         '70-90 cm', '90-110 cm'];

      // Resolve rayon_id from the kecamatan name so each bulk row's
      // (kecamatan_name, rayon_id) pair is consistent with the kecamatans
      // table. Previously these were picked independently and produced
      // mismatches like "Tegalsari → Rayon Barat 1", which broke
      // admin_data review queues that filter by rayon_id.
      const kecRayonRows = await queryRunner.query(
        `SELECT name, rayon_id FROM kecamatans`,
      ) as Array<{ name: string; rayon_id: string }>;
      const rayonByKec = new Map<string, string>();
      for (const k of kecRayonRows) rayonByKec.set(k.name, k.rayon_id);
      const rayonForKec = (kec: string): string =>
        rayonByKec.get(kec) ?? rayonIdForReq;

      const BULK_COUNT = 25;
      // All bulk rows submitted by the canonical Pusat staff_kecamatan demo
      // login) so the Perantingan list has enough volume on `mine=true` to
      // exercise scroll + filter + sort. Admin review queues filter by
      // `rayon_id`, which round-robins across all rayons regardless.
      let bulkInserted = 0;
      for (let i = 0; i < BULK_COUNT; i++) {
        const status = STATUSES[i % STATUSES.length];
        const kec = KECS[i % KECS.length];
        const street = STREETS[i % STREETS.length];
        const reqName = REQ_NAMES[i % REQ_NAMES.length];
        const rtName = RT_NAMES[i % RT_NAMES.length];
        const height = HEIGHTS[i % HEIGHTS.length];
        const diameter = DIAMETERS[i % DIAMETERS.length];
        const treeCount = ((i % 9) + 2);
        const photoCount = ((i % 4) + 1);
        const ageDays = i; // 0 → today, 1 → yesterday … 24 → ~3.5 weeks ago
        const createdAt = new Date(Date.now() - ageDays * 86400000).toISOString();
        const targetDate = new Date(Date.now() + ((i % 14) + 1) * 86400000);
        const targetIsoDate = targetDate.toISOString().split('T')[0];
        // May 9, 2026 schema split: kecamatan picks a WEEK on submit; admin
        // confirms the DAY at assign-to-task. Populate the kecamatan's week
        // for every row, and only fill `scheduled_date` once the admin has
        // acted (whitelist via ADMIN_DATED_STATUSES).
        const isoWk = isoWeekOf(targetDate);
        const scheduledDate = ADMIN_DATED_STATUSES.has(status) ? targetIsoDate : null;
        const reviewedAt = ['approved', 'rejected', 'assigned', 'in_progress',
                             'done', 'cancelled', 'under_review'].includes(status)
          ? new Date(Date.now() - ageDays * 86400000 + 3600 * 1000).toISOString()
          : null;
        const refCode = `PR-BULK-${i.toString().padStart(3, '0')}`;
        const photoUrls = Array.from({ length: photoCount }, (_, n) =>
          `https://placehold.co/600x400?text=PR-BULK-${i}-${n + 1}`,
        );

        const result = await queryRunner.query(
          `INSERT INTO pruning_requests
             (reference_code, submitted_by, kecamatan_name, address, gps_lat, gps_lng,
              expected_year, expected_iso_week, scheduled_date,
              estimated_plant_count, tree_count,
              tree_height_estimate, tree_diameter_estimate,
              requester_name, requester_phone, rt_leader_name, rt_leader_phone,
              photo_urls, status, rayon_id,
              reviewed_by, reviewed_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18::text[],$19,$20,$21,$22,$23)
           ON CONFLICT (reference_code) DO NOTHING`,
          [refCode, sampleSubmitterId, kec, `${street} No. ${100 + i}`,
           -7.2575 + (i * 0.0007), 112.7521 + (i * 0.0007),
           isoWk.year, isoWk.week, scheduledDate,
           treeCount, treeCount,
           height, diameter,
           `${reqName} ${i + 1}`, `0812345${(80000 + i).toString().slice(-5)}`,
           rtName, `0812987${(60000 + i).toString().slice(-5)}`,
           photoUrls, status, rayonForKec(kec),
           reviewedAt ? reviewerId : null, reviewedAt,
           createdAt],
        );
        if (result && (result as any).rowCount > 0) bulkInserted++;
      }
      console.log(`  ✓ ${bulkInserted} additional bulk pruning_requests inserted (volume + status + date variety)`);
      pruningInserted += bulkInserted;

      // Heal existing rows whose kecamatan_name disagrees with rayon_id
      // (e.g. earlier seed runs assigned Tegalsari → Rayon Barat 1). Fixes
      // are scoped to known kecamatan names so manual test rows with
      // arbitrary strings stay untouched.
      const healed = await queryRunner.query(`
        UPDATE pruning_requests pr
        SET rayon_id = k.rayon_id
        FROM kecamatans k
        WHERE pr.kecamatan_name = k.name
          AND (pr.rayon_id IS DISTINCT FROM k.rayon_id)
      `);
      const healedCount = (healed as any)?.[1] ?? 0;
      if (healedCount) {
        console.log(`  ✓ ${healedCount} existing pruning_requests realigned to their kecamatan's rayon`);
      }
    }
    console.log(`  ✓ ${pruningInserted} pruning_requests total (sample + bulk volume rows)`);

    // ==========================================
    // SECTION 5: plant_seeds + seed_transactions
    // ==========================================
    console.log('');
    console.log('🌱 ======== SECTION 5: Plant Seeds & Transactions ========');
    const seedSpecies = [
      { nameId: 'AKASIA_SEEDS', unit: 'gram', qty: 1000 },
      { nameId: 'MAHONI_SEEDS', unit: 'gram', qty: 800 },
      { nameId: 'BUNGUR_SEEDS', unit: 'piece', qty: 500 },
      { nameId: 'SENGON_SEEDS', unit: 'gram', qty: 600 },
      { nameId: 'JATI_SEEDS', unit: 'piece', qty: 300 },
    ];

    let seedsInserted = 0;
    let transactionsInserted = 0;

    for (const seedSpec of seedSpecies) {
      const seedResult = await queryRunner.query(
        `INSERT INTO plant_seeds (name_id, unit, stock_qty)
         VALUES ($1, $2, $3)
         ON CONFLICT (name_id) DO NOTHING
         RETURNING id`,
        [seedSpec.nameId, seedSpec.unit, seedSpec.qty],
      );

      if (seedResult.length > 0) {
        seedsInserted++;
        const seedId = seedResult[0].id;

        // Add initial transaction (purchase/stock)
        const recorder = await queryRunner.query(`SELECT id FROM users LIMIT 1`);
        if (recorder.length > 0) {
          const txResult = await queryRunner.query(
            `INSERT INTO seed_transactions (seed_id, transaction_type, qty, supplier, occurred_at, recorded_by)
             VALUES ($1, 'purchase', $2, 'Nursery A', $3, $4)`,
            [seedId, seedSpec.qty, new Date().toISOString().split('T')[0], recorder[0].id],
          );
          if (txResult && (txResult as any).rowCount > 0) transactionsInserted++;
        }
      }
    }
    console.log(`  ✓ ${seedsInserted} plant_seeds inserted`);
    console.log(`  ✓ ${transactionsInserted} seed_transactions inserted`);

    // ==========================================
    // SECTION 6: service_capacity
    // ==========================================
    console.log('');
    console.log('📅 ======== SECTION 6: Service Capacity ========');

    const rayons = await queryRunner.query(`SELECT id, name FROM rayons ORDER BY name`);
    if (rayons.length === 0) {
      console.log('  ⚠ No rayons found, skipping service_capacity seed');
    } else {
      // Seed 12 weeks starting from the current ISO week.
      const currentDate = new Date();
      const { year: startYear, week: startWeek } = getIsoWeek(currentDate);

      const weeksToSeed: Array<{ year: number; week: number }> = [];
      let yr = startYear;
      let wk = startWeek;
      for (let i = 0; i < 12; i++) {
        weeksToSeed.push({ year: yr, week: wk });
        wk++;
        // ISO weeks max is 52 or 53 — advance year when needed
        const maxWeek = getMaxIsoWeek(yr);
        if (wk > maxWeek) {
          wk = 1;
          yr++;
        }
      }

      // Dev capacity grid — capacity_units = 5 (matches the
      // `service_capacity_defaults.default_capacity_per_week` config) and a
      // varied `booked_units` pattern so the WeekPicker exercises all four
      // chip variants out of the box:
      //   wk %4 == 0 → 0 / 5 booked  → "Tersedia" (green)
      //   wk %4 == 1 → 2 / 5 booked  → "Tersedia" (green)
      //   wk %4 == 2 → 4 / 5 booked  → "Hampir Penuh" (yellow)
      //   wk %4 == 3 → 5 / 5 booked  → "Penuh" (red)
      // The pattern is rotated by rayon index so different rayons show
      // different load profiles — useful when admins switch rayons during
      // UAT and want to see the booking calendar respond.
      const DEV_CAPACITY = 5;
      const BOOK_PATTERN = [0, 2, 4, 5];
      let capacityInserted = 0;
      let capacityUpdated = 0;
      for (let r = 0; r < rayons.length; r++) {
        const rayon = rayons[r];
        for (let i = 0; i < weeksToSeed.length; i++) {
          const { year, week } = weeksToSeed[i];
          const booked = BOOK_PATTERN[(i + r) % BOOK_PATTERN.length];
          // ON CONFLICT DO UPDATE so re-seed swaps stale capacity_units=0 rows
          // (from prior runs / from prod-style reference seed) into the dev
          // values without needing a wipe.
          const result = await queryRunner.query(
            `INSERT INTO service_capacity
                (rayon_id, year, iso_week, service_type, capacity_units, booked_units)
             VALUES ($1, $2, $3, 'pruning', $4, $5)
             ON CONFLICT (rayon_id, year, iso_week, service_type) DO UPDATE SET
                capacity_units = EXCLUDED.capacity_units,
                booked_units   = EXCLUDED.booked_units
             RETURNING (xmax = 0) AS inserted`,
            [rayon.id, year, week, DEV_CAPACITY, booked],
          );
          if (result[0]?.inserted) capacityInserted++;
          else capacityUpdated++;
        }
      }
      console.log(
        `  ✓ ${capacityInserted} new + ${capacityUpdated} refreshed service_capacity rows ` +
        `(${rayons.length} rayons × ${weeksToSeed.length} weeks, capacity_units=${DEV_CAPACITY}, ` +
        `booked rotated through [${BOOK_PATTERN.join(',')}])`,
      );
      console.log(`    Range: ${startYear}-W${startWeek} → ${weeksToSeed[weeksToSeed.length - 1].year}-W${weeksToSeed[weeksToSeed.length - 1].week}`);
    }

    await queryRunner.commitTransaction();

    // ====================================================================
    // SUMMARY — Phase 3 (May 9 2026 refresh)
    // ====================================================================
    const counts = await queryRunner.query(`
      SELECT
        (SELECT count(*)::int FROM kecamatans)                                       AS kecamatans,
        (SELECT count(*)::int FROM users WHERE role = 'staff_kecamatan')             AS staff_kec_users,
        (SELECT count(*)::int FROM plant_species)                                    AS plant_species,
        (SELECT count(*)::int FROM area_plants)                                      AS area_plants,
        (SELECT count(*)::int FROM notable_plants)                                   AS notable_plants,
        (SELECT count(*)::int FROM pruning_requests)                                 AS pruning_requests,
        (SELECT count(*)::int FROM plant_seeds)                                      AS plant_seeds,
        (SELECT count(*)::int FROM seed_transactions)                                AS seed_transactions,
        (SELECT count(*)::int FROM service_capacity)                                 AS service_capacity
    `);
    const c = counts[0] ?? {};
    const sampleStaff = (await queryRunner.query(`
      SELECT u.username, u.full_name, u.phone_number, k.name AS kecamatan, r.name AS rayon
      FROM users u
      LEFT JOIN kecamatans k ON k.id = u.kecamatan_id
      LEFT JOIN rayons r     ON r.id = u.rayon_id
      WHERE u.role = 'staff_kecamatan'
      ORDER BY r.name, k.name
      LIMIT 8
    `)) as Array<{ username: string; full_name: string; phone_number: string; kecamatan: string; rayon: string }>;

    console.log('');
    console.log('╔══════════════════════════════════════════════════════════════════════════════════╗');
    console.log('║  ✅  Phase 3 Seeding Completed Successfully                                     ║');
    console.log('╚══════════════════════════════════════════════════════════════════════════════════╝');
    console.log('');
    console.log('  [1] Reference Data');
    console.log('      ─────────────────────────────────────────────────────────────────────────────');
    console.log(`      ${String(c.plant_species).padStart(3)} plant_species  · ${String(c.kecamatans).padStart(3)} kecamatans (FK to rayons)`);
    console.log(`      ${String(c.service_capacity).padStart(3)} service_capacity rows (rayons × ISO weeks × pruning)`);
    console.log('');
    console.log('  [2] Sample Showcase Data (dev only)');
    console.log('      ─────────────────────────────────────────────────────────────────────────────');
    console.log(`      ${String(c.area_plants).padStart(3)} area_plants    · ${String(c.notable_plants).padStart(3)} notable_plants`);
    console.log(`      ${String(c.pruning_requests).padStart(3)} pruning_requests across all 8 statuses`);
    console.log(`      ${String(c.plant_seeds).padStart(3)} plant_seeds    · ${String(c.seed_transactions).padStart(3)} seed_transactions`);
    console.log('');
    console.log('  [3] Staff Kecamatan Users (NEW — May 9, 2026)');
    console.log('      ─────────────────────────────────────────────────────────────────────────────');
    console.log(`      ${String(c.staff_kec_users).padStart(3)} staff_kecamatan users — one per kecamatan, all password: password123`);
    console.log('      Username pattern: staff_kecamatan_<code>_<n>  (e.g. staff_kecamatan_wiyung_1)');
    console.log('      Each user is auto-linked to their kecamatan_id + rayon_id so the mobile');
    console.log('      submit form pre-fills + locks both fields on login.');
    console.log('');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    console.log('🧪  STAFF KECAMATAN — sample logins (all passwords: password123)');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
    console.log('');
    console.log('  Username                       Phone          Kecamatan         Rayon');
    console.log('  ──────────────────────────────────────────────────────────────────────────────────');
    for (const u of sampleStaff) {
      console.log(
        `  ${u.username.padEnd(30)} ${(u.phone_number ?? '').padEnd(14)} ${(u.kecamatan ?? '—').padEnd(17)} ${u.rayon ?? '—'}`,
      );
    }
    console.log(`  … and ${Math.max(0, c.staff_kec_users - sampleStaff.length)} more (one for every kecamatan).`);
    console.log('');
    console.log('  All 31 Surabaya Kecamatans seeded (per-rayon assignment):');
    console.log('  ──────────────────────────────────────────────────────────────────────────────────');
    console.log('  Rayon Pusat    (4): Bubutan, Genteng, Simokerto, Tegalsari');
    console.log('  Rayon Timur 1  (3): Tambaksari, Gubeng, Sukolilo');
    console.log('  Rayon Timur 2  (4): Mulyorejo, Rungkut, Tenggilis Mejoyo, Gunung Anyar');
    console.log('  Rayon Barat 1  (5): Sukomanunggal, Tandes, Asemrowo, Benowo, Pakal');
    console.log('  Rayon Barat 2  (2): Sambikerep, Lakarsantri');
    console.log('  Rayon Utara    (5): Krembangan, Pabean Cantian, Semampir, Kenjeran, Bulak');
    console.log('  Rayon Selatan  (8): Wonokromo, Wonocolo, Gayungan, Jambangan, Sawahan,');
    console.log('                      Dukuh Pakis, Wiyung, Karang Pilang');
    console.log('');
    console.log('  Tip: pair `staff_kecamatan_tegalsari_1` (Rayon Pusat) for the submit flow with');
    console.log('       `admin_data_pusat_1` (Rayon Pusat) to review + convert — both share Rayon');
    console.log('       Pusat so the request lands in the admin\'s queue. For other rayons use the');
    console.log('       matching admin (e.g. staff_kecamatan_wiyung_1 → admin_data_selatan_1).');
    console.log('══════════════════════════════════════════════════════════════════════════════════════');
  } catch (error) {
    await queryRunner.rollbackTransaction();
    console.error('❌ Phase 3 seed failed, rolling back:', error);
    throw error;
  } finally {
    await queryRunner.release();
  }
}

/**
 * Returns the maximum ISO week number for a given year.
 * A year has 53 ISO weeks if Jan 1 is Thursday, or if it is a leap year and Jan 1 is Wednesday.
 */
export function getMaxIsoWeek(year: number): number {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay() || 7;
  const dec31 = new Date(Date.UTC(year, 11, 31)).getUTCDay() || 7;
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
}

// ==========================================
// Reusable embeddable helpers (no transaction management — caller owns it)
// ==========================================

/**
 * Phase 3 reference data — fully idempotent, no FK requirements beyond migrations.
 * Seeds: plant_species (128), Phase 3 monitoring_configs (4 keys).
 * Safe for production cold-start.
 */
export async function seedPhase3Reference(queryRunner: QueryRunner): Promise<void> {
  let speciesInserted = 0;
  for (const species of PLANT_SPECIES) {
    const rows = await queryRunner.query(
      `INSERT INTO plant_species (name_id, category)
       VALUES ($1, $2)
       ON CONFLICT (name_id) DO NOTHING
       RETURNING id`,
      [species.nameId, species.category],
    );
    if (rows.length > 0) speciesInserted++;
  }
  console.log(`  ✓ ${speciesInserted} new plant_species inserted (${PLANT_SPECIES.length - speciesInserted} already existed)`);

  const phase3Configs = [
    { key: 'plants_forecast', value: { default_pruning_cycle_days: 90, overdue_threshold_days: 30, due_soon_window_days: 14 }, description: 'Plant pruning forecast configuration (Phase 3)' },
    { key: 'service_capacity_defaults', value: { default_capacity_per_week: 5, overbooking_tolerance: 10, booking_window_weeks: 12 }, description: 'Service capacity booking defaults (Phase 3)' },
    { key: 'pruning_request_workflow', value: { auto_assign_to_rayon: false, review_deadline_days: 7, reference_code_prefix: 'PR' }, description: 'Pruning request workflow settings (Phase 3)' },
    { key: 'seed_inventory', value: { low_stock_threshold_grams: 500, low_stock_threshold_pieces: 50, reorder_notification: true }, description: 'Seed inventory alert thresholds (Phase 3)' },
  ];
  let configsInserted = 0;
  for (const cfg of phase3Configs) {
    const rows = await queryRunner.query(
      `INSERT INTO monitoring_configs (key, value, description)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (key) DO NOTHING
       RETURNING key`,
      [cfg.key, JSON.stringify(cfg.value), cfg.description],
    );
    if (rows.length > 0) configsInserted++;
  }
  console.log(`  ✓ ${configsInserted} new Phase 3 monitoring_configs inserted (${phase3Configs.length - configsInserted} already existed)`);
}

/**
 * Service capacity grid — 12 ISO weeks ahead × N rayons × service_type='pruning'.
 * Idempotent. Requires `rayons` to be seeded first.
 *
 * @param capacityUnits initial capacity per row (default 0; UAT may pass 5 to enable booking demos).
 */
export async function seedPhase3ServiceCapacity(
  queryRunner: QueryRunner,
  capacityUnits = 0,
): Promise<void> {
  const rayons = await queryRunner.query(`SELECT id FROM rayons ORDER BY name`);
  if (rayons.length === 0) {
    console.log('  ⚠ No rayons found, skipping service_capacity seed');
    return;
  }
  const today = new Date();
  const { year: startYear, week: startWeek } = getIsoWeek(today);
  const weeks: Array<{ year: number; week: number }> = [];
  let yr = startYear;
  let wk = startWeek;
  for (let i = 0; i < 12; i++) {
    weeks.push({ year: yr, week: wk });
    wk++;
    if (wk > getMaxIsoWeek(yr)) { wk = 1; yr++; }
  }
  let inserted = 0;
  for (const r of rayons) {
    for (const { year, week } of weeks) {
      const rows = await queryRunner.query(
        `INSERT INTO service_capacity (rayon_id, year, iso_week, service_type, capacity_units, booked_units)
         VALUES ($1, $2, $3, 'pruning', $4, 0)
         ON CONFLICT (rayon_id, year, iso_week, service_type) DO NOTHING
         RETURNING id`,
        [r.id, year, week, capacityUnits],
      );
      if (rows.length > 0) inserted++;
    }
  }
  console.log(`  ✓ ${inserted} new service_capacity rows (${rayons.length} rayons × ${weeks.length} weeks, capacity_units=${capacityUnits})`);
}

/**
 * Phase 3 sample/UAT data — area_plants, notable_plants, pruning_requests (with task lineage),
 * plant_seeds, and seed_transactions.
 * Requires existing users (admin_data or staff_kecamatan), areas, and rayons.
 * Idempotent on natural keys; safe to re-run.
 */
export async function seedPhase3SampleData(queryRunner: QueryRunner): Promise<void> {
  // Sample area_plants — link first up-to-6 active areas to common species
  const areas = await queryRunner.query(`SELECT id FROM areas WHERE is_active = true LIMIT 6`);
  if (areas.length > 0) {
    const mappings = [
      { speciesName: 'AKASIA', count: 10 },
      { speciesName: 'MAHONI', count: 6 },
      { speciesName: 'BUNGUR', count: 4 },
      { speciesName: 'SENGON', count: 8 },
      { speciesName: 'JATI', count: 3 },
    ];
    let inserted = 0;
    for (const area of areas) {
      for (const m of mappings) {
        const sp = await queryRunner.query(`SELECT id FROM plant_species WHERE name_id = $1 LIMIT 1`, [m.speciesName]);
        if (sp.length > 0) {
          const rows = await queryRunner.query(
            `INSERT INTO area_plants (area_id, species_id, count)
             VALUES ($1, $2, $3)
             ON CONFLICT (area_id, species_id) DO NOTHING
             RETURNING id`,
            [area.id, sp[0].id, m.count],
          );
          if (rows.length > 0) inserted++;
        }
      }
    }
    console.log(`  ✓ ${inserted} area_plants inserted across ${areas.length} areas`);
  } else {
    console.log('  ⚠ No active areas found, skipping area_plants');
  }

  // Sample notable_plants — heritage specimens (heritage=true) linked to areas
  if (areas.length > 0) {
    const notablePlantSamples = [
      { areaIndex: 0, speciesName: 'BERINGIN', lat: -7.2506, lng: 112.7508, heritage: true, label: 'Pohon Beringin Tua Keramat', notes: 'Pohon bersejarah usia 150 tahun' },
      { areaIndex: 1, speciesName: 'MAHONI', lat: -7.2575, lng: 112.7665, heritage: true, label: 'Mahoni Koleksi 1990', notes: 'Specimen dari Jepang, perlu perawatan khusus' },
      { areaIndex: 2, speciesName: 'JATI', lat: -7.2450, lng: 112.7450, heritage: false, label: 'Jati Benih Unggul', notes: 'Jati dari proyek hutan tanaman 2020' },
    ];
    let notableInserted = 0;
    for (const notable of notablePlantSamples) {
      if (notable.areaIndex < areas.length) {
        const sp = await queryRunner.query(
          `SELECT id FROM plant_species WHERE name_id = $1 LIMIT 1`,
          [notable.speciesName],
        );
        if (sp.length > 0) {
          // notable_plants has no natural unique constraint — idempotency via label match
          const existing = await queryRunner.query(
            `SELECT id FROM notable_plants WHERE area_id = $1 AND species_id = $2 AND label = $3 LIMIT 1`,
            [areas[notable.areaIndex].id, sp[0].id, notable.label],
          );
          if (existing.length === 0) {
            await queryRunner.query(
              `INSERT INTO notable_plants (area_id, species_id, gps_lat, gps_lng, label, heritage, notes, photo_urls)
               VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
              [areas[notable.areaIndex].id, sp[0].id, notable.lat, notable.lng, notable.label, notable.heritage, notable.notes, []],
            );
            notableInserted++;
          }
        }
      }
    }
    console.log(`  ✓ ${notableInserted} notable_plants (heritage) inserted`);
  }

  // Sample pruning_requests — various statuses with optional task lineage
  const submitter = await queryRunner.query(
    `SELECT id FROM users WHERE role IN ('staff_kecamatan','admin_data') ORDER BY role LIMIT 1`,
  );
  const admin = await queryRunner.query(
    `SELECT id FROM users WHERE role IN ('admin_system', 'superadmin') ORDER BY role LIMIT 1`,
  );
  const rayon = await queryRunner.query(`SELECT id FROM rayons LIMIT 1`);

  if (submitter.length > 0) {
    const submitterId = submitter[0].id;
    const adminId = admin.length > 0 ? admin[0].id : submitterId;
    const rayonId = rayon.length > 0 ? rayon[0].id : null;

    // 6 samples covering every status chip used in MyRequestsScreen
    // and ReviewQueueScreen so each visual variant is on screen on
    // first login.
    // Phase 3 Apr 27 redesign — sample rows now include the new tree-detail
    // and contact fields populated by the redesigned mobile submit form.
    const samples = [
      { kecamatan: 'Tegalsari',  address: 'Jl. Pemuda No. 1',         status: 'submitted'   as const, estimatedCount: 12, daysFromNow: 30,
        height: '8-10 meter', diameter: '40-60 cm',  reqName: 'Budi Santoso',   reqPhone: '081234567001', rtName: 'Pak Joko',  rtPhone: '081298765001' },
      { kecamatan: 'Wonokromo',  address: 'Jl. Raya Darmo No. 50',    status: 'submitted'   as const, estimatedCount: 8,  daysFromNow: 45,
        height: '6-8 meter',  diameter: '30-45 cm',  reqName: 'Siti Aminah',    reqPhone: '081234567002', rtName: 'Pak Hendra',rtPhone: '081298765002' },
      { kecamatan: 'Kenjeran',   address: 'Jl. Kenjeran No. 100',     status: 'approved'    as const, estimatedCount: 15, daysFromNow: 14,
        height: '10-12 meter',diameter: '50-70 cm',  reqName: 'Andi Wijaya',    reqPhone: '081234567003', rtName: 'Pak Slamet',rtPhone: '081298765003' },
      { kecamatan: 'Krembangan', address: 'Jl. Tanjungsari No. 25',   status: 'rejected'    as const, estimatedCount: 6,  daysFromNow: -5,
        height: '4-5 meter',  diameter: '20-30 cm',  reqName: 'Dewi Lestari',   reqPhone: '081234567004', rtName: 'Pak Budi',  rtPhone: '081298765004' },
      { kecamatan: 'Genteng',    address: 'Jl. Tunjungan No. 12',     status: 'assigned'   as const, estimatedCount: 10, daysFromNow: 7,
        height: '7-9 meter',  diameter: '35-50 cm',  reqName: 'Rina Susanti',   reqPhone: '081234567005', rtName: 'Pak Wahyu', rtPhone: '081298765005' },
      { kecamatan: 'Tegalsari',  address: 'Jl. Embong Malang No. 7',  status: 'in_progress' as const, estimatedCount: 6,  daysFromNow: 3,
        height: '5-7 meter',  diameter: '30-40 cm',  reqName: 'Eko Pranoto',    reqPhone: '081234567006', rtName: 'Pak Agus',  rtPhone: '081298765006' },
    ];
    let inserted = 0;
    for (let i = 0; i < samples.length; i++) {
      const refCode = `PR-2026-STAGING-${String(i + 1).padStart(4, '0')}`;
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + samples[i].daysFromNow);
      const targetIsoDate = targetDate.toISOString().split('T')[0];

      const photoUrls = Array.from({ length: 3 + (i % 3) }, (_, n) =>
        `https://placehold.co/600x400?text=PR-${i + 1}-${n + 1}`,
      );

      const s = samples[i];
      // May 9, 2026 schema split — kecamatan picks a week on submit, admin
      // confirms the day. Sample seeds populate `expected_year` /
      // `expected_iso_week` for every row, and `scheduled_date` only for
      // statuses where admin has acted.
      const isoWk = isoWeekOf(targetDate);
      const scheduledDate = ADMIN_DATED_STATUSES.has(s.status) ? targetIsoDate : null;

      const insertParams: any[] = [
        refCode,
        submitterId,
        s.kecamatan,
        s.address,
        s.status,
        isoWk.year,
        isoWk.week,
        scheduledDate,
        s.estimatedCount,
        s.estimatedCount,            // tree_count mirrors estimated_plant_count
        s.height,
        s.diameter,
        s.reqName,
        s.reqPhone,
        s.rtName,
        s.rtPhone,
        rayonId,
        photoUrls,
      ];

      // Add review metadata for any reviewed/post-review status
      const reviewed = ['approved', 'rejected', 'assigned', 'in_progress'].includes(s.status);
      if (reviewed) {
        insertParams.push(adminId, new Date().toISOString(), `Reviewed by admin on ${new Date().toLocaleDateString()}`);
      } else {
        insertParams.push(null, null, null);
      }

      const rows = await queryRunner.query(
        `INSERT INTO pruning_requests
           (reference_code, submitted_by, kecamatan_name, address, status,
            expected_year, expected_iso_week, scheduled_date,
            estimated_plant_count, tree_count, tree_height_estimate, tree_diameter_estimate,
            requester_name, requester_phone, rt_leader_name, rt_leader_phone,
            rayon_id, photo_urls,
            reviewed_by, reviewed_at, review_notes)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18::text[], $19, $20, $21)
         ON CONFLICT (reference_code) DO NOTHING
         RETURNING id`,
        insertParams,
      );
      if (rows.length > 0) inserted++;
    }
    console.log(`  ✓ ${inserted} pruning_requests inserted (mixed statuses + tree details + contacts)`);
  } else {
    console.log('  ⚠ No staff_kecamatan/admin_data user found, skipping pruning_requests');
  }

  // Sample plant_seeds + seed_transactions
  const recorder = await queryRunner.query(`SELECT id FROM users WHERE role = 'admin_data' LIMIT 1`);
  const recorderId = recorder.length > 0 ? recorder[0].id : null;
  const seeds = [
    { nameId: 'AKASIA_SEEDS', unit: 'gram', qty: 1000 },
    { nameId: 'MAHONI_SEEDS', unit: 'gram', qty: 800 },
    { nameId: 'BUNGUR_SEEDS', unit: 'piece', qty: 500 },
    { nameId: 'SENGON_SEEDS', unit: 'gram', qty: 600 },
    { nameId: 'JATI_SEEDS', unit: 'piece', qty: 300 },
  ];
  let seedsInserted = 0;
  let txInserted = 0;
  for (const s of seeds) {
    const seedResult = await queryRunner.query(
      `INSERT INTO plant_seeds (name_id, unit, stock_qty)
       VALUES ($1, $2, $3)
       ON CONFLICT (name_id) DO NOTHING
       RETURNING id`,
      [s.nameId, s.unit, s.qty],
    );
    if (seedResult.length > 0) {
      seedsInserted++;
      if (recorderId) {
        const tx = await queryRunner.query(
          `INSERT INTO seed_transactions (seed_id, transaction_type, qty, supplier, occurred_at, recorded_by)
           VALUES ($1, 'purchase', $2, 'Dinas Lingkungan Hidup', $3, $4)
           RETURNING id`,
          [seedResult[0].id, s.qty, new Date().toISOString().split('T')[0], recorderId],
        );
        if (tx.length > 0) txInserted++;
      }
    }
  }
  console.log(`  ✓ ${seedsInserted} plant_seeds + ${txInserted} seed_transactions`);
}

// ==========================================
// Standalone entry point
// ==========================================
async function main(): Promise<void> {
  const { DataSource: DS } = await import('typeorm');
  const dataSource = new DS({
    type: 'postgres',
    host: process.env.DATABASE_HOST || 'localhost',
    port: parseInt(process.env.DATABASE_PORT || '5432', 10),
    username: process.env.DATABASE_USER || 'postgres',
    password: process.env.DATABASE_PASSWORD || 'postgres',
    database: process.env.DATABASE_NAME || 'sekar_db',
    entities: [],
    synchronize: false,
  });

  await dataSource.initialize();
  try {
    await seedPhase3(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

// Only run main() when this file is the entry point (npm run db:seed:phase3).
// Without this guard, importing the helpers from seed-reference.ts or
// seed-staging.ts would trigger a second full Phase 3 seed.
if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}

export { seedPhase3 };
