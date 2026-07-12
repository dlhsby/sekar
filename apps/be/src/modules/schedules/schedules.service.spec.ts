import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ScheduleLocation } from './entities/schedule-location.entity';
import { Location } from '../locations/entities/location.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserLocationsService } from '../user-locations/user-locations.service';
import { AuditLogService } from '../audit/audit.service';

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
    find: jest.fn(),
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
  let areaRepo: { delete: jest.Mock; create: jest.Mock; save: jest.Mock };
  let areaEntityRepo: { find: jest.Mock };
  let userRepo: { find: jest.Mock; findOne: jest.Mock };
  let userAreas: { getPermanentLocationIdsForUsers: jest.Mock; getPermanentLocationIds: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    rosterRepo = makeRosterRepo();
    areaRepo = {
      delete: jest.fn(),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => x),
    };
    areaEntityRepo = { find: jest.fn().mockResolvedValue([]) };
    userRepo = { find: jest.fn(), findOne: jest.fn() };
    userAreas = {
      getPermanentLocationIdsForUsers: jest.fn().mockResolvedValue(new Map()),
      getPermanentLocationIds: jest.fn().mockResolvedValue([]),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: getRepositoryToken(Schedule), useValue: rosterRepo },
        { provide: getRepositoryToken(ScheduleLocation), useValue: areaRepo },
        { provide: getRepositoryToken(Location), useValue: areaEntityRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: UserLocationsService, useValue: userAreas },
        { provide: AuditLogService, useValue: audit },
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

    it('scopes to a rayon when one is given', async () => {
      await service.findByDate('2026-06-30', 'r1');
      expect(rosterRepo.qb.andWhere).toHaveBeenCalledWith('ds.rayon_id = :rayonId', {
        rayonId: 'r1',
      });
    });
  });

  describe('generateRoster', () => {
    it('materializes a row per active user — PLANNED with a shift, OFF without', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'A', is_active: true, rayon_id: 'r1', shift_definition_id: 's1' },
        { id: 'B', is_active: true, rayon_id: null, shift_definition_id: null },
      ]);
      rosterRepo.find.mockResolvedValue([]); // none yet
      userAreas.getPermanentLocationIdsForUsers.mockResolvedValue(
        new Map([
          ['A', ['area1']],
          ['B', []],
        ]),
      );

      const created = await service.generateRoster('2026-06-30', 'admin');

      expect(created).toBe(2);
      const statuses = rosterRepo.save.mock.calls.map((c) => c[0].status);
      expect(statuses).toContain(ScheduleStatus.PLANNED);
      expect(statuses).toContain(ScheduleStatus.OFF);
      // worker A's single area materialized into the join table
      expect(areaRepo.save).toHaveBeenCalled();
    });

    it('is idempotent — skips users who already have a row for the day', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'A', is_active: true, shift_definition_id: 's1' },
        { id: 'B', is_active: true, shift_definition_id: 's1' },
      ]);
      rosterRepo.find.mockResolvedValue([{ id: 'x', user_id: 'A' }]); // A already rostered
      userAreas.getPermanentLocationIdsForUsers.mockResolvedValue(new Map([['B', []]])); // only B

      const created = await service.generateRoster('2026-06-30', 'admin');

      expect(created).toBe(1);
      expect(rosterRepo.save.mock.calls.every((c) => c[0].user_id !== 'A')).toBe(true);
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
          schedule_locations: [],
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
          schedule_locations: [],
        })
        .mockResolvedValueOnce({ id: 'd1', status: expected });

      await service.setLeave('d1', type, undefined, ADMIN);

      expect(rosterRepo.save.mock.calls[0][0].status).toBe(expected);
    });
  });

  describe('replaceWorker', () => {
    it('marks the original replaced and upserts a covering row for the same day', async () => {
      const original = {
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_date: '2026-06-30',
        rayon_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        schedule_locations: [{ location_id: 'area1' }],
      };
      rosterRepo.findOne
        .mockResolvedValueOnce(original) // findOne(id)
        .mockResolvedValueOnce(null) // findByUserAndDate(replacement) → no row yet
        .mockResolvedValueOnce({ ...original, status: ScheduleStatus.REPLACED }); // final refresh
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
        rayon_id: 'r1',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        schedule_locations: [{ location_id: 'area1' }],
      };
      const existingCoverRow = {
        id: 'cover1',
        user_id: 'B',
        status: ScheduleStatus.OFF,
        // Stale eager relation from findByUserAndDate() — must be ignored.
        shift_definition: { id: 'old-shift' },
      };
      rosterRepo.findOne
        .mockResolvedValueOnce(original) // findOne(id)
        .mockResolvedValueOnce(existingCoverRow) // findByUserAndDate(replacement)
        .mockResolvedValueOnce({ ...original, status: ScheduleStatus.REPLACED }); // final refresh
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
        schedule_locations: [],
      });
      await expect(service.replaceWorker('d1', 'A', undefined, ADMIN)).rejects.toThrow();
    });

    it('rejects a replacement who is already committed (planned) that day', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          schedule_date: '2026-06-30',
          rayon_id: 'r1',
          shift_definition_id: 's1',
          status: ScheduleStatus.PLANNED,
          schedule_locations: [],
        })
        .mockResolvedValueOnce({
          id: 'd2',
          user_id: 'B',
          status: ScheduleStatus.PLANNED,
        }); // B already planned → can't cover
      userRepo.findOne.mockResolvedValue({ id: 'B', role: UserRole.SATGAS });

      await expect(service.replaceWorker('d1', 'B', undefined, ADMIN)).rejects.toThrow();
    });
  });

  describe('addForDay', () => {
    it('adds one row, defaulting shift + areas to the worker template', async () => {
      userRepo.findOne.mockResolvedValue({
        id: 'W',
        is_active: true,
        role: UserRole.SATGAS,
        rayon_id: 'r1',
        shift_definition_id: 's1',
      });
      rosterRepo.findOne
        .mockResolvedValueOnce(null) // findByUserAndDate → no existing row
        .mockResolvedValueOnce({ id: 'new', user_id: 'W' }); // final findOne
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaP']);

      await service.addForDay({ user_id: 'W', date: '2026-07-04' }, ADMIN);

      const saved = rosterRepo.save.mock.calls[0][0];
      expect(saved).toMatchObject({
        user_id: 'W',
        schedule_date: '2026-07-04',
        shift_definition_id: 's1',
        status: ScheduleStatus.PLANNED,
        source: 'manual',
      });
      // Default areas (worker's permanent areas) are applied.
      expect(areaRepo.save).toHaveBeenCalled();
    });

    it('rejects when the worker already has a schedule that day (one per day)', async () => {
      userRepo.findOne.mockResolvedValue({ id: 'W', is_active: true, role: UserRole.SATGAS });
      rosterRepo.findOne.mockResolvedValueOnce({ id: 'existing', user_id: 'W' });

      await expect(service.addForDay({ user_id: 'W', date: '2026-07-04' }, ADMIN)).rejects.toThrow(
        'already has a schedule',
      );
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
      // `schedule_locations` has `cascade: true`, so `row.schedule_locations` (loaded by
      // findOne()) is a stale array once setAreas() has raw-deleted the old
      // rows — save(row) would cascade-reinsert them. Must use update().
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
          schedule_locations: [{ location_id: 'area1' }],
        })
        .mockResolvedValueOnce({ id: 'd1', schedule_locations: [] });

      await service.updateAreas('d1', [], ADMIN);

      expect(areaRepo.delete).toHaveBeenCalledWith({ schedule_id: 'd1' });
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
          schedule_locations: [],
        })
        .mockResolvedValueOnce({ id: 'd1', schedule_locations: [{ location_id: 'area2' }] });

      await service.updateAreas('d1', ['area2'], ADMIN);

      expect(areaRepo.save).toHaveBeenCalled();
      const inserted = areaRepo.save.mock.calls[0][0];
      expect(inserted).toEqual([
        expect.objectContaining({ schedule_id: 'd1', location_id: 'area2' }),
      ]);
    });
  });

  describe('getActiveAreasForDay', () => {
    it("returns the day's areas", async () => {
      rosterRepo.findOne.mockResolvedValue({
        id: 'd1',
        schedule_locations: [{ area: { id: 'area1' } }, { area: { id: 'area2' } }],
      });
      const areas = await service.getActiveAreasForDay('A', '2026-06-30');
      expect(areas.map((a) => a.id)).toEqual(['area1', 'area2']);
    });

    it('returns empty when there is no roster row', async () => {
      rosterRepo.findOne.mockResolvedValue(null);
      expect(await service.getActiveAreasForDay('A', '2026-06-30')).toEqual([]);
    });
  });

  describe('overrideForDay', () => {
    it('creates a PLANNED row with the shift when one is provided', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce(null) // findByUserAndDate → no existing row
        .mockResolvedValue({ id: 'gen-1', schedule_locations: [] }); // subsequent this.findOne()

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a1', rayonId: 'r1', shiftDefinitionId: 's1' },
        'admin',
      );

      const created = rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.PLANNED);
      expect(created.shift_definition_id).toBe('s1');
      expect(created.rayon_id).toBe('r1');
    });

    it('creates an OFF row (not PLANNED) when no shift is provided', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'gen-1', schedule_locations: [] });

      await service.overrideForDay('u1', '2026-07-01', { locationId: 'a1' }, 'admin');

      const created = rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.OFF);
      expect(created.shift_definition_id).toBeNull();
    });

    it('sets the day to exactly the target area', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'gen-1', schedule_locations: [] });

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a9', shiftDefinitionId: 's1' },
        'admin',
      );

      const createdAreaIds = areaRepo.create.mock.calls.map((c) => c[0].location_id);
      expect(createdAreaIds).toEqual(['a9']);
    });

    it('updates an EXISTING row via update(), not save() (same stale-eager-relation pitfall)', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'existing-1',
          status: ScheduleStatus.OFF,
          shift_definition_id: null,
          // Stale eager relation — would win over a manual FK set on save().
          shift_definition: null,
          schedule_locations: [],
        })
        .mockResolvedValue({ id: 'existing-1', schedule_locations: [] });

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { locationId: 'a1', rayonId: 'r1', shiftDefinitionId: 's1' },
        'admin',
      );

      expect(rosterRepo.update).toHaveBeenCalledWith(
        'existing-1',
        expect.objectContaining({ shift_definition_id: 's1', status: ScheduleStatus.PLANNED }),
      );
      expect(rosterRepo.save.mock.calls.some((c) => c[0]?.id === 'existing-1')).toBe(false);
    });
  });

  describe('edit hierarchy (assertCanEdit via setLeave)', () => {
    const KORLAP = { id: 'k1', role: UserRole.KORLAP } as User;
    const KEPALA = { id: 'kr1', role: UserRole.KEPALA_RAYON, rayon_id: 'r1' } as User;
    const TOP = { id: 't1', role: UserRole.TOP_MANAGEMENT } as User;

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
        schedule_locations: [{ location_id: 'area1' }],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KORLAP)).resolves.toBeDefined();
    });

    it('korlap CANNOT edit a satgas outside their areas', async () => {
      userAreas.getPermanentLocationIds.mockResolvedValue(['areaX']);
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_locations: [{ location_id: 'area1' }],
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
        schedule_locations: [{ location_id: 'area1' }],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KORLAP)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('kepala_rayon can edit a korlap in their rayon', async () => {
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KORLAP },
        rayon_id: 'r1',
        schedule_locations: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KEPALA)).resolves.toBeDefined();
    });

    it('kepala_rayon CANNOT edit a worker in a different rayon', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        rayon_id: 'r2',
        schedule_locations: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KEPALA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('top_management can edit any role (full admin_system parity) — kepala_rayon and satgas', async () => {
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KEPALA_RAYON },
        rayon_id: 'r1',
        schedule_locations: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, TOP)).resolves.toBeDefined();

      allowRow({
        id: 'd2',
        user_id: 'B',
        user: { role: UserRole.SATGAS },
        rayon_id: 'r1',
        schedule_locations: [],
      });
      await expect(service.setLeave('d2', 'sick', undefined, TOP)).resolves.toBeDefined();
    });
  });

  describe('generateRoster — manager whole-rayon + top-tier skip', () => {
    it('assigns kepala_rayon the whole rayon, field workers their areas, and skips top_management', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'kr', role: UserRole.KEPALA_RAYON, rayon_id: 'r1' },
        { id: 'sat', role: UserRole.SATGAS, rayon_id: null, shift_definition_id: 's1' },
        { id: 'tm', role: UserRole.TOP_MANAGEMENT },
      ]);
      rosterRepo.find.mockResolvedValue([]); // nothing rostered yet
      userAreas.getPermanentLocationIdsForUsers.mockResolvedValue(new Map([['sat', ['areaS']]]));
      areaEntityRepo.find.mockResolvedValue([
        { id: 'a1', rayon_id: 'r1' },
        { id: 'a2', rayon_id: 'r1' },
      ]);

      const created = await service.generateRoster('2026-07-01', 'admin');

      // kr + sat rostered; top_management skipped.
      expect(created).toBe(2);
      const rosteredUserIds = rosterRepo.save.mock.calls.map((c) => c[0].user_id);
      expect(rosteredUserIds).toEqual(expect.arrayContaining(['kr', 'sat']));
      expect(rosteredUserIds).not.toContain('tm');

      // The kepala_rayon's row is assigned to ALL areas of rayon r1.
      const assignedLocationIds = areaRepo.create.mock.calls.map((c) => c[0].location_id);
      expect(assignedLocationIds).toEqual(expect.arrayContaining(['a1', 'a2', 'areaS']));
    });
  });
});
