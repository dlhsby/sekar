import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupervisorService } from './supervisor.service';
import { Shift } from '../shifts/entities/shift.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { LocationLog } from '../location/entities/location-log.entity';

describe('SupervisorService', () => {
  let module: TestingModule;
  let service: SupervisorService;
  let shiftsRepository: Repository<Shift>;
  let usersRepository: Repository<User>;
  let areasRepository: Repository<Area>;
  let locationLogsRepository: Repository<LocationLog>;

  const mockShiftsRepository = {
    find: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockUsersRepository = {
    find: jest.fn(),
    count: jest.fn(),
  };

  const mockAreasRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
  };

  const mockLocationLogsRepository = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        SupervisorService,
        {
          provide: getRepositoryToken(Shift),
          useValue: mockShiftsRepository,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUsersRepository,
        },
        {
          provide: getRepositoryToken(Area),
          useValue: mockAreasRepository,
        },
        {
          provide: getRepositoryToken(LocationLog),
          useValue: mockLocationLogsRepository,
        },
      ],
    }).compile();

    service = module.get<SupervisorService>(SupervisorService);
    shiftsRepository = module.get<Repository<Shift>>(getRepositoryToken(Shift));
    usersRepository = module.get<Repository<User>>(getRepositoryToken(User));
    areasRepository = module.get<Repository<Area>>(getRepositoryToken(Area));
    locationLogsRepository = module.get<Repository<LocationLog>>(getRepositoryToken(LocationLog));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getActiveUsersPaginated', () => {
    beforeEach(() => {
      mockShiftsRepository.findAndCount = jest.fn();
    });

    it('should return paginated active workers with latest locations', async () => {
      const mockUser = {
        id: 'worker-uuid-1',
        username: 'worker1',
        full_name: 'Worker One',
      };

      const mockArea = {
        id: 'area-uuid-1',
        name: 'Taman Bungkul',
      };

      const mockShift = {
        id: 'shift-uuid-1',
        user: mockUser,
        area: mockArea,
        clock_in_time: new Date('2026-01-09T08:00:00Z'),
        clock_out_time: null,
      };

      const mockLocation = {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        logged_at: new Date('2026-01-09T10:30:00Z'),
      };

      mockShiftsRepository.findAndCount.mockResolvedValue([[mockShift], 1]);
      mockLocationLogsRepository.findOne.mockResolvedValue(mockLocation);

      const result = await service.getActiveUsersPaginated(1, 50);

      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('worker-uuid-1');
      expect(result.data[0].latest_location).toEqual(mockLocation);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(mockShiftsRepository.findAndCount).toHaveBeenCalled();
    });

    it('should handle workers without location logs in paginated results', async () => {
      const mockShift = {
        id: 'shift-uuid-1',
        user: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: { id: 'area-uuid-1', name: 'Taman Bungkul' },
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.findAndCount.mockResolvedValue([[mockShift], 1]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveUsersPaginated(1, 50);

      expect(result.data[0].latest_location).toBeNull();
    });

    it('should return empty paginated results if no active workers', async () => {
      mockShiftsRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getActiveUsersPaginated(1, 50);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle workers with null area in paginated results', async () => {
      const mockShift = {
        id: 'shift-uuid-1',
        user: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: null,
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.findAndCount.mockResolvedValue([[mockShift], 1]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveUsersPaginated(1, 50);

      expect(result.data[0].shift.area).toBeNull();
    });

    it('should handle pagination correctly with page 2', async () => {
      const mockShifts = [
        {
          id: 'shift-2',
          user: { id: 'worker-2', username: 'worker2', full_name: 'Worker Two' },
          area: { id: 'area-1', name: 'Area 1' },
          clock_in_time: new Date(),
          clock_out_time: null,
        },
      ];

      mockShiftsRepository.findAndCount.mockResolvedValue([mockShifts, 100]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveUsersPaginated(2, 50);

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(mockShiftsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        }),
      );
    });
  });

  describe('getActiveUsers', () => {
    it('should return active workers with latest locations', async () => {
      const mockUser = {
        id: 'worker-uuid-1',
        username: 'worker1',
        full_name: 'Worker One',
      };

      const mockArea = {
        id: 'area-uuid-1',
        name: 'Taman Bungkul',
      };

      const mockShift = {
        id: 'shift-uuid-1',
        user: mockUser,
        area: mockArea,
        clock_in_time: new Date('2026-01-09T08:00:00Z'),
        clock_out_time: null,
      };

      const mockLocation = {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        logged_at: new Date('2026-01-09T10:30:00Z'),
      };

      mockShiftsRepository.find.mockResolvedValue([mockShift]);
      mockLocationLogsRepository.findOne.mockResolvedValue(mockLocation);

      const result = await service.getActiveUsers();

      expect(result.users).toHaveLength(1);
      expect(result.users[0].id).toBe('worker-uuid-1');
      expect(result.users[0].latest_location).toEqual(mockLocation);
      expect(shiftsRepository.find).toHaveBeenCalled();
    });

    it('should handle workers without location logs', async () => {
      const mockShift = {
        id: 'shift-uuid-1',
        user: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: { id: 'area-uuid-1', name: 'Taman Bungkul' },
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.find.mockResolvedValue([mockShift]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveUsers();

      expect(result.users[0].latest_location).toBeNull();
    });

    it('should handle workers with null area', async () => {
      const mockShift = {
        id: 'shift-uuid-1',
        user: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: null,
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.find.mockResolvedValue([mockShift]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveUsers();

      expect(result.users[0].shift.area).toBeNull();
    });

    it('should return empty array if no active workers', async () => {
      mockShiftsRepository.find.mockResolvedValue([]);

      const result = await service.getActiveUsers();

      expect(result.users).toEqual([]);
    });
  });

  describe('getAreaStatus', () => {
    it('should return area statistics', async () => {
      const mockAreas = [
        { id: 'area-uuid-1', name: 'Taman Bungkul', is_active: true },
        { id: 'area-uuid-2', name: 'Jalan Raya Darmo', is_active: true },
      ];

      mockAreasRepository.find.mockResolvedValue(mockAreas);
      mockShiftsRepository.count.mockResolvedValueOnce(2); // area 1 active
      mockShiftsRepository.count.mockResolvedValueOnce(1); // area 2 active

      const result = await service.getAreaStatus();

      expect(result.areas).toHaveLength(2);
      expect(result.areas[0].active_workers_count).toBe(2);
      expect(result.areas[1].active_workers_count).toBe(1);
    });

    it('should return empty array if no active areas', async () => {
      mockAreasRepository.find.mockResolvedValue([]);

      const result = await service.getAreaStatus();

      expect(result.areas).toEqual([]);
    });
  });

  describe('getAttendance', () => {
    it('should return attendance report for today', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
        },
        {
          id: 'worker-2',
          username: 'worker2',
          full_name: 'Worker Two',
          role: UserRole.SATGAS,
          is_active: true,
        },
        {
          id: 'worker-3',
          username: 'worker3',
          full_name: 'Worker Three',
          role: UserRole.SATGAS,
          is_active: true,
        },
      ];

      const mockClockedInShifts = [{ user: { id: 'worker-1' } }, { user: { id: 'worker-2' } }];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue(mockClockedInShifts);

      const result = await service.getAttendance();

      expect(result.total_workers).toBe(3);
      expect(result.clocked_in_count).toBe(2);
      expect(result.not_clocked_in).toHaveLength(1);
      expect(result.not_clocked_in[0].id).toBe('worker-3');
    });

    it('should return attendance report for specific date', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
        },
      ];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue([]);

      const result = await service.getAttendance('2026-01-08');

      expect(result.date).toBe('2026-01-08');
      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(0);
      expect(result.not_clocked_in).toHaveLength(1);
    });

    it('should handle 100% attendance', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
        },
      ];

      const mockClockedInShifts = [{ user: { id: 'worker-1' } }];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue(mockClockedInShifts);

      const result = await service.getAttendance();

      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(1);
      expect(result.not_clocked_in).toHaveLength(0);
    });
  });

  describe('getAttendancePaginated', () => {
    it('should return paginated attendance report for today', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
        },
        {
          id: 'worker-2',
          username: 'worker2',
          full_name: 'Worker Two',
          role: UserRole.SATGAS,
          is_active: true,
        },
        {
          id: 'worker-3',
          username: 'worker3',
          full_name: 'Worker Three',
          role: UserRole.SATGAS,
          is_active: true,
        },
      ];

      const mockClockedInShifts = [{ user: { id: 'worker-1' } }, { user: { id: 'worker-2' } }];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue(mockClockedInShifts);

      const result = await service.getAttendancePaginated(undefined, 1, 50);

      expect(result.total_workers).toBe(3);
      expect(result.clocked_in_count).toBe(2);
      expect(result.not_clocked_in.data).toHaveLength(1);
      expect(result.not_clocked_in.data[0].id).toBe('worker-3');
      expect(result.not_clocked_in.meta.total).toBe(1);
      expect(result.not_clocked_in.meta.page).toBe(1);
    });

    it('should return paginated attendance report for specific date', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
        },
      ];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue([]);

      const result = await service.getAttendancePaginated('2026-01-08', 1, 50);

      expect(result.date).toBe('2026-01-08');
      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(0);
      expect(result.not_clocked_in.data).toHaveLength(1);
    });

    it('should handle pagination with multiple pages', async () => {
      const mockAllWorkers = Array.from({ length: 100 }, (_, i) => ({
        id: `worker-${i}`,
        username: `worker${i}`,
        full_name: `Worker ${i}`,
        role: UserRole.SATGAS,
        is_active: true,
      }));

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue([]);

      const result = await service.getAttendancePaginated(undefined, 2, 50);

      expect(result.not_clocked_in.data).toHaveLength(50);
      expect(result.not_clocked_in.meta.page).toBe(2);
      expect(result.not_clocked_in.meta.total).toBe(100);
      expect(result.not_clocked_in.meta.totalPages).toBe(2);
    });

    it('should handle 100% attendance in paginated results', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
        },
      ];

      const mockClockedInShifts = [{ user: { id: 'worker-1' } }];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue(mockClockedInShifts);

      const result = await service.getAttendancePaginated(undefined, 1, 50);

      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(1);
      expect(result.not_clocked_in.data).toHaveLength(0);
      expect(result.not_clocked_in.meta.total).toBe(0);
    });

    it('should include area info when not-clocked-in worker has area_id and area is found', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
          area_id: 'area-1',
        },
      ];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue([]);
      mockAreasRepository.findOne.mockResolvedValue({ id: 'area-1', name: 'Taman Bungkul' });

      const result = await service.getAttendancePaginated(undefined, 1, 50);

      expect(result.not_clocked_in.data[0].area).toEqual({ id: 'area-1', name: 'Taman Bungkul' });
    });

    it('should set area to null when worker has area_id but area is not found', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
          area_id: 'area-missing',
        },
      ];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue([]);
      mockAreasRepository.findOne.mockResolvedValue(null);

      const result = await service.getAttendancePaginated(undefined, 1, 50);

      expect(result.not_clocked_in.data[0].area).toBeNull();
    });
  });

  describe('getAttendance (area_id branches)', () => {
    it('should include area info when not-clocked-in worker has area_id and area is found', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
          area_id: 'area-1',
        },
      ];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue([]);
      mockAreasRepository.findOne.mockResolvedValue({ id: 'area-1', name: 'Taman Bungkul' });

      const result = await service.getAttendance();

      expect(result.not_clocked_in[0].area).toEqual({ id: 'area-1', name: 'Taman Bungkul' });
    });

    it('should set area to null when worker has area_id but area is not found', async () => {
      const mockAllWorkers = [
        {
          id: 'worker-1',
          username: 'worker1',
          full_name: 'Worker One',
          role: UserRole.SATGAS,
          is_active: true,
          area_id: 'area-missing',
        },
      ];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue([]);
      mockAreasRepository.findOne.mockResolvedValue(null);

      const result = await service.getAttendance();

      expect(result.not_clocked_in[0].area).toBeNull();
    });
  });
});
