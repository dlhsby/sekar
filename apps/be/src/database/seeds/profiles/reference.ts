import { runProfileCli, type SeedContext } from '../lib/context';
import { seedPermissions } from '../entities/permission';
import { seedRoles } from '../entities/role';
import { seedAreaTypes } from '../entities/area-type';
import { seedRayons } from '../entities/rayon';
import { seedShiftDefinitions } from '../entities/shift-definition';
import { seedActivityTypes } from '../entities/activity-type';
import { seedSpecialDayOverrides } from '../entities/special-day';
import { seedKecamatans } from '../entities/kecamatan';
import { seedMonitoringConfigs } from '../entities/monitoring-config';
import { seedPlantSpecies } from '../entities/plant-species';
import { seedServiceCapacity } from '../entities/service-capacity';
import { ADMIN_USER_ID } from '../lib/ids';
import { superadminPasswordHash } from '../constants';

/**
 * REFERENCE profile — production-safe seeding (non-destructive, idempotent).
 *
 * Seeds ONLY immutable reference/config data + 1 superadmin user.
 * Safe to run in staging and production — will NOT wipe any existing data.
 * Safe to re-run multiple times with no side effects (all inserts use ON CONFLICT DO NOTHING).
 *
 * **CRITICAL COUNTS (must match exactly):**
 *   - users 1 (superadmin only)
 *   - rayons 8 (7 geographic + Taman Aktif)
 *   - kecamatans 31
 *   - area_types 4
 *   - shift_definitions 3
 *   - activity_types 20
 *   - special_day_overrides 4
 *   - monitoring_configs 9 (5 Phase 2 + 4 Phase 3)
 *   - plant_species 128
 *   - service_capacity 96 (8 rayons × 12 ISO weeks × pruning, capacity_units=0)
 *   - areas 0 (no areas in reference — loaded via KMZ import)
 *   - All transactional tables 0
 */
async function seedReference(ctx: SeedContext): Promise<void> {
  ctx.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  ctx.log('║  📦 Reference Data Seeder (Production-Safe, Idempotent)               ║');
  ctx.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  ctx.log('');

  // DO NOT truncate — this is idempotent reference data only.

  // Dynamic RBAC (ADR-044) — idempotent; grants seeded only when a role has none.
  await seedPermissions(ctx);
  await seedRoles(ctx);

  // Reference data (all idempotent via ON CONFLICT DO NOTHING).
  await seedAreaTypes(ctx);
  await seedRayons(ctx);
  await seedShiftDefinitions(ctx);
  await seedActivityTypes(ctx);
  await seedSpecialDayOverrides(ctx);
  await seedKecamatans(ctx);
  await seedMonitoringConfigs(ctx);

  // Phase 3 reference (plant catalog + capacity grid).
  await seedPlantSpecies(ctx);
  await seedServiceCapacity(ctx);

  // Default superadmin user for initial production login (1 only).
  // Password sourced from SEED_SUPERADMIN_PASSWORD env (falls back to default if unset).
  ctx.log('👤 Seeding default superadmin…');
  await ctx.qr.query(
    `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, is_active, password_must_change)
     VALUES ($1, 'superadmin', $2, 'Super Admin', '081200000000', 'superadmin', TRUE, FALSE)
     ON CONFLICT (username) DO NOTHING`,
    [ADMIN_USER_ID, superadminPasswordHash()],
  );
  ctx.log('  ✓ superadmin user (idempotent — existing accounts untouched)');

  ctx.log('');
  ctx.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  ctx.log('║  ✅ Reference Seeding Completed                                      ║');
  ctx.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  ctx.log('');
  ctx.log('Summary (idempotent):');
  ctx.log('  - 4   area_types');
  ctx.log('  - 8   rayons (7 geographic + Rayon Taman Aktif)');
  ctx.log('  - 31  kecamatans');
  ctx.log('  - 3   shift_definitions (SHIFT1/2/3)');
  ctx.log('  - 20  activity_types');
  ctx.log('  - 4   special_day_overrides (holidays)');
  ctx.log('  - 9   monitoring_configs (5 Phase 2 + 4 Phase 3)');
  ctx.log('  - 128 plant_species');
  ctx.log('  - 96  service_capacity rows (8 rayons × 12 ISO weeks)');
  ctx.log('  - 1   superadmin user');
  ctx.log('');
  ctx.log('⚠️  Production note: Change the superadmin password immediately after first login.');
}

runProfileCli('reference', seedReference);
