import { EntityManager } from 'typeorm';
import { District } from '../districts/entities/district.entity';
import { Region } from '../regions/entities/region.entity';
import { Location } from '../locations/entities/location.entity';
import { LocationType } from '../location-types/entities/location-type.entity';
import { TeamCategory } from '../teams/entities/team-category.entity';
import { User } from '../users/entities/user.entity';
import { Role } from '../rbac/entities/role.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { ScheduleCascade, type ScheduleTarget } from './schedule-cascade';

export const DELETABLE_TYPES = [
  'district',
  'region',
  'location',
  'location_type',
  'team_category',
  'user',
  'role',
  'shift_definition',
] as const;
export type DeletableType = (typeof DELETABLE_TYPES)[number];

/** Counts shown in the confirmation dialog; keys are i18n keys on the web. */
export type Impact = Record<string, number>;

export interface PlanContext {
  manager: EntityManager;
  cascade: ScheduleCascade;
  actorId: string | null;
  /** Required for types whose dependants cannot exist without one (role, location type). */
  replacementId?: string;
}

type Row = { id: string } & Record<string, unknown>;

export interface DeletePlan {
  entity: new () => object;
  /** Catalog permission required to force-delete. */
  permission: string;
  /** What the operator must type to confirm. */
  label: (row: Row) => string;
  /** Dependants that must move to a replacement (0 → no replacement needed). */
  needsReplacement?: (m: EntityManager, row: Row) => Promise<number>;
  impact: (m: EntityManager, c: ScheduleCascade, row: Row) => Promise<Impact>;
  /** Cascade, then remove the row itself. Returns what actually changed. */
  execute: (ctx: PlanContext, row: Row) => Promise<Impact>;
}

const LOCATION: ScheduleTarget = { rows: 'location_id = $1', events: 'location_id = $1' };
const REGION: ScheduleTarget = {
  // Lokasi rows under a kawasan also carry region_id; only kawasan-scoped rows go.
  rows: 'region_id = $1 AND location_id IS NULL',
  // An event carries exactly one place id (chk_schedule_events_scope).
  events: 'region_id = $1',
};
const DISTRICT: ScheduleTarget = { rows: 'district_id = $1', events: 'district_id = $1' };
const USER: ScheduleTarget = {
  rows: 'user_id = $1',
  events: 'user_id = $1 OR pic_user_id = $1',
};
const SHIFT: ScheduleTarget = {
  rows: 'shift_definition_id = $1',
  events: 'shift_definition_id = $1',
};

async function count(m: EntityManager, sql: string, id: string): Promise<number> {
  const [r] = (await m.query(sql, [id])) as Array<{ n: number }>;
  return r?.n ?? 0;
}

async function affected(m: EntityManager, sql: string, params: unknown[]): Promise<number> {
  const res = (await m.query(sql, params)) as [unknown, number];
  return res[1] ?? 0;
}

async function softRemove(m: EntityManager, entity: new () => object, row: Row): Promise<void> {
  await m.softRemove(entity, row);
}

// ─── Place ────────────────────────────────────────────────────────────────

async function locationImpact(m: EntityManager, c: ScheduleCascade, id: string): Promise<Impact> {
  return {
    future_schedules: await c.countFutureRows(LOCATION, id),
    schedule_series: await c.countLiveSeries(LOCATION, id),
    users_home: await count(
      m,
      `SELECT COUNT(*)::int n FROM users WHERE deleted_at IS NULL AND location_id = $1`,
      id,
    ),
    user_assignments: await count(
      m,
      `SELECT COUNT(*)::int n FROM user_locations WHERE location_id = $1`,
      id,
    ),
  };
}

async function deleteLocation(ctx: PlanContext, row: Row): Promise<Impact> {
  const { manager: m, cascade } = ctx;
  const sched = await cascade.cancel(LOCATION, row.id);
  const usersHome = await affected(
    m,
    `UPDATE users SET location_id = NULL WHERE location_id = $1`,
    [row.id],
  );
  const assignments = await affected(m, `DELETE FROM user_locations WHERE location_id = $1`, [
    row.id,
  ]);
  await softRemove(m, Location, row);
  return {
    future_schedules: sched.rows,
    schedule_series: sched.seriesEnded + sched.seriesRemoved,
    users_home: usersHome,
    user_assignments: assignments,
  };
}

async function regionImpact(m: EntityManager, c: ScheduleCascade, id: string): Promise<Impact> {
  return {
    future_schedules: await c.countFutureRows(REGION, id),
    schedule_series: await c.countLiveSeries(REGION, id),
    locations_detached: await count(
      m,
      `SELECT COUNT(*)::int n FROM locations WHERE deleted_at IS NULL AND region_id = $1`,
      id,
    ),
    users_home: await count(
      m,
      `SELECT COUNT(*)::int n FROM users WHERE deleted_at IS NULL AND region_id = $1`,
      id,
    ),
  };
}

