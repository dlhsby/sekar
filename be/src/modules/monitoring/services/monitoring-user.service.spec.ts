import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { MonitoringUserService } from './monitoring-user.service';
import { User } from '../../users/entities/user.entity';
import { Area } from '../../areas/entities/area.entity';
import { Shift } from '../../shifts/entities/shift.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { Activity } from '../../activities/entities/activity.entity';
import { LocationLog } from '../../location/entities/location-log.entity';
import { Rayon } from '../../rayons/entities/rayon.entity';
import { ShiftDefinition } from '../../shift-definitions/entities/shift-definition.entity';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';

describe('MonitoringUserService', () => {
  let service: MonitoringUserService;
  let userRepository: jest.Mocked<Repository<User>>;
  let areaRepository: jest.Mocked<Repository<Area>>;
  let shiftRepository: jest.Mocked<Repository<Shift>>;
  let taskRepository: jest.Mocked<Repository<Task>>;
  let activityRepository: jest.Mocked<Repository<Activity>>;
  let locationRepository: jest.Mocked<Repository<LocationLog>>;
  let rayonRepository: jest.Mocked<Repository<Rayon>>;
  let shiftDefinitionRepository: jest.Mocked<Repository<ShiftDefinition>>;
  let trackingRepository: jest.Mocked<Repository<UserTrackingStatus>>;

  const mockUser: User = {
    id: 'user-1',
    username: 'satgas1',
    full_name: 'Satgas One',
    phone_number: '081234567890',
    role: 'satgas',
    area_id: 'area-1',
    rayon_id: 'rayon-1',
  } as User;

  const mockArea: Area = {
    id: 'area-1',
    name: 'Area 1',
    rayon_id: 'rayon-1',
    gps_lat: -7.25,
    gps_lng: 112.75,
  } as Area;

  const mockRayon: Rayon = {
    id: 'rayon-1',
    name: 'Rayon 1',
    code: 'R1',
  } as Rayon;

  const mockShift: Shift = {
    id: 'shift-1',
    user_id: 'user-1',
    area_id: 'area-1',
    clock_in_time: new Date(),
    clock_out_time: null,
    clock_in_outside_boundary: false,
  } as unknown as Shift;

  const mockShiftDef: ShiftDefinition = {
    id: 'shift-def-1',
    name: 'Morning',
    start_time: '06:00',
    end_time: '14:00',
  } as ShiftDefinition;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MonitoringUserService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Area),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Task),
          useValue: {
            find: jest.fn().mockResolvedValue([]),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(Activity),
          useValue: {
            find: jest.fn(),
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
          },
        },
        {
          provide: getRepositoryToken(ShiftDefinition),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(UserTrackingStatus),
          useValue: {
            findOne: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MonitoringUserService>(MonitoringUserService);
    userRepository = module.get<jest.Mocked<Repository<User>>>(getRepositoryToken(User));
    areaRepository = module.get<jest.Mocked<Repository<Area>>>(getRepositoryToken(Area));
    shiftRepository = module.get<jest.Mocked<Repository<Shift>>>(getRepositoryToken(Shift));
    taskRepository = module.get<jest.Mocked<Repository<Task>>>(getRepositoryToken(Task));
    activityRepository = module.get<jest.Mocked<Repository<Activity>>>(
      getRepositoryToken(Activity),
    );
    locationRepository = module.get<jest.Mocked<Repository<LocationLog>>>(
      getRepositoryToken(LocationLog),
    );
    rayonRepository = module.get<jest.Mocked<Repository<Rayon>>>(getRepositoryToken(Rayon));
    shiftDefinitionRepository = module.get<jest.Mocked<Repository<ShiftDefinition>>>(
      getRepositoryToken(ShiftDefinition),
    );
    trackingRepository = module.get<jest.Mocked<Repository<UserTrackingStatus>>>(
      getRepositoryToken(UserTrackingStatus),
    );
  });

  describe('getLiveUsers', () => {
    it('should return live user positions without filters', async () => {
      const mockTracking: UserTrackingStatus = {
        id: 'tracking-1',
        user_id: 'user-1',
        user: mockUser,
        area_id: 'area-1',
        area: mockArea,
        shift_id: 'shift-1',
        shift: mockShift,
        shift_definition_id: 'shift-def-1',
        shift_definition: mockShiftDef,
        status: TrackingStatus.ACTIVE,
        last_latitude: -7.25,
        last_longitude: 112.75,
        last_accuracy_meters: 10,
        last_battery_level: 85,
        last_location_at: new Date(),
        is_within_area: true,
      } as unknown as UserTrackingStatus;

      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockTracking]),
      };

      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);
      const taskQb = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(taskQb as any);
      const areaQb = {
        createQueryBuilder: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockArea]),
      };
      areaRepository.createQueryBuilder.mockReturnValue(areaQb as any);
      rayonRepository.find.mockResolvedValue([mockRayon]);

      const result = await service.getLiveUsers();

      expect(result).toBeDefined();
      expect(result.users).toHaveLength(1);
      expect(result.users[0].id).toBe('user-1');
    });

    it('should filter users by area ID', async () => {
      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getLiveUsers({ area_id: 'area-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter users by rayon ID', async () => {
      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getLiveUsers({ rayon_id: 'rayon-1' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter users by role', async () => {
      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getLiveUsers({ role: 'satgas' });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });

    it('should filter users by status', async () => {
      const mockQueryBuilder = {
        innerJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        leftJoin: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      trackingRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getLiveUsers({ status: TrackingStatus.ACTIVE });

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getLocationHistory', () => {
    it('should return location history for a user on a specific date', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      shiftRepository.findOne.mockResolvedValue(mockShift);
      areaRepository.findOne.mockResolvedValue(mockArea);
      shiftDefinitionRepository.findOne.mockResolvedValue(mockShiftDef);

      const mockLocationLog: LocationLog = {
        id: 'log-1',
        user_id: 'user-1',
        shift_id: 'shift-1',
        gps_lat: -7.25,
        gps_lng: 112.75,
        accuracy_meters: 10,
        battery_level: 85,
        logged_at: new Date(),
      } as LocationLog;

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([mockLocationLog]),
      };

      locationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getLocationHistory('user-1', '2024-01-01');

      expect(result).toBeDefined();
      expect(result.user_id).toBe('user-1');
      expect(result.points).toHaveLength(1);
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getLocationHistory('invalid-id', '2024-01-01')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should filter by shift ID when provided', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      shiftRepository.findOne.mockResolvedValue(mockShift);
      areaRepository.findOne.mockResolvedValue(mockArea);
      shiftDefinitionRepository.findOne.mockResolvedValue(mockShiftDef);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      locationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      await service.getLocationHistory('user-1', '2024-01-01', 'shift-1');

      expect(mockQueryBuilder.andWhere).toHaveBeenCalled();
    });
  });

  describe('getUserDaySummary', () => {
    it('should return user day summary', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      const mockTracking: UserTrackingStatus = {
        id: 'tracking-1',
        user_id: 'user-1',
        area_id: 'area-1',
        area: mockArea,
        shift_id: 'shift-1',
        shift: mockShift,
        shift_definition_id: 'shift-def-1',
        status: TrackingStatus.ACTIVE,
        last_latitude: -7.25,
        last_longitude: 112.75,
        last_accuracy_meters: 10,
        last_battery_level: 85,
        last_location_at: new Date(),
        is_within_area: true,
      } as unknown as UserTrackingStatus;

      trackingRepository.findOne.mockResolvedValue(mockTracking);
      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      shiftDefinitionRepository.findOne.mockResolvedValue(mockShiftDef);

      const activityQb = {
        find: jest.fn().mockResolvedValue([]),
      };
      activityRepository.find.mockResolvedValue([]);

      const taskQb = {
        find: jest.fn().mockResolvedValue([]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(taskQb as any);

      const result = await service.getUserDaySummary('user-1');

      expect(result).toBeDefined();
      expect(result.user_id).toBe('user-1');
      expect(result.full_name).toBe('Satgas One');
    });

    it('should throw NotFoundException when user not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(service.getUserDaySummary('invalid-id')).rejects.toThrow(NotFoundException);
    });

    it('should handle user without tracking data', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      trackingRepository.findOne.mockResolvedValue(null);
      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      activityRepository.find.mockResolvedValue([]);

      const taskQb = {
        find: jest.fn().mockResolvedValue([]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(taskQb as any);

      const result = await service.getUserDaySummary('user-1');

      expect(result).toBeDefined();
      expect(result.status).toBe(TrackingStatus.OFFLINE);
    });
  });

  describe('private helpers', () => {
    it('should parse date range correctly', async () => {
      userRepository.findOne.mockResolvedValue(mockUser);
      shiftRepository.findOne.mockResolvedValue(null);
      areaRepository.findOne.mockResolvedValue(null);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };

      locationRepository.createQueryBuilder.mockReturnValue(mockQueryBuilder as any);

      const result = await service.getLocationHistory('user-1', '2024-01-15');

      expect(result.date).toBe('2024-01-15');
    });

    it('should build WhatsApp links from phone number', async () => {
      const userWithPhone = { ...mockUser, phone_number: '081234567890' };
      userRepository.findOne.mockResolvedValue(userWithPhone);
      trackingRepository.findOne.mockResolvedValue(null);
      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      activityRepository.find.mockResolvedValue([]);

      const taskQb = {
        find: jest.fn().mockResolvedValue([]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(taskQb as any);

      const result = await service.getUserDaySummary('user-1');

      expect(result.whatsapp_links).toBeDefined();
      expect(result.whatsapp_links?.chat).toContain('wa.me');
    });

    it('should handle null phone number in WhatsApp links', async () => {
      const userNoPhone = { ...mockUser, phone_number: null };
      userRepository.findOne.mockResolvedValue(userNoPhone);
      trackingRepository.findOne.mockResolvedValue(null);
      areaRepository.findOne.mockResolvedValue(mockArea);
      rayonRepository.findOne.mockResolvedValue(mockRayon);
      activityRepository.find.mockResolvedValue([]);

      const taskQb = {
        find: jest.fn().mockResolvedValue([]),
      };
      taskRepository.createQueryBuilder.mockReturnValue(taskQb as any);

      const result = await service.getUserDaySummary('user-1');

      expect(result.whatsapp_links).toBeNull();
    });
  });
});
