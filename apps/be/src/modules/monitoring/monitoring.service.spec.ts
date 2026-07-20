import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { MonitoringStatsService } from './services/monitoring-stats.service';
import { MonitoringUserService } from './services/monitoring-user.service';
import { StatusCalculatorService } from './services/status-calculator.service';
import { MonitoringCacheService } from './services/monitoring-cache.service';
import { DayTypeService } from './services/day-type.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Task, TaskStatus, TaskPriority } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { LocationLog } from '../location/entities/location-log.entity';
import { District, StaffingLevel } from '../districts/entities/district.entity';
import { Region } from '../regions/entities/region.entity';
import { Role } from '../rbac/entities/role.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import {
  LocationStaffRequirement,
  StaffRole,
  DayType,
} from '../location-staff-requirements/entities/location-staff-requirement.entity';
import { UserTrackingStatus, TrackingStatus } from './entities/user-tracking-status.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { ScheduleLocation } from '../schedules/entities/schedule.entity';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let userRepository: jest.Mocked<Repository<User>>;
  let areaRepository: jest.Mocked<Repository<Location>>;
  let shiftRepository: jest.Mocked<Repository<Shift>>;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let locationRepository: jest.Mocked<Repository<LocationLog>>;
  let districtRepository: jest.Mocked<Repository<District>>;
  let regionRepository: jest.Mocked<Repository<Region>>;
  let shiftDefinitionRepository: jest.Mocked<Repository<ShiftDefinition>>;
  let staffRequirementRepository: jest.Mocked<Repository<LocationStaffRequirement>>;
  let trackingRepository: jest.Mocked<Repository<UserTrackingStatus>>;

  const mockDistrict: District = {
    id: 'district-1',
    name: 'Rayon Selatan',
    description: 'Southern sector',
    staffing_level: StaffingLevel.REGION,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockArea: Location = {
    id: 'area-1',
    name: 'Taman Bungkul',
    location_type_id: 'type-1',
    locationType: {
      id: 'type-1',
      code: 'park',
      name: 'Taman',
      category: 'ACTIVE',
      description: 'Park',
      created_at: new Date(),
      updated_at: new Date(),
    },
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    address: 'Jl. Taman Bungkul',
    is_active: true,
    district_id: 'district-1',
    coverage_area: 2500,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUser: User = {
    id: 'user-1',
    username: 'worker1',
    password_hash: 'hashed',
    full_name: 'Worker One',
    phone_number: '08123456789',
    profile_picture_url: null,
    role: UserRole.SATGAS,
    is_active: true,
    password_must_change: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockShift: Shift = {
    id: 'shift-1',
    user_id: 'user-1',
    user: mockUser,
    location_id: 'area-1',
    area: mockArea,
    clock_in_time: new Date(),
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_in_photo_url: 'https://example.com/photo.jpg',
    clock_out_time: null as unknown as Date,
    clock_out_gps_lat: null as unknown as number,
    clock_out_gps_lng: null as unknown as number,
    clock_in_outside_boundary: false,
    clock_out_outside_boundary: false,
    shift_definition_id: null,
    shift_definition: null as unknown as any,
    is_overtime: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockShiftDefinition: ShiftDefinition = {
    id: 'shift-def-1',
    name: 'Shift 1',
    code: 'SHIFT1',
    start_time: '06:00',
    end_time: '15:00',
    crosses_midnight: false,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLocationLog: LocationLog = {
    id: 'loc-1',
    user_id: 'user-1',
    shift_id: 'shift-1',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    accuracy_meters: 10,
    battery_level: 85,
    logged_at: new Date(),
    user: mockUser,
    shift: mockShift,
  };

  const mockTask: Task = {
    id: 'task-1',
    title: 'Water plants',
    description: 'Water all plants',
    status: TaskStatus.PENDING,
    priority: TaskPriority.MEDIUM,
    deadline: new Date(),
    location_id: 'area-1',
    district_id: null,
    assigned_to: null,
    created_by: 'user-1',
    completion_photo_urls: null,
    completion_notes: null,
    completed_at: null,
    assigned_at: null,
    started_at: null,
    accepted_at: null,
    declined_at: null,
    decline_reason: null,
    verified_by: null,
    verified_at: null,
    revision_reason: null,
    deleted_at: null,
    area: mockArea,
    district: null as any,
    tags: [],
    assignee: null as any,
    creator: mockUser,
    verifier: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockStaffRequirement: LocationStaffRequirement = {
    id: 'req-1',
    location_id: 'area-1',
    shift_definition_id: 'shift-def-1',
    role: StaffRole.SATGAS,
    required_count: 5,
    day_type: DayType.WEEKDAY,
    area: mockArea,
    shiftDefinition: mockShiftDefinition,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const createMockQueryBuilder = (result: any = [], count: number = 0) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoinAndSelect: jest.fn().mockReturnThis(),
    innerJoin: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    addSelect: jest.fn().mockReturnThis(),
    groupBy: jest.fn().mockReturnThis(),
    addGroupBy: jest.fn().mockReturnThis(),
    subQuery: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    getQuery: jest.fn().mockReturnValue('subquery'),
    getMany: jest.fn().mockResolvedValue(result),
    getRawMany: jest.fn().mockResolvedValue([]),
    getOne: jest.fn().mockResolvedValue(result[0] || null),
    getCount: jest.fn().mockResolvedValue(count),
    getRawOne: jest.fn().mockResolvedValue({ count: count.toString(), total: count.toString() }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
        MonitoringStatsService,
        MonitoringUserService,
        {
          provide: DayTypeService,
          useValue: {
            getCurrentDayType: jest.fn().mockResolvedValue('WEEKDAY'),
            getDayTypeLabel: jest.fn().mockReturnValue('Hari Kerja'),
            loadDayType: jest.fn().mockResolvedValue('WEEKDAY'),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Location),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Activity),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(LocationLog),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(District),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Role),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
          },
        },
        {
          provide: getRepositoryToken(Region),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(ShiftDefinition),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(LocationStaffRequirement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(UserTrackingStatus),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(Schedule),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: getRepositoryToken(ScheduleLocation),
          useValue: {
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
        {
          provide: StatusCalculatorService,
          useValue: {
            calculateAxes: jest.fn().mockReturnValue({ activity: 'aktif', location: 'dalam_area' }),
          },
        },
        {
          provide: MonitoringCacheService,
          useValue: {
            getThresholds: jest.fn().mockResolvedValue({
              active_max_age_seconds: 300,
              inactive_threshold_seconds: 900,
              missing_threshold_seconds: 3600,
              location_ping_interval_seconds: 60,
              late_grace_seconds: 900,
            }),
          },
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    // Ad-hoc flagging on getLiveUsers/getSnapshot calls these; default to a
    // no-op so tests that don't care about scheduling don't need to stub them
    // (individual tests override getCurrentShiftDefinition where it matters).
    jest
      .spyOn(service['statsService'], 'scheduledUserIdsForCurrentShift')
      .mockResolvedValue(new Set<string>());
    userRepository = module.get(getRepositoryToken(User));
    areaRepository = module.get(getRepositoryToken(Location));
    shiftRepository = module.get(getRepositoryToken(Shift));
    taskRepository = module.get(getRepositoryToken(Task));
    activityRepository = module.get(getRepositoryToken(Activity));
    locationRepository = module.get(getRepositoryToken(LocationLog));
    districtRepository = module.get(getRepositoryToken(District));
    regionRepository = module.get(getRepositoryToken(Region));
    shiftDefinitionRepository = module.get(getRepositoryToken(ShiftDefinition));
    staffRequirementRepository = module.get(getRepositoryToken(LocationStaffRequirement));
    trackingRepository = module.get(getRepositoryToken(UserTrackingStatus));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCityStats', () => {
    it('should return city-wide statistics', async () => {
      districtRepository.find.mockResolvedValue([mockDistrict]);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftRepository.count.mockResolvedValue(5);
      taskRepository.count.mockResolvedValue(10);
      activityRepository.count.mockResolvedValue(15);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getCityStats();

      expect(result).toHaveProperty('total_districts');
      expect(result).toHaveProperty('total_areas');
      expect(result).toHaveProperty('total_workers');
      expect(result).toHaveProperty('workers_online');
      expect(result).toHaveProperty('workers_offline');
      expect(result).toHaveProperty('active_shifts');
      expect(result).toHaveProperty('tasks_pending');
      expect(result).toHaveProperty('tasks_in_progress');
      expect(result).toHaveProperty('tasks_completed_today');
      expect(result).toHaveProperty('activities_submitted_today');
      expect(result).toHaveProperty('districts');
      expect(result).toHaveProperty('generated_at');
      expect(result.districts).toBeInstanceOf(Array);
    });

    it('should aggregate statistics from all districts', async () => {
      const district2 = { ...mockDistrict, id: 'district-2', name: 'Rayon Utara' };
      districtRepository.find.mockResolvedValue([mockDistrict, district2]);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftRepository.count.mockResolvedValue(10);
      taskRepository.count.mockResolvedValue(5);
      activityRepository.count.mockResolvedValue(20);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getCityStats();

      expect(result.total_districts).toBe(2);
      expect(result.districts.length).toBe(2);
    });
  });

  describe('getDistrictStats', () => {
    it('should return district statistics', async () => {
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      taskRepository.count.mockResolvedValue(5);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getDistrictStats('district-1');

      expect(result).toHaveProperty('id', 'district-1');
      expect(result).toHaveProperty('name', 'Rayon Selatan');
      expect(result).toHaveProperty('total_areas');
      expect(result).toHaveProperty('total_workers');
      expect(result).toHaveProperty('workers_online');
      expect(result).toHaveProperty('workers_offline');
      expect(result).toHaveProperty('active_shifts');
      expect(result).toHaveProperty('areas');
      expect(result).toHaveProperty('shifts');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('generated_at');
    });

    it('should throw NotFoundException for non-existent district', async () => {
      districtRepository.findOne.mockResolvedValue(null);

      await expect(service.getDistrictStats('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include area summaries', async () => {
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getDistrictStats('district-1');

      expect(result.areas.length).toBe(1);
      expect(result.areas[0]).toHaveProperty('id', 'area-1');
      expect(result.areas[0]).toHaveProperty('name', 'Taman Bungkul');
    });

    it('should include shift summaries', async () => {
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getDistrictStats('district-1');

      expect(result.shifts.length).toBe(1);
      expect(result.shifts[0]).toHaveProperty('id', 'shift-def-1');
      expect(result.shifts[0]).toHaveProperty('name', 'Shift 1');
    });
  });

  describe('getAreaStats', () => {
    const mockAreaTrackingRecord = {
      user_id: 'user-1',
      user: mockUser,
      shift_id: 'shift-1',
      shift: mockShift,
      shift_definition_id: 'shift-def-1',
      shift_definition: mockShiftDefinition,
      location_id: 'area-1',
      area: mockArea,
      district_id: null,
      district: null as any,
      status: TrackingStatus.ACTIVE,
      last_latitude: -7.2905,
      last_longitude: 112.7398,
      last_accuracy_meters: 10,
      last_battery_level: 85,
      last_location_at: new Date(),
      is_within_area: true,
      updated_at: new Date(),
    };

    beforeEach(() => {
      // Mock trackingRepository.find for getAreaWorkers
      trackingRepository.find.mockResolvedValue([]);
      // Mock trackingRepository.createQueryBuilder for getAreaStaffRequirements
      trackingRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
    });

    it('should return area statistics', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(5);

      const result = await service.getAreaStats('area-1');

      expect(result).toHaveProperty('id', 'area-1');
      expect(result).toHaveProperty('name', 'Taman Bungkul');
      expect(result).toHaveProperty('area_type', 'Taman');
      expect(result).toHaveProperty('area_type_category', 'ACTIVE');
      expect(result).toHaveProperty('district_id', 'district-1');
      expect(result).toHaveProperty('district_name', 'Rayon Selatan');
      expect(result).toHaveProperty('latitude');
      expect(result).toHaveProperty('longitude');
      expect(result).toHaveProperty('coverage_area');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('staff_requirements');
      expect(result).toHaveProperty('active_tasks');
      expect(result).toHaveProperty('alerts');
      expect(result).toHaveProperty('generated_at');
    });

    it('should throw NotFoundException for non-existent area', async () => {
      areaRepository.findOne.mockResolvedValue(null);

      await expect(service.getAreaStats('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include worker status list', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      trackingRepository.find.mockResolvedValue([mockAreaTrackingRecord]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([mockStaffRequirement]);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.users.length).toBe(1);
      expect(result.users[0]).toHaveProperty('id', 'user-1');
      expect(result.users[0]).toHaveProperty('full_name', 'Worker One');
      expect(result.users[0]).toHaveProperty('status');
    });

    it('should include active tasks', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const inProgressTask = { ...mockTask, id: 'task-2', status: TaskStatus.IN_PROGRESS };
      const completedTask = { ...mockTask, id: 'task-3', status: TaskStatus.COMPLETED };

      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([pendingTask, inProgressTask, completedTask]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.active_tasks.length).toBe(2);
      expect(result.tasks_pending).toBe(1);
      expect(result.tasks_in_progress).toBe(1);
    });

    it('should generate alerts for understaffed requirements', async () => {
      // Make shift definition active by setting time to include current hour
      const now = new Date();
      const currentHour = now.getHours();
      const startHour = currentHour;
      const endHour = (currentHour + 2) % 24;

      // Properly handle midnight crossing
      const activeShiftDef = {
        ...mockShiftDefinition,
        start_time: `${String(startHour).padStart(2, '0')}:00`,
        end_time: `${String(endHour).padStart(2, '0')}:00`,
        crosses_midnight: endHour < startHour, // true if end is smaller (crossed midnight)
      };

      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      shiftRepository.find.mockResolvedValue([mockShift]);
      shiftDefinitionRepository.find.mockResolvedValue([activeShiftDef]);
      staffRequirementRepository.find.mockResolvedValue([mockStaffRequirement]); // requires 5
      shiftRepository.count.mockResolvedValue(3); // only 3 present
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.staff_requirements.length).toBe(1);
      expect(result.staff_requirements[0].is_met).toBe(false);
      expect(result.alerts.length).toBeGreaterThan(0);
    });
  });

  describe('getLiveUsers', () => {
    beforeEach(() => {
      // getLiveUsers now resolves the current shift to flag ad-hoc workers.
      jest.spyOn(service['statsService'], 'getCurrentShiftDefinition').mockResolvedValue(null);
    });

    const mockTrackingRecord = {
      user_id: 'user-1',
      user: mockUser,
      shift_id: 'shift-1',
      shift: mockShift,
      shift_definition_id: 'shift-def-1',
      shift_definition: mockShiftDefinition,
      location_id: 'area-1',
      area: mockArea,
      status: TrackingStatus.ACTIVE,
      last_latitude: -7.2905,
      last_longitude: 112.7398,
      last_accuracy_meters: 10,
      last_battery_level: 85,
      last_location_at: new Date(),
      is_within_area: true,
      updated_at: new Date(),
    };

    it('should return live user positions with status counts', async () => {
      const qb = createMockQueryBuilder([mockTrackingRecord], 1);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      districtRepository.find.mockResolvedValue([mockDistrict]);

      const result = await service.getLiveUsers();

      expect(result).toHaveProperty('total_active');
      expect(result).toHaveProperty('total_offline');
      expect(result).toHaveProperty('total_outside_area');
      expect(result).toHaveProperty('total_absent');
      expect(result).toHaveProperty('total_offline');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('generated_at');
      expect(result.total_active).toBe(1);
    });

    it('should filter by location_id', async () => {
      const qb = createMockQueryBuilder([], 0);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);

      await service.getLiveUsers({ location_id: 'area-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('uts.location_id = :locationId', {
        locationId: 'area-1',
      });
    });

    it('should filter by district_id', async () => {
      const qb = createMockQueryBuilder([], 0);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);

      await service.getLiveUsers({ district_id: 'district-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('area.district_id = :districtId', {
        districtId: 'district-1',
      });
    });

    it('should filter by role', async () => {
      const qb = createMockQueryBuilder([], 0);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);

      await service.getLiveUsers({ role: UserRole.SATGAS });

      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', { role: UserRole.SATGAS });
    });

    it('should filter by tracking status', async () => {
      const qb = createMockQueryBuilder([], 0);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);

      await service.getLiveUsers({ status: TrackingStatus.ACTIVE });

      expect(qb.andWhere).toHaveBeenCalledWith('uts.status = :status', {
        status: TrackingStatus.ACTIVE,
      });
    });

    it('should return empty list when no tracking records', async () => {
      const qb = createMockQueryBuilder([], 0);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);

      const result = await service.getLiveUsers();

      expect(result.users).toEqual([]);
      expect(result.total_active).toBe(0);
      expect(result.total_offline).toBe(0);
    });

    it('should include shift name from shift definition', async () => {
      const qb = createMockQueryBuilder([mockTrackingRecord], 1);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      districtRepository.find.mockResolvedValue([mockDistrict]);

      const result = await service.getLiveUsers();

      expect(result.users[0].shift_name).toBe('Shift 1');
    });

    it('should include is_within_area from tracking status', async () => {
      const outsideRecord = {
        ...mockTrackingRecord,
        is_within_area: false,
        status: TrackingStatus.ACTIVE,
      };
      const qb = createMockQueryBuilder([outsideRecord], 1);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      districtRepository.find.mockResolvedValue([mockDistrict]);

      const result = await service.getLiveUsers();

      expect(result.users[0].is_within_area).toBe(false);
      expect(result.users[0].status).toBe(TrackingStatus.ACTIVE);
      // The axis is counted ALONGSIDE the status, not instead of it: outside_area
      // stopped being a status value, so reading it off the status column (as
      // countByStatus used to) left this permanently 0 — invisible to tsc and to
      // any test that only asserted the three statuses.
      expect(result.total_outside_area).toBe(1);
      expect(result.total_active).toBe(1);
    });

    it('should include phone number', async () => {
      const userWithPhone = { ...mockUser, phone_number: '08123456789' };
      const recordWithPhone = { ...mockTrackingRecord, user: userWithPhone };
      const qb = createMockQueryBuilder([recordWithPhone], 1);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      areaRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      taskRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      districtRepository.find.mockResolvedValue([mockDistrict]);

      const result = await service.getLiveUsers();

      expect(result.users[0].phone).toBe('08123456789');
    });
  });

  describe('helper methods - edge cases', () => {
    it('should handle empty area IDs in countWorkersByAreaIds', async () => {
      const qb = createMockQueryBuilder([], 0);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);

      // This is a private method, so we test it indirectly through getDistrictStats
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      areaRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      await service.getDistrictStats('district-1');

      // Empty area IDs should not cause errors - trackingRepository not called for empty arrays
      expect(trackingRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should handle area without district_id in getAreaStats', async () => {
      const areaWithoutDistrict = { ...mockArea, district_id: undefined };
      areaRepository.findOne.mockResolvedValue(areaWithoutDistrict);
      trackingRepository.find.mockResolvedValue([]);
      trackingRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.district_name).toBe('Unassigned');
      expect(result.district_id).toBe('');
    });

    it('should handle no current shift definition in getAreaStaffRequirements', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      trackingRepository.find.mockResolvedValue([]);
      trackingRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([]); // No active shifts
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.staff_requirements).toEqual([]);
    });

    it('should handle shift crossing midnight', async () => {
      const midnightShift = {
        ...mockShiftDefinition,
        start_time: '22:00',
        end_time: '06:00',
        crosses_midnight: true,
      };

      districtRepository.findOne.mockResolvedValue(mockDistrict);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([midnightShift]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getDistrictStats('district-1');

      expect(result.shifts.length).toBe(1);
    });

    it('should handle tasks with ASSIGNED status in active tasks filter', async () => {
      const assignedTask = { ...mockTask, status: TaskStatus.ASSIGNED };
      const inProgressTask = { ...mockTask, id: 'task-2', status: TaskStatus.IN_PROGRESS };

      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      trackingRepository.find.mockResolvedValue([]);
      trackingRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([assignedTask, inProgressTask]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.active_tasks.length).toBe(2);
      // Only IN_PROGRESS tasks are counted in tasks_in_progress
      expect(result.tasks_in_progress).toBe(1);
    });

    it('should handle single ASSIGNED task in active tasks filter', async () => {
      const assignedTask = { ...mockTask, status: TaskStatus.ASSIGNED };

      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      trackingRepository.find.mockResolvedValue([]);
      trackingRepository.createQueryBuilder = jest.fn(() => createMockQueryBuilder([]) as any);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([assignedTask]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.active_tasks.length).toBe(1);
    });

    it('should handle empty locationIds in count methods', async () => {
      districtRepository.find.mockResolvedValue([mockDistrict]);
      areaRepository.find.mockResolvedValue([]); // No areas
      shiftRepository.count.mockResolvedValue(0);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.count.mockResolvedValue(0);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const result = await service.getCityStats();

      expect(result.total_areas).toBe(0);
      expect(result.total_workers).toBe(0);
    });

    it('should calculate required workers correctly when current shift exists', async () => {
      const now = new Date();
      const currentHour = now.getHours();

      // Make the shift active right now
      const activeShiftDef = {
        ...mockShiftDefinition,
        start_time: `${String(currentHour).padStart(2, '0')}:00`,
        end_time: `${String((currentHour + 1) % 24).padStart(2, '0')}:00`,
        crosses_midnight: false,
      };

      const qb = createMockQueryBuilder([], 0);
      qb.getRawOne = jest.fn().mockResolvedValue({ total: '10' });

      districtRepository.findOne.mockResolvedValue(mockDistrict);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([activeShiftDef]);
      taskRepository.count.mockResolvedValue(0);

      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getDistrictStats('district-1');

      // Check that the district has the correct structure
      expect(result.total_workers).toBeGreaterThanOrEqual(0);
      expect(result.areas).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Phase 2D-3: New Endpoints
  // ──────────────────────────────────────────────────────────────────────────

  describe('getLocationHistory', () => {
    const today = new Date().toISOString().split('T')[0];

    it('should throw NotFoundException for unknown user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getLocationHistory('unknown', today)).rejects.toThrow(NotFoundException);
    });

    it('should return empty trail when no logs exist', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      shiftRepository.findOne.mockResolvedValue(null);
      const qb = createMockQueryBuilder([]);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getLocationHistory('user-1', today);

      expect(result.user_id).toBe('user-1');
      expect(result.points).toEqual([]);
      expect(result.total_points).toBe(0);
      expect(result.total_distance_meters).toBe(0);
    });

    it('should return location history with points when logs exist', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      shiftRepository.findOne.mockResolvedValue({
        ...mockShift,
        shift_definition_id: 'shift-def-1',
        location_id: 'area-1',
      });
      areaRepository.findOne.mockResolvedValue(mockArea);
      shiftDefinitionRepository.findOne.mockResolvedValue(mockShiftDefinition);

      const loggedAt1 = new Date('2026-03-04T07:00:00Z');
      const loggedAt2 = new Date('2026-03-04T07:05:00Z');
      const logs = [
        { ...mockLocationLog, logged_at: loggedAt1 },
        { ...mockLocationLog, logged_at: loggedAt2, gps_lat: -7.291, gps_lng: 112.74 },
      ];
      const qb = createMockQueryBuilder(logs);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getLocationHistory('user-1', today, 'shift-1');

      expect(result.points).toHaveLength(2);
      expect(result.shift_name).toBe('Shift 1');
      expect(result.location_name).toBe('Taman Bungkul');
      expect(result.total_distance_meters).toBeGreaterThanOrEqual(0);
    });

    it('should compute inside/outside time correctly', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      shiftRepository.findOne.mockResolvedValue(null);
      areaRepository.findOne.mockResolvedValue(null);

      const base = new Date('2026-03-04T07:00:00Z');
      const logs = [
        {
          ...mockLocationLog,
          logged_at: new Date(base.getTime()),
          gps_lat: -7.29,
          gps_lng: 112.739,
        },
        {
          ...mockLocationLog,
          logged_at: new Date(base.getTime() + 10 * 60_000),
          gps_lat: -7.29,
          gps_lng: 112.739,
        },
      ];
      const qb = createMockQueryBuilder(logs);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getLocationHistory('user-1', today);

      expect(result.time_inside_area_minutes + result.time_outside_area_minutes).toBe(10);
    });
  });

  describe('getUserDaySummary', () => {
    it('should throw NotFoundException for unknown user', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserDaySummary('unknown')).rejects.toThrow(NotFoundException);
    });

    it('should return summary with tracking data', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const tracking: any = {
        user_id: 'user-1',
        shift_id: 'shift-1',
        shift_definition_id: 'shift-def-1',
        shift: mockShift,
        shift_definition: null,
        user: mockUser,
        location_id: 'area-1',
        area: mockArea,
        status: TrackingStatus.ACTIVE,
        last_latitude: -7.2905,
        last_longitude: 112.7398,
        last_accuracy_meters: 10,
        last_battery_level: 85,
        last_location_at: new Date(),
        is_within_area: true,
        updated_at: new Date(),
      };
      trackingRepository.findOne.mockResolvedValue(tracking);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      shiftRepository.findOne.mockResolvedValue(mockShift);
      shiftDefinitionRepository.findOne.mockResolvedValue(mockShiftDefinition);
      activityRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);

      const result = await service.getUserDaySummary('user-1');

      expect(result.user_id).toBe('user-1');
      expect(result.status).toBe(TrackingStatus.ACTIVE);
      expect(result.activities_today).toEqual([]);
      expect(result.tasks_today).toEqual([]);
      expect(result.whatsapp_links).not.toBeNull();
    });

    it('should return OFFLINE status when no tracking record', async () => {
      userRepository.findOne.mockResolvedValue({
        ...mockUser,
        location_id: undefined,
        phone_number: null,
      });
      trackingRepository.findOne.mockResolvedValue(null);
      activityRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);

      const result = await service.getUserDaySummary('user-1');

      expect(result.status).toBe(TrackingStatus.OFFLINE);
      expect(result.shift).toBeNull();
      expect(result.last_location).toBeNull();
      expect(result.whatsapp_links).toBeNull();
    });

    it('should include activities and tasks in summary', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const tracking: any = {
        user_id: 'user-1',
        shift_id: null,
        shift_definition_id: null,
        shift: null,
        shift_definition: null,
        user: mockUser,
        area: null,
        location_id: null,
        status: TrackingStatus.OFFLINE,
        last_location_at: null,
        last_latitude: null,
        last_longitude: null,
        last_accuracy_meters: null,
        last_battery_level: null,
        is_within_area: true,
        updated_at: new Date(),
      };
      trackingRepository.findOne.mockResolvedValue(tracking);

      const mockActivity = {
        id: 'act-1',
        description: 'Penyiraman',
        activity_type_id: 'type-1',
        created_at: new Date(),
        photo_urls: ['https://example.com/photo.jpg'],
        user_id: 'user-1',
      };
      const tracking2: any = {
        user_id: 'user-1',
        shift_id: null,
        shift_definition_id: null,
        shift: null,
        shift_definition: null,
        user: mockUser,
        area: null,
        location_id: null,
        status: TrackingStatus.OFFLINE,
        last_location_at: null,
        last_latitude: null,
        last_longitude: null,
        last_accuracy_meters: null,
        last_battery_level: null,
        is_within_area: true,
        updated_at: new Date(),
      };
      trackingRepository.findOne.mockResolvedValue(tracking2);
      activityRepository.find.mockResolvedValue([mockActivity as any]);
      taskRepository.find.mockResolvedValue([{ ...mockTask, assigned_to: 'user-1' }]);

      const result = await service.getUserDaySummary('user-1');

      expect(result.activities_today).toHaveLength(1);
      expect(result.activities_today[0].title).toBe('Penyiraman');
      expect(result.activities_today[0].photo_url).toBe('https://example.com/photo.jpg');
      expect(result.tasks_today).toHaveLength(1);
    });

    it('should resolve area from user.location_id when tracking has no area', async () => {
      userRepository.findOne.mockResolvedValue({ ...mockUser, location_id: 'area-1' });
      const tracking: any = {
        user_id: 'user-1',
        shift_id: null,
        shift_definition_id: null,
        shift: null,
        shift_definition: null,
        user: mockUser,
        area: null,
        location_id: null,
        status: TrackingStatus.OFFLINE,
        last_location_at: null,
        last_latitude: null,
        last_longitude: null,
        last_accuracy_meters: null,
        last_battery_level: null,
        is_within_area: true,
        updated_at: new Date(),
      };
      trackingRepository.findOne.mockResolvedValue(tracking);
      areaRepository.findOne.mockResolvedValue(mockArea);
      districtRepository.findOne.mockResolvedValue(mockDistrict);
      activityRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);

      const result = await service.getUserDaySummary('user-1');

      expect(result.location_name).toBe('Taman Bungkul');
      expect(result.district_name).toBe('Rayon Selatan');
    });
  });

  describe('getStaffingSummary', () => {
    it('should return empty items when no areas found', async () => {
      areaRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([]);

      const result = await service.getStaffingSummary({});

      expect(result.items).toEqual([]);
      expect(result.generated_at).toBeDefined();
    });

    it('should return staffing summary for a specific area', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([mockStaffRequirement]);

      // Mock tracking counts (getTrackingRoleCounts uses createQueryBuilder)
      const qb = createMockQueryBuilder();
      qb.getRawMany = jest.fn().mockResolvedValue([
        {
          role: 'satgas',
          active: '3',
          inactive: '1',
          outside_area: '0',
          missing: '0',
          offline: '1',
        },
      ]);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);

      // Mock assigned counts (getAssignedRoleCounts uses find)
      userRepository.find.mockResolvedValue([
        { ...mockUser, role: UserRole.SATGAS },
        { ...mockUser, id: 'user-2', role: UserRole.SATGAS },
      ]);

      const result = await service.getStaffingSummary({ location_id: 'area-1' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].id).toBe('area-1');
    });

    it('should filter by district_id', async () => {
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([]);
      staffRequirementRepository.find.mockResolvedValue([]);

      const qb = createMockQueryBuilder();
      qb.getRawMany = jest.fn().mockResolvedValue([]);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      userRepository.find.mockResolvedValue([]);

      const result = await service.getStaffingSummary({ district_id: 'district-1' });

      expect(result.items).toHaveLength(1);
      expect(areaRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ district_id: 'district-1' }) }),
      );
    });

    it('should handle areas with no requirements (no shift)', async () => {
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([]); // no current shift

      const qb = createMockQueryBuilder();
      qb.getRawMany = jest.fn().mockResolvedValue([]);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      userRepository.find.mockResolvedValue([]);

      const result = await service.getStaffingSummary({});

      expect(result.items).toHaveLength(1);
      expect(result.items[0].roles).toEqual([]);
    });
  });

  describe('getBoundaries (MonitoringStatsService)', () => {
    let statsService: MonitoringStatsService;

    beforeEach(() => {
      statsService = (service as any).statsService;
    });

    it('should return boundaries for all districts', async () => {
      districtRepository.find.mockResolvedValue([mockDistrict]);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const qb = createMockQueryBuilder();
      qb.getRawMany = jest.fn().mockResolvedValue([]);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await statsService.getBoundaries();

      expect(result.districts).toHaveLength(1);
      expect(result.districts[0].id).toBe('district-1');
      expect(result.districts[0].areas).toHaveLength(1);
      expect(result.districts[0].areas[0].id).toBe('area-1');
      expect(result.districts[0].areas[0].district_id).toBe('district-1');
      expect(result.districts[0].areas[0].district_name).toBe('Rayon Selatan');
      expect(result.generated_at).toBeInstanceOf(Date);
    });

    it('should filter by district_id when provided', async () => {
      districtRepository.find.mockResolvedValue([mockDistrict]);
      areaRepository.find.mockResolvedValue([]);

      const result = await statsService.getBoundaries({ district_id: 'district-1' });

      expect(districtRepository.find).toHaveBeenCalledWith({ where: { id: 'district-1' } });
      expect(result.districts).toHaveLength(1);
      expect(result.districts[0].areas).toHaveLength(0);
      expect(result.districts[0].area_count).toBe(0);
    });

    it('should compute understaffed status based on assigned vs required', async () => {
      districtRepository.find.mockResolvedValue([mockDistrict]);
      areaRepository.find.mockResolvedValue([mockArea]);
      // No current shift → required = 0, so understaffed depends on assigned vs 0
      shiftDefinitionRepository.find.mockResolvedValue([]);

      const qb = createMockQueryBuilder();
      qb.getRawMany = jest.fn().mockResolvedValue([{ location_id: 'area-1', count: '3' }]);
      trackingRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await statsService.getBoundaries();

      // With no shift definition, required=0, assigned=3, so not understaffed
      expect(result.districts[0].areas[0].assigned_count).toBe(3);
      expect(result.districts[0].areas[0].is_understaffed).toBe(false);
      expect(result.districts[0].is_understaffed).toBe(false);
    });

    it('should include staffing_summary with role details', async () => {
      districtRepository.find.mockResolvedValue([mockDistrict]);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const trackQb = createMockQueryBuilder();
      trackQb.getRawMany = jest
        .fn()
        .mockResolvedValueOnce([{ location_id: 'area-1', count: '3' }]) // assigned counts
        .mockResolvedValueOnce([{ location_id: 'area-1', role: 'satgas', count: '2' }]); // active counts
      trackingRepository.createQueryBuilder = jest.fn(() => trackQb as any);

      const reqQb = createMockQueryBuilder();
      reqQb.getRawMany = jest.fn().mockResolvedValue([{ location_id: 'area-1', total: '5' }]);
      reqQb.getMany = jest
        .fn()
        .mockResolvedValue([{ location_id: 'area-1', role: 'satgas', required_count: 5 }]);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => reqQb as any);

      const result = await statsService.getBoundaries();

      expect(result.districts[0].areas[0].staffing_summary).toBeDefined();
    });

    it('should return empty areas for district with no active areas', async () => {
      districtRepository.find.mockResolvedValue([mockDistrict]);
      areaRepository.find.mockResolvedValue([]);

      const result = await statsService.getBoundaries();

      expect(result.districts[0].areas).toHaveLength(0);
      expect(result.districts[0].area_count).toBe(0);
      expect(result.districts[0].is_understaffed).toBe(false);
    });
  });

  describe('getSnapshot — staffing counts only satgas+linmas (ADR-046)', () => {
    it('ignores a clocked-in korlap when counting a lokasi as staffed', async () => {
      // The defect: `active_count` counted every monitorable role while
      // `required_count` sums satgas+linmas only — so a supervisor standing in a
      // park masked a real shortfall. korlap/kepala_rayon/admin_rayon are
      // monitorable (they render) but never staff a place.
      const liveUsers = {
        total_active: 2,
        total_absent: 0,
        total_outside_area: 0,
        total_offline: 0,
        total_online: 2,
        users: [
          {
            id: 'u-satgas',
            full_name: 'Satgas Satu',
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Pusat',
            status: TrackingStatus.ACTIVE,
            lat: -7.2,
            lng: 112.7,
            last_update: new Date(),
            is_within_area: true,
          },
          {
            id: 'u-korlap',
            full_name: 'Korlap Satu',
            role: 'korlap',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Pusat',
            status: TrackingStatus.ACTIVE,
            lat: -7.2,
            lng: 112.7,
            last_update: new Date(),
            is_within_area: true,
          },
        ],
        generated_at: new Date(),
      };

      jest.spyOn(service['userService'], 'getLiveUsers').mockResolvedValue(liveUsers as any);
      jest
        .spyOn(service['statsService'], 'getCurrentShiftDefinition')
        .mockResolvedValue(mockShiftDefinition);
      // Both are on the roster, so ROLE is the only reason korlap is excluded from
      // the count (ad-hoc exclusion, ADR-050 5.4d, is exercised separately).
      jest
        .spyOn(service['statsService'], 'scheduledUserIdsForCurrentShift')
        .mockResolvedValue(new Set<string>(['u-satgas', 'u-korlap']));
      // Target of 2 satgas at this lokasi.
      staffRequirementRepository.find.mockResolvedValue([
        { ...mockStaffRequirement, required_count: 2 },
      ] as any);

      const result = await service.getSnapshot({} as any);
      const summary = result.data.area_summaries.find((a: any) => a.location_id === 'area-1');

      // 2 people are standing there, but only ONE staffs it.
      expect(summary?.active_count).toBe(1);
      expect(summary?.required_count).toBe(2);
      expect(summary?.is_understaffed).toBe(true);
    });

    it('appends ad_hoc to a worker who is not on the current-shift roster (5.4c)', async () => {
      const liveUsers = {
        total_active: 1,
        total_absent: 0,
        total_outside_area: 0,
        total_offline: 0,
        total_online: 1,
        users: [
          {
            id: 'u-adhoc',
            full_name: 'Satgas Adhoc',
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Pusat',
            status: TrackingStatus.ACTIVE,
            lat: -7.2,
            lng: 112.7,
            last_update: new Date(),
            is_within_area: true,
            lifecycle_state: 'bertugas',
            is_late: false,
            lifecycle_flags: [],
          },
        ],
        generated_at: new Date(),
      };
      jest.spyOn(service['userService'], 'getLiveUsers').mockResolvedValue(liveUsers as any);
      jest
        .spyOn(service['statsService'], 'getCurrentShiftDefinition')
        .mockResolvedValue(mockShiftDefinition);
      staffRequirementRepository.find.mockResolvedValue([] as any);
      // Roster is empty (default mock) → this clock-in is ad-hoc.
      const result = await service.getSnapshot({} as any);
      const worker = result.data.workers.find((w: any) => w.user_id === 'u-adhoc');

      expect(worker?.is_scheduled).toBe(false);
      expect(worker?.lifecycle_flags).toContain('ad_hoc');
      // A scheduled worker (roster includes them) must NOT get ad_hoc.
      jest
        .spyOn(service['statsService'], 'scheduledUserIdsForCurrentShift')
        .mockResolvedValue(new Set<string>(['u-adhoc']));
      const scheduled = await service.getSnapshot({} as any);
      const w2 = scheduled.data.workers.find((w: any) => w.user_id === 'u-adhoc');
      expect(w2?.lifecycle_flags).not.toContain('ad_hoc');
    });
  });

  describe('getSnapshot', () => {
    // Staffing (`active_count`) counts only SCHEDULED satgas+linmas (ADR-050 5.4d);
    // ad-hoc clock-ins are excluded. These fixtures model rostered workers, so mark
    // everyone scheduled by default (a `has()`-always-true stand-in). Tests that
    // exercise ad-hoc behavior override this locally.
    beforeEach(() => {
      jest
        .spyOn(service['statsService'], 'scheduledUserIdsForCurrentShift')
        .mockResolvedValue({ has: () => true } as unknown as Set<string>);
    });

    it('should return snapshot with correct contract shape', async () => {
      const mockLiveUsersResult = {
        total_active: 2,
        total_offline: 1,
        total_absent: 0,
        total_outside_area: 0,
        total_online: 2,
        users: [
          {
            id: 'user-1',
            full_name: 'Worker One',
            phone: '08123456789',
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Selatan',
            latitude: -7.2905,
            longitude: 112.7398,
            accuracy: 10,
            battery_level: 85,
            last_update: new Date(),
            status: TrackingStatus.ACTIVE,
            activity: 'aktif',
            location: 'dalam_area',
            is_within_area: true,
            outside_boundary: false,
            shift_id: 'shift-1',
            shift_definition_id: 'shift-def-1',
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
          {
            id: 'user-2',
            full_name: 'Worker Two',
            phone: '08129999999',
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Selatan',
            latitude: -7.291,
            longitude: 112.74,
            accuracy: 15,
            battery_level: 65,
            last_update: new Date(),
            status: TrackingStatus.OFFLINE,
            activity: 'offline',
            location: 'dalam_area',
            is_within_area: true,
            outside_boundary: false,
            shift_id: 'shift-2',
            shift_definition_id: 'shift-def-1',
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
        ],
        generated_at: new Date(),
      };

      jest
        .spyOn(service['userService'], 'getLiveUsers')
        .mockResolvedValue(mockLiveUsersResult as any);
      jest
        .spyOn(service['statsService'], 'getCurrentShiftDefinition')
        .mockResolvedValue(mockShiftDefinition);
      staffRequirementRepository.find.mockResolvedValue([mockStaffRequirement]);

      const result = await service.getSnapshot('location', 'area-1');

      // Validate overall structure
      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data.scope).toBe('location');
      expect(result.data.scope_id).toBe('area-1');

      // Validate aggregated counts
      expect(result.data.total_active).toBe(2);
      expect(result.data.total_offline).toBe(1);
      expect(result.data.total_absent).toBe(0);
      expect(result.data.total_outside_area).toBe(0);
      expect(result.data.generated_at).toBeDefined();
      expect(typeof result.data.generated_at).toBe('string');

      // Validate workers array contract (lat/lng, user_id, last_update as ISO string)
      expect(result.data.workers).toHaveLength(2);
      expect(result.data.workers[0]).toMatchObject({
        user_id: 'user-1',
        full_name: 'Worker One',
        role: 'satgas',
        lat: -7.2905,
        lng: 112.7398,
        status: TrackingStatus.ACTIVE,
        location_id: 'area-1',
        location_name: 'Taman Bungkul',
        district_id: 'district-1',
        district_name: 'Rayon Selatan',
        is_within_area: true,
        battery_level: 85,
      });
      expect(typeof result.data.workers[0].last_update).toBe('string');

      // Validate area_summaries: computed staffing per area
      expect(result.data.area_summaries).toHaveLength(1);
      expect(result.data.area_summaries[0]).toMatchObject({
        location_id: 'area-1',
        location_name: 'Taman Bungkul',
        district_id: 'district-1',
        district_name: 'Rayon Selatan',
        active_count: 2, // active + offline = clocked in (both satgas staff the park)
        required_count: 5, // From mockStaffRequirement
        is_understaffed: true, // 2 clocked-in < 5 required
      });
    });

    it('should handle workers without area assignment in area_summaries', async () => {
      const mockLiveUsersResult = {
        total_active: 1,
        total_absent: 0,
        total_outside_area: 0,
        total_offline: 0,
        total_online: 1,
        users: [
          {
            id: 'user-1',
            full_name: 'Worker One',
            phone: '08123456789',
            role: 'satgas',
            location_id: null,
            location_name: 'Unknown',
            district_id: null,
            district_name: null,
            latitude: -7.2905,
            longitude: 112.7398,
            accuracy: 10,
            battery_level: 85,
            last_update: new Date(),
            status: TrackingStatus.ACTIVE,
            activity: 'aktif',
            location: 'dalam_area',
            is_within_area: false,
            outside_boundary: false,
            shift_id: 'shift-1',
            shift_definition_id: 'shift-def-1',
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
        ],
        generated_at: new Date(),
      };

      jest
        .spyOn(service['userService'], 'getLiveUsers')
        .mockResolvedValue(mockLiveUsersResult as any);
      jest
        .spyOn(service['statsService'], 'getCurrentShiftDefinition')
        .mockResolvedValue(mockShiftDefinition);

      const result = await service.getSnapshot('city');

      expect(result.data.workers).toHaveLength(1);
      expect(result.data.area_summaries).toHaveLength(0); // No area → no summaries
      expect(result.data.total_active).toBe(1);
    });

    it('should compute is_understaffed correctly', async () => {
      const mockLiveUsersResult = {
        total_active: 3,
        total_absent: 0,
        total_outside_area: 0,
        total_offline: 0,
        total_online: 3,
        users: [
          {
            id: 'user-1',
            full_name: 'Worker One',
            phone: null,
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Selatan',
            latitude: -7.2905,
            longitude: 112.7398,
            accuracy: null,
            battery_level: 50,
            last_update: new Date(),
            status: TrackingStatus.ACTIVE,
            activity: 'aktif',
            location: 'dalam_area',
            is_within_area: true,
            outside_boundary: false,
            shift_id: 'shift-1',
            shift_definition_id: 'shift-def-1',
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
          {
            id: 'user-2',
            full_name: 'Worker Two',
            phone: null,
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Selatan',
            latitude: -7.29,
            longitude: 112.74,
            accuracy: null,
            battery_level: null,
            last_update: new Date(),
            status: TrackingStatus.ACTIVE,
            activity: 'aktif',
            location: 'dalam_area',
            is_within_area: true,
            outside_boundary: false,
            shift_id: 'shift-2',
            shift_definition_id: 'shift-def-1',
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
          {
            id: 'user-3',
            full_name: 'Worker Three',
            phone: null,
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Selatan',
            latitude: -7.288,
            longitude: 112.741,
            accuracy: null,
            battery_level: 100,
            last_update: new Date(),
            status: TrackingStatus.ACTIVE,
            activity: 'aktif',
            location: 'dalam_area',
            is_within_area: true,
            outside_boundary: false,
            shift_id: 'shift-3',
            shift_definition_id: 'shift-def-1',
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
        ],
        generated_at: new Date(),
      };

      jest
        .spyOn(service['userService'], 'getLiveUsers')
        .mockResolvedValue(mockLiveUsersResult as any);
      jest
        .spyOn(service['statsService'], 'getCurrentShiftDefinition')
        .mockResolvedValue(mockShiftDefinition);

      // Required = satgas 3 + linmas 2 = 5 (summed across roles), active = 3 → understaffed.
      // Guards the per-role sum: a single-role findOne would have under-counted to 3.
      staffRequirementRepository.find.mockResolvedValue([
        { ...mockStaffRequirement, role: StaffRole.SATGAS, required_count: 3 },
        { ...mockStaffRequirement, role: StaffRole.LINMAS, required_count: 2 },
      ]);

      const result = await service.getSnapshot('location', 'area-1');

      expect(result.data.area_summaries[0].active_count).toBe(3); // 3 workers with ACTIVE status
      expect(result.data.area_summaries[0].required_count).toBe(5); // 3 + 2 summed
      expect(result.data.area_summaries[0].is_understaffed).toBe(true);
    });

    it('should set is_understaffed false when fully staffed', async () => {
      const mockLiveUsersResult = {
        total_active: 5,
        total_absent: 0,
        total_outside_area: 0,
        total_offline: 0,
        total_online: 5,
        users: Array.from({ length: 5 }, (_, i) => ({
          id: `user-${i + 1}`,
          full_name: `Worker ${i + 1}`,
          phone: null,
          role: 'satgas',
          location_id: 'area-1',
          location_name: 'Taman Bungkul',
          district_id: 'district-1',
          district_name: 'Rayon Selatan',
          latitude: -7.2905,
          longitude: 112.7398,
          accuracy: null,
          battery_level: 80,
          last_update: new Date(),
          status: TrackingStatus.ACTIVE,
          activity: 'aktif',
          location: 'dalam_area',
          is_within_area: true,
          outside_boundary: false,
          shift_id: `shift-${i + 1}`,
          shift_definition_id: 'shift-def-1',
          shift_name: 'Shift 1',
          clock_in_time: new Date(),
          current_task_status: null,
          current_task_title: null,
        })),
        generated_at: new Date(),
      };

      jest
        .spyOn(service['userService'], 'getLiveUsers')
        .mockResolvedValue(mockLiveUsersResult as any);
      jest
        .spyOn(service['statsService'], 'getCurrentShiftDefinition')
        .mockResolvedValue(mockShiftDefinition);

      // Required count = 5, active count = 5 → fully staffed
      staffRequirementRepository.find.mockResolvedValue([mockStaffRequirement]);

      const result = await service.getSnapshot('location', 'area-1');

      expect(result.data.area_summaries[0].active_count).toBe(5);
      expect(result.data.area_summaries[0].required_count).toBe(5);
      expect(result.data.area_summaries[0].is_understaffed).toBe(false);
    });

    it('should handle no shift definition gracefully', async () => {
      const mockLiveUsersResult = {
        total_active: 2,
        total_absent: 0,
        total_outside_area: 0,
        total_offline: 0,
        total_online: 2,
        users: [
          {
            id: 'user-1',
            full_name: 'Worker One',
            phone: null,
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Selatan',
            latitude: -7.2905,
            longitude: 112.7398,
            accuracy: null,
            battery_level: 80,
            last_update: new Date(),
            status: TrackingStatus.ACTIVE,
            activity: 'aktif',
            location: 'dalam_area',
            is_within_area: true,
            outside_boundary: false,
            shift_id: 'shift-1',
            shift_definition_id: null,
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
          {
            id: 'user-2',
            full_name: 'Worker Two',
            phone: null,
            role: 'satgas',
            location_id: 'area-1',
            location_name: 'Taman Bungkul',
            district_id: 'district-1',
            district_name: 'Rayon Selatan',
            latitude: -7.29,
            longitude: 112.74,
            accuracy: null,
            battery_level: null,
            last_update: new Date(),
            status: TrackingStatus.ACTIVE,
            activity: 'aktif',
            location: 'dalam_area',
            is_within_area: true,
            outside_boundary: false,
            shift_id: 'shift-2',
            shift_definition_id: null,
            shift_name: 'Shift 1',
            clock_in_time: new Date(),
            current_task_status: null,
            current_task_title: null,
          },
        ],
        generated_at: new Date(),
      };

      jest
        .spyOn(service['userService'], 'getLiveUsers')
        .mockResolvedValue(mockLiveUsersResult as any);
      jest.spyOn(service['statsService'], 'getCurrentShiftDefinition').mockResolvedValue(null);

      const result = await service.getSnapshot('location', 'area-1');

      expect(result.data.area_summaries).toHaveLength(1);
      // With no shift, required_count defaults to 0
      expect(result.data.area_summaries[0].required_count).toBe(0);
      // 2 active > 0 required → not understaffed
      expect(result.data.area_summaries[0].is_understaffed).toBe(false);
    });
  });
});
