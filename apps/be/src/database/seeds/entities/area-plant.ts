import type { SeedContext } from '../lib/context';

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
 *   - Other locations have at least one off-status row so admin views never look uniformly green.
 */
const AREA_PLANT_PLAN: Record<string, AreaPlantSeed[]> = {
  'Taman Bungkul': [
    { species: 'TREMBESI', count: 8, lastPrunedDaysAgo: 200, cycleDays: 90, status: 'overdue' },
    { species: 'MAHONI', count: 12, lastPrunedDaysAgo: 80, cycleDays: 90, status: 'due_soon' },
    {
      species: 'KETEPENG KENCANA',
      count: 6,
      lastPrunedDaysAgo: 30,
      cycleDays: 180,
      status: 'ok',
    },
    { species: 'TABEBUYA', count: 5, lastPrunedDaysAgo: 25, cycleDays: 240, status: 'ok' },
    {
      species: 'GLODOKAN TIYANG',
      count: 9,
      lastPrunedDaysAgo: 15,
      cycleDays: 180,
      status: 'ok',
    },
  ],
  'Taman Asahan': [
    {
      species: 'TABEBUYA KUNING',
      count: 14,
      lastPrunedDaysAgo: 240,
      cycleDays: 180,
      status: 'overdue',
    },
    {
      species: 'GLODOKAN',
      count: 10,
      lastPrunedDaysAgo: 95,
      cycleDays: 100,
      status: 'due_soon',
    },
    { species: 'MAHONI', count: 11, lastPrunedDaysAgo: 30, cycleDays: 180, status: 'ok' },
    { species: 'TANJUNG', count: 6, lastPrunedDaysAgo: 50, cycleDays: 365, status: 'ok' },
  ],
  'Taman Bintoro': [
    {
      species: 'TABEBUYA PINK',
      count: 18,
      lastPrunedDaysAgo: 220,
      cycleDays: 180,
      status: 'overdue',
    },
    {
      species: 'TABEBUYA MERAH',
      count: 16,
      lastPrunedDaysAgo: 110,
      cycleDays: 120,
      status: 'due_soon',
    },
    {
      species: 'PALEM RAJA',
      count: 22,
      lastPrunedDaysAgo: 95,
      cycleDays: 100,
      status: 'due_soon',
    },
    { species: 'BERINGIN', count: 4, lastPrunedDaysAgo: 25, cycleDays: 365, status: 'ok' },
  ],
  'Taman Harmoni': [
    { species: 'TREMBESI', count: 6, lastPrunedDaysAgo: 35, cycleDays: 180, status: 'ok' },
    { species: 'KAMBOJA', count: 9, lastPrunedDaysAgo: 22, cycleDays: 240, status: 'ok' },
    { species: 'PALEM PUTRI', count: 12, lastPrunedDaysAgo: 18, cycleDays: 180, status: 'ok' },
  ],
  'Taman Pelangi': [
    {
      species: 'FLAMBOYANT',
      count: 5,
      lastPrunedDaysAgo: 210,
      cycleDays: 180,
      status: 'overdue',
    },
    { species: 'KAYU PUTIH', count: 7, lastPrunedDaysAgo: 30, cycleDays: 180, status: 'ok' },
    { species: 'TANJUNG', count: 4, lastPrunedDaysAgo: 20, cycleDays: 240, status: 'ok' },
  ],
  'Taman Benteng': [
    {
      species: 'CEMARA UDANG',
      count: 10,
      lastPrunedDaysAgo: 100,
      cycleDays: 110,
      status: 'due_soon',
    },
    {
      species: 'PALEM EKOR TUPAI',
      count: 14,
      lastPrunedDaysAgo: 92,
      cycleDays: 100,
      status: 'due_soon',
    },
    { species: 'WARU', count: 6, lastPrunedDaysAgo: 40, cycleDays: 200, status: 'ok' },
    { species: 'NYAMPLUNG', count: 5, lastPrunedDaysAgo: 28, cycleDays: 240, status: 'ok' },
  ],
  'Taman Ex. Metro': [
    { species: 'JATI', count: 7, lastPrunedDaysAgo: 250, cycleDays: 200, status: 'overdue' },
    {
      species: 'KENANGGA',
      count: 5,
      lastPrunedDaysAgo: 95,
      cycleDays: 100,
      status: 'due_soon',
    },
    { species: 'KAMBOJA', count: 8, lastPrunedDaysAgo: 30, cycleDays: 240, status: 'ok' },
  ],
  'TAMAN BUK TONG': [
    {
      species: 'PALEM KIPAS',
      count: 10,
      lastPrunedDaysAgo: 90,
      cycleDays: 100,
      status: 'due_soon',
    },
    { species: 'SAWO KECIK', count: 6, lastPrunedDaysAgo: 25, cycleDays: 240, status: 'ok' },
    { species: 'GLODOKAN', count: 9, lastPrunedDaysAgo: 18, cycleDays: 180, status: 'ok' },
  ],
  'Taman Underpass Mayjend Sisi Utara': [
    { species: 'AKASIA', count: 12, lastPrunedDaysAgo: 230, cycleDays: 180, status: 'overdue' },
    { species: 'SAPU TANGAN', count: 4, lastPrunedDaysAgo: 22, cycleDays: 240, status: 'ok' },
  ],
  'Taman Fasum Darmo indah': [
    { species: 'BUNGUR', count: 8, lastPrunedDaysAgo: 35, cycleDays: 180, status: 'ok' },
    { species: 'KENANGGA', count: 5, lastPrunedDaysAgo: 28, cycleDays: 240, status: 'ok' },
  ],
};

