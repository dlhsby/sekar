import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ScheduleMaterializerService } from './schedule-materializer.service';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { ScheduleLocation } from '../entities/schedule-area.entity';
import { ScheduleOverlapService } from './schedule-overlap.service';
import { SystemConfigService } from '../../settings/services/system-config.service';
import { User } from '../../users/entities/user.entity';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleScope } from '../enums/schedule-scope.enum';

describe('ScheduleMaterializerService', () => {
  let service: ScheduleMaterializerService;
  let scheduleRepo: Repository<Schedule>;
  let scheduleLocationRepo: Repository<ScheduleLocation>;
  let eventRepo: Repository<ScheduleEvent>;
  let userRepo: Repository<User>;
  let overlapService: ScheduleOverlapService;
  let configService: SystemConfigService;

  const mockShiftDef = {
    id: 'shift-1',
    name: 'Shift 1',
    start_time: '06:00:00',
    end_time: '15:00:00',
    crosses_midnight: false,
    is_active: true,
  };

  const mockLocation = {
    id: 'loc-1',
    name: 'Location 1',
    rayon_id: 'rayon-1',
  };

  const mockRegion = {
    id: 'region-1',
    name: 'Region 1',
    rayon_id: 'rayon-2',
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScheduleMaterializerService,
        {
          provide: getRepositoryToken(Schedule),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ScheduleLocation),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ScheduleEvent),
          useValue: {
            find: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: ScheduleOverlapService,
          useValue: {
            findConflict: jest.fn(),
          },
        },
        {
          provide: SystemConfigService,
          useValue: {
            getNumber: jest.fn().mockReturnValue(30),
          },
        },
      ],
    }).compile();

    service = module.get<ScheduleMaterializerService>(ScheduleMaterializerService);
    scheduleRepo = module.get<Repository<Schedule>>(getRepositoryToken(Schedule));
    scheduleLocationRepo = module.get<Repository<ScheduleLocation>>(
      getRepositoryToken(ScheduleLocation),
    );
    overlapService = module.get<ScheduleOverlapService>(ScheduleOverlapService);
    configService = module.get<SystemConfigService>(SystemConfigService);
  });

  describe('materializeEvent', () => {
    it('should create a schedule row for individual event with no conflicts', async () => {
      const event: Partial<ScheduleEvent> = {
        id: 'event-1',
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
        shift_definition: mockShiftDef as any,
        shift_definition_id: mockShiftDef.id,
        user_id: 'user-1',
        is_team: false,
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        location: mockLocation as any,
        members: [],
        created_by: 'admin-1',
      };

      jest.spyOn(scheduleRepo, 'findOne').mockResolvedValueOnce(null); // No tombstone
      jest.spyOn(overlapService, 'findConflict').mockResolvedValueOnce(null); // No conflict
      jest.spyOn(scheduleRepo, 'create').mockReturnValueOnce({ id: 'sched-1' } as Schedule);
      jest.spyOn(scheduleRepo, 'save').mockResolvedValueOnce({ id: 'sched-1' } as Schedule);
      jest.spyOn(scheduleLocationRepo, 'create').mockReturnValueOnce({} as ScheduleLocation);
      jest.spyOn(scheduleLocationRepo, 'save').mockResolvedValueOnce({} as ScheduleLocation);

      const result = await service.materializeEvent(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-15',
      );

      expect(result.created).toBe(1);
      expect(result.skipped).toHaveLength(0);
      expect(scheduleRepo.save).toHaveBeenCalled();
      expect(scheduleLocationRepo.save).toHaveBeenCalled(); // Static scope adds location
    });

    it('should skip row with tombstone (existing soft-deleted row)', async () => {
      const event: Partial<ScheduleEvent> = {
        id: 'event-1',
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
        shift_definition: mockShiftDef as any,
        user_id: 'user-1',
        is_team: false,
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        location: mockLocation as any,
        members: [],
      };

      // Tombstone exists (soft-deleted row)
      jest.spyOn(scheduleRepo, 'findOne').mockResolvedValueOnce({
        id: 'sched-old',
        deleted_at: new Date(),
      } as Schedule);

      const result = await service.materializeEvent(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-15',
      );

      expect(result.created).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('tombstone');
    });

    it('should skip row with overlap conflict', async () => {
      const event: Partial<ScheduleEvent> = {
        id: 'event-1',
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
        shift_definition: mockShiftDef as any,
        user_id: 'user-1',
        is_team: false,
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        location: mockLocation as any,
        members: [],
      };

      jest.spyOn(scheduleRepo, 'findOne').mockResolvedValueOnce(null); // No tombstone
      jest.spyOn(overlapService, 'findConflict').mockResolvedValueOnce({
        schedule_id: 'conflict-sched',
        date: '2026-07-15',
        shift_name: 'Shift 2',
      }); // Conflict

      const result = await service.materializeEvent(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-15',
      );

      expect(result.created).toBe(0);
      expect(result.skipped).toHaveLength(1);
      expect(result.skipped[0].reason).toBe('overlap');
    });

    it('should materialize team event with multiple members', async () => {
      const event: Partial<ScheduleEvent> = {
        id: 'event-1',
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
        shift_definition: mockShiftDef as any,
        user_id: null,
        is_team: true,
        pic_user_id: 'pic-1',
        team_id: 'team-1',
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        location: mockLocation as any,
        members: [{ user_id: 'member-1' }, { user_id: 'member-2' }] as any,
      };

      // No tombstones or conflicts for any member
      jest.spyOn(scheduleRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(overlapService, 'findConflict').mockResolvedValue(null);
      jest.spyOn(scheduleRepo, 'create').mockReturnValue({ id: 'new-sched' } as Schedule);
      jest.spyOn(scheduleRepo, 'save').mockResolvedValue({ id: 'new-sched' } as Schedule);
      jest.spyOn(scheduleLocationRepo, 'create').mockReturnValue({} as ScheduleLocation);
      jest.spyOn(scheduleLocationRepo, 'save').mockResolvedValue({} as ScheduleLocation);

      const result = await service.materializeEvent(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-15',
      );

      // PIC + 2 members = 3 rows
      expect(result.created).toBe(3);
      expect(result.skipped).toHaveLength(0);
    });

    it('should deduplicate team members (PIC appears in members list)', async () => {
      const event: Partial<ScheduleEvent> = {
        id: 'event-1',
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
        shift_definition: mockShiftDef as any,
        user_id: null,
        is_team: true,
        pic_user_id: 'pic-1', // Also in members
        team_id: 'team-1',
        scope: ScheduleScope.STATIC,
        location_id: mockLocation.id,
        location: mockLocation as any,
        members: [{ user_id: 'pic-1' }, { user_id: 'member-2' }] as any,
      };

      jest.spyOn(scheduleRepo, 'findOne').mockResolvedValue(null);
      jest.spyOn(overlapService, 'findConflict').mockResolvedValue(null);
      jest.spyOn(scheduleRepo, 'create').mockReturnValue({ id: 'new-sched' } as Schedule);
      jest.spyOn(scheduleRepo, 'save').mockResolvedValue({ id: 'new-sched' } as Schedule);
      jest.spyOn(scheduleLocationRepo, 'create').mockReturnValue({} as ScheduleLocation);
      jest.spyOn(scheduleLocationRepo, 'save').mockResolvedValue({} as ScheduleLocation);

      const result = await service.materializeEvent(
        event as ScheduleEvent,
        '2026-07-15',
        '2026-07-15',
      );

      // PIC + 1 unique member = 2 rows (deduped)
      expect(result.created).toBe(2);
    });

    it('should set region_id for mobile scope events', async () => {
      const event: Partial<ScheduleEvent> = {
        id: 'event-1',
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
        shift_definition: mockShiftDef as any,
        user_id: 'user-1',
        is_team: false,
        scope: ScheduleScope.MOBILE,
        region_id: mockRegion.id,
        region: mockRegion as any,
        members: [],
      };

      jest.spyOn(scheduleRepo, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(overlapService, 'findConflict').mockResolvedValueOnce(null);

      const createdSchedule = {} as Schedule;
      jest.spyOn(scheduleRepo, 'create').mockReturnValueOnce(createdSchedule);
      jest.spyOn(scheduleRepo, 'save').mockResolvedValueOnce(createdSchedule);

      await service.materializeEvent(event as ScheduleEvent, '2026-07-15', '2026-07-15');

      // Verify region_id was set
      expect(scheduleRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          region_id: mockRegion.id,
        }),
      );
    });

    it('should NOT add schedule_locations for mobile scope', async () => {
      const event: Partial<ScheduleEvent> = {
        id: 'event-1',
        recurrence_type: RecurrenceType.NONE,
        start_date: '2026-07-15',
        end_date: null,
        recurrence_config: null,
        shift_definition: mockShiftDef as any,
        user_id: 'user-1',
        is_team: false,
        scope: ScheduleScope.MOBILE,
        region_id: mockRegion.id,
        region: mockRegion as any,
        members: [],
      };

      jest.spyOn(scheduleRepo, 'findOne').mockResolvedValueOnce(null);
      jest.spyOn(overlapService, 'findConflict').mockResolvedValueOnce(null);
      jest.spyOn(scheduleRepo, 'create').mockReturnValueOnce({ id: 'sched-1' } as Schedule);
      jest.spyOn(scheduleRepo, 'save').mockResolvedValueOnce({ id: 'sched-1' } as Schedule);

      await service.materializeEvent(event as ScheduleEvent, '2026-07-15', '2026-07-15');

      // scheduleLocationRepo.save should NOT be called for mobile
      expect(scheduleLocationRepo.save).not.toHaveBeenCalled();
    });
  });

  describe('horizonDays', () => {
    it('should return configured horizon days', () => {
      jest.spyOn(configService, 'getNumber').mockReturnValueOnce(45);
      const horizon = service.horizonDays();
      expect(horizon).toBe(45);
    });

    it('should default to 30 days', () => {
      jest.spyOn(configService, 'getNumber').mockReturnValueOnce(30);
      const horizon = service.horizonDays();
      expect(horizon).toBe(30);
    });
  });
});
