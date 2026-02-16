import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationLog } from './entities/location-log.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';

describe('LocationService', () => {
  let module: TestingModule;
  let service: LocationService;
  let shiftsRepository: jest.Mocked<Repository<Shift>>;
  let dataSource: jest.Mocked<DataSource>;
  let locationLogsRepository: Repository<LocationLog>;

  const mockLocationLogsRepository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockShiftsRepository = {
    findOne: jest.fn(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      save: jest.fn(),
    },
  };

  const mockDataSource = {
    createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: getRepositoryToken(LocationLog),
          useValue: mockLocationLogsRepository,
        },
        {
          provide: getRepositoryToken(Shift),
          useValue: mockShiftsRepository,
        },
        {
          provide: DataSource,
          useValue: mockDataSource,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    locationLogsRepository = module.get<Repository<LocationLog>>(getRepositoryToken(LocationLog));
    shiftsRepository = module.get(getRepositoryToken(Shift)) as jest.Mocked<Repository<Shift>>;
    dataSource = module.get(DataSource) as jest.Mocked<DataSource>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('createBatch', () => {
    const userId = 'user-uuid-123';
    const shiftId = 'shift-uuid-456';
    const createDto: CreateLocationBatchDto = {
      shift_id: shiftId,
      locations: [
        {
          gps_lat: -7.2905,
          gps_lng: 112.7398,
          accuracy_meters: 12.5,
          battery_level: 85,
          logged_at: '2026-01-09T10:30:00Z',
        },
        {
          gps_lat: -7.2906,
          gps_lng: 112.7399,
          accuracy_meters: 10.0,
          battery_level: 83,
          logged_at: '2026-01-09T10:35:00Z',
        },
      ],
    };

    const mockShift = {
      id: shiftId,
      user_id: userId,
      clock_in_time: new Date(),
      clock_out_time: null,
    };

    it('should successfully batch insert locations', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockLocationLogsRepository.create.mockImplementation((data) => data);

      const result = await service.createBatch(createDto, userId);

      expect(result.count).toBe(2);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(LocationLog, expect.any(Array));
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if shift not found', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(null);

      await expect(service.createBatch(createDto, userId)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if shift is completed', async () => {
      const completedShift = { ...mockShift, clock_out_time: new Date() };
      mockShiftsRepository.findOne.mockResolvedValue(completedShift);

      await expect(service.createBatch(createDto, userId)).rejects.toThrow(BadRequestException);
    });

    it('should rollback transaction on error', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockLocationLogsRepository.create.mockImplementation((data) => data);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createBatch(createDto, userId)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getUserHistory', () => {
    const userId = 'user-uuid-123';

    it('should return location history with no filters', async () => {
      const mockLocations = [
        { id: 'loc-1', user_id: userId },
        { id: 'loc-2', user_id: userId },
      ];
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getUserHistory(userId, {});

      expect(result).toEqual(mockLocations);
      expect(locationLogsRepository.find).toHaveBeenCalled();
    });

    it('should filter by shift_id', async () => {
      const mockLocations = [{ id: 'loc-1', shift_id: 'shift-123' }];
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getUserHistory(userId, {
        shift_id: 'shift-123',
      });

      expect(result).toEqual(mockLocations);
    });

    it('should filter by date range', async () => {
      const mockLocations = [{ id: 'loc-1' }];
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getUserHistory(userId, {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result).toEqual(mockLocations);
    });

    it('should filter by from_date only (to current date)', async () => {
      const mockLocations = [{ id: 'loc-1' }];
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getUserHistory(userId, {
        from_date: '2026-01-01',
      });

      expect(result).toEqual(mockLocations);
    });

    it('should limit results to 1000 records', async () => {
      const mockLocations = Array(1000).fill({ id: 'loc-1' });
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getUserHistory(userId, {});

      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getUserHistoryPaginated', () => {
    const userId = 'user-uuid-123';

    beforeEach(() => {
      mockLocationLogsRepository.findAndCount = jest.fn();
    });

    it('should return paginated location history with default parameters', async () => {
      const mockData = [
        { id: 'loc-1', user_id: userId },
        { id: 'loc-2', user_id: userId },
      ];
      mockLocationLogsRepository.findAndCount.mockResolvedValue([mockData, 100]);

      const result = await service.getUserHistoryPaginated(userId, {}, 1, 50);

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(100);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(result.meta.totalPages).toBe(2);
      expect(mockLocationLogsRepository.findAndCount).toHaveBeenCalled();
    });

    it('should filter by shift_id in paginated results', async () => {
      const mockData = [{ id: 'loc-1', shift_id: 'shift-123' }];
      mockLocationLogsRepository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.getUserHistoryPaginated(
        userId,
        { shift_id: 'shift-123' },
        1,
        50,
      );

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by date range in paginated results', async () => {
      const mockData = [{ id: 'loc-1', logged_at: new Date('2026-01-15') }];
      mockLocationLogsRepository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.getUserHistoryPaginated(
        userId,
        {
          from_date: '2026-01-01',
          to_date: '2026-01-31',
        },
        1,
        50,
      );

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
    });

    it('should filter by from_date only in paginated results', async () => {
      const mockData = [{ id: 'loc-1', logged_at: new Date('2026-01-15') }];
      mockLocationLogsRepository.findAndCount.mockResolvedValue([mockData, 1]);

      const result = await service.getUserHistoryPaginated(
        userId,
        { from_date: '2026-01-01' },
        1,
        50,
      );

      expect(result.data).toEqual(mockData);
      expect(result.meta.total).toBe(1);
    });

    it('should handle pagination with page 2', async () => {
      const mockData = [{ id: 'loc-51' }];
      mockLocationLogsRepository.findAndCount.mockResolvedValue([mockData, 100]);

      const result = await service.getUserHistoryPaginated(userId, {}, 2, 50);

      expect(result.meta.page).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(mockLocationLogsRepository.findAndCount).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 50,
          take: 50,
        }),
      );
    });

    it('should return empty results when no data found', async () => {
      mockLocationLogsRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.getUserHistoryPaginated(userId, {}, 1, 50);

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });

  describe('getLatestLocation', () => {
    const userId = 'user-uuid-123';

    it('should return latest location', async () => {
      const mockLocation = {
        id: 'loc-1',
        user_id: userId,
        logged_at: new Date('2026-01-09T10:30:00Z'),
      };
      mockLocationLogsRepository.findOne.mockResolvedValue(mockLocation);

      const result = await service.getLatestLocation(userId);

      expect(result).toEqual(mockLocation);
      expect(locationLogsRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: userId },
        relations: ['shift', 'shift.area', 'user'],
        order: { logged_at: 'DESC' },
      });
    });

    it('should return null if no location found', async () => {
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getLatestLocation(userId);

      expect(result).toBeNull();
    });
  });
});
