import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { LocationService } from './location.service';
import { LocationLog } from './entities/location-log.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';

describe('LocationService', () => {
  let service: LocationService;
  let locationLogsRepository: Repository<LocationLog>;
  let shiftsRepository: Repository<Shift>;
  let dataSource: DataSource;

  const mockLocationLogsRepository = {
    create: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
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
    const module: TestingModule = await Test.createTestingModule({
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
    locationLogsRepository = module.get<Repository<LocationLog>>(
      getRepositoryToken(LocationLog),
    );
    shiftsRepository = module.get<Repository<Shift>>(getRepositoryToken(Shift));
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBatch', () => {
    const workerId = 'worker-uuid-123';
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
      worker_id: workerId,
      clock_in_time: new Date(),
      clock_out_time: null,
    };

    it('should successfully batch insert locations', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockLocationLogsRepository.create.mockImplementation((data) => data);

      const result = await service.createBatch(createDto, workerId);

      expect(result.count).toBe(2);
      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.save).toHaveBeenCalledWith(
        LocationLog,
        expect.any(Array),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });

    it('should throw NotFoundException if shift not found', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(null);

      await expect(service.createBatch(createDto, workerId)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should throw BadRequestException if shift is completed', async () => {
      const completedShift = { ...mockShift, clock_out_time: new Date() };
      mockShiftsRepository.findOne.mockResolvedValue(completedShift);

      await expect(service.createBatch(createDto, workerId)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should rollback transaction on error', async () => {
      mockShiftsRepository.findOne.mockResolvedValue(mockShift);
      mockLocationLogsRepository.create.mockImplementation((data) => data);
      mockQueryRunner.manager.save.mockRejectedValue(new Error('Database error'));

      await expect(service.createBatch(createDto, workerId)).rejects.toThrow();
      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
    });
  });

  describe('getWorkerHistory', () => {
    const workerId = 'worker-uuid-123';

    it('should return location history with no filters', async () => {
      const mockLocations = [
        { id: 'loc-1', worker_id: workerId },
        { id: 'loc-2', worker_id: workerId },
      ];
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getWorkerHistory(workerId, {});

      expect(result).toEqual(mockLocations);
      expect(locationLogsRepository.find).toHaveBeenCalled();
    });

    it('should filter by shift_id', async () => {
      const mockLocations = [{ id: 'loc-1', shift_id: 'shift-123' }];
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getWorkerHistory(workerId, {
        shift_id: 'shift-123',
      });

      expect(result).toEqual(mockLocations);
    });

    it('should filter by date range', async () => {
      const mockLocations = [{ id: 'loc-1' }];
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getWorkerHistory(workerId, {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(result).toEqual(mockLocations);
    });

    it('should limit results to 1000 records', async () => {
      const mockLocations = Array(1000).fill({ id: 'loc-1' });
      mockLocationLogsRepository.find.mockResolvedValue(mockLocations);

      const result = await service.getWorkerHistory(workerId, {});

      expect(result.length).toBeLessThanOrEqual(1000);
    });
  });

  describe('getLatestLocation', () => {
    const workerId = 'worker-uuid-123';

    it('should return latest location', async () => {
      const mockLocation = {
        id: 'loc-1',
        worker_id: workerId,
        logged_at: new Date('2026-01-09T10:30:00Z'),
      };
      mockLocationLogsRepository.findOne.mockResolvedValue(mockLocation);

      const result = await service.getLatestLocation(workerId);

      expect(result).toEqual(mockLocation);
      expect(locationLogsRepository.findOne).toHaveBeenCalledWith({
        where: { worker_id: workerId },
        relations: ['shift', 'shift.area', 'worker'],
        order: { logged_at: 'DESC' },
      });
    });

    it('should return null if no location found', async () => {
      mockLocationLogsRepository.findOne.mockResolvedValue(null);

      const result = await service.getLatestLocation(workerId);

      expect(result).toBeNull();
    });
  });
});
