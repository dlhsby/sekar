import type { SeedContext } from '../lib/context';

/**
 * Seed plant_seeds + seed_transactions together (they're created as a pair).
 * 5 seed species with initial purchase transactions.
 */
export async function seedPlantSeeds(ctx: SeedContext): Promise<void> {
  ctx.log('🌱 Seeding Plant Seeds & Transactions…');

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
    const seedResult = await ctx.qr.query(
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
      const recorder = await ctx.qr.query(`SELECT id FROM users LIMIT 1`);
      if (recorder.length > 0) {
        const txResult = await ctx.qr.query(
          `INSERT INTO seed_transactions (seed_id, transaction_type, qty, supplier, occurred_at, recorded_by)
           VALUES ($1, 'purchase', $2, 'Nursery A', $3, $4)`,
          [seedId, seedSpec.qty, new Date().toISOString().split('T')[0], recorder[0].id],
        );
        if (txResult && (txResult as any).rowCount > 0) transactionsInserted++;
      }
    }
  }
  ctx.log(`  ✓ ${seedsInserted} plant_seeds inserted`);
  ctx.log(`  ✓ ${transactionsInserted} seed_transactions inserted`);
}
