import type { SeedContext } from '../lib/context';

/**
 * Get ISO week number for a given date (standard ISO 8601 — week with first Thursday).
 */
function getIsoWeek(date: Date): { year: number; week: number } {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayOfWeek = d.getUTCDay() || 7; // 1=Mon ... 7=Sun
  d.setUTCDate(d.getUTCDate() + 4 - dayOfWeek); // align to Thursday
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return { year: d.getUTCFullYear(), week };
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

/**
 * Seed service_capacity — pruning booking grid for 7 rayons × 12 ISO weeks.
 * Demo pattern: capacity_units=5 per week, booked_units rotated through [0, 2, 4, 5]
 * so the UI exercises all four chip variants (Tersedia/yellow/Hampir Penuh/Penuh).
 * Rotation offset per rayon so different rayons show different load profiles.
 */
export async function seedServiceCapacity(ctx: SeedContext): Promise<void> {
  ctx.log('📅 Seeding Service Capacity…');

  const rayons = await ctx.qr.query(`SELECT id, name FROM rayons ORDER BY name`);
  if (rayons.length === 0) {
    ctx.log('  ⚠ No rayons found, skipping service_capacity seed');
    return;
  }

  // Seed 12 weeks starting from the current ISO week
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

  // Capacity grid — capacity_units varies by mode:
  // - Staging: 5 units per week (exercises all WeekPicker chip variants)
  // - Reference: 0 units (capacity tracking disabled in production reference)
  // - Demo: 5 units (same as staging for UI testing)
  // Booked pattern rotates by rayon so different rayons show different load profiles:
  //   wk %4 == 0 → 0 booked  → "Tersedia" (green)
  //   wk %4 == 1 → 2 booked  → "Tersedia" (green)
  //   wk %4 == 2 → 4 booked  → "Hampir Penuh" (yellow)
  //   wk %4 == 3 → max booked → "Penuh" (red)
  const CAPACITY_UNITS = ctx.mode === 'reference' ? 0 : 5;
  const BOOK_PATTERN = [0, 2, 4, 5];
  let capacityInserted = 0;
  let capacityUpdated = 0;
  for (let r = 0; r < rayons.length; r++) {
    const rayon = rayons[r];
    for (let i = 0; i < weeksToSeed.length; i++) {
      const { year, week } = weeksToSeed[i];
      const booked = BOOK_PATTERN[(i + r) % BOOK_PATTERN.length];
      // ON CONFLICT DO UPDATE so re-seed swaps stale capacity_units=0 rows
      // into the dev values without needing a wipe.
      const result = await ctx.qr.query(
        `INSERT INTO service_capacity
            (rayon_id, year, iso_week, service_type, capacity_units, booked_units)
         VALUES ($1, $2, $3, 'pruning', $4, $5)
         ON CONFLICT (rayon_id, year, iso_week, service_type) DO UPDATE SET
            capacity_units = EXCLUDED.capacity_units,
            booked_units   = EXCLUDED.booked_units
         RETURNING (xmax = 0) AS inserted`,
        [rayon.id, year, week, CAPACITY_UNITS, booked],
      );
      if (result[0]?.inserted) capacityInserted++;
      else capacityUpdated++;
    }
  }
  ctx.log(
    `  ✓ ${capacityInserted} new + ${capacityUpdated} refreshed service_capacity rows ` +
      `(${rayons.length} rayons × ${weeksToSeed.length} weeks, capacity_units=${CAPACITY_UNITS}, ` +
      `booked rotated through [${BOOK_PATTERN.join(',')}])`,
  );
  ctx.log(
    `    Range: ${startYear}-W${startWeek} → ${weeksToSeed[weeksToSeed.length - 1].year}-W${weeksToSeed[weeksToSeed.length - 1].week}`,
  );
}