async function deleteRegion(ctx: PlanContext, row: Row): Promise<Impact> {
  const { manager: m, cascade } = ctx;
  const sched = await cascade.cancel(REGION, row.id);
  // Lokasi stay valid under their rayon; they only leave the kawasan.
  const detached = await affected(m, `UPDATE locations SET region_id = NULL WHERE region_id = $1`, [
    row.id,
  ]);
  const usersHome = await affected(m, `UPDATE users SET region_id = NULL WHERE region_id = $1`, [
    row.id,
  ]);
  await softRemove(m, Region, row);
  return {
    future_schedules: sched.rows,
    schedule_series: sched.seriesEnded + sched.seriesRemoved,
    locations_detached: detached,
    users_home: usersHome,
  };
}

async function districtImpact(m: EntityManager, c: ScheduleCascade, id: string): Promise<Impact> {
  return {
    regions_deleted: await count(
      m,
      `SELECT COUNT(*)::int n FROM regions WHERE deleted_at IS NULL AND district_id = $1`,
      id,
    ),
    locations_deleted: await count(
      m,
      `SELECT COUNT(*)::int n FROM locations WHERE deleted_at IS NULL AND district_id = $1`,
      id,
    ),
    future_schedules: await c.countFutureRows(DISTRICT, id),
    schedule_series: await c.countLiveSeries(DISTRICT, id),
    users_home: await count(
      m,
      `SELECT COUNT(*)::int n FROM users WHERE deleted_at IS NULL AND district_id = $1`,
      id,
    ),
  };
}

/** User decision: a rayon force delete cascades to its kawasan and lokasi. */
async function deleteDistrict(ctx: PlanContext, row: Row): Promise<Impact> {
  const { manager: m, cascade } = ctx;
  const locations = await m.find(Location, { where: { district_id: row.id } });
  for (const loc of locations) {
    await deleteLocation(ctx, loc as unknown as Row);
  }
  const regions = await m.find(Region, { where: { district_id: row.id } });
  for (const reg of regions) {
    await deleteRegion(ctx, reg as unknown as Row);
  }
  const sched = await cascade.cancel(DISTRICT, row.id);
  const usersHome = await affected(
    m,
    `UPDATE users SET district_id = NULL WHERE district_id = $1`,
    [row.id],
  );
  await softRemove(m, District, row);
  return {
    regions_deleted: regions.length,
    locations_deleted: locations.length,
    future_schedules: sched.rows,
    schedule_series: sched.seriesEnded + sched.seriesRemoved,
    users_home: usersHome,
  };
}

// ─── People & catalogs ────────────────────────────────────────────────────

async function userImpact(m: EntityManager, c: ScheduleCascade, id: string): Promise<Impact> {
  return {
    future_schedules: await c.countFutureRows(USER, id),
    schedule_series: await c.countLiveSeries(USER, id),
    team_memberships: await count(
      m,
      `SELECT COUNT(*)::int n FROM schedule_event_members mem
         JOIN schedule_events e ON e.id = mem.schedule_event_id
        WHERE mem.user_id = $1 AND e.deleted_at IS NULL`,
      id,
    ),
    user_assignments: await count(
      m,
      `SELECT COUNT(*)::int n FROM user_locations WHERE user_id = $1`,
      id,
    ),
  };
}

async function deleteUser(ctx: PlanContext, row: Row): Promise<Impact> {
  const { manager: m, cascade } = ctx;
  // Series the person owns (individual, or as team PIC) end at today.
  const sched = await cascade.cancel(USER, row.id);
  // Memberships of other teams: leave the roster; past rows are already materialised.
  const memberships = await affected(m, `DELETE FROM schedule_event_members WHERE user_id = $1`, [
    row.id,
  ]);
  const assignments = await affected(m, `DELETE FROM user_locations WHERE user_id = $1`, [row.id]);
  await softRemove(m, User, row);
  return {
    future_schedules: sched.rows,
    schedule_series: sched.seriesEnded + sched.seriesRemoved,
    team_memberships: memberships,
    user_assignments: assignments,
  };
}

async function shiftImpact(m: EntityManager, c: ScheduleCascade, id: string): Promise<Impact> {
  return {
    future_schedules: await c.countFutureRows(SHIFT, id),
    schedule_series: await c.countLiveSeries(SHIFT, id),
    users_default_shift: await count(
      m,
      `SELECT COUNT(*)::int n FROM users WHERE deleted_at IS NULL AND shift_definition_id = $1`,
      id,
    ),
  };
}

