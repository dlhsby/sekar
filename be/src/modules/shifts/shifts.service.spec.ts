import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { Shift } from './entities/shift.entity';
import { WorkerSchedule } from '../worker-schedules/entities/worker-schedule.entity';
import { WorkerAssignment } from '../worker-assignments/entities/worker-assignment.entity';
import { AreasService } from '../areas/areas.service';
import { WorkerAssignmentsService } from '../worker-assignments/worker-assignments.service';
import { S3Service } from '../../shared/services/s3.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { UserRole } from '../users/entities/user.entity';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';

describe('ShiftsService', () => {
  let module: TestingModule;
  let service: ShiftsService;
  let repository: jest.Mocked<Repository<Shift>>;
  let workerScheduleRepo: jest.Mocked<Repository<WorkerSchedule>>;
  let workerAssignmentRepo: jest.Mocked<Repository<WorkerAssignment>>;
  let areasService: jest.Mocked<AreasService>;
  let workerAssignmentsService: jest.Mocked<WorkerAssignmentsService>;
  let s3Service: jest.Mocked<S3Service>;

  const mockWorker = {
    id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'worker1',
    role: UserRole.SATGAS,
    full_name: 'Worker One',
    is_active: true,
  };

  const mockArea = {
    id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 150,
    is_active: true,
  };

  const mockAssignment = {
    id: 'assignment-uuid-4d5e6f7a-b8c9-0123-def0-234567890123',
    worker_id: mockWorker.id,
    area_id: mockArea.id,
    area: mockArea as any,
  };

  const mockShift: any = {
    id: 'shift-uuid-5e6f7a8b-c9d0-1234-ef01-345678901234',
    worker_id: mockWorker.id,
    worker: mockWorker as any,
    area_id: mockArea.id,
    area: mockArea as any,
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

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
  };

  const mockAreasService = {
    findOne: jest.fn(),
  };

  const mockWorkerAssignmentsService = {
    getWorkerAssignment: jest.fn(),
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
    generateKey: jest.fn(),
  };

  const mockWorkerScheduleRepo = {
    findOne: jest.fn(),
  };

  const mockWorkerAssignmentRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        ShiftsService,
        {
          provide: getRepositoryToken(Shift),
          useValue: mockRepository,
        },
        {
          provide: getRepositoryToken(WorkerSchedule),
          useValue: mockWorkerScheduleRepo,
        },
        {
          provide: getRepositoryToken(WorkerAssignment),
          useValue: mockWorkerAssignmentRepo,
        },
        {
          provide: AreasService,
          useValue: mockAreasService,
        },
        {
          provide: WorkerAssignmentsService,
          useValue: mockWorkerAssignmentsService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    repository = module.get(getRepositoryToken(Shift)) as jest.Mocked<Repository<Shift>>;
    workerScheduleRepo = module.get(getRepositoryToken(WorkerSchedule)) as jest.Mocked<
      Repository<WorkerSchedule>
    >;
    workerAssignmentRepo = module.get(getRepositoryToken(WorkerAssignment)) as jest.Mocked<
      Repository<WorkerAssignment>
    >;
    areasService = module.get(AreasService) as jest.Mocked<AreasService>;
    workerAssignmentsService = module.get(
      WorkerAssignmentsService,
    ) as jest.Mocked<WorkerAssignmentsService>;
    s3Service = module.get(S3Service) as jest.Mocked<S3Service>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getActiveArea', () => {
    it('should return area from WorkerSchedule when exists', async () => {
      const mockSchedule = {
        id: 'schedule-uuid',
        user_id: mockWorker.id,
        area_id: mockArea.id,
        area: mockArea,
        effective_date: new Date('2026-01-01'),
      };
      mockWorkerScheduleRepo.findOne.mockResolvedValue(mockSchedule as any);

      const result = await service.getActiveArea(mockWorker.id);

      expect(result).toEqual(mockArea);
      expect(mockWorkerScheduleRepo.findOne).toHaveBeenCalled();
    });

    it('should fallback to WorkerAssignment when no WorkerSchedule', async () => {
      mockWorkerScheduleRepo.findOne.mockResolvedValue(null);
      mockWorkerAssignmentRepo.findOne.mockResolvedValue(mockAssignment as any);

      const result = await service.getActiveArea(mockWorker.id);

      expect(result).toEqual(mockArea);
      expect(mockWorkerAssignmentRepo.findOne).toHaveBeenCalled();
    });

    it('should return null when no assignment found', async () => {
      mockWorkerScheduleRepo.findOne.mockResolvedValue(null);
      mockWorkerAssignmentRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveArea(mockWorker.id);

      expect(result).toBeNull();
    });
  });

  describe('clockIn', () => {
    const clockInDto: ClockInDto = {
      area_id: mockArea.id,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    };

    it('should successfully clock in a worker with area_id provided', async () => {
      mockRepository.findOne.mockResolvedValue(null); // No active shift
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockRepository.create.mockReturnValue(mockShift);
      mockRepository.save.mockResolvedValue(mockShift);

      const result = await service.clockIn(mockWorker.id, clockInDto);

      expect(result).toEqual(mockShift);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { worker_id: mockWorker.id, clock_out_time: IsNull() },
        relations: ['area', 'area.areaType', 'worker'],
      });
      expect(mockAreasService.findOne).toHaveBeenCalledWith(mockArea.id);
      expect(mockS3Service.uploadFile).toHaveBeenCalled();
    });

    it('should successfully clock in with auto-detected area when area_id not provided', async () => {
      const dtoWithoutArea = {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      };

      const mockSchedule = {
        id: 'schedule-uuid',
        user_id: mockWorker.id,
        area_id: mockArea.id,
        area: mockArea,
        effective_date: new Date('2026-01-01'),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockWorkerScheduleRepo.findOne.mockResolvedValue(mockSchedule as any);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockRepository.create.mockReturnValue(mockShift);
      mockRepository.save.mockResolvedValue(mockShift);

      const result = await service.clockIn(mockWorker.id, dtoWithoutArea);

      expect(result).toEqual(mockShift);
      expect(mockWorkerScheduleRepo.findOne).toHaveBeenCalled();
      expect(mockAreasService.findOne).not.toHaveBeenCalled();
    });

    it('should allow clock-in without area when no assignment found', async () => {
      const dtoWithoutArea = {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      };

      const shiftWithoutArea = {
        ...mockShift,
        area_id: null,
        area: null,
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockWorkerScheduleRepo.findOne.mockResolvedValue(null);
      mockWorkerAssignmentRepo.findOne.mockResolvedValue(null);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockRepository.create.mockReturnValue(shiftWithoutArea);
      mockRepository.save.mockResolvedValue(shiftWithoutArea);

      const result = await service.clockIn(mockWorker.id, dtoWithoutArea);

      expect(result).toEqual(shiftWithoutArea);
      expect(result.area_id).toBeNull();
    });

    it('should throw ApiException with SHIFT_ALREADY_ACTIVE if worker already clocked in', async () => {
      mockRepository.findOne.mockResolvedValue(mockShift);

      await expect(service.clockIn(mockWorker.id, clockInDto)).rejects.toThrow(ApiException);

      try {
        await service.clockIn(mockWorker.id, clockInDto);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_ALREADY_ACTIVE);
        expect(error.message).toContain('Already clocked in');
        expect(error.getDetails()).toHaveProperty('activeShiftId');
      }
    });

    it('should throw ApiException with SHIFT_PHOTO_UPLOAD_FAILED if selfie upload fails', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockRejectedValue(new Error('S3 upload failed'));

      try {
        await service.clockIn(mockWorker.id, clockInDto);
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_PHOTO_UPLOAD_FAILED);
        expect(error.message).toContain('Failed to upload selfie photo');
      }
    });
  });

  describe('clockOut', () => {
    const clockOutDto: ClockOutDto = {
      gps_lat: -7.2906,
      gps_lng: 112.7399,
    };

    it('should successfully clock out a worker', async () => {
      const activeShift = { ...mockShift };
      mockRepository.findOne.mockResolvedValue(activeShift);
      mockRepository.save.mockResolvedValue({
        ...activeShift,
        clock_out_time: new Date(),
        clock_out_gps_lat: clockOutDto.gps_lat,
        clock_out_gps_lng: clockOutDto.gps_lng,
      });

      const result = await service.clockOut(mockWorker.id, clockOutDto);

      expect(result.clock_out_time).toBeTruthy();
      expect(result.clock_out_gps_lat).toBe(clockOutDto.gps_lat);
      expect(result.clock_out_gps_lng).toBe(clockOutDto.gps_lng);
    });

    it('should throw ApiException with SHIFT_NOT_ACTIVE if no active shift found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.clockOut(mockWorker.id, clockOutDto)).rejects.toThrow(ApiException);

      try {
        await service.clockOut(mockWorker.id, clockOutDto);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_NOT_ACTIVE);
        expect(error.message).toContain('No active shift found');
      }
    });
  });

  describe('findActiveShift', () => {
    it('should return active shift if exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockShift);

      const result = await service.findActiveShift(mockWorker.id);

      expect(result).toEqual(mockShift);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { worker_id: mockWorker.id, clock_out_time: IsNull() },
        relations: ['area', 'area.areaType', 'worker'],
      });
    });

    it('should return null if no active shift', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findActiveShift(mockWorker.id);

      expect(result).toBeNull();
    });
  });

  describe('findOne', () => {
    it('should return shift by ID', async () => {
      mockRepository.findOne.mockResolvedValue(mockShift);

      const result = await service.findOne(mockShift.id);

      expect(result).toEqual(mockShift);
    });

    it('should throw ApiException with SHIFT_NOT_FOUND if shift not found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      try {
        await service.findOne('nonexistent-id');
        fail('Should have thrown ApiException');
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_NOT_FOUND);
        expect(error.message).toContain('not found');
      }
    });
  });

  describe('findByWorkerId', () => {
    it('should return shifts for worker', async () => {
      mockRepository.find.mockResolvedValue([mockShift]);

      const result = await service.findByWorkerId(mockWorker.id);

      expect(result).toEqual([mockShift]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { worker_id: mockWorker.id },
        relations: ['area', 'area.areaType'],
        order: { clock_in_time: 'DESC' },
        take: 50,
      });
    });
  });

  describe('findByAreaId', () => {
    it('should return shifts for area', async () => {
      mockRepository.find.mockResolvedValue([mockShift]);

      const result = await service.findByAreaId(mockArea.id);

      expect(result).toEqual([mockShift]);
    });
  });

  describe('calculateHoursWorked', () => {
    it('should calculate hours correctly with clock-out time', () => {
      const clockIn = new Date('2026-01-09T08:00:00Z');
      const clockOut = new Date('2026-01-09T16:00:00Z');

      const result = service.calculateHoursWorked(clockIn, clockOut);

      expect(result).toBe(8);
    });

    it('should use current time if clock-out is null', () => {
      const clockIn = new Date(Date.now() - 2 * 60 * 60 * 1000); // 2 hours ago

      const result = service.calculateHoursWorked(clockIn, null);

      expect(result).toBeGreaterThan(1.9);
      expect(result).toBeLessThan(2.1);
    });
  });

  describe('findAllActiveShifts', () => {
    it('should return all active shifts', async () => {
      mockRepository.find.mockResolvedValue([mockShift]);

      const result = await service.findAllActiveShifts();

      expect(result).toEqual([mockShift]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { clock_out_time: IsNull() },
        relations: ['worker', 'area', 'area.areaType'],
        order: { clock_in_time: 'ASC' },
      });
    });
  });

  describe('findAllActiveShiftsPaginated', () => {
    it('should return paginated active shifts with default values', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockShift], 1]);

      const result = await service.findAllActiveShiftsPaginated();

      expect(result.data).toEqual([mockShift]);
      expect(result.meta.total).toBe(1);
      expect(result.meta.page).toBe(1);
      expect(result.meta.limit).toBe(50);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { clock_out_time: IsNull() },
        relations: ['worker', 'area', 'area.areaType'],
        order: { clock_in_time: 'ASC' },
        skip: 0,
        take: 50,
      });
    });

    it('should return paginated active shifts with custom page and limit', async () => {
      mockRepository.findAndCount.mockResolvedValue([[mockShift], 10]);

      const result = await service.findAllActiveShiftsPaginated(2, 5);

      expect(result.meta.page).toBe(2);
      expect(result.meta.limit).toBe(5);
      expect(result.meta.totalPages).toBe(2);
      expect(mockRepository.findAndCount).toHaveBeenCalledWith({
        where: { clock_out_time: IsNull() },
        relations: ['worker', 'area', 'area.areaType'],
        order: { clock_in_time: 'ASC' },
        skip: 5,
        take: 5,
      });
    });

    it('should return empty array when no active shifts', async () => {
      mockRepository.findAndCount.mockResolvedValue([[], 0]);

      const result = await service.findAllActiveShiftsPaginated();

      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
      expect(result.meta.totalPages).toBe(0);
    });
  });
});