const daysAgoIso = (n: number): string => new Date(Date.now() - n * 86400000).toISOString();

/**
 * Seed location_plants with deterministic per-area species mixes, statuses, and pruning schedules.
 * Uses ctx.maps.speciesIdByName from plant-species seeding.
 * Also purges stale rows from prior seeds via ON CONFLICT DO UPDATE.
 */
export async function seedAreaPlants(ctx: SeedContext): Promise<void> {
  ctx.log('🌿 Seeding Location Plants (showcase)…');

  let areaPlantInserted = 0;
  let areaPlantUpdated = 0;
  let areaPlantSkippedSpecies = 0;

  for (const [areaName, plan] of Object.entries(AREA_PLANT_PLAN)) {
    const areaRow = await ctx.qr.query(
      `SELECT id FROM locations WHERE name = $1 AND is_active = true LIMIT 1`,
      [areaName],
    );
    if (areaRow.length === 0) {
      ctx.log(`  ⚠ Location '${areaName}' not found, skipping`);
      continue;
    }
    const areaId = areaRow[0].id;

    for (const r of plan) {
      const speciesId = ctx.maps.speciesIdByName.get(r.species);
      if (!speciesId) {
        areaPlantSkippedSpecies += 1;
        ctx.log(`  ⚠ Species '${r.species}' missing from catalog, skipping`);
        continue;
      }
      const lastPruned = daysAgoIso(r.lastPrunedDaysAgo);
      const nextDue = new Date(
        new Date(lastPruned).getTime() + r.cycleDays * 86400000,
      ).toISOString();
      const result = await ctx.qr.query(
        `INSERT INTO location_plants
           (location_id, species_id, count, last_pruned_at, override_cycle_days,
            next_due_at, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (location_id, species_id) DO UPDATE SET
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
  // matches the deterministic plan above.
  const allowedAreaNames = Object.keys(AREA_PLANT_PLAN);
  const allowedSpeciesByArea = Object.entries(AREA_PLANT_PLAN).map(([name, plan]) => ({
    name,
    species: plan.map((r) => r.species),
  }));
  let areaPlantPurged = 0;
  for (const { name, species } of allowedSpeciesByArea) {
    const areaRow = await ctx.qr.query(`SELECT id FROM locations WHERE name = $1 LIMIT 1`, [name]);
    if (areaRow.length === 0) continue;
    const purge = await ctx.qr.query(
      `DELETE FROM location_plants
       WHERE location_id = $1
         AND species_id NOT IN (
           SELECT id FROM plant_species WHERE name_id = ANY($2::text[])
         )`,
      [areaRow[0].id, species],
    );
    areaPlantPurged += (purge as any)[1] ?? 0;
  }
  ctx.log(
    `  ✓ ${areaPlantInserted} inserted, ${areaPlantUpdated} updated, ` +
      `${areaPlantPurged} stale rows purged across ${allowedAreaNames.length} locations` +
      (areaPlantSkippedSpecies > 0
        ? ` (skipped ${areaPlantSkippedSpecies} species missing from catalog)`
        : ''),
  );
}
