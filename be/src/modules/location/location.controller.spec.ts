import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationLog } from './entities/location-log.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';

describe('LocationController', () => {
  let controller: LocationController;
  let service: LocationService;

  const mockLocationService = {
    createBatch: jest.fn(),
    getWorkerHistory: jest.fn(),
    getLatestLocation: jest.fn(),
  };

  const mockWorker: User = {
    id: 'worker-uuid-123',
    username: 'worker1',
    password_hash: 'hashed',
    full_name: 'Worker One',
    role: UserRole.WORKER,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLocationLog: LocationLog = {
    id: 'location-uuid-1',
    worker_id: mockWorker.id,
    shift_id: 'shift-uuid-1',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    accuracy_meters: 12.5,
    battery_level: 85,
    logged_at: new Date('2026-01-09T10:30:00Z'),
    worker: mockWorker,
    shift: null as any,
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [
        {
          provide: LocationService,
          useValue: mockLocationService,
        },
      ],
    }).compile();

    controller = module.get<LocationController>(LocationController);
    service = module.get<LocationService>(LocationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBatch', () => {
    const createDto: CreateLocationBatchDto = {
      shift_id: 'shift-uuid-1',
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

    it('should batch upload locations', async () => {
      mockLocationService.createBatch.mockResolvedValue({ count: 2 });

      const result = await controller.createBatch(createDto, mockWorker);

      expect(service.createBatch).toHaveBeenCalledWith(createDto, mockWorker.id);
      expect(result).toEqual({ count: 2 });
    });

    it('should return count of inserted locations', async () => {
      mockLocationService.createBatch.mockResolvedValue({ count: 10 });

      const result = await controller.createBatch(
        { ...createDto, locations: Array(10).fill(createDto.locations[0]) },
        mockWorker,
      );

      expect(result.count).toBe(10);
    });
  });

  describe('getWorkerHistory', () => {
    const workerId = 'worker-uuid-123';

    it('should return worker location history with no filters', async () => {
      const mockLocations = [mockLocationLog];
      mockLocationService.getWorkerHistory.mockResolvedValue(mockLocations);

      const result = await controller.getWorkerHistory(workerId);

      expect(service.getWorkerHistory).toHaveBeenCalledWith(workerId, {
        from_date: undefined,
        to_date: undefined,
        shift_id: undefined,
      });
      expect(result).toEqual(mockLocations);
    });

    it('should filter by date range', async () => {
      const mockLocations = [mockLocationLog];
      mockLocationService.getWorkerHistory.mockResolvedValue(mockLocations);

      const result = await controller.getWorkerHistory(
        workerId,
        '2026-01-01',
        '2026-01-31',
      );

      expect(service.getWorkerHistory).toHaveBeenCalledWith(workerId, {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
        shift_id: undefined,
      });
      expect(result).toEqual(mockLocations);
    });

    it('should filter by shift_id', async () => {
      const mockLocations = [mockLocationLog];
      mockLocationService.getWorkerHistory.mockResolvedValue(mockLocations);

      const result = await controller.getWorkerHistory(
        workerId,
        undefined,
        undefined,
        'shift-uuid-1',
      );

      expect(service.getWorkerHistory).toHaveBeenCalledWith(workerId, {
        from_date: undefined,
        to_date: undefined,
        shift_id: 'shift-uuid-1',
      });
      expect(result).toEqual(mockLocations);
    });
  });

  describe('getLatestLocation', () => {
    const workerId = 'worker-uuid-123';

    it('should return latest location', async () => {
      mockLocationService.getLatestLocation.mockResolvedValue(mockLocationLog);

      const result = await controller.getLatestLocation(workerId);

      expect(service.getLatestLocation).toHaveBeenCalledWith(workerId);
      expect(result).toEqual(mockLocationLog);
    });

    it('should return null if no location found', async () => {
      mockLocationService.getLatestLocation.mockResolvedValue(null);

      const result = await controller.getLatestLocation(workerId);

      expect(result).toBeNull();
    });
  });
});