async function deleteShift(ctx: PlanContext, row: Row): Promise<Impact> {
  const { manager: m, cascade } = ctx;
  const sched = await cascade.cancel(SHIFT, row.id);
  const users = await affected(
    m,
    `UPDATE users SET shift_definition_id = NULL WHERE shift_definition_id = $1`,
    [row.id],
  );
  await softRemove(m, ShiftDefinition, row);
  return {
    future_schedules: sched.rows,
    schedule_series: sched.seriesEnded + sched.seriesRemoved,
    users_default_shift: users,
  };
}

async function teamCategoryImpact(
  m: EntityManager,
  c: ScheduleCascade,
  id: string,
): Promise<Impact> {
  // Team series keep running; they just lose the category's marker.
  return {
    team_series: await count(
      m,
      `SELECT COUNT(*)::int n FROM schedule_events WHERE deleted_at IS NULL AND team_category_id = $1`,
      id,
    ),
  };
}

async function roleImpact(m: EntityManager, _c: ScheduleCascade, row: Row): Promise<Impact> {
  return {
    users_moved: await count(
      m,
      `SELECT COUNT(*)::int n FROM users WHERE deleted_at IS NULL AND role = $1`,
      row.code as string,
    ),
  };
}

async function deleteRole(ctx: PlanContext, row: Row): Promise<Impact> {
  const { manager: m } = ctx;
  let moved = 0;
  if (ctx.replacementId) {
    const [target] = (await m.query(`SELECT code FROM roles WHERE id = $1 AND deleted_at IS NULL`, [
      ctx.replacementId,
    ])) as Array<{ code: string }>;
    moved = await affected(m, `UPDATE users SET role = $2 WHERE role = $1 AND deleted_at IS NULL`, [
      row.code,
      target.code,
    ]);
  }
  await softRemove(m, Role, row);
  return { users_moved: moved };
}

async function locationTypeImpact(
  m: EntityManager,
  _c: ScheduleCascade,
  id: string,
): Promise<Impact> {
  return {
    locations_moved: await count(
      m,
      `SELECT COUNT(*)::int n FROM locations WHERE location_type_id = $1`,
      id,
    ),
  };
}

async function deleteLocationType(ctx: PlanContext, row: Row): Promise<Impact> {
  const { manager: m } = ctx;
  const moved = ctx.replacementId
    ? await affected(m, `UPDATE locations SET location_type_id = $2 WHERE location_type_id = $1`, [
        row.id,
        ctx.replacementId,
      ])
    : 0;
  await softRemove(m, LocationType, row);
  return { locations_moved: moved };
}

const byId =
  (fn: (m: EntityManager, c: ScheduleCascade, id: string) => Promise<Impact>) =>
  (m: EntityManager, c: ScheduleCascade, row: Row) =>
    fn(m, c, row.id);

const name = (row: Row) => String(row.name ?? '');

export const DELETE_PLANS: Record<DeletableType, DeletePlan> = {
  district: {
    entity: District,
    permission: 'district:delete',
    label: name,
    impact: byId(districtImpact),
    execute: deleteDistrict,
  },
  region: {
    entity: Region,
    permission: 'region:delete',
    label: name,
    impact: byId(regionImpact),
    execute: deleteRegion,
  },
  location: {
    entity: Location,
    permission: 'area:delete',
    label: name,
    impact: byId(locationImpact),
    execute: deleteLocation,
  },
  location_type: {
    entity: LocationType,
    permission: 'area:delete',
    label: name,
    needsReplacement: (m, row) =>
      count(m, `SELECT COUNT(*)::int n FROM locations WHERE location_type_id = $1`, row.id),
    impact: byId(locationTypeImpact),
    execute: deleteLocationType,
  },
  team_category: {
    entity: TeamCategory,
    permission: 'team:delete',
    label: name,
    impact: byId(teamCategoryImpact),
    execute: async (ctx, row) => {
      const impact = await teamCategoryImpact(ctx.manager, ctx.cascade, row.id);
      await softRemove(ctx.manager, TeamCategory, row);
      return impact;
    },
  },
  user: {
    entity: User,
    permission: 'user:delete',
    // Usernames are unique and unambiguous; full names are not.
    label: (row) => String(row.username ?? ''),
    impact: byId(userImpact),
    execute: deleteUser,
  },
  role: {
    entity: Role,
    permission: 'role:delete',
    label: name,
    needsReplacement: (m, row) =>
      count(
        m,
        `SELECT COUNT(*)::int n FROM users WHERE deleted_at IS NULL AND role = $1`,
        row.code as string,
      ),
    impact: roleImpact,
    execute: deleteRole,
  },
  shift_definition: {
    entity: ShiftDefinition,
    permission: 'shift-definition:delete',
    label: name,
    impact: byId(shiftImpact),
    execute: deleteShift,
  },
};
