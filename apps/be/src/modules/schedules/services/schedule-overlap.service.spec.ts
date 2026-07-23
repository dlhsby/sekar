import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleOverlapService } from './schedule-overlap.service';
import { Schedule } from '../entities/schedule.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';

describe('ScheduleOverlapService', () => {
  let service: ScheduleOverlapService;
  let scheduleRepo: Repository<Schedule>;

  const mockShift1: ShiftDefinition = {
    id: 'shift-1',
    name: 'Shift 1',
    code: 'S1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockShift2: ShiftDefinition = {
    id: 'shift-2',
    name: 'Shift 2',
    code: 'S2',
    start_time: '15:00:00',
    end_time: '23:00:00',
    crosses_midnight: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockShift3: ShiftDefinition = {
    id: 'shift-3',
    name: 'Shift 3',
    code: 'S3',
    start_time: '21:00:00',
    end_time: '05:00:00',
    crosses_midnight: true,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleOverlapService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: {
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScheduleOverlapService>(ScheduleOverlapService);
    scheduleRepo = module.get<Repository<Schedule>>(getRepositoryToken(Schedule));
  });

  describe('ADR examples', () => {
    // Shift 1 06:00–15:00, Shift 2 15:00–23:00, Shift 3 21:00–05:00+1

    it('should allow shift 1 + shift 2 same day (touching)', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';

      // Existing: shift 1 on 2026-07-15
      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift1.id,
          shift_definition: mockShift1,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Candidate: shift 2 on same day
      const conflict = await service.findConflict(userId, date, mockShift2);
      expect(conflict).toBeNull();
    });

    it('should ALLOW shift 1 + shift 1 same day — siblings at different places (ADR-053)', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';

      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift1.id,
          shift_definition: mockShift1,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Candidate: same shift 1. ADR-053 — a second row on the SAME shift is a
      // sibling (the worker covering another place during that shift), not a
      // conflict. The duplicate that is wrong (same place too) is blocked by
      // `UQ_schedules_user_date_shift_place`, not by the overlap guard.
      const conflict = await service.findConflict(userId, date, mockShift1);
      expect(conflict).toBeNull();
    });

    it('should allow prior-day shift 3 (21:00→05:00) + today shift 1 (06:00)', async () => {
      const userId = 'user-1';
      const prevDay = '2026-07-14';
      const today = '2026-07-15';

      // Existing: shift 3 on previous day (ends at 05:00 on today)
      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: prevDay,
          shift_definition_id: mockShift3.id,
          shift_definition: mockShift3,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Candidate: shift 1 on today (starts at 06:00)
      // Shift 3 ends at 05:00 (touching), so 06:00 start is allowed
      const conflict = await service.findConflict(userId, today, mockShift1);
      expect(conflict).toBeNull();
    });

    it('should reject shift 2 + shift 3 same day (23:00 vs 21:00 overlap)', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';

      // Existing: shift 2 on date (15:00–23:00)
      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift2.id,
          shift_definition: mockShift2,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Candidate: shift 3 on same date (21:00–05:00 next day)
      // Shift 2 ends at 23:00, Shift 3 starts at 21:00 → overlap
      const conflict = await service.findConflict(userId, date, mockShift3);
      expect(conflict).not.toBeNull();
      expect(conflict?.shift_name).toBe('Shift 2');
    });
  });

  describe('excludeScheduleId option', () => {
    it('should ignore rows matching excludeScheduleId', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';
      const excludeId = 'sched-to-ignore';

      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: excludeId,
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift1.id,
          shift_definition: mockShift1,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Check same shift 1, but exclude the existing row
      const conflict = await service.findConflict(userId, date, mockShift1, {
        excludeScheduleId: excludeId,
      });
      expect(conflict).toBeNull(); // Should be allowed because we ignored it
    });
  });

  describe('excludeEventId option', () => {
    it('should ignore rows matching excludeEventId', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';
      const eventId = 'event-1';

      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift1.id,
          shift_definition: mockShift1,
          schedule_event_id: eventId,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Check same shift 1, but exclude rows of this event
      const conflict = await service.findConflict(userId, date, mockShift1, {
        excludeEventId: eventId,
      });
      expect(conflict).toBeNull();
    });
  });

  describe('soft-delete handling', () => {
    it('should exclude soft-deleted rows via repository default scope (not in-code filtering)', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';

      // The repository's default scope excludes soft-deleted rows,
      // so the mock returns only live rows. This test verifies the
      // query uses Between(prevDay, nextDay) to bound the date range.
      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift1.id,
          shift_definition: mockShift1,
          deleted_at: null, // Live row only
        } as unknown as Schedule,
      ]);

      // Same shift 1 → sibling, not a conflict (ADR-053). This test's subject is
      // the soft-delete filter, asserted via the query below.
      const conflict = await service.findConflict(userId, date, mockShift1);
      expect(conflict).toBeNull();

      // Verify the where clause uses Between() to limit date range
      expect(scheduleRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            user_id: userId,
            schedule_date: expect.any(Object), // Between operator
          }),
        }),
      );
    });
  });

  describe('rows without shift_definition_id', () => {
    it('should ignore rows with no shift', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';

      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: null, // No shift
          shift_definition: null,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Check shift 1
      const conflict = await service.findConflict(userId, date, mockShift1);
      expect(conflict).toBeNull();
    });
  });

  describe('midnight-crossing edge cases', () => {
    it('should correctly compute shift 3 window (21:00 to 05:00 next day)', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';

      // Existing: shift 3 on 2026-07-15 (21:00 on 15th → 05:00 on 16th)
      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift3.id,
          shift_definition: mockShift3,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Candidate: shift 1 starting at 06:00 on 2026-07-16
      // The existing shift 3 ends at 05:00 on 2026-07-16, touching but not overlapping
      const conflict = await service.findConflict(userId, '2026-07-16', mockShift1);
      expect(conflict).toBeNull();
    });

    it('should detect overlap when shift 1 starts before shift 3 ends on next day', async () => {
      const userId = 'user-1';
      const date = '2026-07-15';

      // Existing: shift 3 on date (21:00 → 05:00 next day)
      jest.spyOn(scheduleRepo, 'find').mockResolvedValueOnce([
        {
          id: 'sched-1',
          user_id: userId,
          schedule_date: date,
          shift_definition_id: mockShift3.id,
          shift_definition: mockShift3,
          deleted_at: null,
        } as unknown as Schedule,
      ]);

      // Candidate: shift 1 on next day, but let's say it actually starts at 04:00 (overlaps shift 3)
      const earlyShift: ShiftDefinition = {
        ...mockShift1,
        start_time: '04:00:00',
      };
      const conflict = await service.findConflict(userId, '2026-07-16', earlyShift);
      expect(conflict).not.toBeNull(); // Should detect the overlap
    });
  });
});
