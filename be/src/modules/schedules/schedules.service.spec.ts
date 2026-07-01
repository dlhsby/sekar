import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { ForbiddenException } from '@nestjs/common';
import { SchedulesService } from './schedules.service';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ScheduleArea } from './entities/schedule-area.entity';
import { Area } from '../areas/entities/area.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UserAreasService } from '../user-areas/user-areas.service';
import { AuditLogService } from '../audit/audit.service';

/** A global editor (superadmin) — passes the edit hierarchy for any target. */
const ADMIN = { id: 'admin', role: UserRole.SUPERADMIN } as User;

/** Minimal in-memory-ish repo mock with the methods the service uses. */
function makeRosterRepo() {
  let counter = 0;
  return {
    find: jest.fn(),
    findOne: jest.fn(),
    create: jest.fn((x) => ({ ...x })),
    save: jest.fn(async (x) => ({ id: x.id ?? `gen-${++counter}`, ...x })),
    softDelete: jest.fn(),
  };
}

describe('SchedulesService', () => {
  let service: SchedulesService;
  let rosterRepo: ReturnType<typeof makeRosterRepo>;
  let areaRepo: { delete: jest.Mock; create: jest.Mock; save: jest.Mock };
  let areaEntityRepo: { find: jest.Mock };
  let userRepo: { find: jest.Mock; findOne: jest.Mock };
  let userAreas: { getPermanentAreaIdsForUsers: jest.Mock; getPermanentAreaIds: jest.Mock };
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
      getPermanentAreaIdsForUsers: jest.fn().mockResolvedValue(new Map()),
      getPermanentAreaIds: jest.fn().mockResolvedValue([]),
    };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SchedulesService,
        { provide: getRepositoryToken(Schedule), useValue: rosterRepo },
        { provide: getRepositoryToken(ScheduleArea), useValue: areaRepo },
        { provide: getRepositoryToken(Area), useValue: areaEntityRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: UserAreasService, useValue: userAreas },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get(SchedulesService);
  });

  describe('generateRoster', () => {
    it('materializes a row per active user — PLANNED with a shift, OFF without', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'A', is_active: true, rayon_id: 'r1', shift_definition_id: 's1' },
        { id: 'B', is_active: true, rayon_id: null, shift_definition_id: null },
      ]);
      rosterRepo.find.mockResolvedValue([]); // none yet
      userAreas.getPermanentAreaIdsForUsers.mockResolvedValue(
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
      userAreas.getPermanentAreaIdsForUsers.mockResolvedValue(new Map([['B', []]])); // only B

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
        schedule_areas: [{ area_id: 'area1' }],
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
      const coverSave = rosterRepo.save.mock.calls[1][0];
      expect(coverSave.user_id).toBe('B');
      expect(coverSave.original_user_id).toBe('A');
      expect(coverSave.shift_definition_id).toBe('s1');
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
          schedule_areas: [],
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

  describe('updateShift', () => {
    it('clearing the shift flips a PLANNED row to OFF', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: ScheduleStatus.PLANNED,
          shift_definition_id: 's1',
          schedule_date: '2026-06-30',
          user_id: 'A',
          user: { role: UserRole.SATGAS },
        })
        .mockResolvedValueOnce({ id: 'd1', status: ScheduleStatus.OFF });

      await service.updateShift('d1', null, ADMIN);

      const saved = rosterRepo.save.mock.calls[0][0];
      expect(saved.shift_definition_id).toBeNull();
      expect(saved.status).toBe(ScheduleStatus.OFF);
    });
  });

  describe('getActiveAreasForDay', () => {
    it("returns the day's areas", async () => {
      rosterRepo.findOne.mockResolvedValue({
        id: 'd1',
        schedule_areas: [{ area: { id: 'area1' } }, { area: { id: 'area2' } }],
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
        .mockResolvedValue({ id: 'gen-1', schedule_areas: [] }); // subsequent this.findOne()

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { areaId: 'a1', rayonId: 'r1', shiftDefinitionId: 's1' },
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
        .mockResolvedValue({ id: 'gen-1', schedule_areas: [] });

      await service.overrideForDay('u1', '2026-07-01', { areaId: 'a1' }, 'admin');

      const created = rosterRepo.save.mock.calls[0][0];
      expect(created.status).toBe(ScheduleStatus.OFF);
      expect(created.shift_definition_id).toBeNull();
    });

    it('sets the day to exactly the target area', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce(null)
        .mockResolvedValue({ id: 'gen-1', schedule_areas: [] });

      await service.overrideForDay(
        'u1',
        '2026-07-01',
        { areaId: 'a9', shiftDefinitionId: 's1' },
        'admin',
      );

      const createdAreaIds = areaRepo.create.mock.calls.map((c) => c[0].area_id);
      expect(createdAreaIds).toEqual(['a9']);
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
      userAreas.getPermanentAreaIds.mockResolvedValue(['area1']);
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_areas: [{ area_id: 'area1' }],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KORLAP)).resolves.toBeDefined();
    });

    it('korlap CANNOT edit a satgas outside their areas', async () => {
      userAreas.getPermanentAreaIds.mockResolvedValue(['areaX']);
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        schedule_areas: [{ area_id: 'area1' }],
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
        schedule_areas: [{ area_id: 'area1' }],
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
        schedule_areas: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KEPALA)).resolves.toBeDefined();
    });

    it('kepala_rayon CANNOT edit a worker in a different rayon', async () => {
      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.SATGAS },
        rayon_id: 'r2',
        schedule_areas: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, KEPALA)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('top_management can edit a kepala_rayon but NOT a satgas', async () => {
      allowRow({
        id: 'd1',
        user_id: 'A',
        user: { role: UserRole.KEPALA_RAYON },
        rayon_id: 'r1',
        schedule_areas: [],
      });
      await expect(service.setLeave('d1', 'sick', undefined, TOP)).resolves.toBeDefined();

      rosterRepo.findOne.mockResolvedValueOnce({
        id: 'd2',
        user_id: 'B',
        user: { role: UserRole.SATGAS },
        rayon_id: 'r1',
        schedule_areas: [],
      });
      await expect(service.setLeave('d2', 'sick', undefined, TOP)).rejects.toThrow(
        ForbiddenException,
      );
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
      userAreas.getPermanentAreaIdsForUsers.mockResolvedValue(new Map([['sat', ['areaS']]]));
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
      const assignedAreaIds = areaRepo.create.mock.calls.map((c) => c[0].area_id);
      expect(assignedAreaIds).toEqual(expect.arrayContaining(['a1', 'a2', 'areaS']));
    });
  });
});
