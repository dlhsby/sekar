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
  // Dynamic RBAC (ADR-044) — join first, then roles/permissions.
  'role_permissions',
  'roles',
  'permissions',
  // Settings overrides (ADR-049) — operator config, cleared on full reseed.
  'system_config',
  // Phase 3 (plants / pruning / seeds / capacity) — cleared first (deepest FKs).
  'seed_transactions',
  'plant_seeds',
  'service_capacity',
  'activity_plant_items',
  'pruning_requests',
  'notable_plants',
  'area_plants',
  'plant_species',
  // Daily roster.
  'schedule_areas',
  'schedules',
  // Core transactional + assignment tables.
  'user_areas',
  'user_tracking_status',
  'monitoring_configs',
  'notification_tokens',
  'notifications',
  'task_tags',
  'overtimes',
  'special_day_overrides',
  'area_staff_requirements',
  'tasks',
  'location_logs',
  'activities',
  'shifts',
  'shift_definitions',
  'areas',
  'regions',
  'area_types',
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
