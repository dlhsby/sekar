import { TimezoneUtil } from '../../common/utils/timezone.util';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { SchedulesService, isShiftWindowClosed } from './schedules.service';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { Location } from '../locations/entities/location.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { AuditLogService } from '../audit/audit.service';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';
import { ScheduleOverlapService } from './services/schedule-overlap.service';

/** A global editor (superadmin) — passes the edit hierarchy for any target. */
const ADMIN = { id: 'admin', role: UserRole.SUPERADMIN } as User;

/** Minimal in-memory-ish repo mock with the methods the service uses. */
function makeRosterRepo() {
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
    qb,
  };
}

describe('SchedulesService', () => {
  let service: SchedulesService;
  let rosterRepo: ReturnType<typeof makeRosterRepo>;
  let eventRepo: { find: jest.Mock };
  let locationRepo: { find: jest.Mock; delete: jest.Mock; create: jest.Mock; save: jest.Mock };
  let areaEntityRepo: { find: jest.Mock };
  let userRepo: { find: jest.Mock; findOne: jest.Mock };
  let shiftDefinitionRepo: { findOne: jest.Mock };
  let shiftRepo: { findOne: jest.Mock; find: jest.Mock };
  let userAreas: { getPermanentLocationIdsForUsers: jest.Mock; getPermanentLocationIds: jest.Mock };
  let audit: { log: jest.Mock };
  let materializer: { materializeEvent: jest.Mock };
  let overlapService: { findConflict: jest.Mock };

  beforeEach(async () => {
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

    service = module.get(SchedulesService);
  });

  describe('findByDate', () => {
    it('joins the user relation so rows carry user (web table reads user.full_name)', async () => {
      await service.findByDate('2026-06-30');
      // `user` is eager on the entity but createQueryBuilder ignores eager
      // relations — the explicit join is what keeps the row's user populated.
      expect(rosterRepo.qb.leftJoin).toHaveBeenCalledWith('ds.user', 'u');
      expect(rosterRepo.qb.addSelect).toHaveBeenCalledWith(
        expect.arrayContaining(['u.id', 'u.full_name']),
      );
    });

    it('never selects the user avatar (a base64 data URI, once 190 MB per day)', async () => {
      await service.findByDate('2026-06-30');
      // `users.profile_picture_url` holds an inline data URI on legacy rows, up
      // to 5 MB each, and a worker appears on many rows per day. Selecting the
      // whole user entity is what made an unscoped day 190 MB.
      const selected = rosterRepo.qb.addSelect.mock.calls.flat(2) as string[];
      expect(selected).not.toContain('u.profile_picture_url');
      expect(rosterRepo.qb.leftJoinAndSelect).not.toHaveBeenCalledWith('ds.user', 'u');
    });

    it('scopes to a district when one is given', async () => {
      await service.findByDate('2026-06-30', 'r1');
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.district_id = :districtId', {
        districtId: 'r1',
      });
    });
  });

  // ---------------------------------------------------------------------------
  // Projection guards: two key-set queries that decide whether an event's
  // occurrence may be projected. Both used to be unbounded, and one ran INSIDE
  // the per-event loop.
  // ---------------------------------------------------------------------------
  describe('projection guard queries', () => {
    const anEvent = (id: string) => ({
      id,
      scope: 'city',
      is_team: false,
      user_id: 'u1',
      user: { id: 'u1', is_active: true },
      shift_definition_id: 'sd1',
      shift_definition: { id: 'sd1', name: 'S1' },
      start_date: '2026-06-30',
      end_date: '2026-07-05',
      recurrence_type: 'daily',
      is_active: true,
    });

    it('reads tombstones once for the range, not once per event', async () => {
      // This is the N+1 that dominated a month-wide range: ~1k active events on
      // the staging clone meant ~1k sequential round-trips inside the loop.
      eventRepo.find.mockResolvedValue([anEvent('e1'), anEvent('e2'), anEvent('e3')]);

      await service.findByDateRange('2026-06-30', '2026-07-05');

      // Two guard queries total (tombstone keys + occupied shift keys),
      // regardless of how many events were loaded.
      expect(rosterRepo.find).toHaveBeenCalledTimes(2);
    });

    it('narrows both guards by the filters that are components of the key', async () => {
      eventRepo.find.mockResolvedValue([anEvent('e1')]);

      await service.findByDateRange('2026-06-30', '2026-07-05', {
        userId: 'u9',
        shiftDefinitionId: 'sd9',
        districtId: 'd9',
      });

      for (const call of rosterRepo.find.mock.calls) {
        expect(call[0].where).toMatchObject({
          user_id: 'u9',
          shift_definition_id: 'sd9',
          district_id: 'd9',
        });
      }
    });

    it('never narrows a guard by team — a blocking row may belong to another team', async () => {
      // The guards answer "does a row already own this (user, date, shift,
      // place)?". A row in a different team can own it, so filtering the guard
      // by team would drop it and resurrect the phantom projected duplicate
      // `occupiedShiftKeys` exists to prevent.
      eventRepo.find.mockResolvedValue([anEvent('e1')]);

      await service.findByDateRange('2026-06-30', '2026-07-05', { teamCategoryId: 'tc1' });

      for (const call of rosterRepo.find.mock.calls) {
        expect(call[0].where).not.toHaveProperty('team_category_id');
      }
    });
  });

  describe('findByDateRange', () => {
    it('queries schedules between from and to dates inclusive', async () => {
      await service.findByDateRange('2026-06-30', '2026-07-05');
      expect(rosterRepo.qb.where).toHaveBeenCalledWith('ds.schedule_date >= :from', {
        from: '2026-06-30',
      });
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.schedule_date <= :to', {
        to: '2026-07-05',
      });
    });

    it('joins user, shift_definition, location, region, and team_category relations (Phase 4)', async () => {
      await service.findByDateRange('2026-06-30', '2026-07-05');
      const joinCalls = rosterRepo.qb.leftJoin.mock.calls;
      expect(joinCalls.some((c) => c[0] === 'ds.user')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.shift_definition')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.location')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.region')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.team_category')).toBe(true);
    });

    it('selects location/region by NAME only — never the boundary polygon', async () => {
      // Regression guard. `leftJoinAndSelect` stamped ~2 KB of GeoJSON onto every
      // row: a 31-day all-district range measured 293 MB / 29 s on the staging
      // clone, and staging runs the API at --max-old-space-size=384, so that
      // response is an OOM rather than a slow page. Re-adding a bare
      // leftJoinAndSelect for these relations must fail here.
      await service.findByDateRange('2026-06-30', '2026-07-05');
      const selected = rosterRepo.qb.addSelect.mock.calls.flatMap((c) => c[0] as string[]);
      expect(selected).toEqual(expect.arrayContaining(['location.id', 'location.name']));
      expect(selected).toEqual(expect.arrayContaining(['r.id', 'r.name']));
      expect(selected.some((f) => f.includes('boundary_polygon'))).toBe(false);
      expect(selected.some((f) => f.includes('coverage_area'))).toBe(false);
      // The lazy no-show flip (ADR-056) needs the grace on both frontends.
      expect(selected).toEqual(expect.arrayContaining(['sd.cutoff_grace_min']));
      const wholeRelationJoins = rosterRepo.qb.leftJoinAndSelect.mock.calls.map((c) => c[0]);
      expect(wholeRelationJoins).not.toContain('ds.location');
      expect(wholeRelationJoins).not.toContain('ds.region');
    });

    it('scopes to a district when one is given', async () => {
      await service.findByDateRange('2026-06-30', '2026-07-05', 'r1');
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.district_id = :districtId', {
        districtId: 'r1',
      });
    });
  });

  describe('generateRoster', () => {
    it('materializes all active schedule events for the given date via ScheduleMaterializerService', async () => {
      const event1 = { id: 'event1' };
      const event2 = { id: 'event2' };
      eventRepo.find.mockResolvedValue([event1, event2]);
      materializer.materializeEvent
        .mockResolvedValueOnce({ created: 5, skipped: [] })
        .mockResolvedValueOnce({ created: 3, skipped: [] });

      const created = await service.generateRoster('2026-06-30', 'admin');

      expect(created).toBe(8); // 5 + 3
      // Events are now date-scoped: a where array of active + date-overlap branches.
      expect(eventRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.arrayContaining([expect.objectContaining({ is_active: true })]),
        }),
      );
      expect(materializer.materializeEvent).toHaveBeenCalledTimes(2);
      expect(materializer.materializeEvent).toHaveBeenCalledWith(
        event1,
        '2026-06-30',
        '2026-06-30',
      );
      expect(materializer.materializeEvent).toHaveBeenCalledWith(
        event2,
        '2026-06-30',
        '2026-06-30',
      );
    });

    it('logs failures per event but continues materializing remaining events', async () => {
      const event1 = { id: 'event1' };
      const event2 = { id: 'event2' };
      eventRepo.find.mockResolvedValue([event1, event2]);
      materializer.materializeEvent
        .mockRejectedValueOnce(new Error('event1 failed'))
        .mockResolvedValueOnce({ created: 3, skipped: [] });

      const created = await service.generateRoster('2026-06-30', 'admin');

      expect(created).toBe(3); // only event2 succeeded
      expect(materializer.materializeEvent).toHaveBeenCalledTimes(2);
    });
  });

  describe('setLeave', () => {
    it('marks the row leave_sick, stores notes, flips source to manual, audits', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: null,
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.LEAVE_SICK });

      await service.setLeave('d1', 'sick', 'demam', ADMIN);

      const saved = rosterRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(ScheduleStatus.LEAVE_SICK);
      expect(saved.notes).toBe('demam');
      expect(saved.source).toBe('manual');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: 'schedule', action: 'set_leave' }),
      );
    });

    it.each([
      ['sick', ScheduleStatus.LEAVE_SICK],
      ['annual', ScheduleStatus.LEAVE_ANNUAL],
      ['permit', ScheduleStatus.LEAVE_PERMIT],
      ['off', ScheduleStatus.OFF],
    ] as const)('maps absence type %s → %s', async (type, expected) => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: null,
        })
        .mockResolvedValueOnce({ id: 'd1', status: expected });

      await service.setLeave('d1', type, undefined, ADMIN);

      expect(rosterRepo.save.mock.calls[0][0].status).toBe(expected);
    });
  });

  describe('replaceWorker', () => {
    it('marks the original replaced and upserts a covering row for the same day (now uses findAllByUserAndDate)', async () => {
      const original = {
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_date: '2026-06-30',
        district_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        location_id: 'area1',
      };
      rosterRepo.findOne
        .mockResolvedValueOnce(original) // findOne(id)
        .mockResolvedValueOnce({ ...original, status: ScheduleStatus.REPLACED }); // final refresh
      // findAllByUserAndDate(replacement_id, date) → no existing rows
      rosterRepo.find.mockResolvedValueOnce([]);
      userRepo.findOne.mockResolvedValue({ id: 'B', role: UserRole.SATGAS });

      await service.replaceWorker('d1', 'B', undefined, ADMIN);

      const originalSave = rosterRepo.save.mock.calls[0][0];
      expect(originalSave.status).toBe(ScheduleStatus.REPLACED);
      expect(originalSave.replacement_user_id).toBe('B');
      // No existing cover row → created fresh via create()+save() (safe: no
      // stale eager relations on a brand-new entity).
      const coverSave = rosterRepo.save.mock.calls[1][0];
      expect(coverSave.user_id).toBe('B');
      expect(coverSave.original_user_id).toBe('A');
      expect(coverSave.shift_definition_id).toBe('s1');
    });

    it('upserts an EXISTING covering row via update(), not save() (avoids the stale-eager-relation revert bug)', async () => {
      const original = {
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_date: '2026-06-30',
        district_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        location_id: 'area1',
      };
      const existingCoverRow = {
        id: 'cover1',
        user_id: 'B',
        shift_definition_id: 's1', // Matching shift for reuse
        status: ScheduleStatus.OFF,
        // Stale eager relation from findAllByUserAndDate() — must be ignored.
        shift_definition: { id: 'old-shift' },
      };
      rosterRepo.findOne
        .mockResolvedValueOnce(original) // findOne(id)
        .mockResolvedValueOnce({ ...original, status: ScheduleStatus.REPLACED }); // final refresh
      // findAllByUserAndDate(replacement_id, date) returns one existing row
      rosterRepo.find.mockResolvedValueOnce([existingCoverRow]);
      userRepo.findOne.mockResolvedValue({ id: 'B', role: UserRole.SATGAS });

      await service.replaceWorker('d1', 'B', undefined, ADMIN);

      expect(rosterRepo.update).toHaveBeenCalledWith(
        'cover1',
        expect.objectContaining({ shift_definition_id: 's1', original_user_id: 'A' }),
      );
      // The stale cover row was never passed to save() for the cover upsert.
      expect(rosterRepo.save.mock.calls.some((c) => c[0]?.id === 'cover1')).toBe(false);
    });

    it('rejects replacing a worker with themselves', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: null,
      });
      await expect(service.replaceWorker('d1', 'A', undefined, ADMIN)).rejects.toThrow();
    });

    it('rejects a replacement who is already committed (planned/leave) that day', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_date: '2026-06-30',
        district_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        location_id: null,
      });
      // findAllByUserAndDate(replacement_id, date) returns rows with BUSY status
      rosterRepo.find.mockResolvedValueOnce([
        {
          id: 'd2',
          user_id: 'B',
          status: ScheduleStatus.PLANNED, // BUSY → can't cover
        },
      ]);
      userRepo.findOne.mockResolvedValue({ id: 'B', role: UserRole.SATGAS });

      await expect(service.replaceWorker('d1', 'B', undefined, ADMIN)).rejects.toThrow(
        'already has a schedule',
      );
    });
  });

  describe('addForDay', () => {
    it('adds one row with a shift, using overlapService.findConflict to check for conflicts', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
        shift_definition_id: 's1',
      });
      shiftDefinitionRepo.findOne.mockResolvedValue({
        id: 's1',
        name: 'Shift 1',
        start_time: '06:00:00',
        end_time: '15:00:00',
      });
      overlapService.findConflict.mockResolvedValue(null); // No conflict
      rosterRepo.save.mockResolvedValue({ id: 'new', user_id: 'W' });
      rosterRepo.findOne.mockResolvedValue({ id: 'new', user_id: 'W', location_id: null }); // findOne refresh
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      await service.addForDay(
        { user_id: 'W', date: '2026-07-04', shift_definition_id: 's1' },
        ADMIN,
      );

      const saved = rosterRepo.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        user_id: 'W',
        schedule_date: '2026-07-04',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        source: 'manual',
      });
      // Verify overlapService was called
      expect(overlapService.findConflict).toHaveBeenCalledWith(
        'W',
        '2026-07-04',
        expect.objectContaining({ id: 's1' }),
      );
    });

    it('adds one row without a shift (OFF status), rejecting if the worker already has any row', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
      });
      // Shiftless add: check findAllByUserAndDate, which returns empty
      rosterRepo.find.mockResolvedValue([]);
      rosterRepo.save.mockResolvedValue({ id: 'new', user_id: 'W' });
      rosterRepo.findOne.mockResolvedValue({ id: 'new', user_id: 'W', location_id: null }); // findOne refresh
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      await service.addForDay({ user_id: 'W', date: '2026-07-04' }, ADMIN);

      const saved = rosterRepo.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        user_id: 'W',
        schedule_date: '2026-07-04',
        shift_definition_id: null,
        status: ScheduleStatus.OFF,
        source: 'manual',
      });
    });

    it('rejects shiftless add when the worker already has any schedule that day', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'W', is_active: true, role: UserRole.SATGAS });
      // findAllByUserAndDate returns one existing row
      rosterRepo.find.mockResolvedValue([
        { id: 'existing', user_id: 'W', schedule_date: '2026-07-04', status: ScheduleStatus.OFF },
      ]);

      await expect(service.addForDay({ user_id: 'W', date: '2026-07-04' }, ADMIN)).rejects.toThrow(
        'already has a schedule',
      );
      expect(rosterRepo.save).not.toHaveBeenCalled();
    });

    it('allows non-overlapping second shift to be added (ADR-047)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
      });
      shiftDefinitionRepo.findOne.mockResolvedValue({
        id: 's2',
        name: 'Shift 2',
        start_time: '15:00:00',
        end_time: '23:00:00',
      });
      // First shift exists (06:00-15:00), candidate is 15:00-23:00 (touching, not overlapping)
      overlapService.findConflict.mockResolvedValue(null);
      rosterRepo.save.mockResolvedValue({ id: 'new2', user_id: 'W' });
      rosterRepo.findOne.mockResolvedValue({ id: 'new2', user_id: 'W', location_id: null }); // findOne refresh
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      await service.addForDay(
        { user_id: 'W', date: '2026-07-04', shift_definition_id: 's2' },
        ADMIN,
      );

      expect(rosterRepo.save).toHaveBeenCalled();
      expect(overlapService.findConflict).toHaveBeenCalledWith(
        'W',
        '2026-07-04',
        expect.objectContaining({ id: 's2' }),
      );
    });

    it('allows overlapping shift (Phase 4: warn, not reject)', async () => {
      // Phase 4 (ADR-047 amended): overlaps are warned, not rejected (Google-Calendar style)
      userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
      });
      shiftDefinitionRepo.findOne.mockResolvedValue({
        id: 's3',
        name: 'Shift 3',
        start_time: '14:00:00',
        end_time: '22:00:00',
      });
      // Overlap detected but allowed (logs warning)
      overlapService.findConflict.mockResolvedValue({
        schedule_id: 'existing-s2',
        date: '2026-07-04',
        shift_name: 'Shift 2',
      });
      rosterRepo.save.mockResolvedValue({ id: 'new-overlap', user_id: 'W' });
      rosterRepo.findOne.mockResolvedValue({ id: 'new-overlap', user_id: 'W', location_id: null });
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      // Should not throw — creates the row anyway
      const result = await service.addForDay(
        { user_id: 'W', date: '2026-07-04', shift_definition_id: 's3' },
        ADMIN,
      );
      expect(result.id).toBe('new-overlap');
      expect(rosterRepo.save).toHaveBeenCalled();
    });

    it('rejects exact duplicate shift (Phase 4: same user+date+shift)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        district_id: 'r1',
      });
      shiftDefinitionRepo.findOne.mockResolvedValue({
        id: 's3',
        name: 'Shift 3',
        start_time: '14:00:00',
        end_time: '22:00:00',
      });
      // Exact duplicate already exists (same shift that day)
      rosterRepo.find.mockResolvedValue([
        { user_id: 'W', schedule_date: '2026-07-04', shift_definition_id: 's3' },
      ]);

      await expect(
        service.addForDay({ user_id: 'W', date: '2026-07-04', shift_definition_id: 's3' }, ADMIN),
      ).rejects.toThrow(/already has this exact shift/i);
      expect(rosterRepo.save).not.toHaveBeenCalled();
    });

    it('rejects a non-schedulable role (staff_kecamatan)', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'K',
        is_active: true,
        role: UserRole.STAFF_KECAMATAN,
      });

      await expect(service.addForDay({ user_id: 'K', date: '2026-07-04' }, ADMIN)).rejects.toThrow(
        'not schedulable',
      );
    });
  });

  describe('findAllByUserAndDate', () => {
    it('returns all rows for a user on a date, sorted by shift start_time', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '15:00:00', end_time: '23:00:00' };
      rosterRepo.find.mockResolvedValue([
        { id: 'd1', user_id: 'W', shift_definition: shift2 }, // Out of order in DB
        { id: 'd2', user_id: 'W', shift_definition: shift1 },
      ]);

      const result = await service.findAllByUserAndDate('W', '2026-07-04');

      expect(result).toHaveLength(2);
      // Sorted by start_time
      expect(result[0].shift_definition?.start_time).toBe('06:00:00');
      expect(result[1].shift_definition?.start_time).toBe('15:00:00');
    });

    it('returns single row as-is', async () => {
      const row = { id: 'd1', user_id: 'W', shift_definition: null };
      rosterRepo.find.mockResolvedValue([row]);

      const result = await service.findAllByUserAndDate('W', '2026-07-04');

      expect(result).toHaveLength(1);
      expect(result[0]).toBe(row);
    });

    it('returns empty array when no rows exist', async () => {
      rosterRepo.find.mockResolvedValue([]);

      const result = await service.findAllByUserAndDate('W', '2026-07-04');

      expect(result).toEqual([]);
    });
  });

  describe('findByUserAndDate', () => {
    it('returns null when no rows exist', async () => {
      rosterRepo.find.mockResolvedValue([]);

      const result = await service.findByUserAndDate('W', '2026-07-04');

      expect(result).toBeNull();
    });

    it('returns single row as-is', async () => {
      const row = { id: 'd1', user_id: 'W', shift_definition: null };
      rosterRepo.find.mockResolvedValue([row]);

      const result = await service.findByUserAndDate('W', '2026-07-04');

      expect(result).toBe(row);
    });

    /** Freeze "now" at a WIB wall-clock time (jakartaNow returns a Date whose
     * UTC fields read as WIB). */
    const freezeWibClock = (hours: number, minutes = 0) => {
      const frozen = new Date(Date.UTC(2026, 6, 4, hours, minutes, 0));
      return jest.spyOn(TimezoneUtil, 'jakartaNow').mockReturnValue(frozen);
    };

    it('picks the shift whose window covers now (WIB)', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '15:00:00', end_time: '23:00:00' };
      rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd2', shift_definition: shift2 },
      ]);
      const spy = freezeWibClock(16, 30); // 16:30 WIB → inside shift 2

      const result = await service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d2');
      spy.mockRestore();
    });

    it('covers a crosses-midnight shift after its evening start', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift3 = {
        id: 's3',
        start_time: '21:00:00',
        end_time: '05:00:00',
        crosses_midnight: true,
      };
      rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd3', shift_definition: shift3 },
      ]);
      const spy = freezeWibClock(22, 0); // 22:00 WIB → inside shift 3 tonight

      const result = await service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d3');
      spy.mockRestore();
    });

    it("at 03:00, TODAY's crosses-midnight row is not yet covering — the upcoming day shift wins", async () => {
      // The 00:00–05:00 tail belongs to YESTERDAY's shift-3 row (served when
      // querying yesterday's date); today's shift-3 row starts tonight.
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift3 = {
        id: 's3',
        start_time: '21:00:00',
        end_time: '05:00:00',
        crosses_midnight: true,
      };
      rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd3', shift_definition: shift3 },
      ]);
      const spy = freezeWibClock(3, 0);

      const result = await service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d1');
      spy.mockRestore();
    });

    it('picks the next upcoming shift when none covers now', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '16:00:00', end_time: '23:00:00' };
      rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd2', shift_definition: shift2 },
      ]);
      const spy = freezeWibClock(15, 30); // 15:30 WIB → between the shifts

      const result = await service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d2');
      spy.mockRestore();
    });

    it('falls back to the last shift of the day when all have passed', async () => {
      const shift1 = { id: 's1', start_time: '06:00:00', end_time: '15:00:00' };
      const shift2 = { id: 's2', start_time: '15:00:00', end_time: '20:00:00' };
      rosterRepo.find.mockResolvedValue([
        { id: 'd1', shift_definition: shift1 },
        { id: 'd2', shift_definition: shift2 },
      ]);
      const spy = freezeWibClock(23, 0); // 23:00 WIB → after both

      const result = await service.findByUserAndDate('W', '2026-07-04');

      expect(result?.id).toBe('d2');
      spy.mockRestore();
    });
  });

  describe('findCurrentForUser — dangling open shift fallback', () => {
    const SHIFT3 = {
      id: 'sd3',
      start_time: '21:00:00',
      end_time: '05:00:00',
      crosses_midnight: true,
    };

    /** Freeze both "now" (nowMin) and "today" (WIB date string) for the resolver. */
    const freeze = (nowUtc: Date, todayStr: string) => {
      const spyNow = jest.spyOn(TimezoneUtil, 'jakartaNow').mockReturnValue(nowUtc);
      const spyDate = jest
        .spyOn(TimezoneUtil, 'jakartaDateString')
        // With an explicit date (the shift's clock-in), compute the real WIB day;
        // with no arg, return the frozen "today".
        .mockImplementation((d?: Date) =>
          d ? new Date(d.getTime() + 7 * 60 * 60 * 1000).toISOString().split('T')[0] : todayStr,
        );
      return () => {
        spyNow.mockRestore();
        spyDate.mockRestore();
      };
    };

    it("surfaces yesterday's still-open shift after its window ends (05:42, Shift 3 not clocked out)", async () => {
      // The reported bug: a Shift 3 (21:00–05:00) clocked in Jul 24 21:39 and never
      // clocked out. At 05:42 Jul 25 the carried-tail test (now < end_time) fails,
      // and today's roster is empty — so the worker was shown "belum ada jadwal".
      const july24Row = {
        id: 'r24',
        user_id: 'W',
        schedule_date: '2026-07-24',
        shift_definition_id: 'sd3',
        shift_definition: SHIFT3,
        location: { id: 'loc1', name: 'Taman Barat' },
      };
      rosterRepo.find.mockImplementation((opts: { where: { schedule_date: string } }) =>
        Promise.resolve(opts.where.schedule_date === '2026-07-24' ? [july24Row] : []),
      );
      // Open shift: clocked in Jul 24 21:39 WIB (= 14:39 UTC), no clock_out_time.
      shiftRepo.findOne.mockResolvedValue({
        id: 'shift-open',
        user_id: 'W',
        shift_definition_id: 'sd3',
        clock_in_time: new Date(Date.UTC(2026, 6, 24, 14, 39, 0)),
        clock_out_time: null,
      });
      const restore = freeze(new Date(Date.UTC(2026, 6, 25, 5, 42, 0)), '2026-07-25');

      const result = await service.findCurrentForUser('W');

      expect(result?.id).toBe('r24');
      expect(result?.shift_definition_id).toBe('sd3');
      restore();
    });

    it('returns null when nothing is scheduled and there is no open shift', async () => {
      rosterRepo.find.mockResolvedValue([]);
      shiftRepo.findOne.mockResolvedValue(null); // no dangling shift
      const restore = freeze(new Date(Date.UTC(2026, 6, 25, 5, 42, 0)), '2026-07-25');

      const result = await service.findCurrentForUser('W');

      expect(result).toBeNull();
      restore();
    });

    it('does not shadow a genuine current-day shift with a dangling one', async () => {
      // A current-day Shift 1 is operative at 07:00; the open Shift 3 fallback must
      // NOT run (resolved wins), so the worker sees today's shift, not yesterday's.
      const shift1 = { id: 'sd1', start_time: '06:00:00', end_time: '15:00:00' };
      const todayRow = { id: 'r25', schedule_date: '2026-07-25', shift_definition: shift1 };
      rosterRepo.find.mockImplementation((opts: { where: { schedule_date: string } }) =>
        Promise.resolve(opts.where.schedule_date === '2026-07-25' ? [todayRow] : []),
      );
      const restore = freeze(new Date(Date.UTC(2026, 6, 25, 7, 0, 0)), '2026-07-25');

      const result = await service.findCurrentForUser('W');

      expect(result?.id).toBe('r25');
      expect(shiftRepo.findOne).not.toHaveBeenCalled();
      restore();
    });
  });

  describe('updateShift', () => {
    it('clearing the shift flips a PLANNED row to OFF, via update() not save()', async () => {
      // `shift_definition` is an `eager: true` relation, so `row` below carries
      // a stale relation object — save(row) would let TypeORM reconcile the FK
      // from it and revert the clear. Must use a raw column update() instead.
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          shift_definition_id: 's1',
          shift_definition: { id: 's1', name: 'Shift 1' },
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.OFF });

      await service.updateShift('d1', null, ADMIN);

      expect(rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ shift_definition_id: null, status: ScheduleStatus.OFF }),
      );
      expect(rosterRepo.save).not.toHaveBeenCalled();
    });

    it('sets a new shift and flips an OFF row to PLANNED', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.OFF,
          shift_definition_id: null,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.PLANNED });

      await service.updateShift('d1', 's2', ADMIN);

      expect(rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ shift_definition_id: 's2', status: ScheduleStatus.PLANNED }),
      );
    });

    it('leaves a LEAVE_SICK row status untouched when the shift changes', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.LEAVE_SICK,
          shift_definition_id: 's1',
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.LEAVE_SICK });

      await service.updateShift('d1', null, ADMIN);

      expect(rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ status: ScheduleStatus.LEAVE_SICK }),
      );
    });
  });

  describe('updateAreas', () => {
    it('replaces the areas via setAreas() and updates via update(), not save()', async () => {
      // `row` holds relation objects from findOne(); entity save would reconcile
      // FK columns back from those stale objects and revert the write. Must use
      // update().
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: 'area1',
        })
        .mockResolvedValueOnce({ id: 'd1', location_id: null });

      await service.updateAreas('d1', [], ADMIN);

      expect(rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ source: 'manual' }),
      );
      expect(rosterRepo.save).not.toHaveBeenCalled();
    });

    it('inserts the new area rows when areas are added', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          location_id: null,
        })
        .mockResolvedValueOnce({ id: 'd1', location_id: 'area2' });

      await service.updateAreas('d1', ['area2'], ADMIN);

      // The place lives on the row now (ADR-053), so setting it is a column write —
      // one UPDATE carrying the place and the provenance together.
      expect(rosterRepo.update).toHaveBeenCalledWith(
        'd1',
        expect.objectContaining({ location_id: 'area2', source: 'manual' }),
      );
    });

    it('rejects more than one lokasi instead of silently keeping the first (ADR-053)', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        status: ScheduleStatus.PLANNED,
        schedule_date: '2026-06-30',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: null,
      });

      // One row = one place. Truncating to `[0]` behind a 200 lost the operator's
      // other picks silently and wrote an audit entry the row never matched.
      await expect(service.updateAreas('d1', ['area2', 'area3'], ADMIN)).rejects.toThrow(
        BadRequestException,
      );
      expect(rosterRepo.update).not.toHaveBeenCalled();
    });

    it('rejects a row scoped to a lokasi AND a kawasan at once (ADR-053)', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        status: ScheduleStatus.PLANNED,
        schedule_date: '2026-06-30',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: null,
      });

      // `schedulePlaceKey` resolves lokasi first, so the kawasan would survive as
      // unreachable state that still matched the board's region filter — the row
      // would show up under both containers.
      await expect(
        service.updateAreas('d1', ['area2'], ADMIN, undefined, 'region9'),
      ).rejects.toThrow(BadRequestException);
      expect(rosterRepo.update).not.toHaveBeenCalled();
    });
  });

  /**
   * ADR-054. Two rules carry the whole feature, and both are easy to get wrong:
   * a projected occurrence must count as scheduled, and an excused row must not
   * land in the list of people to place.
   */
  describe('findUnscheduled', () => {
    const worker = (id: string, role: UserRole, name = id) => ({
      id,
      full_name: name,
      username: id,
      role,
      district_id: 'ry1',
      is_active: true,
    });

    /** Stub the workforce query (getRawAndEntities) and the day's occurrences. */
    const setup = (workforce: unknown[], occurrences: unknown[]) => {
      const uqb: Record<string, jest.Mock> = {};
      for (const m of ['leftJoin', 'addSelect', 'where', 'andWhere', 'orderBy']) {
        uqb[m] = jest.fn(() => uqb);
      }
      uqb.getRawAndEntities = jest.fn().mockResolvedValue({
        entities: workforce,
        raw: workforce.map(() => ({ u_district_id: 'ry1', district_name: 'Rayon Pusat' })),
      });
      (userRepo as unknown as { createQueryBuilder: jest.Mock }).createQueryBuilder = jest.fn(
        () => uqb,
      );
      jest.spyOn(service, 'findByDateRange').mockResolvedValue(occurrences as never);
      return uqb;
    };

    it('counts a PROJECTED occurrence as scheduled', async () => {
      // The trap: projections are not rows, so a NOT EXISTS against `schedules`
      // would report everyone on a daily rule as unscheduled for every future
      // date — the list would be noise exactly where planning happens.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED, is_projected: true }],
      );

      const res = await service.findUnscheduled('2026-08-30');

      expect(res.unscheduled).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('separates an EXCUSED worker from a genuinely free one', async () => {
      // Someone on cuti has no assignment and cannot take one; listing them
      // beside free workers invites scheduling over approved leave.
      setup(
        [worker('u1', UserRole.SATGAS), worker('u2', UserRole.LINMAS)],
        [{ user_id: 'u2', status: ScheduleStatus.LEAVE_ANNUAL }],
      );

      const res = await service.findUnscheduled('2026-07-23');

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
      expect(res.unavailable.map((w) => w.id)).toEqual(['u2']);
      expect(res.unavailable[0].status).toBe(ScheduleStatus.LEAVE_ANNUAL);
    });

    it('treats a live assignment as outranking an excused row for the same worker', async () => {
      setup(
        [worker('u1', UserRole.SATGAS)],
        [
          { user_id: 'u1', status: ScheduleStatus.OFF },
          { user_id: 'u1', status: ScheduleStatus.PLANNED },
        ],
      );

      const res = await service.findUnscheduled('2026-07-23');

      expect(res.unscheduled).toHaveLength(0);
      expect(res.unavailable).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('treats a row on ANOTHER shift as not filling the target shift', async () => {
      // ADR-053: holding rows for other shifts is normal and says nothing about
      // availability for THIS one.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED, shift_definition_id: 'shift-2' }],
      );

      const res = await service.findUnscheduled('2026-07-23', { shiftDefinitionId: 'shift-1' });

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
    });

    it('treats a row at ANOTHER lokasi as not filling the target lokasi', async () => {
      // The filters describe the SLOT being filled. Being busy at Taman B does
      // not disqualify someone from also covering Taman A (ADR-053).
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED, location_id: 'loc-b' }],
      );

      const res = await service.findUnscheduled('2026-07-23', { locationId: 'loc-a' });

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
    });

    it('excludes a worker whose row MATCHES every target criterion', async () => {
      setup(
        [worker('u1', UserRole.SATGAS)],
        [
          {
            user_id: 'u1',
            status: ScheduleStatus.PLANNED,
            shift_definition_id: 'shift-1',
            district_id: 'ry1',
            region_id: 'kw1',
            location_id: 'loc-a',
          },
        ],
      );

      const res = await service.findUnscheduled('2026-07-23', {
        shiftDefinitionId: 'shift-1',
        districtId: 'ry1',
        regionId: 'kw1',
        locationId: 'loc-a',
      });

      expect(res.unscheduled).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('keeps a worker EXCUSED for the day out of the list whatever the target', async () => {
      // Leave does not care how the slot is described.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.LEAVE_SICK, location_id: 'loc-b' }],
      );

      const res = await service.findUnscheduled('2026-07-23', { locationId: 'loc-a' });

      expect(res.unscheduled).toHaveLength(0);
      expect(res.unavailable.map((w) => w.id)).toEqual(['u1']);
    });

    it('matches the search against a TEAM the worker is scheduled on', async () => {
      // A team lives on the schedule, not on the person, so "Penyiraman" has to
      // reach through today's occurrences to find that crew.
      setup(
        [worker('u1', UserRole.SATGAS, 'Budi'), worker('u2', UserRole.SATGAS, 'Ani')],
        [
          {
            user_id: 'u1',
            status: ScheduleStatus.PLANNED,
            shift_definition_id: 'shift-2',
            team_category: { name: 'Tim Penyiraman' },
          },
        ],
      );

      const res = await service.findUnscheduled('2026-07-23', {
        shiftDefinitionId: 'shift-1',
        q: 'penyiraman',
      });

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
      expect(res.unscheduled[0].teams).toEqual(['Tim Penyiraman']);
    });

    it('still matches the search on name and username', async () => {
      setup(
        [worker('u1', UserRole.SATGAS, 'Budi Santoso'), worker('u2', UserRole.SATGAS, 'Ani')],
        [],
      );

      const byName = await service.findUnscheduled('2026-07-23', { q: 'budi' });
      expect(byName.unscheduled.map((w) => w.id)).toEqual(['u1']);
      // `workforce` is the visible set; `matched` is what the search hit.
      expect(byName.totals.workforce).toBe(2);
      expect(byName.totals.matched).toBe(1);
    });

    it('drops a role outside the three schedulable ones instead of honouring it', async () => {
      const uqb = setup([worker('u1', UserRole.SATGAS)], []);

      // kepala_rayon is excluded outright (ADR-054 §4) — asking for it must not
      // widen the query, it must fall back to the schedulable three.
      await service.findUnscheduled('2026-07-23', { roles: [UserRole.KEPALA_RAYON] });

      expect(uqb.where).toHaveBeenCalledWith('u.role IN (:...roles)', {
        roles: [UserRole.SATGAS, UserRole.LINMAS, UserRole.KORLAP],
      });
    });

    it("narrows the WORKFORCE to the caller's own rayon (visibleDistrictId)", async () => {
      // The scope guard that silently broke: `districtId` describes the SLOT and
      // stopped narrowing people, so a kepala_rayon listed every rayon's workers.
      const uqb = setup([worker('u1', UserRole.SATGAS)], []);

      await service.findUnscheduled('2026-07-23', {
        districtId: 'ry-target',
        visibleDistrictId: 'ry-caller',
      });

      // The caller's rayon reaches the USER query...
      expect(uqb.andWhere).toHaveBeenCalledWith('u.district_id = :visibleDistrictId', {
        visibleDistrictId: 'ry-caller',
      });
      // ...and the target rayon does NOT.
      expect(uqb.andWhere).not.toHaveBeenCalledWith(
        'u.district_id = :visibleDistrictId',
        expect.objectContaining({ visibleDistrictId: 'ry-target' }),
      );
    });

    it('leaves the workforce unnarrowed for a globally-scoped caller', async () => {
      const uqb = setup([worker('u1', UserRole.SATGAS)], []);

      await service.findUnscheduled('2026-07-23', { districtId: 'ry-target' });

      expect(uqb.andWhere).not.toHaveBeenCalledWith(
        'u.district_id = :visibleDistrictId',
        expect.anything(),
      );
    });

    it('treats a BROADER assignment as already covering a narrower target', async () => {
      // A city-wide row covers every rayon. Demanding an exact column match
      // reported those workers as free for a place they were already committed
      // to, and collapsed `scheduled` to 0 for any geography-narrowed target.
      setup(
        [worker('u1', UserRole.SATGAS)],
        [{ user_id: 'u1', status: ScheduleStatus.PLANNED }], // city scope: no geography
      );

      const res = await service.findUnscheduled('2026-07-23', { districtId: 'ry1' });

      expect(res.unscheduled).toHaveLength(0);
      expect(res.totals.scheduled).toBe(1);
    });

    it('frees a REPLACED worker instead of counting them as scheduled', async () => {
      // Someone else took the shift, so they are the exact person this list is
      // for. `absent` stays busy — they hold the slot, they just did not show.
      setup(
        [worker('u1', UserRole.SATGAS), worker('u2', UserRole.SATGAS)],
        [
          { user_id: 'u1', status: ScheduleStatus.REPLACED, team_category: { name: 'Tim A' } },
          { user_id: 'u2', status: ScheduleStatus.ABSENT },
        ],
      );

      const res = await service.findUnscheduled('2026-07-23');

      expect(res.unscheduled.map((w) => w.id)).toEqual(['u1']);
      // ...and they are no longer tagged with the team they were replaced out of.
      expect(res.unscheduled[0].teams).toEqual([]);
      expect(res.totals.scheduled).toBe(1);
    });

    it('reports workforce as the VISIBLE set and matched as the searched subset', async () => {
      setup([worker('u1', UserRole.SATGAS, 'Budi'), worker('u2', UserRole.SATGAS, 'Ani')], []);

      const res = await service.findUnscheduled('2026-07-23', { q: 'budi' });

      // Reporting the search result as "workforce" made a 1-hit search read as
      // though the whole department were one person.
      expect(res.totals.workforce).toBe(2);
      expect(res.totals.matched).toBe(1);
    });

    it('reports the totals the button needs', async () => {
      setup(
        [
          worker('u1', UserRole.SATGAS),
          worker('u2', UserRole.LINMAS),
          worker('u3', UserRole.KORLAP),
        ],
        [
          { user_id: 'u2', status: ScheduleStatus.PLANNED },
          { user_id: 'u3', status: ScheduleStatus.LEAVE_SICK },
        ],
      );

      const res = await service.findUnscheduled('2026-07-23');

      expect(res.totals).toEqual({
        unscheduled: 1,
        unavailable: 1,
        scheduled: 1,
        workforce: 3,
        matched: 3,
      });
    });
  });

  describe('getActiveAreasForDay', () => {
    it("returns the day's areas", async () => {
      rosterRepo.find.mockResolvedValue([
        {
          id: 'd1',
          // ONE place per row (ADR-053) — several lokasi means several rows.
          location_id: 'area1',
          location: { id: 'area1' },
        },
      ]);
      const areas = await service.getActiveAreasForDay('A', '2026-06-30');
      expect(areas.map((a) => a.id)).toEqual(['area1']);
    });

    it('returns empty when there is no roster row', async () => {
      rosterRepo.find.mockResolvedValue([]);
      expect(await service.getActiveAreasForDay('A', '2026-06-30')).toEqual([]);
    });
  });

  describe('overrideForDay', () => {
    it('creates a PLANNED row with the shift when one is provided', async () => {
      // findAllByUserAndDate returns empty array (no existing row)
      rosterRepo.find.mockResolvedValue([]);
      rosterRepo.save.mockResolvedValue({ id: 'gen-1', location_id: null });

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a1', districtId: 'r1', shiftDefinitionId: 's1' },
        'admin',
      );

      const created = rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.PLANNED);
      expect(created.shift_definition_id).toBe('s1');
      expect(created.district_id).toBe('r1');
    });

    it('creates an OFF row (not PLANNED) when no shift is provided', async () => {
      rosterRepo.find.mockResolvedValue([]);
      rosterRepo.save.mockResolvedValue({ id: 'gen-1', location_id: null });

      await service.overrideForDay('u1', '2026-07-01', { locationId: 'a1' }, 'admin');

      const created = rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.OFF);
      expect(created.shift_definition_id).toBeNull();
    });

    it('sets the day to exactly the target area', async () => {
      rosterRepo.find.mockResolvedValue([]);
      rosterRepo.save.mockResolvedValue({ id: 'gen-1', location_id: null });

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a9', shiftDefinitionId: 's1' },
        'admin',
      );

      const written = rosterRepo.update.mock.calls
        .map((c) => c[1]?.location_id)
        .filter((v) => v !== undefined);
      expect(written).toEqual(['a9']);
    });

    it('updates an EXISTING row via update(), not save() (same stale-eager-relation pitfall)', async () => {
      const existingRow = {
        id: 'existing-1',
        status: ScheduleStatus.OFF,
        shift_definition_id: null,
        shift_definition: null,
        location_id: null,
      };
      // findAllByUserAndDate returns the existing row
      rosterRepo.find.mockResolvedValue([existingRow]);

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a1', districtId: 'r1', shiftDefinitionId: 's1' },
        'admin',
      );

      expect(rosterRepo.update).toHaveBeenCalledWith(
        'existing-1',
        expect.objectContaining({ shift_definition_id: 's1', status: ScheduleStatus.PLANNED }),
      );
      // The existing row should NOT be passed to save()
      expect(rosterRepo.save.mock.calls.some((c) => c[0]?.id === 'existing-1')).toBe(false);
    });
  });

  describe('edit hierarchy (assertCanEdit via setLeave)', () => {
    const KORLAP = { id: 'k1', role: UserRole.KORLAP } as User;
    const KEPALA = { id: 'kr1', role: UserRole.KEPALA_RAYON, district_id: 'r1' } as User;
    const TOP = { id: 't1', role: UserRole.MANAGEMENT } as User;

    /** Queue findOne(id) then the post-save refresh so an ALLOWED edit resolves. */
    function allowRow(row: Record<string, unknown>): void {
      rosterRepo.findOne
        .mockResolvedValueOnce(row)
        .mockResolvedValueOnce({ id: row.id, status: ScheduleStatus.LEAVE_SICK });
    }

    it('korlap can edit a satgas in their assigned area', async () => {
      userAreas.getPermanentLocationIds.mockResolvedValue(['area1']);
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: 'area1',
      });
      await expect(service.setLeave('d1', 'sick', undefined, KORLAP)).resolves.toBeDefined();
    });

    it('korlap CANNOT edit a satgas outside their areas', async () => {
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaX']);
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        location_id: 'area1',
      });
      await expect(service.setLeave('d1', 'sick', undefined, KORLAP)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('korlap CANNOT edit another korlap (peer)', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KORLAP },
        location_id: 'area1',
      });
      await expect(service.setLeave('d1', 'sick', undefined, KORLAP)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('kepala_rayon can edit a korlap in their district', async () => {
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KORLAP },
        district_id: 'r1',
        location_id: null,
      });
      await expect(service.setLeave('d1', 'sick', undefined, KEPALA)).resolves.toBeDefined();
    });

    it('kepala_rayon CANNOT edit a worker in a different district', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        district_id: 'r2',
        location_id: null,
      });
      await expect(service.setLeave('d1', 'sick', undefined, KEPALA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('management can edit any role (full admin_system parity) — kepala_rayon and satgas', async () => {
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KEPALA_RAYON },
        district_id: 'r1',
        location_id: null,
      });
      await expect(service.setLeave('d1', 'sick', undefined, TOP)).resolves.toBeDefined();

      allowRow({
        id: 'd2',
        user_id: 'B',
        user: { role: UserRole.SATGAS },
        district_id: 'r1',
        location_id: null,
      });
      await expect(service.setLeave('d2', 'sick', undefined, TOP)).resolves.toBeDefined();
    });
  });

  describe('generateRoster — event-based materialization', () => {
    it('returns 0 when no active events exist', async () => {
      eventRepo.find.mockResolvedValue([]);

      const created = await service.generateRoster('2026-07-01', 'admin');

      expect(created).toBe(0);
      expect(materializer.materializeEvent).not.toHaveBeenCalled();
    });

    it('materializes multiple events and sums their created counts', async () => {
      eventRepo.find.mockResolvedValue([
        { id: 'e1', is_active: true },
        { id: 'e2', is_active: true },
        { id: 'e3', is_active: true },
      ]);
      materializer.materializeEvent
        .mockResolvedValueOnce({
          created: 2,
          skipped: [{ user_id: 'u1', date: '2026-07-01', reason: 'overlap' }],
        })
        .mockResolvedValueOnce({ created: 4, skipped: [] })
        .mockResolvedValueOnce({ created: 1, skipped: [] });

      const created = await service.generateRoster('2026-07-01', 'admin');

      expect(created).toBe(7); // 2 + 4 + 1
    });
  });

  describe('getTeamMembership (Phase 5.7)', () => {
    it('returns an empty Map when userIds is empty', async () => {
      const result = await service.getTeamMembership([], '2026-07-01');
      expect(result).toEqual(new Map());
    });

    it('queries schedules with team_category_id IS NOT NULL for the given date and user IDs', async () => {
      const result = await service.getTeamMembership(['u1', 'u2'], '2026-07-01');

      // Verify the query builder was called correctly
      expect(rosterRepo.qb.leftJoinAndSelect).toHaveBeenCalledWith('ds.team_category', 'tc');
      expect(rosterRepo.qb.where).toHaveBeenCalledWith('ds.user_id IN (:...userIds)', {
        userIds: ['u1', 'u2'],
      });
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.schedule_date = :date', {
        date: '2026-07-01',
      });
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.deleted_at IS NULL');
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.team_category_id IS NOT NULL');
    });

    it('returns team_id = schedule_event_id when schedule_event_id is present (ADR-048 grouping key)', async () => {
      const scheduleRow = {
        user_id: 'u1',
        schedule_event_id: 'event-123',
        team_category_id: 'cat-456',
        team_category: { name: 'Penyiraman', marker_color: '#22C55E' },
      };
      rosterRepo.qb.getMany.mockResolvedValue([scheduleRow]);

      const result = await service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.get('u1')).toEqual({
        team_id: 'event-123',
        team_name: 'Penyiraman',
        team_color: '#22C55E',
        team_opacity: null,
        team_icon: null,
      });
    });

    it('returns team_id = team_category_id when schedule_event_id is null (fallback)', async () => {
      const scheduleRow = {
        user_id: 'u1',
        schedule_event_id: null,
        team_category_id: 'cat-456',
        team_category: { name: 'Perawatan', marker_color: '#FF6B6B' },
      };
      rosterRepo.qb.getMany.mockResolvedValue([scheduleRow]);

      const result = await service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.get('u1')).toEqual({
        team_id: 'cat-456',
        team_name: 'Perawatan',
        team_color: '#FF6B6B',
        team_opacity: null,
        team_icon: null,
      });
    });

    it('maps team_color to null when marker_color is null', async () => {
      const scheduleRow = {
        user_id: 'u1',
        schedule_event_id: 'event-123',
        team_category_id: 'cat-456',
        team_category: { name: 'Penyapuan', marker_color: null },
      };
      rosterRepo.qb.getMany.mockResolvedValue([scheduleRow]);

      const result = await service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.get('u1')).toEqual({
        team_id: 'event-123',
        team_name: 'Penyapuan',
        team_color: null,
        team_opacity: null,
        team_icon: null,
      });
    });

    it('handles multiple users and returns first match per user (created_at order)', async () => {
      const scheduleRows = [
        {
          user_id: 'u1',
          schedule_event_id: 'event-1',
          team_category_id: 'cat-1',
          team_category: { name: 'Team A', marker_color: '#22C55E' },
        },
        {
          user_id: 'u1',
          schedule_event_id: 'event-2',
          team_category_id: 'cat-2',
          team_category: { name: 'Team B', marker_color: '#FF6B6B' },
        },
        {
          user_id: 'u2',
          schedule_event_id: 'event-3',
          team_category_id: 'cat-3',
          team_category: { name: 'Team C', marker_color: '#69D2E7' },
        },
      ];
      rosterRepo.qb.getMany.mockResolvedValue(scheduleRows);

      const result = await service.getTeamMembership(['u1', 'u2'], '2026-07-01');

      // u1: first win (event-1, Team A)
      expect(result.get('u1')).toEqual({
        team_id: 'event-1',
        team_name: 'Team A',
        team_color: '#22C55E',
        team_opacity: null,
        team_icon: null,
      });
      // u2: only one (event-3, Team C)
      expect(result.get('u2')).toEqual({
        team_id: 'event-3',
        team_name: 'Team C',
        team_color: '#69D2E7',
        team_opacity: null,
        team_icon: null,
      });
      expect(result.size).toBe(2);
    });

    it('skips rows where team_category is missing', async () => {
      const scheduleRows = [
        {
          user_id: 'u1',
          schedule_event_id: 'event-1',
          team_category_id: 'cat-1',
          team_category: null, // Missing relation
        },
      ];
      rosterRepo.qb.getMany.mockResolvedValue(scheduleRows);

      const result = await service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.size).toBe(0);
    });

    it('skips rows where both schedule_event_id and team_category_id would be null', async () => {
      const scheduleRows = [
        {
          user_id: 'u1',
          schedule_event_id: null,
          team_category_id: null,
          team_category: { name: 'Team A', marker_color: '#22C55E' },
        },
      ];
      rosterRepo.qb.getMany.mockResolvedValue(scheduleRows);

      const result = await service.getTeamMembership(['u1'], '2026-07-01');

      expect(result.size).toBe(0);
    });
  });

  describe('getAttributionCandidates (ADR-055)', () => {
    const sd = (id: string, start: string, end: string, crossing = false) => ({
      id,
      start_time: start,
      end_time: end,
      crosses_midnight: crossing,
      early_window_min: 60,
      cutoff_grace_min: 60,
    });

    it('maps PLANNED/PRESENT yesterday+today rows, excludes leave/off, dedups per (day,shift)', async () => {
      rosterRepo.find
        // yesterday: a crossing Shift 3 (PLANNED) + an OFF row (excluded)
        .mockResolvedValueOnce([
          {
            schedule_date: '2026-07-24',
            status: ScheduleStatus.PLANNED,
            shift_definition: sd('sd-3', '21:00:00', '05:00:00', true),
          },
          {
            schedule_date: '2026-07-24',
            status: ScheduleStatus.OFF,
            shift_definition: sd('sd-1', '06:00:00', '15:00:00'),
          },
        ])
        // today: Shift 1 PRESENT + duplicate Shift 1 PLANNED (dedup) + a LEAVE row (excluded)
        .mockResolvedValueOnce([
          {
            schedule_date: '2026-07-25',
            status: ScheduleStatus.PRESENT,
            shift_definition: sd('sd-1', '06:00:00', '15:00:00'),
          },
          {
            schedule_date: '2026-07-25',
            status: ScheduleStatus.PLANNED,
            shift_definition: sd('sd-1', '06:00:00', '15:00:00'),
          },
          {
            schedule_date: '2026-07-25',
            status: ScheduleStatus.LEAVE_SICK,
            shift_definition: sd('sd-2', '15:00:00', '23:00:00'),
          },
        ]);

      const result = await service.getAttributionCandidates('user-1');

      expect(result.map((c) => c.shift_definition_id)).toEqual(['sd-3', 'sd-1']);
      expect(result.find((c) => c.shift_definition_id === 'sd-3')).toMatchObject({
        service_day: '2026-07-24',
        crosses_midnight: true,
        early_window_min: 60,
        cutoff_grace_min: 60,
      });
      expect(result.filter((c) => c.shift_definition_id === 'sd-1')).toHaveLength(1); // deduped
    });
  });

  describe('markPresentForClockIn (schedule-status-lifecycle)', () => {
    it('flips only the matching planned row to present', async () => {
      await service.markPresentForClockIn('u-1', '2026-07-26', 'sd-1');
      expect(rosterRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({
          user_id: 'u-1',
          schedule_date: '2026-07-26',
          shift_definition_id: 'sd-1',
          status: ScheduleStatus.PLANNED,
        }),
        { status: ScheduleStatus.PRESENT },
      );
    });
  });

  describe('sweepAbsences (schedule-status-lifecycle)', () => {
    // Shift 1, 06:00–15:00, grace 60 → window closes 16:00 WIB.
    const plannedRow = (over: Partial<Record<string, unknown>> = {}) => ({
      id: 'r-1',
      user_id: 'u-1',
      schedule_date: '2026-07-26',
      shift_definition_id: 'sd-1',
      status: ScheduleStatus.PLANNED,
      shift_definition: {
        end_time: '15:00:00',
        crosses_midnight: false,
        cutoff_grace_min: 60,
      },
      ...over,
    });

    // -----------------------------------------------------------------------
    // Lookback bound. Unbounded, the FIRST sweep on a database that has never
    // run ADR-056 rewrites the whole backlog in one transaction — on staging
    // that is tens of thousands of rows on the first cron tick after cutover.
    // -----------------------------------------------------------------------
    describe('lookback bound', () => {
      it('queries a bounded date window by default, not all of history', async () => {
        rosterRepo.find.mockResolvedValue([]);
        await service.sweepAbsences(new Date('2026-07-26T20:00:00Z'));

        const where = rosterRepo.find.mock.calls[0][0].where;
        // Between(from, to) rather than LessThanOrEqual(today).
        expect(where.schedule_date?._type).toBe('between');
      });

      it('honours an explicit lookback, in WIB days', async () => {
        // Midday WIB on the 26th (05:00Z), deliberately: `now` is a REAL instant
        // and the window is expressed in WIB calendar days, so an evening-UTC
        // value like 20:00Z is already the NEXT WIB day and would make the
        // expected dates non-obvious.
        rosterRepo.find.mockResolvedValue([]);
        await service.sweepAbsences(new Date('2026-07-26T05:00:00Z'), 3);

        const where = rosterRepo.find.mock.calls[0][0].where;
        expect(where.schedule_date?._value?.[0]).toBe('2026-07-23');
        expect(where.schedule_date?._value?.[1]).toBe('2026-07-26');
      });

      it('rolls "today" to the next WIB day for a late-UTC instant', () => {
        // 20:00Z on the 26th is 03:00 WIB on the 27th. Getting this wrong is how
        // the two time conventions used to bite.
        expect(TimezoneUtil.jakartaDateString(new Date('2026-07-26T20:00:00Z'))).toBe('2026-07-27');
      });

      it('treats lookback 0 as an explicit, unbounded backfill', async () => {
        rosterRepo.find.mockResolvedValue([]);
        await service.sweepAbsences(new Date('2026-07-26T20:00:00Z'), 0);

        const where = rosterRepo.find.mock.calls[0][0].where;
        expect(where.schedule_date?._type).toBe('lessThanOrEqual');
      });
    });

    it('marks a past no-show absent (window closed, no session)', async () => {
      rosterRepo.find.mockResolvedValue([plannedRow()]);
      shiftRepo.find.mockResolvedValue([]); // no session → never clocked in
      const now = new Date('2026-07-26T20:00:00Z'); // past 16:00 WIB close

      const res = await service.sweepAbsences(now);

      expect(res).toEqual({ absent: 1, present: 0 });
      expect(rosterRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScheduleStatus.PLANNED }),
        { status: ScheduleStatus.ABSENT },
      );
    });

    it('self-heals to present when a session exists', async () => {
      rosterRepo.find.mockResolvedValue([plannedRow()]);
      // A matching non-overtime session → they clocked in (self-heal to present).
      shiftRepo.find.mockResolvedValue([
        { user_id: 'u-1', service_day: '2026-07-26', shift_definition_id: 'sd-1' },
      ]);
      const now = new Date('2026-07-26T20:00:00Z');

      const res = await service.sweepAbsences(now);

      expect(res).toEqual({ absent: 0, present: 1 });
      expect(rosterRepo.update).toHaveBeenCalledWith(
        expect.objectContaining({ status: ScheduleStatus.PLANNED }),
        { status: ScheduleStatus.PRESENT },
      );
    });

    it('leaves a row whose window is still open untouched', async () => {
      rosterRepo.find.mockResolvedValue([plannedRow()]);
      const now = new Date('2026-07-26T09:00:00Z'); // shift still running

      const res = await service.sweepAbsences(now);

      expect(res).toEqual({ absent: 0, present: 0 });
      expect(rosterRepo.update).not.toHaveBeenCalled();
    });
  });

  describe('isShiftWindowClosed (pure)', () => {
    it('is closed only after end_time + grace (WIB)', () => {
      const args = ['2026-07-26', '15:00:00', false, 60] as const;
      expect(isShiftWindowClosed(...args, new Date('2026-07-26T15:30:00Z'))).toBe(false); // in grace
      expect(isShiftWindowClosed(...args, new Date('2026-07-26T16:30:00Z'))).toBe(true); // past grace
    });

    it('rolls a crossing shift end into the next day', () => {
      // Shift 3, 21:00–05:00 (crosses), grace 60 → closes 06:00 next day.
      const args = ['2026-07-26', '05:00:00', true, 60] as const;
      expect(isShiftWindowClosed(...args, new Date('2026-07-27T05:30:00Z'))).toBe(false); // in grace
      expect(isShiftWindowClosed(...args, new Date('2026-07-27T06:30:00Z'))).toBe(true); // past grace
    });
  });
  // ---------------------------------------------------------------------------
  // getDaySummary — the collapsed day board, as counts.
  //
  // Its numbers have to equal what `/schedules/range` would list for the same
  // day. The dangerous half is PROJECTION: past the materialization horizon a day
  // holds no rows at all, only occurrences an event will produce, so a summary
  // that counted rows alone reported "0 petugas" for a day the board could open
  // and list 1,009 people in.
  // ---------------------------------------------------------------------------
  describe('SchedulesService.getDaySummary', () => {
    it('counts projected occurrences, not just materialized rows', async () => {
      const svc = service as unknown as {
        getDaySummary: (
          d: string,
          f?: unknown,
        ) => Promise<{
          groups: Array<{ total: number; role: string; location_id: string | null }>;
          workers: { city: number; locations: Array<{ id: string; workers: number }> };
        }>;
        projectOccurrences: jest.Mock;
      };
      // No materialized rows for this day — everything is a projection.
      rosterRepo.qb.getRawMany.mockResolvedValue([]);
      svc.projectOccurrences = jest.fn().mockResolvedValue([
        {
          user_id: 'w1',
          district_id: 'ry1',
          region_id: null,
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_event_id: 'e1',
          user: { role: 'satgas' },
        },
        {
          user_id: 'w2',
          district_id: 'ry1',
          region_id: null,
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_event_id: 'e1',
          user: { role: 'satgas' },
        },
      ]);
      // The service's `locationRepo` is provided as `areaEntityRepo` here.
      areaEntityRepo.find.mockResolvedValue([{ id: 'loc1', region_id: 'kw1' }]);

      const summary = await svc.getDaySummary('2026-10-15');

      expect(summary.groups).toEqual([
        expect.objectContaining({ location_id: 'loc1', role: 'satgas', total: 2 }),
      ]);
      expect(summary.workers.city).toBe(2);
      expect(summary.workers.locations).toEqual([{ id: 'loc1', workers: 2 }]);
    });

    it("rolls a lokasi's people up into its kawasan, which the row itself never names", async () => {
      // A static row carries no `region_id` — only the lokasi knows its kawasan.
      // Getting this wrong zeroed every kawasan headcount on a projected day.
      const svc = service as unknown as {
        getDaySummary: (
          d: string,
        ) => Promise<{ workers: { regions: Array<{ id: string; workers: number }> } }>;
        projectOccurrences: jest.Mock;
      };
      rosterRepo.qb.getRawMany.mockResolvedValue([
        {
          user_id: 'w1',
          district_id: 'ry1',
          region_id: null,
          location_id: 'loc1',
          shift_definition_id: 's1',
          schedule_event_id: null,
          role: 'satgas',
        },
      ]);
      svc.projectOccurrences = jest.fn().mockResolvedValue([]);
      // The service's `locationRepo` is provided as `areaEntityRepo` here.
      areaEntityRepo.find.mockResolvedValue([{ id: 'loc1', region_id: 'kw1' }]);

      const summary = await svc.getDaySummary('2026-07-08');
      expect(summary.workers.regions).toEqual([{ id: 'kw1', workers: 1 }]);
    });
  });
});
