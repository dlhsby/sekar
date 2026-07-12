import type { SeedContext } from './context';

/**
 * Canonical destructive-truncate order for a full reseed (demo + staging).
 *
 * Superset of every table any profile clears, ordered child → parent. TRUNCATE …
 * CASCADE makes strict FK order unnecessary, but keeping it child-first avoids
 * surprises and documents the dependency graph. Tables absent in a given schema
 * (pre-migration states) are probed and skipped.
 */
export const TRUNCATE_ORDER: readonly string[] = [
  'audit_logs',
  // Phase 3 (plants / pruning / seeds / capacity) — cleared first (deepest FKs).
  'seed_transactions',
  'plant_seeds',
  'service_capacity',
  'activity_plant_items',
  'pruning_requests',
  'notable_plants',
  'location_plants',
  'plant_species',
  // Daily roster.
  'schedule_locations',
  'schedules',
  // Core transactional + assignment tables.
  'user_locations',
  'user_tracking_status',
  'monitoring_configs',
  'notification_tokens',
  'notifications',
  'task_tags',
  'overtimes',
  'special_day_overrides',
  'location_staff_requirements',
  'tasks',
  'location_logs',
  'activities',
  'shifts',
  'shift_definitions',
  'locations',
  'location_types',
  'activity_types',
  'kecamatans',
  'rayons',
  'users',
];

/** Truncate every existing table in {@link TRUNCATE_ORDER} (CASCADE). Destructive. */
export async function truncateAll(ctx: SeedContext): Promise<void> {
  ctx.log('🗑️  Clearing all tables…');
  const existing: string[] = [];
  for (const table of TRUNCATE_ORDER) {
    const rows = (await ctx.qr.query(
      `SELECT EXISTS (
         SELECT FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
       ) AS exists`,
      [table],
    )) as Array<{ exists: boolean }>;
    if (rows[0]?.exists) existing.push(table);
  }
  if (existing.length > 0) {
    await ctx.qr.query(`TRUNCATE TABLE ${existing.map((t) => `"${t}"`).join(', ')} CASCADE`);
    ctx.log(`  ✓ Cleared ${existing.length} tables`);
  }
}
