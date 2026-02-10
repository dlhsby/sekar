import { Test, TestingModule } from '@nestjs/testing';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { Shift } from './entities/shift.entity';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';
import { PaginationDto, PaginatedResponseDto } from '../../common/dto/pagination.dto';

describe('ShiftsController', () => {
  let module: TestingModule;
  let controller: ShiftsController;
  let service: ShiftsService;

  const mockWorker = {
    id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'worker1',
    role: UserRole.SATGAS,
    full_name: 'Worker One',
    is_active: true,
    password_hash: 'hashed',
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockShift: any = {
    id: 'shift-uuid-5e6f7a8b-c9d0-1234-ef01-345678901234',
    worker_id: mockWorker.id,
    worker: mockWorker as any,
    area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    area: {
      id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
      name: 'Taman Bungkul',
    } as any,
    clock_in_time: new Date('2026-01-09T08:00:00Z'),
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_in_photo_url: 'https://s3.amazonaws.com/photo.jpg',
    clock_out_time: null,
    clock_out_gps_lat: null,
    clock_out_gps_lng: null,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockShiftsService = {
    clockIn: jest.fn(),
    clockOut: jest.fn(),
    findActiveShift: jest.fn(),
    findByWorkerId: jest.fn(),
    findAllActiveShifts: jest.fn(),
    findAllActiveShiftsPaginated: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [ShiftsController],
      providers: [
        {
          provide: ShiftsService,
          useValue: mockShiftsService,
        },
      ],
    }).compile();

    controller = module.get<ShiftsController>(ShiftsController);
    service = module.get<ShiftsService>(ShiftsService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('clockIn', () => {
    const clockInDto: ClockInDto = {
      area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    };

    it('should clock in a worker with provided area_id', async () => {
      mockShiftsService.clockIn.mockResolvedValue(mockShift);

      const result = await controller.clockIn(mockWorker as any, clockInDto);

      expect(result).toEqual(mockShift);
      expect(service.clockIn).toHaveBeenCalledWith(mockWorker.id, clockInDto);
      expect(service.clockIn).toHaveBeenCalledTimes(1);
    });

    it('should clock in a worker with auto-detected area', async () => {
      const dtoWithoutArea = {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      };
      mockShiftsService.clockIn.mockResolvedValue(mockShift);

      const result = await controller.clockIn(mockWorker as any, dtoWithoutArea);

      expect(result).toEqual(mockShift);
      expect(service.clockIn).toHaveBeenCalledWith(mockWorker.id, dtoWithoutArea);
    });

    it('should throw BadRequestException if already clocked in', async () => {
      mockShiftsService.clockIn.mockRejectedValue(new BadRequestException('Already clocked in'));

      await expect(controller.clockIn(mockWorker as any, clockInDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException if photo upload fails', async () => {
      mockShiftsService.clockIn.mockRejectedValue(
        new BadRequestException('Failed to upload selfie photo'),
      );

      await expect(controller.clockIn(mockWorker as any, clockInDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('clockOut', () => {
    const clockOutDto: ClockOutDto = {
      gps_lat: -7.2906,
      gps_lng: 112.7399,
    };

    it('should clock out a worker', async () => {
      const clockedOutShift = {
        ...mockShift,
        clock_out_time: new Date('2026-01-09T16:00:00Z'),
        clock_out_gps_lat: clockOutDto.gps_lat,
        clock_out_gps_lng: clockOutDto.gps_lng,
      };
      mockShiftsService.clockOut.mockResolvedValue(clockedOutShift);

      const result = await controller.clockOut(mockWorker as any, clockOutDto);

      expect(result).toEqual(clockedOutShift);
      expect(service.clockOut).toHaveBeenCalledWith(mockWorker.id, clockOutDto);
      expect(service.clockOut).toHaveBeenCalledTimes(1);
    });

    it('should throw BadRequestException if no active shift', async () => {
      mockShiftsService.clockOut.mockRejectedValue(
        new BadRequestException('No active shift found'),
      );

      await expect(controller.clockOut(mockWorker as any, clockOutDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('getCurrentShift', () => {
    it('should return current active shift', async () => {
      mockShiftsService.findActiveShift.mockResolvedValue(mockShift);

      const result = await controller.getCurrentShift(mockWorker as any);

      expect(result).toEqual(mockShift);
      expect(service.findActiveShift).toHaveBeenCalledWith(mockWorker.id);
    });

    it('should return null if no active shift', async () => {
      mockShiftsService.findActiveShift.mockResolvedValue(null);

      const result = await controller.getCurrentShift(mockWorker as any);

      expect(result).toBeNull();
    });
  });

  describe('getMyShifts', () => {
    it('should return shift history for worker', async () => {
      const shifts = [mockShift, { ...mockShift, id: 'shift-2' }];
      mockShiftsService.findByWorkerId.mockResolvedValue(shifts);

      const result = await controller.getMyShifts(mockWorker as any);

      expect(result).toEqual(shifts);
      expect(service.findByWorkerId).toHaveBeenCalledWith(mockWorker.id);
    });

    it('should return empty array if no shifts', async () => {
      mockShiftsService.findByWorkerId.mockResolvedValue([]);

      const result = await controller.getMyShifts(mockWorker as any);

      expect(result).toEqual([]);
    });
  });

  describe('getActiveShifts', () => {
    it('should return paginated active shifts', async () => {
      const activeShifts = [mockShift, { ...mockShift, worker_id: 'worker-2' }];
      const paginatedResult = new PaginatedResponseDto(activeShifts, 2, 1, 50);
      mockShiftsService.findAllActiveShiftsPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getActiveShifts(paginationDto);

      expect(result).toEqual(paginatedResult);
      expect(service.findAllActiveShiftsPaginated).toHaveBeenCalledWith(1, 50);
    });

    it('should return empty paginated result if no active shifts', async () => {
      const paginatedResult = new PaginatedResponseDto([], 0, 1, 50);
      mockShiftsService.findAllActiveShiftsPaginated.mockResolvedValue(paginatedResult);

      const paginationDto: PaginationDto = { page: 1, limit: 50 };
      const result = await controller.getActiveShifts(paginationDto);

      expect(result).toEqual(paginatedResult);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });
  });
});
