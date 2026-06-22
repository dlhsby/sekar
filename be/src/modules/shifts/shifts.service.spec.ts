import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { ShiftsService } from './shifts.service';
import { Shift } from './entities/shift.entity';
import { Schedule } from '../schedules/entities/schedule.entity';
import { AreasService } from '../areas/areas.service';
import { S3Service } from '../../shared/services/s3.service';
import { ClockInDto } from './dto/clock-in.dto';
import { ClockOutDto } from './dto/clock-out.dto';
import { UserRole } from '../users/entities/user.entity';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { StatusCalculatorService } from '../monitoring/services/status-calculator.service';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { AuditLogService } from '../audit/audit.service';

describe('ShiftsService', () => {
  let module: TestingModule;
  let service: ShiftsService;
  let repository: jest.Mocked<Repository<Shift>>;
  let scheduleRepo: jest.Mocked<Repository<Schedule>>;
  let areasService: jest.Mocked<AreasService>;
  let s3Service: jest.Mocked<S3Service>;
  let statusCalculator: jest.Mocked<StatusCalculatorService>;
  let shiftDefinitionRepo: jest.Mocked<Repository<ShiftDefinition>>;

  const mockUser = {
    id: 'user-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'user1',
    role: UserRole.SATGAS,
    full_name: 'User One',
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

  const mockShift: any = {
    id: 'shift-uuid-5e6f7a8b-c9d0-1234-ef01-345678901234',
    user_id: mockUser.id,
    user: mockUser as any,
    area_id: mockArea.id,
    area: mockArea as any,
    shift_definition_id: null,
    clock_in_time: new Date('2026-01-09T08:00:00Z'),
    clock_in_gps_lat: -7.2905,
    clock_in_gps_lng: 112.7398,
    clock_in_photo_url: 'https://s3.amazonaws.com/photo.jpg',
    clock_in_outside_boundary: false,
    clock_out_time: null,
    clock_out_gps_lat: null,
    clock_out_gps_lng: null,
    clock_out_outside_boundary: false,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    findAndCount: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockAreasService = {
    findOne: jest.fn(),
  };

  const mockS3Service = {
    uploadFile: jest.fn(),
    generateKey: jest.fn(),
  };

  const mockScheduleRepo = {
    findOne: jest.fn(),
  };

  const mockShiftDefinitionRepo = {
    find: jest.fn(),
  };

  const mockStatusCalculator = {
    onClockIn: jest.fn().mockResolvedValue(undefined),
    onClockOut: jest.fn().mockResolvedValue(undefined),
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
          provide: getRepositoryToken(Schedule),
          useValue: mockScheduleRepo,
        },
        {
          provide: getRepositoryToken(ShiftDefinition),
          useValue: mockShiftDefinitionRepo,
        },
        {
          provide: AreasService,
          useValue: mockAreasService,
        },
        {
          provide: S3Service,
          useValue: mockS3Service,
        },
        {
          provide: StatusCalculatorService,
          useValue: mockStatusCalculator,
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<ShiftsService>(ShiftsService);
    repository = module.get(getRepositoryToken(Shift)) as jest.Mocked<Repository<Shift>>;
    scheduleRepo = module.get(getRepositoryToken(Schedule)) as jest.Mocked<Repository<Schedule>>;
    areasService = module.get(AreasService) as jest.Mocked<AreasService>;
    s3Service = module.get(S3Service) as jest.Mocked<S3Service>;
    statusCalculator = module.get(StatusCalculatorService) as jest.Mocked<StatusCalculatorService>;
    shiftDefinitionRepo = module.get(getRepositoryToken(ShiftDefinition)) as jest.Mocked<
      Repository<ShiftDefinition>
    >;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getActiveArea', () => {
    it('should return area from Schedule when exists', async () => {
      const mockSchedule = {
        id: 'schedule-uuid',
        user_id: mockUser.id,
        area_id: mockArea.id,
        area: mockArea,
        effective_date: new Date('2026-01-01'),
      };
      mockScheduleRepo.findOne.mockResolvedValue(mockSchedule as any);

      const result = await service.getActiveArea(mockUser.id);

      expect(result).toEqual(mockArea);
      expect(mockScheduleRepo.findOne).toHaveBeenCalled();
    });

    it('should return null when no schedule found', async () => {
      mockScheduleRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveArea(mockUser.id);

      expect(result).toBeNull();
    });
  });

  describe('findCurrentShiftDefinition', () => {
    const mockShiftDefs = [
      {
        id: 'sd-1',
        name: 'Shift 1',
        code: 'SHIFT1',
        start_time: '06:00:00',
        end_time: '15:00:00',
        crosses_midnight: false,
        is_active: true,
      },
      {
        id: 'sd-2',
        name: 'Shift 2',
        code: 'SHIFT2',
        start_time: '15:00:00',
        end_time: '23:00:00',
        crosses_midnight: false,
        is_active: true,
      },
      {
        id: 'sd-3',
        name: 'Shift 3',
        code: 'SHIFT3',
        start_time: '21:00:00',
        end_time: '05:00:00',
        crosses_midnight: true,
        is_active: true,
      },
    ];

    it('should return matching shift definition for current time', async () => {
      mockShiftDefinitionRepo.find.mockResolvedValue(mockShiftDefs as any);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-09T10:00:00'));

      const result = await service.findCurrentShiftDefinition();

      expect(result).toEqual(mockShiftDefs[0]); // Shift 1: 06:00-15:00
      jest.useRealTimers();
    });

    it('should return null when no shift definition matches', async () => {
      const nonMidnightDefs = mockShiftDefs.filter((d) => !d.crosses_midnight);
      mockShiftDefinitionRepo.find.mockResolvedValue(nonMidnightDefs as any);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-09T23:30:00'));

      const result = await service.findCurrentShiftDefinition();

      expect(result).toBeNull();
      jest.useRealTimers();
    });

    it('should match crosses_midnight shift definition', async () => {
      mockShiftDefinitionRepo.find.mockResolvedValue(mockShiftDefs as any);
      jest.useFakeTimers();
      jest.setSystemTime(new Date('2026-01-09T03:00:00'));

      const result = await service.findCurrentShiftDefinition();

      expect(result).toEqual(mockShiftDefs[2]); // Shift 3: 21:00-05:00
      jest.useRealTimers();
    });
  });

  describe('clockIn', () => {
    const clockInDto: ClockInDto = {
      area_id: mockArea.id,
      gps_lat: -7.2905,
      gps_lng: 112.7398,
      selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    };

    it('should successfully clock in a user with area_id provided', async () => {
      mockRepository.findOne.mockResolvedValue(null); // No active shift
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionRepo.find.mockResolvedValue([]);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockRepository.create.mockReturnValue(mockShift);
      mockRepository.save.mockResolvedValue(mockShift);

      const result = await service.clockIn(mockUser.id, clockInDto);

      expect(result).toEqual(mockShift);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: mockUser.id, clock_out_time: IsNull() },
        relations: ['area', 'area.areaType', 'user', 'shift_definition'],
      });
      expect(mockAreasService.findOne).toHaveBeenCalledWith(mockArea.id);
    });

    it('should successfully clock in with auto-detected area when area_id not provided', async () => {
      const dtoWithoutArea = {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        selfie_photo: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
      };

      const mockSchedule = {
        id: 'schedule-uuid',
        user_id: mockUser.id,
        area_id: mockArea.id,
        area: mockArea,
        effective_date: new Date('2026-01-01'),
      };

      mockRepository.findOne.mockResolvedValue(null);
      mockScheduleRepo.findOne.mockResolvedValue(mockSchedule as any);
      mockShiftDefinitionRepo.find.mockResolvedValue([]);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockRepository.create.mockReturnValue(mockShift);
      mockRepository.save.mockResolvedValue(mockShift);

      const result = await service.clockIn(mockUser.id, dtoWithoutArea);

      expect(result).toEqual(mockShift);
      expect(mockScheduleRepo.findOne).toHaveBeenCalled();
      expect(mockAreasService.findOne).not.toHaveBeenCalled();
    });

    it('should allow clock-in without area when no schedule found', async () => {
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
      mockScheduleRepo.findOne.mockResolvedValue(null);
      mockShiftDefinitionRepo.find.mockResolvedValue([]);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockRepository.create.mockReturnValue(shiftWithoutArea);
      mockRepository.save.mockResolvedValue(shiftWithoutArea);

      const result = await service.clockIn(mockUser.id, dtoWithoutArea);

      expect(result).toEqual(shiftWithoutArea);
      expect(result.area_id).toBeNull();
    });

    it('should throw ApiException with SHIFT_ALREADY_ACTIVE if user already clocked in', async () => {
      mockRepository.findOne.mockResolvedValue(mockShift);

      await expect(service.clockIn(mockUser.id, clockInDto)).rejects.toThrow(ApiException);

      try {
        await service.clockIn(mockUser.id, clockInDto);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_ALREADY_ACTIVE);
        expect(error.message).toContain('Already clocked in');
        expect(error.getDetails()).toHaveProperty('activeShiftId');
      }
    });

    // Removed: 'should throw ApiException with SHIFT_PHOTO_UPLOAD_FAILED if selfie
    // upload fails' — Phase 2E refactor stores selfie as base64 directly (no S3
    // upload at clock-in/clock-out), so this code path no longer exists.
    it.skip('SHIFT_PHOTO_UPLOAD_FAILED — obsolete after Phase 2E base64 refactor', async () => {
      // intentionally skipped
    });

    it('should call statusCalculator.onClockIn after successful clock-in', async () => {
      mockRepository.findOne.mockResolvedValue(null);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockShiftDefinitionRepo.find.mockResolvedValue([]);
      mockS3Service.generateKey.mockReturnValue('sekar-media/2026/01/09/clock-in/test.jpg');
      mockS3Service.uploadFile.mockResolvedValue('https://s3.amazonaws.com/photo.jpg');
      mockRepository.create.mockReturnValue(mockShift);
      mockRepository.save.mockResolvedValue(mockShift);

      await service.clockIn(mockUser.id, clockInDto);

      expect(mockStatusCalculator.onClockIn).toHaveBeenCalledWith(
        mockUser.id,
        mockShift.id,
        mockShift.area_id,
        null,
        clockInDto.gps_lat,
        clockInDto.gps_lng,
      );
    });
  });

  describe('clockOut', () => {
    const clockOutDto: ClockOutDto = {
      gps_lat: -7.2906,
      gps_lng: 112.7399,
    };

    it('should successfully clock out a user', async () => {
      const activeShift = { ...mockShift };
      mockRepository.findOne.mockResolvedValue(activeShift);
      mockRepository.save.mockResolvedValue({
        ...activeShift,
        clock_out_time: new Date(),
        clock_out_gps_lat: clockOutDto.gps_lat,
        clock_out_gps_lng: clockOutDto.gps_lng,
      });

      const result = await service.clockOut(mockUser.id, clockOutDto);

      expect(result.clock_out_time).toBeTruthy();
      expect(result.clock_out_gps_lat).toBe(clockOutDto.gps_lat);
      expect(result.clock_out_gps_lng).toBe(clockOutDto.gps_lng);
    });

    it('should throw ApiException with SHIFT_NOT_ACTIVE if no active shift found', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(service.clockOut(mockUser.id, clockOutDto)).rejects.toThrow(ApiException);

      try {
        await service.clockOut(mockUser.id, clockOutDto);
      } catch (error) {
        expect(error).toBeInstanceOf(ApiException);
        expect(error.getCode()).toBe(ApiErrorCode.SHIFT_NOT_ACTIVE);
        expect(error.message).toContain('No active shift found');
      }
    });

    it('should call statusCalculator.onClockOut after successful clock-out', async () => {
      const activeShift = { ...mockShift };
      mockRepository.findOne.mockResolvedValue(activeShift);
      mockRepository.save.mockResolvedValue({
        ...activeShift,
        clock_out_time: new Date(),
        clock_out_gps_lat: clockOutDto.gps_lat,
        clock_out_gps_lng: clockOutDto.gps_lng,
      });

      await service.clockOut(mockUser.id, clockOutDto);

      expect(mockStatusCalculator.onClockOut).toHaveBeenCalledWith(mockUser.id);
    });
  });

  describe('findActiveShift', () => {
    it('should return active shift if exists', async () => {
      mockRepository.findOne.mockResolvedValue(mockShift);

      const result = await service.findActiveShift(mockUser.id);

      expect(result).toEqual(mockShift);
      expect(mockRepository.findOne).toHaveBeenCalledWith({
        where: { user_id: mockUser.id, clock_out_time: IsNull() },
        relations: ['area', 'area.areaType', 'user', 'shift_definition'],
      });
    });

    it('should return null if no active shift', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.findActiveShift(mockUser.id);

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

  describe('findByUserId', () => {
    it('should return shifts for user', async () => {
      mockRepository.find.mockResolvedValue([mockShift]);

      const result = await service.findByUserId(mockUser.id);

      expect(result).toEqual([mockShift]);
      expect(mockRepository.find).toHaveBeenCalledWith({
        where: { user_id: mockUser.id },
        relations: ['area', 'area.areaType', 'shift_definition'],
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
        relations: ['user', 'area', 'area.areaType'],
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
        relations: ['user', 'area', 'area.areaType'],
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
        relations: ['user', 'area', 'area.areaType'],
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

  describe('findMyAttendanceDays', () => {
    const sd1 = { start_time: '06:00:00', crosses_midnight: false };
    const sd3 = { start_time: '21:00:00', crosses_midnight: true };

    // Returned clock-in DESC, as the repository would. Day A = 2026-06-22 WIB
    // (two shifts), day B = 2026-06-21 WIB (one night shift clocked in 20:00Z =
    // 03:00 WIB next day → still files under its clock-in WIB day 2026-06-22? no:
    // 2026-06-21T20:00Z + 7h = 2026-06-22T03:00 → WIB day 2026-06-22).
    const dayShifts: any[] = [
      // 2026-06-22 WIB, second shift (afternoon) — active (no clock-out)
      {
        id: 's3',
        clock_in_time: new Date('2026-06-22T08:00:00Z'),
        clock_out_time: null,
        shift_definition: sd1,
        is_overtime: false,
      },
      // 2026-06-22 WIB, first/earliest shift — completed 1h
      {
        id: 's2',
        clock_in_time: new Date('2026-06-22T01:00:00Z'),
        clock_out_time: new Date('2026-06-22T02:00:00Z'),
        shift_definition: sd1,
        is_overtime: false,
      },
      // 2026-06-21T20:00Z = 2026-06-22T03:00 WIB → also day 2026-06-22? It is.
      // Use a clearly-earlier instant for a distinct earlier day (2026-06-20 WIB).
      {
        id: 's1',
        clock_in_time: new Date('2026-06-20T15:00:00Z'),
        clock_out_time: new Date('2026-06-20T23:00:00Z'),
        shift_definition: sd3,
        is_overtime: false,
      },
    ];

    it('groups regular shifts by WIB day, newest day first, with summary fields', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const now = new Date('2026-06-22T09:00:00Z'); // 1h into the active shift

      const result = await service.findMyAttendanceDays(mockUser.id, { page: 1, limit: 20 }, now);

      // Only excludes overtime via the query filter:
      expect(mockRepository.find).toHaveBeenCalledWith(
        expect.objectContaining({ where: { user_id: mockUser.id, is_overtime: false } }),
      );

      expect(result.meta.total).toBe(2);
      expect(result.data).toHaveLength(2);

      const [today, earlier] = result.data;
      expect(today.date).toBe('2026-06-22');
      expect(today.shift_count).toBe(2);
      expect(today.first_clock_in).toBe('2026-06-22T01:00:00.000Z'); // earliest
      expect(today.last_clock_out).toBe('2026-06-22T02:00:00.000Z'); // only completed clock-out
      expect(today.has_active).toBe(true);
      // 60 min (completed) + 60 min (active up to `now`) = 120
      expect(today.total_worked_minutes).toBe(120);
      expect(today.scheduled_start_time).toBe('06:00:00');
      expect(today.crosses_midnight).toBe(false);

      expect(earlier.date).toBe('2026-06-20');
      expect(earlier.has_active).toBe(false);
      expect(earlier.last_clock_out).toBe('2026-06-20T23:00:00.000Z');
      expect(earlier.total_worked_minutes).toBe(480);
      expect(earlier.crosses_midnight).toBe(true);
    });

    it('paginates by distinct day', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { page: 2, limit: 1 },
        new Date('2026-06-22T09:00:00Z'),
      );

      expect(result.meta.total).toBe(2);
      expect(result.meta.totalPages).toBe(2);
      expect(result.data).toHaveLength(1);
      expect(result.data[0].date).toBe('2026-06-20'); // second page = older day
    });

    it('returns empty when the user has no regular shifts', async () => {
      mockRepository.find.mockResolvedValue([]);
      const result = await service.findMyAttendanceDays(mockUser.id);
      expect(result.data).toEqual([]);
      expect(result.meta.total).toBe(0);
    });

    it('computes is_late in WIB (08:00 WIB clock-in vs 06:00 scheduled = late)', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        {},
        new Date('2026-06-22T09:00:00Z'),
      );
      // 2026-06-22 day: first clock-in 01:00Z = 08:00 WIB, scheduled 06:00 → late.
      expect(result.data[0].is_late).toBe(true);
      // 2026-06-20 night shift (sd3 21:00 crosses midnight): clock-in 22:00 WIB → late.
      expect(result.data[1].is_late).toBe(true);
    });

    it('filters by status=late', async () => {
      // Make the older day on-time by giving it a permissive schedule.
      const onTimeNight = { ...dayShifts[2], shift_definition: { start_time: '23:30:00', crosses_midnight: true } };
      mockRepository.find.mockResolvedValue([dayShifts[0], dayShifts[1], onTimeNight]);

      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { status: 'late' },
        new Date('2026-06-22T09:00:00Z'),
      );
      expect(result.data.map((d) => d.date)).toEqual(['2026-06-22']);
    });

    it('filters by date range (inclusive)', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { from_date: '2026-06-21', to_date: '2026-06-22' },
        new Date('2026-06-22T09:00:00Z'),
      );
      expect(result.data.map((d) => d.date)).toEqual(['2026-06-22']);
    });

    it('sorts ascending when sort_dir=asc', async () => {
      mockRepository.find.mockResolvedValue(dayShifts);
      const result = await service.findMyAttendanceDays(
        mockUser.id,
        { sort_dir: 'asc' },
        new Date('2026-06-22T09:00:00Z'),
      );
      expect(result.data.map((d) => d.date)).toEqual(['2026-06-20', '2026-06-22']);
    });
  });

  describe('findMyAttendanceForDate', () => {
    it('queries the day in WIB, excludes overtime/soft-deleted, newest first', async () => {
      const expected = [{ id: 's2' }, { id: 's1' }];
      const qb: any = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue(expected),
      };
      mockRepository.createQueryBuilder.mockReturnValue(qb);

      const result = await service.findMyAttendanceForDate(mockUser.id, '2026-06-22');

      expect(result).toBe(expected);
      expect(qb.where).toHaveBeenCalledWith('shift.user_id = :userId', { userId: mockUser.id });
      expect(qb.andWhere).toHaveBeenCalledWith('shift.is_overtime = false');
      expect(qb.andWhere).toHaveBeenCalledWith(
        "DATE(shift.clock_in_time AT TIME ZONE 'Asia/Jakarta') = :date",
        { date: '2026-06-22' },
      );
      expect(qb.orderBy).toHaveBeenCalledWith('shift.clock_in_time', 'DESC');
    });
  });
});
