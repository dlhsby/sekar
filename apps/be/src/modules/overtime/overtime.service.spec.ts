import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OvertimeService } from './overtime.service';
import { Overtime, OvertimeStatus } from './entities/overtime.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { StartOvertimeDto } from './dto/start-overtime.dto';
import { EndOvertimeDto } from './dto/end-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { OvertimeFilterDto } from './dto/overtime-filter.dto';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ShiftsService } from '../shifts/shifts.service';
import { AuditLogService } from '../audit/audit.service';

describe('OvertimeService', () => {
  let module: TestingModule;
  let service: OvertimeService;
  let overtimeRepo: Repository<Overtime>;
  let activityTypeRepo: Repository<ActivityType>;
  let userRepo: Repository<User>;

  const mockOvertimeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    remove: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockActivityTypeRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockShiftsService = {
    getActiveArea: jest.fn().mockResolvedValue(null),
    findActiveShift: jest.fn(),
    clockIn: jest.fn(),
    clockOut: jest.fn(),
  };

  const createMockQueryBuilder = (result: any[] = [], total = 0) => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    leftJoin: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    take: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue(result),
    getManyAndCount: jest.fn().mockResolvedValue([result, total]),
  });

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OvertimeService,
        {
          provide: getRepositoryToken(Overtime),
          useValue: mockOvertimeRepo,
        },
        {
          provide: getRepositoryToken(ActivityType),
          useValue: mockActivityTypeRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: ShiftsService,
          useValue: mockShiftsService,
        },
        {
          provide: AuditLogService,
          useValue: { log: jest.fn().mockResolvedValue({}) },
        },
      ],
    }).compile();

    service = module.get<OvertimeService>(OvertimeService);
    overtimeRepo = module.get<Repository<Overtime>>(getRepositoryToken(Overtime));
    activityTypeRepo = module.get<Repository<ActivityType>>(getRepositoryToken(ActivityType));
    userRepo = module.get<Repository<User>>(getRepositoryToken(User));
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('submit', () => {
    const userId = 'user-uuid-1';
    const areaId = 'area-uuid-1';
    const activityTypeId = 'activity-type-uuid-1';

    const mockUser = {
      id: userId,
      location_id: areaId,
      role: UserRole.SATGAS,
    };

    const mockActivityType = {
      id: activityTypeId,
      name: 'Cleaning',
      is_active: true,
      applicable_roles: [UserRole.SATGAS, UserRole.LINMAS],
    };

    const createDto: CreateOvertimeDto = {
      start_datetime: '2026-02-10T17:00:00+07:00',
      end_datetime: '2026-02-10T20:00:00+07:00',
      activity_type_id: activityTypeId,
      description: 'Cleaned park area',
      photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
      gps_lat: -7.250445,
      gps_lng: 112.768845,
    };

    it('should submit overtime by satgas', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType);
      mockOvertimeRepo.create.mockReturnValue({
        user_id: userId,
        location_id: areaId,
        ...createDto,
        status: OvertimeStatus.PENDING,
      });
      mockOvertimeRepo.save.mockResolvedValue({
        id: 'overtime-uuid-1',
        user_id: userId,
        ...createDto,
      });

      const result = await service.submit(userId, UserRole.SATGAS, createDto);

      expect(userRepo.findOne).toHaveBeenCalledWith({ where: { id: userId } });
      expect(activityTypeRepo.findOne).toHaveBeenCalledWith({
        where: { id: activityTypeId, is_active: true },
      });
      expect(result).toHaveProperty('id', 'overtime-uuid-1');
    });

    it('should submit overtime by korlap', async () => {
      const korlapUser = { ...mockUser, role: UserRole.KORLAP };
      const korlapActivityType = {
        ...mockActivityType,
        applicable_roles: [UserRole.KORLAP],
      };
      mockUserRepo.findOne.mockResolvedValue(korlapUser);
      mockActivityTypeRepo.findOne.mockResolvedValue(korlapActivityType);
      mockOvertimeRepo.create.mockReturnValue({
        user_id: userId,
        status: OvertimeStatus.PENDING,
      });
      mockOvertimeRepo.save.mockResolvedValue({
        id: 'overtime-uuid-2',
        user_id: userId,
      });

      const result = await service.submit(userId, UserRole.KORLAP, createDto);
      expect(result).toHaveProperty('id', 'overtime-uuid-2');
    });

    it('should submit overtime by admin_rayon', async () => {
      const adminDataUser = { ...mockUser, role: UserRole.ADMIN_RAYON };
      const adminDataActivityType = {
        ...mockActivityType,
        applicable_roles: [UserRole.ADMIN_RAYON],
      };
      mockUserRepo.findOne.mockResolvedValue(adminDataUser);
      mockActivityTypeRepo.findOne.mockResolvedValue(adminDataActivityType);
      mockOvertimeRepo.create.mockReturnValue({
        user_id: userId,
        status: OvertimeStatus.PENDING,
      });
      mockOvertimeRepo.save.mockResolvedValue({
        id: 'overtime-uuid-3',
        user_id: userId,
      });

      const result = await service.submit(userId, UserRole.ADMIN_RAYON, createDto);
      expect(result).toHaveProperty('id', 'overtime-uuid-3');
    });

    it('should reject submission for non-OVERTIME_SUBMITTERS role', async () => {
      await expect(service.submit(userId, UserRole.KEPALA_RAYON, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should validate activity_type against user role', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockActivityTypeRepo.findOne.mockResolvedValue({
        ...mockActivityType,
        applicable_roles: [UserRole.KORLAP],
      });

      await expect(service.submit(userId, UserRole.SATGAS, createDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should submit overnight overtime (end_datetime crosses midnight)', async () => {
      const overnightDto: CreateOvertimeDto = {
        start_datetime: '2026-02-14T17:00:00+07:00',
        end_datetime: '2026-02-15T01:00:00+07:00', // crosses midnight
        activity_type_id: activityTypeId,
        description: 'Overnight patrol',
        photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
      };
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType);
      mockOvertimeRepo.create.mockReturnValue({
        user_id: userId,
        status: OvertimeStatus.PENDING,
      });
      mockOvertimeRepo.save.mockResolvedValue({
        id: 'overtime-overnight-1',
        user_id: userId,
      });

      const result = await service.submit(userId, UserRole.SATGAS, overnightDto);
      expect(result).toHaveProperty('id', 'overtime-overnight-1');
    });

    it('should reject if end_datetime is before start_datetime', async () => {
      const invalidDto: CreateOvertimeDto = {
        start_datetime: '2026-02-14T20:00:00+07:00',
        end_datetime: '2026-02-14T17:00:00+07:00', // end before start
        activity_type_id: activityTypeId,
        description: 'Invalid overtime',
        photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
      };
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType);

      await expect(service.submit(userId, UserRole.SATGAS, invalidDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('approve', () => {
    const overtimeId = 'overtime-uuid-1';
    const approverId = 'korlap-uuid-1';
    const areaId = 'area-uuid-1';

    const mockPendingOvertime = {
      id: overtimeId,
      user_id: 'worker-uuid-1',
      location_id: areaId,
      status: OvertimeStatus.PENDING,
      user: { id: 'worker-uuid-1', role: UserRole.SATGAS },
      area: { id: areaId, district_id: 'district-uuid-1' },
    };

    const mockApprover = {
      id: approverId,
      location_id: areaId,
      role: UserRole.KORLAP,
    };

    it('should approve pending overtime by korlap', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(mockPendingOvertime);
      mockUserRepo.findOne.mockResolvedValue(mockApprover);
      mockOvertimeRepo.save.mockResolvedValue({
        ...mockPendingOvertime,
        status: OvertimeStatus.APPROVED,
        approved_by: approverId,
      });

      const result = await service.approve(overtimeId, approverId);

      expect(result.status).toBe(OvertimeStatus.APPROVED);
      expect(result.approved_by).toBe(approverId);
    });

    it('should approve pending overtime by kepala_rayon for korlap submission', async () => {
      const kepalaDistrictApprover = {
        id: 'kepala-district-uuid',
        district_id: 'district-uuid-1',
        role: UserRole.KEPALA_RAYON,
      };

      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'korlap-worker-uuid',
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: 'korlap-worker-uuid', role: UserRole.KORLAP },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });
      mockUserRepo.findOne.mockResolvedValue(kepalaDistrictApprover);
      mockOvertimeRepo.save.mockResolvedValue({
        id: overtimeId,
        status: OvertimeStatus.APPROVED,
        approved_by: kepalaDistrictApprover.id,
      });

      const result = await service.approve(overtimeId, kepalaDistrictApprover.id);

      expect(result.status).toBe(OvertimeStatus.APPROVED);
    });

    it('should reject self-approval', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: approverId,
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: approverId, role: UserRole.SATGAS },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });

      await expect(service.approve(overtimeId, approverId)).rejects.toThrow(ForbiddenException);
    });

    it('should reject approval if already approved', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'worker-uuid-1',
        location_id: areaId,
        status: OvertimeStatus.APPROVED,
        user: { id: 'worker-uuid-1', role: UserRole.SATGAS },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });

      await expect(service.approve(overtimeId, approverId)).rejects.toThrow(BadRequestException);
    });

    it('should reject approval if area mismatch for korlap', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'worker-uuid-1',
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: 'worker-uuid-1', role: UserRole.SATGAS },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });
      mockUserRepo.findOne.mockResolvedValue({
        id: approverId,
        location_id: 'different-area-uuid',
        role: UserRole.KORLAP,
      });

      await expect(service.approve(overtimeId, approverId)).rejects.toThrow(ForbiddenException);
    });

    it('should reject korlap approving korlap overtime', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'another-korlap',
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: 'another-korlap', role: UserRole.KORLAP },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });
      mockUserRepo.findOne.mockResolvedValue(mockApprover);

      await expect(service.approve(overtimeId, approverId)).rejects.toThrow(ForbiddenException);
    });

    it('should approve kepala_rayon overtime by management', async () => {
      const topMgmtApprover = {
        id: 'top-mgmt-uuid',
        role: UserRole.MANAGEMENT,
      };

      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'kepala-district-worker',
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: 'kepala-district-worker', role: UserRole.KEPALA_RAYON },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });
      mockUserRepo.findOne.mockResolvedValue(topMgmtApprover);
      mockOvertimeRepo.save.mockResolvedValue({
        id: overtimeId,
        status: OvertimeStatus.APPROVED,
        approved_by: topMgmtApprover.id,
      });

      const result = await service.approve(overtimeId, topMgmtApprover.id);
      expect(result.status).toBe(OvertimeStatus.APPROVED);
    });

    it('should reject management approving non-kepala_rayon overtime', async () => {
      const topMgmtApprover = {
        id: 'top-mgmt-uuid',
        role: UserRole.MANAGEMENT,
      };

      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'korlap-worker',
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: 'korlap-worker', role: UserRole.KORLAP },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });
      mockUserRepo.findOne.mockResolvedValue(topMgmtApprover);

      await expect(service.approve(overtimeId, topMgmtApprover.id)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject kepala_rayon approving satgas overtime', async () => {
      const kepalaDistrictApprover = {
        id: 'kepala-district-uuid',
        district_id: 'district-uuid-1',
        role: UserRole.KEPALA_RAYON,
      };
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'worker-uuid-1',
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: 'worker-uuid-1', role: UserRole.SATGAS },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });
      mockUserRepo.findOne.mockResolvedValue(kepalaDistrictApprover);

      await expect(service.approve(overtimeId, kepalaDistrictApprover.id)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('reject', () => {
    const overtimeId = 'overtime-uuid-1';
    const approverId = 'korlap-uuid-1';
    const areaId = 'area-uuid-1';

    const mockPendingOvertime = {
      id: overtimeId,
      user_id: 'worker-uuid-1',
      location_id: areaId,
      status: OvertimeStatus.PENDING,
      user: { id: 'worker-uuid-1', role: UserRole.SATGAS },
      area: { id: areaId, district_id: 'district-uuid-1' },
    };

    const rejectDto: RejectOvertimeDto = {
      reason: 'Overtime not pre-approved',
    };

    it('should reject pending overtime by korlap', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(mockPendingOvertime);
      mockUserRepo.findOne.mockResolvedValue({
        id: approverId,
        location_id: areaId,
        role: UserRole.KORLAP,
      });
      mockOvertimeRepo.save.mockResolvedValue({
        ...mockPendingOvertime,
        status: OvertimeStatus.REJECTED,
        approved_by: approverId,
        rejection_reason: rejectDto.reason,
      });

      const result = await service.reject(overtimeId, approverId, rejectDto);

      expect(result.status).toBe(OvertimeStatus.REJECTED);
      expect(result.rejection_reason).toBe(rejectDto.reason);
    });

    it('should reject self-rejection', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: approverId,
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: approverId, role: UserRole.SATGAS },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });

      await expect(service.reject(overtimeId, approverId, rejectDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('should reject rejection if area mismatch', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: overtimeId,
        user_id: 'worker-uuid-1',
        location_id: areaId,
        status: OvertimeStatus.PENDING,
        user: { id: 'worker-uuid-1', role: UserRole.SATGAS },
        area: { id: areaId, district_id: 'district-uuid-1' },
      });
      mockUserRepo.findOne.mockResolvedValue({
        id: approverId,
        location_id: 'different-area-uuid',
        role: UserRole.KORLAP,
      });

      await expect(service.reject(overtimeId, approverId, rejectDto)).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('findMyPaginated', () => {
    const userId = 'user-uuid-1';

    it('should return paginated user overtime list', async () => {
      const mockOvertimes = [
        { id: 'overtime-1', user_id: userId, status: OvertimeStatus.PENDING },
        { id: 'overtime-2', user_id: userId, status: OvertimeStatus.APPROVED },
      ];
      const mockQb = createMockQueryBuilder(mockOvertimes, 2);
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findMyPaginated(userId, {});

      expect(mockQb.where).toHaveBeenCalledWith('overtime.user_id = :userId', { userId });
      expect(result.data).toHaveLength(2);
      expect(result.meta.total).toBe(2);
    });

    it('should apply status filter', async () => {
      const mockQb = createMockQueryBuilder([], 0);
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findMyPaginated(userId, { status: OvertimeStatus.APPROVED });

      expect(mockQb.andWhere).toHaveBeenCalledWith('overtime.status = :status', {
        status: OvertimeStatus.APPROVED,
      });
    });

    it('should apply date range filter', async () => {
      const mockQb = createMockQueryBuilder([], 0);
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findMyPaginated(userId, {
        from_date: '2026-01-01',
        to_date: '2026-01-31',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith(expect.stringContaining('start_datetime'), {
        fromDate: '2026-01-01',
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(expect.stringContaining('start_datetime'), {
        toDate: '2026-01-31',
      });
    });

    it('should sort by start_datetime ascending', async () => {
      const mockQb = createMockQueryBuilder([], 0);
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findMyPaginated(userId, {
        sort_by: 'start_datetime',
        sort_dir: 'asc',
      });

      expect(mockQb.orderBy).toHaveBeenCalledWith('overtime.start_datetime', 'ASC');
    });
  });

  describe('findAllPaginated', () => {
    const approverId = 'korlap-uuid-1';
    const areaId = 'area-uuid-1';
    const districtId = 'district-uuid-1';

    it('should return overtime scoped to korlap area', async () => {
      const mockApprover = {
        id: approverId,
        location_id: areaId,
        role: UserRole.KORLAP,
      };
      mockUserRepo.findOne.mockResolvedValue(mockApprover);

      const mockQb = createMockQueryBuilder([{ id: 'overtime-1', location_id: areaId }], 1);
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAllPaginated(approverId, UserRole.KORLAP, {});

      expect(mockQb.andWhere).toHaveBeenCalledWith('overtime.location_id = :areaId', { areaId });
      expect(result.data).toHaveLength(1);
    });

    it('should return overtime scoped to kepala_rayon district', async () => {
      const kepalaDistrict = {
        id: 'kepala-district-uuid',
        district_id: districtId,
        role: UserRole.KEPALA_RAYON,
      };
      mockUserRepo.findOne.mockResolvedValue(kepalaDistrict);

      const mockQb = createMockQueryBuilder([{ id: 'overtime-1' }, { id: 'overtime-2' }], 2);
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAllPaginated(kepalaDistrict.id, UserRole.KEPALA_RAYON, {});

      expect(mockQb.andWhere).toHaveBeenCalledWith('area.district_id = :districtId', {
        districtId,
      });
      expect(result.data).toHaveLength(2);
    });

    it('should not scope for superadmin', async () => {
      const superadmin = {
        id: 'superadmin-uuid',
        role: UserRole.SUPERADMIN,
      };
      mockUserRepo.findOne.mockResolvedValue(superadmin);

      const mockQb = createMockQueryBuilder(
        [{ id: 'overtime-1' }, { id: 'overtime-2' }, { id: 'overtime-3' }],
        3,
      );
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      const result = await service.findAllPaginated(superadmin.id, UserRole.SUPERADMIN, {});

      expect(result.data).toHaveLength(3);
    });

    it('should apply filter combinations', async () => {
      const mockApprover = {
        id: approverId,
        location_id: areaId,
        role: UserRole.KORLAP,
      };
      mockUserRepo.findOne.mockResolvedValue(mockApprover);

      const mockQb = createMockQueryBuilder([], 0);
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQb);

      await service.findAllPaginated(approverId, UserRole.KORLAP, {
        status: OvertimeStatus.PENDING,
        from_date: '2026-01-01',
      });

      expect(mockQb.andWhere).toHaveBeenCalledWith('overtime.status = :status', {
        status: OvertimeStatus.PENDING,
      });
      expect(mockQb.andWhere).toHaveBeenCalledWith(expect.stringContaining('start_datetime'), {
        fromDate: '2026-01-01',
      });
    });
  });

  describe('findOne', () => {
    const overtimeId = 'overtime-uuid-1';

    it('should return overtime details', async () => {
      const mockOvertime = { id: overtimeId, status: OvertimeStatus.PENDING };
      mockOvertimeRepo.findOne.mockResolvedValue(mockOvertime);

      const result = await service.findOne(overtimeId);

      expect(result).toEqual(mockOvertime);
    });

    it('should throw NotFoundException if not found', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne(overtimeId)).rejects.toThrow(NotFoundException);
    });
  });

  describe('startOvertime', () => {
    const userId = 'user-uuid-1';
    const areaId = 'area-uuid-1';
    const shiftId = 'shift-uuid-1';
    const overtimeId = 'overtime-uuid-start-1';

    const clockableUser: User = {
      id: userId,
      location_id: areaId,
      role: UserRole.SATGAS,
    } as User;

    const nonClockableUser: User = {
      id: userId,
      location_id: areaId,
      role: UserRole.SUPERADMIN,
    } as User;

    const startDto: StartOvertimeDto = {
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      reason: 'Additional cleanup needed after event',
    };

    const mockCreatedOvertime = {
      id: overtimeId,
      user_id: userId,
      location_id: areaId,
      status: OvertimeStatus.IN_PROGRESS,
      shift_id: null,
      description: startDto.reason,
      photo_urls: [],
      gps_lat: startDto.gps_lat,
      gps_lng: startDto.gps_lng,
    };

    beforeEach(() => {
      mockShiftsService.findActiveShift.mockResolvedValue(null);
      mockShiftsService.getActiveArea.mockResolvedValue(null);
      mockShiftsService.clockIn.mockResolvedValue({ id: shiftId });
      mockOvertimeRepo.create.mockReturnValue({ ...mockCreatedOvertime });
      mockOvertimeRepo.save.mockResolvedValue({ ...mockCreatedOvertime, shift_id: shiftId });
      mockOvertimeRepo.findOne.mockResolvedValue(null);
    });

    it('should start overtime for clockable role user', async () => {
      const result = await service.startOvertime(startDto, clockableUser);

      expect(mockShiftsService.findActiveShift).toHaveBeenCalledWith(userId);
      expect(mockShiftsService.clockIn).toHaveBeenCalledWith(
        userId,
        { gps_lat: startDto.gps_lat, gps_lng: startDto.gps_lng, selfie_photo: undefined },
        true,
      );
      expect(result.shift_id).toBe(shiftId);
    });

    it('should throw ForbiddenException for non-clockable role', async () => {
      await expect(service.startOvertime(startDto, nonClockableUser)).rejects.toThrow(
        ForbiddenException,
      );
      expect(mockShiftsService.findActiveShift).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if active normal shift exists', async () => {
      // A normal (non-overtime) active shift blocks starting overtime
      mockShiftsService.findActiveShift.mockResolvedValue({
        id: 'normal-shift',
        is_overtime: false,
      });

      await expect(service.startOvertime(startDto, clockableUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockShiftsService.clockIn).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if active overtime already exists', async () => {
      // findActiveShift returns null (no normal shift), but overtimeRepo.findOne returns an active overtime
      mockShiftsService.findActiveShift.mockResolvedValue(null);
      mockOvertimeRepo.findOne.mockResolvedValue({
        id: 'existing-overtime',
        user_id: userId,
        status: OvertimeStatus.IN_PROGRESS,
      });

      await expect(service.startOvertime(startDto, clockableUser)).rejects.toThrow(
        BadRequestException,
      );
      expect(mockShiftsService.clockIn).not.toHaveBeenCalled();
    });

    it('should call shiftsService.clockIn with is_overtime=true', async () => {
      await service.startOvertime(startDto, clockableUser);

      // Third argument to clockIn must be true (is_overtime flag)
      expect(mockShiftsService.clockIn).toHaveBeenCalledWith(
        userId,
        expect.objectContaining({ gps_lat: startDto.gps_lat, gps_lng: startDto.gps_lng }),
        true,
      );
    });

    it('should link shift_id to overtime record', async () => {
      const result = await service.startOvertime(startDto, clockableUser);

      // The second save call links shift_id back to the overtime record
      expect(mockOvertimeRepo.save).toHaveBeenCalledTimes(2);
      expect(result.shift_id).toBe(shiftId);
    });

    it('should allow overtime when active shift is itself an overtime shift', async () => {
      // An existing overtime shift should not block starting a new overtime check
      // (only normal shifts block; overtime shift means the check passes through to
      // the next guard which catches active overtime in the overtime table)
      mockShiftsService.findActiveShift.mockResolvedValue({ id: 'ot-shift', is_overtime: true });
      mockOvertimeRepo.findOne.mockResolvedValue(null);

      const result = await service.startOvertime(startDto, clockableUser);

      expect(result).toBeDefined();
    });
  });

  describe('endOvertime', () => {
    const userId = 'user-uuid-1';
    const areaId = 'area-uuid-1';
    const shiftId = 'shift-uuid-end-1';
    const activityTypeId = 'activity-type-uuid-end-1';

    const clockableUser: User = {
      id: userId,
      location_id: areaId,
      role: UserRole.SATGAS,
    } as User;

    const endDto: EndOvertimeDto = {
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      activity_type_id: activityTypeId,
      description: 'Cleaned extra section of park',
      photo_urls: ['https://s3.amazonaws.com/end-photo1.jpg'],
    };

    const mockActiveOvertime = {
      id: 'overtime-active-1',
      user_id: userId,
      location_id: areaId,
      status: OvertimeStatus.IN_PROGRESS,
      shift_id: shiftId,
      activityType: null,
      user: clockableUser,
      area: { id: areaId },
    };

    const mockActivityType = {
      id: activityTypeId,
      name: 'Park Cleaning',
      is_active: true,
      applicable_roles: [UserRole.SATGAS, UserRole.LINMAS],
    };

    beforeEach(() => {
      mockOvertimeRepo.findOne.mockResolvedValue({ ...mockActiveOvertime });
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType);
      mockShiftsService.clockOut.mockResolvedValue(undefined);
      mockOvertimeRepo.save.mockResolvedValue({
        ...mockActiveOvertime,
        status: OvertimeStatus.PENDING,
        activity_type_id: activityTypeId,
        description: endDto.description,
        photo_urls: endDto.photo_urls,
        end_datetime: expect.any(Date),
      });
    });

    it('should end active overtime and update status to pending', async () => {
      const result = await service.endOvertime(endDto, clockableUser);

      expect(mockOvertimeRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: userId, status: OvertimeStatus.IN_PROGRESS },
        relations: ['activityType', 'user', 'area'],
      });
      expect(mockShiftsService.clockOut).toHaveBeenCalledWith(userId, {
        gps_lat: endDto.gps_lat,
        gps_lng: endDto.gps_lng,
      });
      expect(mockOvertimeRepo.save).toHaveBeenCalled();
      expect(result.status).toBe(OvertimeStatus.PENDING);
    });

    it('should throw NotFoundException if no active overtime found', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(null);

      await expect(service.endOvertime(endDto, clockableUser)).rejects.toThrow(NotFoundException);
      expect(mockShiftsService.clockOut).not.toHaveBeenCalled();
    });

    it('should throw BadRequestException if activity type not found', async () => {
      mockActivityTypeRepo.findOne.mockResolvedValue(null);

      await expect(service.endOvertime(endDto, clockableUser)).rejects.toThrow(BadRequestException);
      expect(mockShiftsService.clockOut).not.toHaveBeenCalled();
    });

    it('should throw ForbiddenException if activity type not applicable to user role', async () => {
      // Activity type only available for KORLAP, not SATGAS
      mockActivityTypeRepo.findOne.mockResolvedValue({
        ...mockActivityType,
        applicable_roles: [UserRole.KORLAP],
      });

      await expect(service.endOvertime(endDto, clockableUser)).rejects.toThrow(ForbiddenException);
      expect(mockShiftsService.clockOut).not.toHaveBeenCalled();
    });

    it('should call shiftsService.clockOut when overtime has a linked shift_id', async () => {
      await service.endOvertime(endDto, clockableUser);

      expect(mockShiftsService.clockOut).toHaveBeenCalledWith(userId, {
        gps_lat: endDto.gps_lat,
        gps_lng: endDto.gps_lng,
      });
    });

    it('should skip clockOut when overtime has no linked shift_id', async () => {
      // Overtime without a shift_id (clock-in may have failed or was not linked)
      mockOvertimeRepo.findOne.mockResolvedValue({ ...mockActiveOvertime, shift_id: null });

      await service.endOvertime(endDto, clockableUser);

      expect(mockShiftsService.clockOut).not.toHaveBeenCalled();
      expect(mockOvertimeRepo.save).toHaveBeenCalled();
    });

    it('should set activity details on overtime record', async () => {
      await service.endOvertime(endDto, clockableUser);

      // Verify save was called and the updated overtime properties reflect the DTO values
      const saveCall = mockOvertimeRepo.save.mock.calls[0][0];
      expect(saveCall.activity_type_id).toBe(activityTypeId);
      expect(saveCall.description).toBe(endDto.description);
      expect(saveCall.photo_urls).toEqual(endDto.photo_urls);
      expect(saveCall.status).toBe(OvertimeStatus.PENDING);
      expect(saveCall.end_datetime).toBeInstanceOf(Date);
    });
  });

  describe('getActiveOvertime', () => {
    const userId = 'user-uuid-1';

    it('should return active overtime for user', async () => {
      const activeOvertime = {
        id: 'overtime-active-get-1',
        user_id: userId,
        status: OvertimeStatus.IN_PROGRESS,
        activityType: null,
        area: { id: 'area-uuid-1' },
        shift: { id: 'shift-uuid-1' },
      };
      mockOvertimeRepo.findOne.mockResolvedValue(activeOvertime);

      const result = await service.getActiveOvertime(userId);

      expect(mockOvertimeRepo.findOne).toHaveBeenCalledWith({
        where: { user_id: userId, status: OvertimeStatus.IN_PROGRESS },
        relations: ['activityType', 'area', 'shift'],
      });
      expect(result).toEqual(activeOvertime);
    });

    it('should return null if no active overtime exists', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(null);

      const result = await service.getActiveOvertime(userId);

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const overtimeId = 'overtime-uuid-1';
    const userId = 'user-uuid-1';
    const activityTypeId = 'activity-type-uuid-1';
    const areaId = 'area-uuid-1';

    const mockExistingOvertime = {
      id: overtimeId,
      user_id: userId,
      location_id: areaId,
      status: OvertimeStatus.PENDING,
      start_datetime: new Date('2026-02-14T17:00:00+07:00'),
      end_datetime: new Date('2026-02-14T20:00:00+07:00'),
      activity_type_id: activityTypeId,
      description: 'Original description',
      photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
      gps_lat: -7.250445,
      gps_lng: 112.768845,
      activityType: { id: activityTypeId, name: 'Cleaning', is_active: true },
      user: { id: userId, role: UserRole.SATGAS },
      area: { id: areaId, district_id: 'district-uuid-1' },
      approver: null,
      shift: null,
    };

    const mockActivityType = {
      id: 'activity-type-uuid-2',
      name: 'New Activity Type',
      is_active: true,
      applicable_roles: [UserRole.SATGAS],
    };

    it('should update overtime description and photo_urls', async () => {
      const updateDto: UpdateOvertimeDto = {
        description: 'Updated description',
        photo_urls: ['https://s3.amazonaws.com/updated-photo.jpg'],
      };

      mockOvertimeRepo.findOne.mockResolvedValue(mockExistingOvertime);
      mockOvertimeRepo.save.mockResolvedValue({
        ...mockExistingOvertime,
        description: updateDto.description,
        photo_urls: updateDto.photo_urls,
      });

      const result = await service.update(overtimeId, updateDto);

      expect(mockOvertimeRepo.save).toHaveBeenCalled();
      expect(result.description).toBe(updateDto.description);
      expect(result.photo_urls).toEqual(updateDto.photo_urls);
    });

    it('should update start and end datetime', async () => {
      const updateDto: UpdateOvertimeDto = {
        start_datetime: '2026-02-14T18:00:00+07:00',
        end_datetime: '2026-02-14T21:00:00+07:00',
      };

      mockOvertimeRepo.findOne.mockResolvedValue(mockExistingOvertime);
      const updatedOvertime = {
        ...mockExistingOvertime,
        start_datetime: new Date(updateDto.start_datetime!),
        end_datetime: new Date(updateDto.end_datetime!),
      };
      mockOvertimeRepo.save.mockResolvedValue(updatedOvertime);

      const result = await service.update(overtimeId, updateDto);

      expect(result.start_datetime).toEqual(updatedOvertime.start_datetime);
      expect(result.end_datetime).toEqual(updatedOvertime.end_datetime);
    });

    it('should update activity_type_id', async () => {
      const updateDto: UpdateOvertimeDto = {
        activity_type_id: mockActivityType.id,
      };

      mockOvertimeRepo.findOne.mockResolvedValue(mockExistingOvertime);
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType);
      mockOvertimeRepo.save.mockResolvedValue({
        ...mockExistingOvertime,
        activity_type_id: mockActivityType.id,
      });

      const result = await service.update(overtimeId, updateDto);

      expect(mockActivityTypeRepo.findOne).toHaveBeenCalledWith({
        where: { id: mockActivityType.id, is_active: true },
      });
      expect(result.activity_type_id).toBe(mockActivityType.id);
    });

    it('should update GPS coordinates', async () => {
      const updateDto: UpdateOvertimeDto = {
        gps_lat: -7.3,
        gps_lng: 112.8,
      };

      mockOvertimeRepo.findOne.mockResolvedValue(mockExistingOvertime);
      mockOvertimeRepo.save.mockResolvedValue({
        ...mockExistingOvertime,
        gps_lat: updateDto.gps_lat,
        gps_lng: updateDto.gps_lng,
      });

      const result = await service.update(overtimeId, updateDto);

      expect(mockOvertimeRepo.save).toHaveBeenCalled();
    });

    it('should throw NotFoundException if overtime not found', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(null);

      const updateDto: UpdateOvertimeDto = { description: 'Updated' };

      await expect(service.update(overtimeId, updateDto)).rejects.toThrow(NotFoundException);
    });

    it('should reject update if end_datetime before start_datetime', async () => {
      const updateDto: UpdateOvertimeDto = {
        start_datetime: '2026-02-14T21:00:00+07:00',
        end_datetime: '2026-02-14T18:00:00+07:00',
      };

      mockOvertimeRepo.findOne.mockResolvedValue(mockExistingOvertime);

      await expect(service.update(overtimeId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should reject update if activity_type not found', async () => {
      const updateDto: UpdateOvertimeDto = {
        activity_type_id: 'nonexistent-type-id',
      };

      mockOvertimeRepo.findOne.mockResolvedValue(mockExistingOvertime);
      mockActivityTypeRepo.findOne.mockResolvedValue(null);

      await expect(service.update(overtimeId, updateDto)).rejects.toThrow(BadRequestException);
    });

    it('should update multiple fields at once', async () => {
      const updateDto: UpdateOvertimeDto = {
        description: 'Updated description',
        photo_urls: ['https://s3.amazonaws.com/photo2.jpg'],
        gps_lat: -7.26,
        gps_lng: 112.77,
      };

      mockOvertimeRepo.findOne.mockResolvedValue(mockExistingOvertime);
      const updatedOvertime = { ...mockExistingOvertime, ...updateDto };
      mockOvertimeRepo.save.mockResolvedValue(updatedOvertime);

      const result = await service.update(overtimeId, updateDto);

      expect(result.description).toBe(updateDto.description);
      expect(result.photo_urls).toEqual(updateDto.photo_urls);
      expect(result.gps_lat).toBe(updateDto.gps_lat);
      expect(result.gps_lng).toBe(updateDto.gps_lng);
    });
  });

  describe('remove', () => {
    const overtimeId = 'overtime-uuid-1';
    const userId = 'user-uuid-1';
    const areaId = 'area-uuid-1';

    const mockOvertime = {
      id: overtimeId,
      user_id: userId,
      location_id: areaId,
      status: OvertimeStatus.PENDING,
      start_datetime: new Date('2026-02-14T17:00:00+07:00'),
      end_datetime: new Date('2026-02-14T20:00:00+07:00'),
      user: { id: userId, role: UserRole.SATGAS },
      area: { id: areaId, district_id: 'district-uuid-1' },
    };

    it('should remove overtime by id', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(mockOvertime);
      mockOvertimeRepo.remove.mockResolvedValue(undefined);

      await service.remove(overtimeId);

      expect(mockOvertimeRepo.findOne).toHaveBeenCalledWith({
        where: { id: overtimeId },
        relations: ['activityType', 'user', 'area', 'approver', 'shift'],
      });
      expect(mockOvertimeRepo.remove).toHaveBeenCalledWith(mockOvertime);
    });

    it('should throw NotFoundException if overtime not found', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(null);

      await expect(service.remove(overtimeId)).rejects.toThrow(NotFoundException);
      expect(mockOvertimeRepo.remove).not.toHaveBeenCalled();
    });
  });
});
