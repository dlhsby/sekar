import { DataSource, QueryRunner } from 'typeorm';
import { config } from 'dotenv';

config();

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

const PLANT_SPECIES: Array<{ nameId: string; category: string }> = [
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
function getIsoWeek(date: Date): { year: number; week: number } {
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
         ON CONFLICT DO NOTHING`,
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
      await queryRunner.query(
        `INSERT INTO monitoring_configs (key, value, description)
         VALUES ($1, $2::jsonb, $3)
         ON CONFLICT (key) DO NOTHING`,
        [cfg.key, cfg.value, cfg.description],
      );
      configsInserted++;
    }
    console.log(`  ✓ ${configsInserted} monitoring_configs processed (idempotent)`);

    // ==========================================
    // SECTION 3: service_capacity
    // ==========================================
    console.log('');
    console.log('📅 ======== SECTION 3: Service Capacity ========');

    const rayons = await queryRunner.query(`SELECT id, name FROM rayons ORDER BY name`);
    if (rayons.length === 0) {
      console.log('  ⚠ No rayons found, skipping service_capacity seed');
    } else {
      // Current date: 2026-04-26. ISO week 17 of 2026 is the current week.
      // Seed 12 weeks starting from week 17 of 2026.
      const currentDate = new Date('2026-04-26');
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

      let capacityInserted = 0;
      for (const rayon of rayons) {
        for (const { year, week } of weeksToSeed) {
          const result = await queryRunner.query(
            `INSERT INTO service_capacity (rayon_id, year, iso_week, service_type, capacity_units, booked_units)
             VALUES ($1, $2, $3, 'pruning', 0, 0)
             ON CONFLICT (rayon_id, year, iso_week, service_type) DO NOTHING`,
            [rayon.id, year, week],
          );
          if (result && (result as any).rowCount > 0) capacityInserted++;
        }
      }
      console.log(`  ✓ ${capacityInserted} service_capacity rows inserted`);
      console.log(`    Rayons: ${rayons.length}, Weeks: ${weeksToSeed.length} (${startYear}-W${startWeek} to ${weeksToSeed[weeksToSeed.length - 1].year}-W${weeksToSeed[weeksToSeed.length - 1].week})`);
    }

    await queryRunner.commitTransaction();
    console.log('');
    console.log('✅ Phase 3 seed completed successfully');
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
function getMaxIsoWeek(year: number): number {
  const jan1 = new Date(Date.UTC(year, 0, 1)).getUTCDay() || 7;
  const dec31 = new Date(Date.UTC(year, 11, 31)).getUTCDay() || 7;
  return jan1 === 4 || dec31 === 4 ? 53 : 52;
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

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

export { seedPhase3 };
