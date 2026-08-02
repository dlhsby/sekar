import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { SchedulesService } from '../schedules.service';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { Location } from '../../locations/entities/location.entity';
import { User, UserRole } from '../../users/entities/user.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { UserLocationsService } from '../../../modules/user-locations/user-locations.service';
import { AuditLogService } from '../../audit/audit.service';
import { ScheduleMaterializerService } from '../services/schedule-materializer.service';
import { ScheduleOverlapService } from '../services/schedule-overlap.service';

/**
 * Shared testbed for the `SchedulesService` specs.
 *
 * The spec had grown to 2,163 lines around a single 45-line `beforeEach`.
 * Splitting it by concern needed that setup in one place — every file wires the
 * SAME mocks, so a behaviour that depends on one of them cannot be tested
 * differently depending on which file it landed in.
 *
 * Usage:
 *   const t = setupSchedulesTestbed();
 *   ... t.service, t.rosterRepo, ...
 *
 * `setupSchedulesTestbed` registers its own `beforeEach` and returns a stable
 * object whose fields are refreshed before each test, so callers can destructure
 * it once at describe scope.
 */

/** A global editor (superadmin) — passes the edit hierarchy for any target. */
export const ADMIN = { id: 'admin', role: UserRole.SUPERADMIN } as User;

/** Minimal in-memory-ish repo mock with the methods the service uses. */
export function makeRosterRepo() {
  let counter = 0;
  // Chainable query-builder mock: every method returns `this` so calls can be
  // asserted; getMany resolves to whatever the test stubs on it.
  const qb: Record<string, jest.Mock> = {};
  for (const m of [
    'leftJoinAndSelect',
    'leftJoin',
    'addSelect',
    'where',
    'andWhere',
    'orderBy',
    'addOrderBy',
  ]) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getMany = jest.fn().mockResolvedValue([]);
  qb.getRawMany = jest.fn().mockResolvedValue([]);
  qb.getRawOne = jest.fn().mockResolvedValue(undefined);
  qb.select = jest.fn(() => qb);
  qb.innerJoin = jest.fn(() => qb);
  qb.groupBy = jest.fn(() => qb);
  qb.addGroupBy = jest.fn(() => qb);
  return {
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn(),
    create: jest.fn((x) => ({ ...x })),
    save: jest.fn(async (x) => ({ id: x.id ?? `gen-${++counter}`, ...x })),
    update: jest.fn().mockResolvedValue(undefined),
    softDelete: jest.fn(),
    createQueryBuilder: jest.fn(() => qb),
    // The regions lookup in `getRangeSummary` goes through the entity manager
    // rather than a repository, so the mock needs one.
    manager: { query: jest.fn().mockResolvedValue([]) },
    qb,
  };
}

export interface SchedulesTestbed {
  service: SchedulesService;
  rosterRepo: ReturnType<typeof makeRosterRepo>;
  eventRepo: { find: jest.Mock };
  locationRepo: { find: jest.Mock; delete: jest.Mock; create: jest.Mock; save: jest.Mock };
  /** The service's `locationRepo` — provided under the `Location` entity token. */
  areaEntityRepo: { find: jest.Mock };
  userRepo: { find: jest.Mock; findOne: jest.Mock };
  shiftDefinitionRepo: { findOne: jest.Mock };
  shiftRepo: { findOne: jest.Mock; find: jest.Mock };
  userAreas: { getPermanentLocationIdsForUsers: jest.Mock; getPermanentLocationIds: jest.Mock };
  audit: { log: jest.Mock };
  materializer: { materializeEvent: jest.Mock };
  overlapService: { findConflict: jest.Mock };
}

export function setupSchedulesTestbed(): SchedulesTestbed {
  const t = {} as SchedulesTestbed;

  beforeEach(async () => {
    let rosterRepo: SchedulesTestbed['rosterRepo'];
    let eventRepo: SchedulesTestbed['eventRepo'];
    let locationRepo: SchedulesTestbed['locationRepo'];
    let areaEntityRepo: SchedulesTestbed['areaEntityRepo'];
    let userRepo: SchedulesTestbed['userRepo'];
    let shiftDefinitionRepo: SchedulesTestbed['shiftDefinitionRepo'];
    let shiftRepo: SchedulesTestbed['shiftRepo'];
    let userAreas: SchedulesTestbed['userAreas'];
    let audit: SchedulesTestbed['audit'];
    let materializer: SchedulesTestbed['materializer'];
    let overlapService: SchedulesTestbed['overlapService'];

    rosterRepo = makeRosterRepo();
    eventRepo = { find: jest.fn().mockResolvedValue([]) };
    locationRepo = {
      find: jest.fn().mockResolvedValue([]),
      delete: jest.fn(),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => x),
    };
    areaEntityRepo = { find: jest.fn().mockResolvedValue([]) };
    userRepo = { find: jest.fn(), findOne: jest.fn() };
    shiftDefinitionRepo = { findOne: jest.fn() };
    // Default: no open shift, so findCurrentForUser's fallback is a no-op unless a
    // test opts in by stubbing an open shift.
    shiftRepo = {
      findOne: jest.fn().mockResolvedValue(null),
      find: jest.fn().mockResolvedValue([]),
    };
    userAreas = {
      getPermanentLocationIdsForUsers: jest.fn().mockResolvedValue(new Map()),
      getPermanentLocationIds: jest.fn().mockResolvedValue([]),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };
    materializer = {
      materializeEvent: jest.fn().mockResolvedValue({ created: 0, skipped: [], conflicts: [] }),
    };
    overlapService = {
      findConflict: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: getRepositoryToken(Schedule), useValue: rosterRepo },
        { provide: getRepositoryToken(ScheduleEvent), useValue: eventRepo },
        { provide: getRepositoryToken(Location), useValue: areaEntityRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(ShiftDefinition), useValue: shiftDefinitionRepo },
        { provide: getRepositoryToken(Shift), useValue: shiftRepo },
        { provide: UserLocationsService, useValue: userAreas },
        { provide: AuditLogService, useValue: audit },
        { provide: ScheduleMaterializerService, useValue: materializer },
        { provide: ScheduleOverlapService, useValue: overlapService },
      ],
    }).compile();

    Object.assign(t, {
      service: module.get(SchedulesService),
      rosterRepo,
      eventRepo,
      locationRepo,
      areaEntityRepo,
      userRepo,
      shiftDefinitionRepo,
      shiftRepo,
      userAreas,
      audit,
      materializer,
      overlapService,
    });
  });

  return t;
}
