import { Test, TestingModule } from '@nestjs/testing';
import { LocationController } from './location.controller';
import { LocationService } from './location.service';
import { LocationLog } from './entities/location-log.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { CreateLocationBatchDto } from './dto/create-location-batch.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

describe('LocationController', () => {
  let module: TestingModule;
  let controller: LocationController;
  let service: LocationService;

  const mockLocationService = {
    createBatch: jest.fn(),
    getUserHistoryPaginated: jest.fn(),
    getLatestLocation: jest.fn(),
  };

  const mockUser: User = {
    id: 'user-uuid-123',
    username: 'user1',
    password_hash: 'hashed',
    full_name: 'User One',
    phone_number: null,
    profile_picture_url: null,
    role: UserRole.SATGAS,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockLocationLog: LocationLog = {
    id: 'location-uuid-1',
    user_id: mockUser.id,
    shift_id: 'shift-uuid-1',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    accuracy_meters: 12.5,
    battery_level: 85,
    logged_at: new Date('2026-01-09T10:30:00Z'),
    user: mockUser,
    shift: null as any,
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
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

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
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

      const result = await controller.createBatch(createDto, mockUser);

      expect(service.createBatch).toHaveBeenCalledWith(createDto, mockUser.id);
      expect(result).toEqual({ count: 2 });
    });

    it('should return count of inserted locations', async () => {
      mockLocationService.createBatch.mockResolvedValue({ count: 10 });

      const result = await controller.createBatch(
        { ...createDto, locations: Array(10).fill(createDto.locations[0]) },
        mockUser,
      );

      expect(result.count).toBe(10);
    });
  });

  describe('getUserHistory', () => {
    const userId = 'user-uuid-123';

    it('should return paginated user location history with no filters', async () => {
      const paginatedResult = {
        data: [mockLocationLog],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockLocationService.getUserHistoryPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getUserHistory(userId, paginationDto);

      expect(service.getUserHistoryPaginated).toHaveBeenCalledWith(
        userId,
        {
          from_date: undefined,
          to_date: undefined,
          shift_id: undefined,
        },
        1,
        50,
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should filter by date range with pagination', async () => {
      const paginatedResult = {
        data: [mockLocationLog],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockLocationService.getUserHistoryPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getUserHistory(
        userId,
        paginationDto,
        '2026-01-01',
        '2026-01-31',
      );

      expect(service.getUserHistoryPaginated).toHaveBeenCalledWith(
        userId,
        {
          from_date: '2026-01-01',
          to_date: '2026-01-31',
          shift_id: undefined,
        },
        1,
        50,
      );
      expect(result).toEqual(paginatedResult);
    });

    it('should filter by shift_id with pagination', async () => {
      const paginatedResult = {
        data: [mockLocationLog],
        meta: { total: 1, page: 1, limit: 50, totalPages: 1 },
      };
      mockLocationService.getUserHistoryPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getUserHistory(
        userId,
        paginationDto,
        undefined,
        undefined,
        'shift-uuid-1',
      );

      expect(service.getUserHistoryPaginated).toHaveBeenCalledWith(
        userId,
        {
          from_date: undefined,
          to_date: undefined,
          shift_id: 'shift-uuid-1',
        },
        1,
        50,
      );
      expect(result).toEqual(paginatedResult);
    });
  });

  describe('getLatestLocation', () => {
    const userId = 'user-uuid-123';

    it('should return latest location', async () => {
      mockLocationService.getLatestLocation.mockResolvedValue(mockLocationLog);

      const result = await controller.getLatestLocation(userId);

      expect(service.getLatestLocation).toHaveBeenCalledWith(userId);
      expect(result).toEqual(mockLocationLog);
    });

    it('should return null if no location found', async () => {
      mockLocationService.getLatestLocation.mockResolvedValue(null);

      const result = await controller.getLatestLocation(userId);

      expect(result).toBeNull();
    });
  });
});
