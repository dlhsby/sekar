import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupervisorService } from './supervisor.service';
import { Shift } from '../shifts/entities/shift.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { WorkerAssignment } from '../worker-assignments/entities/worker-assignment.entity';
import { LocationLog } from '../location/entities/location-log.entity';

describe('SupervisorService', () => {
  let module: TestingModule;
  let service: SupervisorService;
  let shiftsRepository: Repository<Shift>;
  let usersRepository: Repository<User>;
  let areasRepository: Repository<Area>;
  let workerAssignmentsRepository: Repository<WorkerAssignment>;
  let locationLogsRepository: Repository<LocationLog>;

  const mockShiftsRepository = {
    find: jest.fn(),
    count: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockUsersRepository = {
    find: jest.fn(),
  };

  const mockAreasRepository = {
    find: jest.fn(),
  };

  const mockWorkerAssignmentsRepository = {
    count: jest.fn(),
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
          provide: getRepositoryToken(WorkerAssignment),
          useValue: mockWorkerAssignmentsRepository,
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
    workerAssignmentsRepository = module.get<Repository<WorkerAssignment>>(
      getRepositoryToken(WorkerAssignment),
    );
    locationLogsRepository = module.get<Repository<LocationLog>>(getRepositoryToken(LocationLog));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getActiveWorkersPaginated', () => {
    beforeEach(() => {
      mockShiftsRepository.findAndCount = jest.fn();
    });

    it('should return paginated active workers with latest locations', async () => {
      const mockWorker = {
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
        worker: mockWorker,
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

      const result = await service.getActiveWorkersPaginated(1, 50);

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
        worker: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: { id: 'area-uuid-1', name: 'Taman Bungkul' },
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.findAndCount.mockResolvedValue([[mockShift], 1]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveWorkersPaginated(1, 50);

      expect(result.data[0].latest_location).toBeNull();
    });

    it('should return empty paginated results if no active workers', async () => {
      mockShiftsRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getActiveWorkersPaginated(1, 50);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('should handle workers with null area in paginated results', async () => {
      const mockShift = {
        id: 'shift-uuid-1',
        worker: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: null,
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.findAndCount.mockResolvedValue([[mockShift], 1]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveWorkersPaginated(1, 50);

      expect(result.data[0].shift.area).toBeNull();
    });

    it('should handle pagination correctly with page 2', async () => {
      const mockShifts = [
        {
          id: 'shift-2',
          worker: { id: 'worker-2', username: 'worker2', full_name: 'Worker Two' },
          area: { id: 'area-1', name: 'Area 1' },
          clock_in_time: new Date(),
          clock_out_time: null,
        },
      ];

      mockShiftsRepository.findAndCount.mockResolvedValue([mockShifts, 100]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveWorkersPaginated(2, 50);

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

  describe('getActiveWorkers', () => {
    it('should return active workers with latest locations', async () => {
      const mockWorker = {
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
        worker: mockWorker,
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

      const result = await service.getActiveWorkers();

      expect(result.workers).toHaveLength(1);
      expect(result.workers[0].id).toBe('worker-uuid-1');
      expect(result.workers[0].latest_location).toEqual(mockLocation);
      expect(shiftsRepository.find).toHaveBeenCalled();
    });

    it('should handle workers without location logs', async () => {
      const mockShift = {
        id: 'shift-uuid-1',
        worker: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: { id: 'area-uuid-1', name: 'Taman Bungkul' },
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.find.mockResolvedValue([mockShift]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveWorkers();

      expect(result.workers[0].latest_location).toBeNull();
    });

    it('should handle workers with null area', async () => {
      const mockShift = {
        id: 'shift-uuid-1',
        worker: { id: 'worker-uuid-1', username: 'worker1', full_name: 'Worker One' },
        area: null,
        clock_in_time: new Date(),
        clock_out_time: null,
      };

      mockShiftsRepository.find.mockResolvedValue([mockShift]);
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getActiveWorkers();

      expect(result.workers[0].shift.area).toBeNull();
    });

    it('should return empty array if no active workers', async () => {
      mockShiftsRepository.find.mockResolvedValue([]);

      const result = await service.getActiveWorkers();

      expect(result.workers).toEqual([]);
    });
  });

  describe('getAreaStatus', () => {
    it('should return area statistics', async () => {
      const mockAreas = [
        { id: 'area-uuid-1', name: 'Taman Bungkul', is_active: true },
        { id: 'area-uuid-2', name: 'Jalan Raya Darmo', is_active: true },
      ];

      mockAreasRepository.find.mockResolvedValue(mockAreas);
      mockWorkerAssignmentsRepository.count.mockResolvedValueOnce(3); // area 1 assigned
      mockShiftsRepository.count.mockResolvedValueOnce(2); // area 1 active
      mockWorkerAssignmentsRepository.count.mockResolvedValueOnce(2); // area 2 assigned
      mockShiftsRepository.count.mockResolvedValueOnce(1); // area 2 active

      const result = await service.getAreaStatus();

      expect(result.areas).toHaveLength(2);
      expect(result.areas[0].assigned_workers_count).toBe(3);
      expect(result.areas[0].active_workers_count).toBe(2);
      expect(result.areas[1].assigned_workers_count).toBe(2);
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

      const mockClockedInShifts = [{ worker: { id: 'worker-1' } }, { worker: { id: 'worker-2' } }];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue(mockClockedInShifts);
      mockWorkerAssignmentsRepository.findOne.mockResolvedValueOnce(null); // worker-3 no assignment

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
      mockWorkerAssignmentsRepository.findOne.mockResolvedValue({
        area: { id: 'area-1', name: 'Taman Bungkul' },
      });

      const result = await service.getAttendance('2026-01-08');

      expect(result.date).toBe('2026-01-08');
      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(0);
      expect(result.not_clocked_in).toHaveLength(1);
      expect(result.not_clocked_in[0].area).toEqual({
        id: 'area-1',
        name: 'Taman Bungkul',
      });
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

      const mockClockedInShifts = [{ worker: { id: 'worker-1' } }];

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

      const mockClockedInShifts = [{ worker: { id: 'worker-1' } }, { worker: { id: 'worker-2' } }];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue(mockClockedInShifts);
      mockWorkerAssignmentsRepository.findOne.mockResolvedValueOnce(null); // worker-3 no assignment

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
      mockWorkerAssignmentsRepository.findOne.mockResolvedValue({
        area: { id: 'area-1', name: 'Taman Bungkul' },
      });

      const result = await service.getAttendancePaginated('2026-01-08', 1, 50);

      expect(result.date).toBe('2026-01-08');
      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(0);
      expect(result.not_clocked_in.data).toHaveLength(1);
      expect(result.not_clocked_in.data[0].area).toEqual({
        id: 'area-1',
        name: 'Taman Bungkul',
      });
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
      mockWorkerAssignmentsRepository.findOne.mockResolvedValue(null);

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

      const mockClockedInShifts = [{ worker: { id: 'worker-1' } }];

      mockUsersRepository.find.mockResolvedValue(mockAllWorkers);
      mockShiftsRepository.find.mockResolvedValue(mockClockedInShifts);

      const result = await service.getAttendancePaginated(undefined, 1, 50);

      expect(result.total_workers).toBe(1);
      expect(result.clocked_in_count).toBe(1);
      expect(result.not_clocked_in.data).toHaveLength(0);
      expect(result.not_clocked_in.meta.total).toBe(0);
    });
  });
});
