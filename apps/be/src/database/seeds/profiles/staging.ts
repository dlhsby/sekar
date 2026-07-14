import { runProfileCli, type SeedContext } from '../lib/context';
import { truncateAll } from '../lib/truncate';
import { seedPermissions } from '../entities/permission';
import { seedRoles } from '../entities/role';
import { seedTeams } from '../entities/team';
import { seedAreaTypes } from '../entities/area-type';
import { seedRayons } from '../entities/rayon';
import { seedShiftDefinitions } from '../entities/shift-definition';
import { seedActivityTypes } from '../entities/activity-type';
import { seedAreas } from '../entities/area';
import { seedRegions } from '../entities/region';
import { seedSpecialDayOverrides } from '../entities/special-day';
import { seedStaffingRequirements } from '../entities/staffing-requirement';
import { seedKecamatans } from '../entities/kecamatan';
import { seedUsers } from '../entities/user';
import { seedMonitoringConfigs } from '../entities/monitoring-config';
import { seedUserTrackingStatus } from '../entities/user-tracking-status';
import { seedUserAreas } from '../entities/user-area';
import { seedSchedules } from '../entities/schedule';
import { seedPlantSpecies } from '../entities/plant-species';
import { seedServiceCapacity } from '../entities/service-capacity';

/**
 * STAGING profile — UAT seeding (destructive, essentials-only).
 *
 * Wipes all tables, then seeds reference data + users + structural data for UAT.
 * Does NOT include dummy transaction/workflow data — testers create their own.
 *
 * **CRITICAL COUNTS (must match exactly):**
 *   - users 1075 (3 system + 1041 from CSV + 31 staff_kecamatan)
 *   - locations 953 (live-staging snapshot — data/areas.snapshot.json)
 *   - regions 129 (kawasan from the client workbook — data/kawasan.snapshot.json)
 *   - monitoring_configs 9
 *   - location_staff_requirements 332
 *   - user_locations 717 (280 from CSV + 27 multi-area + korlap rayons)
 *   - user_tracking_status 1028
 *   - schedules 1075 (daily roster materialized, one per active user)
 *   - schedule_locations 692 (today's area assignments from user_locations)
 *   - plant_species 128
 *   - service_capacity 96
 *   - All others per spec
 */
async function seedStaging(ctx: SeedContext): Promise<void> {
  ctx.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  ctx.log('║  🚀 Staging / UAT Seeder                                              ║');
  ctx.log('╚═══════════════════════════════════════════════════════════════════════════╝');
  ctx.log('');

  await truncateAll(ctx);

  // Reference data (identical across demo/staging/production paths).
  await seedPermissions(ctx);
  await seedRoles(ctx);
  await seedTeams(ctx);
  await seedAreaTypes(ctx);
  await seedRayons(ctx);
  await seedShiftDefinitions(ctx);
  await seedActivityTypes(ctx);
  await seedSpecialDayOverrides(ctx);
  await seedKecamatans(ctx);
  await seedMonitoringConfigs(ctx);

  // Staging-specific data (937 locations, 1125 users, etc.).
  await seedAreas(ctx);
  await seedRegions(ctx);
  await seedUsers(ctx);
  // Daily roster + phase 3 (plants, capacity).
  await seedUserTrackingStatus(ctx);
  await seedUserAreas(ctx);
  await seedSchedules(ctx);
  await seedStaffingRequirements(ctx);
  await seedPlantSpecies(ctx);
  await seedServiceCapacity(ctx);

  ctx.log('');
  ctx.log('╔═══════════════════════════════════════════════════════════════════════════╗');
  ctx.log('║  ✅ Staging Seeding Completed                                        ║');
  ctx.log('╚═══════════════════════════════════════════════════════════════════════════╝');
}

runProfileCli('staging', seedStaging);
