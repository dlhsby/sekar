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
import { seedNotificationTokens } from '../entities/notification-token';
import { seedOvertimes } from '../entities/overtime';
import { seedShifts } from '../entities/shift';
import { seedTasks } from '../entities/task';
import { seedActivities } from '../entities/activity';
import { seedMonitoringConfigs } from '../entities/monitoring-config';
import { seedUserTrackingStatus } from '../entities/user-tracking-status';
import { seedUserAreas } from '../entities/user-area';
import { seedPlantSpecies } from '../entities/plant-species';
import { seedAreaPlants } from '../entities/area-plant';
import { seedNotablePlants } from '../entities/notable-plant';
import { seedPruningRequests } from '../entities/pruning-request';
import { seedPlantSeeds } from '../entities/plant-seed';
import { seedServiceCapacity } from '../entities/service-capacity';
import { seedNotifications } from '../entities/notification';
import { seedScheduleEvents } from '../entities/schedule-event';

/**
 * DEMO profile — the full local dev seed (`npm run db:seed`).
 *
 * Destructive: truncates every table, then seeds reference + demo transaction +
 * plant data. Replaces the old seed-phase1/2/3 + seed-notifications chain; each
 * entity below owns exactly one table and is composed here in FK/runtime order.
 * Kecamatans seed before users because the staff_kecamatan cohort (in seedUsers)
 * carries a kecamatan_id.
 */
async function seedDemo(ctx: SeedContext): Promise<void> {
  ctx.log('🌱 Demo seed starting…');
  await truncateAll(ctx);

  // Reference data.
  await seedPermissions(ctx);
  await seedRoles(ctx);
  await seedTeams(ctx);
  await seedAreaTypes(ctx);
  await seedRayons(ctx);
  await seedShiftDefinitions(ctx);
  await seedActivityTypes(ctx);
  await seedAreas(ctx);
  await seedRegions(ctx);
  await seedSpecialDayOverrides(ctx);
  await seedStaffingRequirements(ctx);
  await seedKecamatans(ctx);

  // People + assignments.
  await seedUsers(ctx);
  await seedNotificationTokens(ctx);

  // Demo transactional history.
  await seedOvertimes(ctx);
  await seedShifts(ctx);
  await seedTasks(ctx);
  await seedActivities(ctx);
  await seedMonitoringConfigs(ctx);
  await seedUserTrackingStatus(ctx);
  await seedUserAreas(ctx);

  // Schedule events (Phase-4 demo data).
  await seedScheduleEvents(ctx);

  // Plants / pruning / capacity (Phase-3 demo data).
  await seedPlantSpecies(ctx);
  await seedAreaPlants(ctx);
  await seedNotablePlants(ctx);
  await seedPruningRequests(ctx);
  await seedPlantSeeds(ctx);
  await seedServiceCapacity(ctx);

  // Notifications deep-link the demo task/activity/overtime rows above.
  await seedNotifications(ctx);

  ctx.log('✅ Demo seed complete.');
}

runProfileCli('demo', seedDemo);
