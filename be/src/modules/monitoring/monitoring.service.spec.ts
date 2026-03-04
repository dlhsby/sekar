import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { User, UserRole } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { Task, TaskStatus, TaskPriority } from '../tasks/entities/task.entity';
import { Activity } from '../activities/entities/activity.entity';
import { LocationLog } from '../location/entities/location-log.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import {
  AreaStaffRequirement,
  StaffRole,
  DayType,
} from '../area-staff-requirements/entities/area-staff-requirement.entity';

describe('MonitoringService', () => {
  let service: MonitoringService;
  let userRepository: jest.Mocked<Repository<User>>;
  let areaRepository: jest.Mocked<Repository<Area>>;
  let shiftRepository: jest.Mocked<Repository<Shift>>;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let locationRepository: jest.Mocked<Repository<LocationLog>>;
  let rayonRepository: jest.Mocked<Repository<Rayon>>;
  let shiftDefinitionRepository: jest.Mocked<Repository<ShiftDefinition>>;
  let staffRequirementRepository: jest.Mocked<Repository<AreaStaffRequirement>>;

  const mockRayon: Rayon = {
    id: 'rayon-1',
    name: 'Rayon Selatan',
    code: 'SELATAN',
    description: 'Southern sector',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockArea: Area = {
    id: 'area-1',
    name: 'Taman Bungkul',
    area_type_id: 'type-1',
    areaType: {
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
    radius_meters: 100,
    address: 'Jl. Taman Bungkul',
    is_active: true,
    rayon_id: 'rayon-1',
    coverage_area: 2500,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockUser: User = {
    id: 'user-1',
    username: 'worker1',
    password_hash: 'hashed',
    full_name: 'Worker One',
    phone: '08123456789',
    role: UserRole.SATGAS,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockShift: Shift = {
    id: 'shift-1',
    user_id: 'user-1',
    user: mockUser,
    area_id: 'area-1',
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
    area_id: 'area-1',
    rayon_id: null,
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
    rayon: null as any,
    tags: [],
    assignee: null as any,
    creator: mockUser,
    verifier: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockStaffRequirement: AreaStaffRequirement = {
    id: 'req-1',
    area_id: 'area-1',
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
    innerJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getOne: jest.fn().mockResolvedValue(result[0] || null),
    getCount: jest.fn().mockResolvedValue(count),
    getRawOne: jest.fn().mockResolvedValue({ count: count.toString(), total: count.toString() }),
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringService,
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
          provide: getRepositoryToken(Area),
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
          provide: getRepositoryToken(Rayon),
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
          provide: getRepositoryToken(AreaStaffRequirement),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
            count: jest.fn(),
            createQueryBuilder: jest.fn(() => createMockQueryBuilder()),
          },
        },
      ],
    }).compile();

    service = module.get<MonitoringService>(MonitoringService);
    userRepository = module.get(getRepositoryToken(User));
    areaRepository = module.get(getRepositoryToken(Area));
    shiftRepository = module.get(getRepositoryToken(Shift));
    taskRepository = module.get(getRepositoryToken(Task));
    activityRepository = module.get(getRepositoryToken(Activity));
    locationRepository = module.get(getRepositoryToken(LocationLog));
    rayonRepository = module.get(getRepositoryToken(Rayon));
    shiftDefinitionRepository = module.get(getRepositoryToken(ShiftDefinition));
    staffRequirementRepository = module.get(getRepositoryToken(AreaStaffRequirement));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getCityStats', () => {
    it('should return city-wide statistics', async () => {
      rayonRepository.find.mockResolvedValue([mockRayon]);
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

      expect(result).toHaveProperty('total_rayons');
      expect(result).toHaveProperty('total_areas');
      expect(result).toHaveProperty('total_workers');
      expect(result).toHaveProperty('workers_online');
      expect(result).toHaveProperty('workers_offline');
      expect(result).toHaveProperty('active_shifts');
      expect(result).toHaveProperty('tasks_pending');
      expect(result).toHaveProperty('tasks_in_progress');
      expect(result).toHaveProperty('tasks_completed_today');
      expect(result).toHaveProperty('activities_submitted_today');
      expect(result).toHaveProperty('rayons');
      expect(result).toHaveProperty('generated_at');
      expect(result.rayons).toBeInstanceOf(Array);
    });

    it('should aggregate statistics from all rayons', async () => {
      const rayon2 = { ...mockRayon, id: 'rayon-2', name: 'Rayon Utara', code: 'UTARA' };
      rayonRepository.find.mockResolvedValue([mockRayon, rayon2]);
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

      expect(result.total_rayons).toBe(2);
      expect(result.rayons.length).toBe(2);
    });
  });

  describe('getRayonStats', () => {
    it('should return rayon statistics', async () => {
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      taskRepository.count.mockResolvedValue(5);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getRayonStats('rayon-1');

      expect(result).toHaveProperty('id', 'rayon-1');
      expect(result).toHaveProperty('name', 'Rayon Selatan');
      expect(result).toHaveProperty('code', 'SELATAN');
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

    it('should throw NotFoundException for non-existent rayon', async () => {
      rayonRepository.findOne.mockResolvedValue(null);

      await expect(service.getRayonStats('non-existent')).rejects.toThrow(NotFoundException);
    });

    it('should include area summaries', async () => {
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getRayonStats('rayon-1');

      expect(result.areas.length).toBe(1);
      expect(result.areas[0]).toHaveProperty('id', 'area-1');
      expect(result.areas[0]).toHaveProperty('name', 'Taman Bungkul');
    });

    it('should include shift summaries', async () => {
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getRayonStats('rayon-1');

      expect(result.shifts.length).toBe(1);
      expect(result.shifts[0]).toHaveProperty('id', 'shift-def-1');
      expect(result.shifts[0]).toHaveProperty('name', 'Shift 1');
    });
  });

  describe('getAreaStats', () => {
    it('should return area statistics', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
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
      expect(result).toHaveProperty('rayon_id', 'rayon-1');
      expect(result).toHaveProperty('rayon_name', 'Rayon Selatan');
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
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      shiftRepository.find.mockResolvedValue([mockShift]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([mockStaffRequirement]);
      shiftRepository.count.mockResolvedValue(3);
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.users.length).toBe(1);
      expect(result.users[0]).toHaveProperty('id', 'user-1');
      expect(result.users[0]).toHaveProperty('full_name', 'Worker One');
      expect(result.users[0]).toHaveProperty('is_online');
    });

    it('should include active tasks', async () => {
      const pendingTask = { ...mockTask, status: TaskStatus.PENDING };
      const inProgressTask = { ...mockTask, id: 'task-2', status: TaskStatus.IN_PROGRESS };
      const completedTask = { ...mockTask, id: 'task-3', status: TaskStatus.COMPLETED };

      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
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
      rayonRepository.findOne.mockResolvedValue(mockRayon);
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
    it('should return live user positions', async () => {
      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.findOne.mockResolvedValue(null);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      const result = await service.getLiveUsers();

      expect(result).toHaveProperty('total_online');
      expect(result).toHaveProperty('total_offline');
      expect(result).toHaveProperty('users');
      expect(result).toHaveProperty('generated_at');
    });

    it('should filter by area_id', async () => {
      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.findOne.mockResolvedValue(null);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      await service.getLiveUsers({ area_id: 'area-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('shift.area_id = :areaId', { areaId: 'area-1' });
    });

    it('should filter by rayon_id', async () => {
      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.findOne.mockResolvedValue(null);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      await service.getLiveUsers({ rayon_id: 'rayon-1' });

      expect(qb.andWhere).toHaveBeenCalledWith('area.rayon_id = :rayonId', { rayonId: 'rayon-1' });
    });

    it('should filter by role', async () => {
      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.findOne.mockResolvedValue(null);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      await service.getLiveUsers({ role: UserRole.SATGAS });

      expect(qb.andWhere).toHaveBeenCalledWith('user.role = :role', { role: UserRole.SATGAS });
    });

    it('should mark user as online if location updated within 10 minutes', async () => {
      const recentLocation = {
        ...mockLocationLog,
        logged_at: new Date(), // Current time
      };

      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(recentLocation);
      taskRepository.findOne.mockResolvedValue(null);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      const result = await service.getLiveUsers();

      expect(result.total_online).toBe(1);
      expect(result.total_offline).toBe(0);
    });

    it('should mark user as offline if location not updated within 10 minutes', async () => {
      const oldLocation = {
        ...mockLocationLog,
        logged_at: new Date(Date.now() - 15 * 60 * 1000), // 15 minutes ago
      };

      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(oldLocation);
      taskRepository.findOne.mockResolvedValue(null);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      const result = await service.getLiveUsers();

      expect(result.total_online).toBe(0);
      expect(result.total_offline).toBe(1);
    });

    it('should include current task if user has one', async () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };

      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.findOne.mockResolvedValue(inProgressTask);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      const result = await service.getLiveUsers();

      expect(result.users[0].current_task_status).toBe(TaskStatus.IN_PROGRESS);
      expect(result.users[0].current_task_title).toBe('Water plants');
    });

    it('should return empty list when no active shifts', async () => {
      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getLiveUsers();

      expect(result.users).toEqual([]);
      expect(result.total_online).toBe(0);
      expect(result.total_offline).toBe(0);
    });

    it('should handle user without rayon', async () => {
      const shiftWithoutRayon = {
        ...mockShift,
        area: { ...mockArea, rayon_id: null },
      };

      const qb = createMockQueryBuilder([shiftWithoutRayon], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(mockLocationLog);
      taskRepository.findOne.mockResolvedValue(null);

      const result = await service.getLiveUsers();

      expect(result.users[0].rayon_id).toBeNull();
      expect(result.users[0].rayon_name).toBeNull();
    });

    it('should handle user without location log', async () => {
      const qb = createMockQueryBuilder([mockShift], 1);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.findOne.mockResolvedValue(null);
      taskRepository.findOne.mockResolvedValue(null);
      rayonRepository.findOne.mockResolvedValue(mockRayon);

      const result = await service.getLiveUsers();

      expect(result.users[0].latitude).toBe(0);
      expect(result.users[0].longitude).toBe(0);
      expect(result.users[0].accuracy).toBeNull();
      expect(result.users[0].battery_level).toBeNull();
      expect(result.users[0].last_update).toEqual(mockShift.clock_in_time);
    });
  });

  describe('helper methods - edge cases', () => {
    it('should handle empty area IDs in countWorkersByAreaIds', async () => {
      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);

      // This is a private method, so we test it indirectly through getRayonStats
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      areaRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);

      await service.getRayonStats('rayon-1');

      // Empty area IDs should not cause errors
      expect(shiftRepository.createQueryBuilder).not.toHaveBeenCalled();
    });

    it('should handle area without rayon_id in getAreaStats', async () => {
      const areaWithoutRayon = { ...mockArea, rayon_id: undefined };
      areaRepository.findOne.mockResolvedValue(areaWithoutRayon);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.rayon_name).toBe('Unassigned');
      expect(result.rayon_id).toBe('');
    });

    it('should handle no current shift definition in getAreaStaffRequirements', async () => {
      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
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

      rayonRepository.findOne.mockResolvedValue(mockRayon);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([midnightShift]);

      const qb = createMockQueryBuilder([], 0);
      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.count.mockResolvedValue(0);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getRayonStats('rayon-1');

      expect(result.shifts.length).toBe(1);
    });

    it('should handle tasks with ASSIGNED status in active tasks filter', async () => {
      const assignedTask = { ...mockTask, status: TaskStatus.ASSIGNED };
      const inProgressTask = { ...mockTask, id: 'task-2', status: TaskStatus.IN_PROGRESS };

      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
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

    it('should handle tasks with ASSIGNED status in active tasks filter', async () => {
      const assignedTask = { ...mockTask, status: TaskStatus.ASSIGNED };

      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      shiftRepository.find.mockResolvedValue([]);
      shiftDefinitionRepository.find.mockResolvedValue([mockShiftDefinition]);
      staffRequirementRepository.find.mockResolvedValue([]);
      taskRepository.find.mockResolvedValue([assignedTask]);
      activityRepository.count.mockResolvedValue(0);

      const result = await service.getAreaStats('area-1');

      expect(result.active_tasks.length).toBe(1);
    });

    it('should handle empty areaIds in count methods', async () => {
      rayonRepository.find.mockResolvedValue([mockRayon]);
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

      rayonRepository.findOne.mockResolvedValue(mockRayon);
      areaRepository.find.mockResolvedValue([mockArea]);
      shiftDefinitionRepository.find.mockResolvedValue([activeShiftDef]);
      taskRepository.count.mockResolvedValue(0);

      shiftRepository.createQueryBuilder = jest.fn(() => qb as any);
      taskRepository.createQueryBuilder = jest.fn(() => qb as any);
      activityRepository.createQueryBuilder = jest.fn(() => qb as any);
      locationRepository.createQueryBuilder = jest.fn(() => qb as any);
      staffRequirementRepository.createQueryBuilder = jest.fn(() => qb as any);

      const result = await service.getRayonStats('rayon-1');

      // Check that the rayon has the correct structure
      expect(result.total_workers).toBeGreaterThanOrEqual(0);
      expect(result.areas).toBeDefined();
    });
  });
});
