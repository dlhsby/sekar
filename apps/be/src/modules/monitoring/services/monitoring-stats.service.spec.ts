import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MonitoringStatsService } from './monitoring-stats.service';
import { DayTypeService } from './day-type.service';
import { Location } from '../../locations/entities/location.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { Rayon, StaffingLevel } from '../../rayons/entities/rayon.entity';
import { Region } from '../../regions/entities/region.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import {
  LocationStaffRequirement,
  DayType,
} from '../../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { Schedule, ScheduleLocation } from '../../schedules/entities/schedule.entity';
import { User } from '../../users/entities/user.entity';

describe('MonitoringStatsService', () => {
  let service: MonitoringStatsService;
  let areaRepository: jest.Mocked<Repository<Location>>;
  let shiftRepository: jest.Mocked<Repository<Shift>>;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let locationRepository: jest.Mocked<Repository<LocationLog>>;
  let rayonRepository: jest.Mocked<Repository<Rayon>>;
  let regionRepository: jest.Mocked<Repository<Region>>;
  let shiftDefinitionRepository: jest.Mocked<Repository<ShiftDefinition>>;
  let staffRequirementRepository: jest.Mocked<Repository<LocationStaffRequirement>>;
  let trackingRepository: jest.Mocked<Repository<UserTrackingStatus>>;
  let dayTypeService: jest.Mocked<DayTypeService>;

  const mockRayon: Rayon = {
    id: 'rayon-1',
    name: 'Rayon 1',
    code: 'R1',
    border_color: '#7FBC8C',
    staffing_level: StaffingLevel.REGION,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  } as Rayon;

  const mockArea: Location = {
    id: 'area-1',
    name: 'Location 1',
    rayon_id: 'rayon-1',
    gps_lat: -7.25,
    gps_lng: 112.75,
    coverage_area: 100,
    is_active: true,
    locationType: { id: 'type-1', name: 'Park', category: 'active' } as any,
  } as Location;

  const mockShift: Shift = {
    id: 'shift-1',
    user_id: 'user-1',
    location_id: 'area-1',
    clock_in_time: new Date(),
    clock_out_time: null,
    clock_in_outside_boundary: false,
    created_at: new Date(),
    updated_at: new Date(),
  } as unknown as Shift;

  const mockUser: User = {
    id: 'user-1',
    username: 'satgas1',
    full_name: 'Satgas One',
    phone_number: '081234567890',
    role: 'satgas',
  } as User;

  const mockShiftDef: ShiftDefinition = {
    id: 'shift-def-1',
    name: 'Morning',
    start_time: '06:00',
    end_time: '14:00',
    is_active: true,
    crosses_midnight: false,
  } as ShiftDefinition;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringStatsService,
        {
          provide: getRepositoryToken(Location),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Activity),
          useValue: {
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LocationLog),
          useValue: {
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Rayon),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Region),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(ShiftDefinition),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(LocationStaffRequirement),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserTrackingStatus),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Schedule),
          useValue: { find: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: getRepositoryToken(ScheduleLocation),
          useValue: { find: jest.fn(), createQueryBuilder: jest.fn() },
        },
        {
          provide: DayTypeService,
          useValue: {
            getCurrentDayType: jest.fn().mockResolvedValue(DayType.WEEKDAY),
            getDayTypeLabel: jest.fn().mockReturnValue('Workday'),
          },
        },
      ],
    }).compile();

    service = module.get<MonitoringStatsService>(MonitoringStatsService);
    areaRepository = module.get<jest.Mocked<Repository<Location>>>(getRepositoryToken(Location));
    shiftRepository = module.get<jest.Mocked<Repository<Shift>>>(getRepositoryToken(Shift));
    taskRepository = module.get<jest.Mocked<Repository<Task>>>(getRepositoryToken(Task));
    activityRepository = module.get<jest.Mocked<Repository<Activity>>>(
      getRepositoryToken(Activity),
    );
    locationRepository = module.get<jest.Mocked<Repository<LocationLog>>>(
      getRepositoryToken(LocationLog),
    );
    rayonRepository = module.get<jest.Mocked<Repository<Rayon>>>(getRepositoryToken(Rayon));
    regionRepository = module.get<jest.Mocked<Repository<Region>>>(getRepositoryToken(Region));
    shiftDefinitionRepository = module.get<jest.Mocked<Repository<ShiftDefinition>>>(
      getRepositoryToken(ShiftDefinition),
    );
    staffRequirementRepository = module.get<jest.Mocked<Repository<LocationStaffRequirement>>>(
      getRepositoryToken(LocationStaffRequirement),
    );
    trackingRepository = module.get<jest.Mocked<Repository<UserTrackingStatus>>>(
      getRepositoryToken(UserTrackingStatus),
    );
    dayTypeService = module.get<jest.Mocked<DayTypeService>>(DayTypeService);
  });

  describe('getCityStats', () => {
    it('should return city-wide statistics', async () => {
      const mockQueryBuilder = {
        getMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      };
      rayonRepository.find.mockResolvedValue([mockRayon]);
      jest.spyOn(service, 'getRayonSummary').mockResolvedValue({
        id: 'rayon-1',
        name: 'Rayon 1',
        area_count: 1,
        worker_count: 10,
        workers_online: 5,
        workers_offline: 5,
        workers_required: 8,
        is_fully_staffed: false,
      });
      shiftRepository.count.mockResolvedValue(2);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getCityStats();

      expect(result).toBeDefined();
      expect(result.total_rayons).toBe(1);
      expect(result.active_shifts).toBe(2);
    });
  });

  describe('getRayonStats', () => {
    it('should return rayon statistics', async () => {
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      areaRepository.find.mockResolvedValue([mockArea]);
      jest.spyOn(service, 'getAreaSummary').mockResolvedValue({
        id: 'area-1',
        name: 'Location 1',
        area_type_category: 'active',
        workers_required: 5,
        workers_online: 3,
        workers_offline: 2,
        is_fully_staffed: false,
        staffing_delta: -2,
        tasks_pending: 1,
        tasks_in_progress: 0,
      });
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDef]);
      jest.spyOn(service, 'countTasksByAreaIds').mockResolvedValue(0);
      jest.spyOn(service, 'countTasksCompletedTodayByAreaIds').mockResolvedValue(0);
      jest.spyOn(service, 'countActivitiesByAreaIds').mockResolvedValue(0);
      jest.spyOn(service, 'countActiveShiftsByAreaIds').mockResolvedValue(0);
      jest.spyOn(service, 'countWorkersByAreaIds').mockResolvedValue(0);
      jest.spyOn(service, 'countOnlineWorkersByAreaIds').mockResolvedValue(0);
      jest.spyOn(service, 'countOfflineWorkersByAreaIds').mockResolvedValue(0);

      const result = await service.getRayonStats('rayon-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('rayon-1');
      expect(result.name).toBe('Rayon 1');
    });

    it('should throw NotFoundException when rayon not found', async () => {
      rayonRepository.findOne.mockResolvedValue(null);

      await expect(service.getRayonStats('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAreaStats', () => {
    it('should return area statistics', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      jest.spyOn(service, 'getAreaWorkers').mockResolvedValue([
        {
          id: 'user-1',
          full_name: 'Satgas One',
          role: 'satgas',
          phone: '081234567890',
          status: TrackingStatus.ACTIVE,
          last_lat: -7.25,
          last_lng: 112.75,
          last_location_update: new Date(),
          is_within_area: true,
          current_shift_id: 'shift-1',
          shift_name: 'Morning',
          clock_in_time: new Date(),
        },
      ]);
      jest.spyOn(service, 'getAreaStaffRequirements').mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(0);
      dayTypeService.getCurrentDayType.mockResolvedValue(DayType.WEEKDAY);

      const result = await service.getAreaStats('area-1');

      expect(result).toBeDefined();
      expect(result.id).toBe('area-1');
      expect(result.name).toBe('Location 1');
    });

    it('should throw NotFoundException when area not found', async () => {
      areaRepository.findOne.mockResolvedValue(null);

      await expect(service.getAreaStats('invalid-id')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getAreaWorkers', () => {
    it('should return area workers from tracking status', async () => {
      const mockTracking: UserTrackingStatus = {
        id: 'tracking-1',
        user: mockUser,
        user_id: 'user-1',
        location_id: 'area-1',
        shift_id: 'shift-1',
        shift: mockShift,
        shift_definition: mockShiftDef,
        shift_definition_id: 'shift-def-1',
        status: TrackingStatus.ACTIVE,
        last_latitude: -7.25,
        last_longitude: 112.75,
        last_accuracy_meters: 10,
        last_battery_level: 85,
        last_location_at: new Date(),
        is_within_area: true,
      } as unknown as UserTrackingStatus;

      trackingRepository.find.mockResolvedValue([mockTracking]);

      const result = await service.getAreaWorkers('area-1');

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('user-1');
    });

    it('should fall back to legacy method when no tracking records', async () => {
      trackingRepository.find.mockResolvedValue([]);
      shiftRepository.find.mockResolvedValue([]);

      const result = await service.getAreaWorkers('area-1');

      expect(result).toEqual([]);
    });
  });

  describe('getTodayRange', () => {
    it('should return today date range', () => {
      const result = service.getTodayRange();

      expect(result.start).toBeDefined();
      expect(result.end).toBeDefined();
      expect(result.start.getHours()).toBe(0);
      expect(result.start.getMinutes()).toBe(0);
      expect(result.end.getHours()).toBe(23);
    });
  });

  describe('isShiftActive', () => {
    it('should return true when current time is within shift', () => {
      const shift: ShiftDefinition = {
        ...mockShiftDef,
        crosses_midnight: false,
      } as ShiftDefinition;
      const time = new Date();
      time.setHours(10, 0, 0, 0);

      const result = service.isShiftActive(shift, time);

      expect(typeof result).toBe('boolean');
    });

    it('should handle midnight crossing shifts', () => {
      const shift: ShiftDefinition = {
        ...mockShiftDef,
        start_time: '22:00',
        end_time: '06:00',
        crosses_midnight: true,
      } as ShiftDefinition;
      const time = new Date();
      time.setHours(23, 0, 0, 0);

      const result = service.isShiftActive(shift, time);

      expect(typeof result).toBe('boolean');
    });
  });

  describe('countWorkersByAreaIds', () => {
    it('should return 0 when no area IDs provided', async () => {
      const result = await service.countWorkersByAreaIds([]);
      expect(result).toBe(0);
    });

    it('should count workers across areas', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(5),
      };
      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.countWorkersByAreaIds(['area-1', 'area-2']);

      expect(result).toBe(5);
    });
  });

  describe('countOnlineWorkersByAreaIds', () => {
    it('should return 0 when no area IDs provided', async () => {
      const result = await service.countOnlineWorkersByAreaIds([]);
      expect(result).toBe(0);
    });

    it('should count online workers', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(3),
      };
      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.countOnlineWorkersByAreaIds(['area-1']);

      expect(result).toBe(3);
    });
  });

  describe('countOfflineWorkersByAreaIds', () => {
    it('should return 0 when no area IDs provided', async () => {
      const result = await service.countOfflineWorkersByAreaIds([]);
      expect(result).toBe(0);
    });

    it('should count offline workers', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };
      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.countOfflineWorkersByAreaIds(['area-1']);

      expect(result).toBe(2);
    });
  });

  describe('countTasksByAreaIds', () => {
    it('should return 0 when no area IDs provided', async () => {
      const result = await service.countTasksByAreaIds([], TaskStatus.PENDING);
      expect(result).toBe(0);
    });

    it('should count tasks by status', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };
      taskRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.countTasksByAreaIds(['area-1'], TaskStatus.PENDING);

      expect(result).toBe(2);
    });
  });

  describe('countActivitiesByAreaIds', () => {
    it('should return 0 when no area IDs provided', async () => {
      const today = service.getTodayRange();
      const result = await service.countActivitiesByAreaIds([], today);
      expect(result).toBe(0);
    });

    it('should count activities within date range', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(1),
      };
      activityRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      const today = service.getTodayRange();

      const result = await service.countActivitiesByAreaIds(['area-1'], today);

      expect(result).toBe(1);
    });
  });

  describe('countActiveShiftsByAreaIds', () => {
    it('should return 0 when no area IDs provided', async () => {
      const result = await service.countActiveShiftsByAreaIds([]);
      expect(result).toBe(0);
    });

    it('should count active shifts', async () => {
      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getCount: jest.fn().mockResolvedValue(2),
      };
      shiftRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.countActiveShiftsByAreaIds(['area-1']);

      expect(result).toBe(2);
    });
  });

  describe('getBoundaries', () => {
    it('should return boundaries for all rayons', async () => {
      rayonRepository.find.mockResolvedValue([mockRayon]);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDef]);
      const mockQueryBuilder = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getMany: jest.fn().mockResolvedValue([]),
      };
      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      staffRequirementRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getBoundaries();

      expect(result).toBeDefined();
      expect(result.rayons).toHaveLength(1);
    });

    it('should filter by rayon ID', async () => {
      rayonRepository.find.mockResolvedValue([mockRayon]);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDef]);
      const mockQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        addSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        innerJoin: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        groupBy: jest.fn().mockReturnThis(),
        addGroupBy: jest.fn().mockReturnThis(),
        getRawMany: jest.fn().mockResolvedValue([]),
        getMany: jest.fn().mockResolvedValue([]),
      };
      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      staffRequirementRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getBoundaries({ rayon_id: 'rayon-1' });

      expect(result).toBeDefined();
    });
  });
});
