import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DailySchedulesService } from './daily-schedules.service';
import { DailySchedule, DailyScheduleStatus } from './entities/daily-schedule.entity';
import { DailyScheduleArea } from './entities/daily-schedule-area.entity';
import { User } from '../users/entities/user.entity';
import { UserAreasService } from '../user-areas/user-areas.service';
import { AuditLogService } from '../audit/audit.service';

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

describe('DailySchedulesService', () => {
  let service: DailySchedulesService;
  let rosterRepo: ReturnType<typeof makeRosterRepo>;
  let areaRepo: { delete: jest.Mock; create: jest.Mock; save: jest.Mock };
  let userRepo: { find: jest.Mock; findOne: jest.Mock };
  let userAreas: { getPermanentAreaIds: jest.Mock };
  let audit: { log: jest.Mock };

  beforeEach(async () => {
    rosterRepo = makeRosterRepo();
    areaRepo = {
      delete: jest.fn(),
      create: jest.fn((x) => ({ ...x })),
      save: jest.fn(async (x) => x),
    };
    userRepo = { find: jest.fn(), findOne: jest.fn() };
    userAreas = { getPermanentAreaIds: jest.fn().mockResolvedValue([]) };
    audit = { log: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DailySchedulesService,
        { provide: getRepositoryToken(DailySchedule), useValue: rosterRepo },
        { provide: getRepositoryToken(DailyScheduleArea), useValue: areaRepo },
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: UserAreasService, useValue: userAreas },
        { provide: AuditLogService, useValue: audit },
      ],
    }).compile();

    service = module.get(DailySchedulesService);
  });

  describe('generateRoster', () => {
    it('materializes a row per active user — PLANNED with a shift, OFF without', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'A', is_active: true, rayon_id: 'r1', shift_definition_id: 's1' },
        { id: 'B', is_active: true, rayon_id: null, shift_definition_id: null },
      ]);
      rosterRepo.find.mockResolvedValue([]); // none yet
      userAreas.getPermanentAreaIds.mockImplementation(async (uid: string) =>
        uid === 'A' ? ['area1'] : [],
      );

      const created = await service.generateRoster('2026-06-30', 'admin');

      expect(created).toBe(2);
      const statuses = rosterRepo.save.mock.calls.map((c) => c[0].status);
      expect(statuses).toContain(DailyScheduleStatus.PLANNED);
      expect(statuses).toContain(DailyScheduleStatus.OFF);
      // worker A's single area materialized into the join table
      expect(areaRepo.save).toHaveBeenCalled();
    });

    it('is idempotent — skips users who already have a row for the day', async () => {
      userRepo.find.mockResolvedValue([
        { id: 'A', is_active: true, shift_definition_id: 's1' },
        { id: 'B', is_active: true, shift_definition_id: 's1' },
      ]);
      rosterRepo.find.mockResolvedValue([{ id: 'x', user_id: 'A' }]); // A already rostered

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
          status: DailyScheduleStatus.PLANNED,
          schedule_date: '2026-06-30',
          user_id: 'A',
          daily_schedule_areas: [],
        })
        .mockResolvedValueOnce({ id: 'd1', status: DailyScheduleStatus.LEAVE_SICK });

      await service.setLeave('d1', 'sick', 'demam', 'admin');

      const saved = rosterRepo.save.mock.calls[0][0];
      expect(saved.status).toBe(DailyScheduleStatus.LEAVE_SICK);
      expect(saved.notes).toBe('demam');
      expect(saved.source).toBe('manual');
      expect(audit.log).toHaveBeenCalledWith(
        expect.objectContaining({ entity_type: 'daily_schedule', action: 'set_leave' }),
      );
    });
  });

  describe('replaceWorker', () => {
    it('marks the original replaced and upserts a covering row for the same day', async () => {
      const original = {
        id: 'd1',
        user_id: 'A',
        schedule_date: '2026-06-30',
        rayon_id: 'r1',
        shift_definition_id: 's1',
        status: DailyScheduleStatus.PLANNED,
        daily_schedule_areas: [{ area_id: 'area1' }],
      };
      rosterRepo.findOne
        .mockResolvedValueOnce(original) // findOne(id)
        .mockResolvedValueOnce(null) // findByUserAndDate(replacement) → no row yet
        .mockResolvedValueOnce({ ...original, status: DailyScheduleStatus.REPLACED }); // final refresh
      userRepo.findOne.mockResolvedValue({ id: 'B' });

      await service.replaceWorker('d1', 'B', undefined, 'admin');

      const originalSave = rosterRepo.save.mock.calls[0][0];
      expect(originalSave.status).toBe(DailyScheduleStatus.REPLACED);
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
        daily_schedule_areas: [],
      });
      await expect(service.replaceWorker('d1', 'A', undefined, 'admin')).rejects.toThrow();
    });

    it('rejects a replacement who is already committed (planned) that day', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          user_id: 'A',
          schedule_date: '2026-06-30',
          rayon_id: 'r1',
          shift_definition_id: 's1',
          status: DailyScheduleStatus.PLANNED,
          daily_schedule_areas: [],
        })
        .mockResolvedValueOnce({
          id: 'd2',
          user_id: 'B',
          status: DailyScheduleStatus.PLANNED,
        }); // B already planned → can't cover
      userRepo.findOne.mockResolvedValue({ id: 'B' });

      await expect(service.replaceWorker('d1', 'B', undefined, 'admin')).rejects.toThrow();
    });
  });

  describe('updateShift', () => {
    it('clearing the shift flips a PLANNED row to OFF', async () => {
      rosterRepo.findOne
        .mockResolvedValueOnce({
          id: 'd1',
          status: DailyScheduleStatus.PLANNED,
          shift_definition_id: 's1',
          schedule_date: '2026-06-30',
          user_id: 'A',
        })
        .mockResolvedValueOnce({ id: 'd1', status: DailyScheduleStatus.OFF });

      await service.updateShift('d1', null, 'admin');

      const saved = rosterRepo.save.mock.calls[0][0];
      expect(saved.shift_definition_id).toBeNull();
      expect(saved.status).toBe(DailyScheduleStatus.OFF);
    });
  });

  describe('getActiveAreasForDay', () => {
    it("returns the day's areas", async () => {
      rosterRepo.findOne.mockResolvedValue({
        id: 'd1',
        daily_schedule_areas: [{ area: { id: 'area1' } }, { area: { id: 'area2' } }],
      });
      const areas = await service.getActiveAreasForDay('A', '2026-06-30');
      expect(areas.map((a) => a.id)).toEqual(['area1', 'area2']);
    });

    it('returns empty when there is no roster row', async () => {
      rosterRepo.findOne.mockResolvedValue(null);
      expect(await service.getActiveAreasForDay('A', '2026-06-30')).toEqual([]);
    });
  });
});
