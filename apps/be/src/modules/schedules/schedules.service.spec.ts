import { TimezoneUtil } from '../../common/utils/timezone.util';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { Schedule, ScheduleStatus, ScheduleLocation } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { Location } from '../locations/entities/location.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
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
  for (const m of ['leftJoinAndSelect', 'where', 'andWhere', 'orderBy', 'addOrderBy']) {
    qb[m] = jest.fn(() => qb);
  }
  qb.getMany = jest.fn().mockResolvedValue([]);
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
        { provide: getRepositoryToken(ScheduleLocation), useValue: locationRepo },
        { provide: getRepositoryToken(ScheduleEvent), useValue: eventRepo },
        { provide: getRepositoryToken(Location), useValue: areaEntityRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(ShiftDefinition), useValue: shiftDefinitionRepo },
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
      expect(rosterRepo.qb.leftJoinAndSelect).toHaveBeenCalledWith('ds.user', 'u');
    });

    it('scopes to a district when one is given', async () => {
      await service.findByDate('2026-06-30', 'r1');
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.district_id = :districtId', {
        districtId: 'r1',
      });
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

    it('joins user, shift_definition, schedule_areas, region, and team_category relations (Phase 4)', async () => {
      await service.findByDateRange('2026-06-30', '2026-07-05');
      const joinCalls = rosterRepo.qb.leftJoinAndSelect.mock.calls;
      expect(joinCalls.some((c) => c[0] === 'ds.user')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.shift_definition')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.schedule_areas')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.region')).toBe(true);
      expect(joinCalls.some((c) => c[0] === 'ds.team_category')).toBe(true);
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
          schedule_areas: [],
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
          schedule_areas: [],
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
        schedule_areas: [{ location_id: 'area1' }],
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
        schedule_areas: [{ location_id: 'area1' }],
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
        schedule_areas: [],
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
        schedule_areas: [],
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
      rosterRepo.findOne.mockResolvedValue({ id: 'new', user_id: 'W', schedule_areas: [] }); // findOne refresh
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
      rosterRepo.findOne.mockResolvedValue({ id: 'new', user_id: 'W', schedule_areas: [] }); // findOne refresh
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
      rosterRepo.findOne.mockResolvedValue({ id: 'new2', user_id: 'W', schedule_areas: [] }); // findOne refresh
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
      rosterRepo.findOne.mockResolvedValue({ id: 'new-overlap', user_id: 'W', schedule_areas: [] });
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
      // `schedule_areas` has `cascade: true`, so `row.schedule_areas` (loaded by
      // findOne()) is a stale array once setAreas() has raw-deleted the old
      // rows — save(row) would cascade-reinsert them. Must use update().
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          schedule_areas: [{ location_id: 'area1' }],
        })
        .mockResolvedValueOnce({ id: 'd1', schedule_areas: [] });

      await service.updateAreas('d1', [], ADMIN);

      expect(locationRepo.delete).toHaveBeenCalledWith({ schedule_id: 'd1' });
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
          schedule_areas: [],
        })
        .mockResolvedValueOnce({ id: 'd1', schedule_areas: [{ location_id: 'area2' }] });

      await service.updateAreas('d1', ['area2'], ADMIN);

      expect(locationRepo.save).toHaveBeenCalled();
      const inserted = locationRepo.save.mock.calls[0][0];
      expect(inserted).toEqual([
        expect.objectContaining({ schedule_id: 'd1', location_id: 'area2' }),
      ]);
    });
  });

  describe('getActiveAreasForDay', () => {
    it("returns the day's areas", async () => {
      rosterRepo.find.mockResolvedValue([
        {
          id: 'd1',
          schedule_areas: [{ area: { id: 'area1' } }, { area: { id: 'area2' } }],
        },
      ]);
      const areas = await service.getActiveAreasForDay('A', '2026-06-30');
      expect(areas.map((a) => a.id)).toEqual(['area1', 'area2']);
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
      rosterRepo.save.mockResolvedValue({ id: 'gen-1', schedule_areas: [] });

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
      rosterRepo.save.mockResolvedValue({ id: 'gen-1', schedule_areas: [] });

      await service.overrideForDay('u1', '2026-07-01', { locationId: 'a1' }, 'admin');

      const created = rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.OFF);
      expect(created.shift_definition_id).toBeNull();
    });

    it('sets the day to exactly the target area', async () => {
      rosterRepo.find.mockResolvedValue([]);
      rosterRepo.save.mockResolvedValue({ id: 'gen-1', schedule_areas: [] });

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a9', shiftDefinitionId: 's1' },
        'admin',
      );

      const createdAreaIds = locationRepo.create.mock.calls.map((c) => c[0].location_id);
      expect(createdAreaIds).toEqual(['a9']);
    });

    it('updates an EXISTING row via update(), not save() (same stale-eager-relation pitfall)', async () => {
      const existingRow = {
        id: 'existing-1',
        status: ScheduleStatus.OFF,
        shift_definition_id: null,
        shift_definition: null,
        schedule_areas: [],
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
        schedule_areas: [{ location_id: 'area1' }],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KORLAP)).resolves.toBeDefined();
    });

    it('korlap CANNOT edit a satgas outside their areas', async () => {
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaX']);
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_areas: [{ location_id: 'area1' }],
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
        schedule_areas: [{ location_id: 'area1' }],
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
        schedule_areas: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KEPALA)).resolves.toBeDefined();
    });

    it('kepala_rayon CANNOT edit a worker in a different district', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        district_id: 'r2',
        schedule_areas: [],
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
        schedule_areas: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, TOP)).resolves.toBeDefined();

      allowRow({
        id: 'd2',
        user_id: 'B',
        user: { role: UserRole.SATGAS },
        district_id: 'r1',
        schedule_areas: [],
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
        team_icon: null,
      });
      // u2: only one (event-3, Team C)
      expect(result.get('u2')).toEqual({
        team_id: 'event-3',
        team_name: 'Team C',
        team_color: '#69D2E7',
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
});
