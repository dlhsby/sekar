import * as bcrypt from 'bcrypt';
import { runProfileCli, type SeedContext } from '../lib/context';
import { seedPermissions } from '../entities/permission';
import { seedRoles } from '../entities/role';
import { seedAreaTypes } from '../entities/area-type';
import { seedDistricts } from '../entities/district';
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
 * PRODUCTION profile — production-safe seeding (non-destructive, upsert-only).
 *
 * **IMPORTANT: This file is CODE-ONLY REVIEW. It is NOT locally runnable.**
 *
 * In production, this runs via a deployment pipeline with environment variables
 * for admin passwords (SEED_SUPERADMIN_PASSWORD, PROD_ADMIN_SYSTEM_PASSWORD).
 * Local devs cannot run this without those env vars set and validated.
 *
 * Seeds ONLY idempotent reference data + 2 admin accounts (superadmin + admin_system_1).
 * Never wipes; every insert is an upsert keyed on the table's unique column.
 * Safe to re-run multiple times.
 *
 * **Flow for production bootstrap:**
 *   1. Deploy database schema (migrations)
 *   2. Run this profile with env vars set (SEED_SUPERADMIN_PASSWORD, PROD_ADMIN_SYSTEM_PASSWORD)
 *   3. Import area boundaries via KMZ import page (admin_system_1)
 *   4. Bulk-load workers via CSV import (admin_system_1)
 *   5. Optional: seed Phase 3 plant catalog
 */
async function seedProduction(ctx: SeedContext): Promise<void> {
  ctx.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  ctx.log('║  🚀 SEKAR Production Seeder (Non-Destructive, Upsert-Only)            ║');
  ctx.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  ctx.log('');

  // DO NOT truncate — this is production!

  // Dynamic RBAC (ADR-044) — MUST come first, and must not be omitted.
  //
  // The migration that creates roles/permissions/role_permissions leaves them
  // EMPTY, and no migration ever inserts rows. With empty tables
  // RolePermissionsService resolves [] for every role, so every
  // @RequirePermissions handler 403s and every role's monitoring_scope is `none` —
  // the app comes up authenticated but authorization-dead. This profile omitted
  // them (unlike `reference.ts`), which armed exactly that failure for the
  // production cutover. Both seeders are idempotent; grants are seeded only when
  // a role has none, so re-running never clobbers operator edits.
  await seedPermissions(ctx);
  await seedRoles(ctx);

  // Reference data (all idempotent via ON CONFLICT DO NOTHING).
  await seedAreaTypes(ctx);
  await seedDistricts(ctx);
  await seedShiftDefinitions(ctx);
  await seedActivityTypes(ctx);
  await seedSpecialDayOverrides(ctx);
  await seedKecamatans(ctx);
  await seedMonitoringConfigs(ctx);

  // Phase 3 reference (plant catalog + capacity grid).
  await seedPlantSpecies(ctx);
  await seedServiceCapacity(ctx);

  // Admin accounts (2 only: superadmin + admin_system_1, passwords from env).
  ctx.log('👤 Seeding production admin accounts…');

  // Superadmin (password from SEED_SUPERADMIN_PASSWORD).
  const superadminPw = superadminPasswordHash({ requireEnv: true });
  await ctx.qr.query(
    `INSERT INTO users (id, username, password_hash, full_name, phone_number, role, is_active, password_must_change)
     VALUES ($1, 'superadmin', $2, 'Super Administrator', '081200000000', 'superadmin', TRUE, FALSE)
     ON CONFLICT (username) DO NOTHING`,
    [ADMIN_USER_ID, superadminPw],
  );
  ctx.log('  ✓ superadmin (password from SEED_SUPERADMIN_PASSWORD)');

  // Admin System (password from PROD_ADMIN_SYSTEM_PASSWORD).
  const adminSystemPw = process.env.PROD_ADMIN_SYSTEM_PASSWORD?.trim();
  if (!adminSystemPw || adminSystemPw.length < 12) {
    throw new Error('PROD_ADMIN_SYSTEM_PASSWORD must be set in the environment (min 12 chars).');
  }
  const adminSystemHash = await bcrypt.hash(adminSystemPw, 10);
  await ctx.qr.query(
    `INSERT INTO users (username, password_hash, full_name, role, is_active, password_must_change)
     VALUES ('admin_system_1', $1, 'Administrator Sistem', 'admin_system', TRUE, FALSE)
     ON CONFLICT (username) DO NOTHING`,
    [adminSystemHash],
  );
  ctx.log('  ✓ admin_system_1 (password from PROD_ADMIN_SYSTEM_PASSWORD)');

  ctx.log('');
  ctx.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  ctx.log('║  ✅ Production Seeding Completed                                     ║');
  ctx.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  ctx.log('');
  ctx.log('📋 Next steps:');
  ctx.log('   1. Verify superadmin + admin_system_1 accounts created');
  ctx.log('   2. Change the admin passwords immediately');
  ctx.log('   3. Import area boundaries via the KMZ import page (admin_system_1)');
  ctx.log('   4. Bulk-load workers via CSV import');
  ctx.log('   5. Optional: seed Phase 3 plant catalog');
  ctx.log('');
  ctx.log('Accounts created:');
  ctx.log('   - Username: superadmin     (password from SEED_SUPERADMIN_PASSWORD)');
  ctx.log('   - Username: admin_system_1 (password from PROD_ADMIN_SYSTEM_PASSWORD)');
}

runProfileCli('production', seedProduction);
