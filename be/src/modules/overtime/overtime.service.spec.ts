import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { OvertimeService } from './overtime.service';
import { Overtime, OvertimeStatus } from './entities/overtime.entity';
import { OvertimeAktivitas } from './entities/overtime-aktivitas.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

describe('OvertimeService', () => {
  let module: TestingModule;
  let service: OvertimeService;
  let overtimeRepo: Repository<Overtime>;
  let overtimeAktivitasRepo: Repository<OvertimeAktivitas>;
  let activityTypeRepo: Repository<ActivityType>;
  let userRepo: Repository<User>;

  const mockOvertimeRepo = {
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
    findOne: jest.fn(),
    createQueryBuilder: jest.fn(),
  };

  const mockOvertimeAktivitasRepo = {
    create: jest.fn(),
  };

  const mockActivityTypeRepo = {
    findOne: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        OvertimeService,
        {
          provide: getRepositoryToken(Overtime),
          useValue: mockOvertimeRepo,
        },
        {
          provide: getRepositoryToken(OvertimeAktivitas),
          useValue: mockOvertimeAktivitasRepo,
        },
        {
          provide: getRepositoryToken(ActivityType),
          useValue: mockActivityTypeRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
      ],
    }).compile();

    service = module.get<OvertimeService>(OvertimeService);
    overtimeRepo = module.get<Repository<Overtime>>(
      getRepositoryToken(Overtime),
    );
    overtimeAktivitasRepo = module.get<Repository<OvertimeAktivitas>>(
      getRepositoryToken(OvertimeAktivitas),
    );
    activityTypeRepo = module.get<Repository<ActivityType>>(
      getRepositoryToken(ActivityType),
    );
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
      area_id: areaId,
      role: UserRole.SATGAS,
    };

    const mockActivityType = {
      id: activityTypeId,
      name: 'Cleaning',
      is_active: true,
      applicable_roles: [UserRole.SATGAS, UserRole.LINMAS],
    };

    const createDto: CreateOvertimeDto = {
      date: '2026-02-10',
      start_time: '17:00',
      end_time: '20:00',
      notes: 'Extra cleaning work',
      aktivitas: [
        {
          activity_type_id: activityTypeId,
          description: 'Cleaned park area',
          photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
          gps_lat: -7.250445,
          gps_lng: 112.768845,
        },
      ],
    };

    it('should submit overtime by satgas', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockActivityTypeRepo.findOne.mockResolvedValue(mockActivityType);
      mockOvertimeAktivitasRepo.create.mockReturnValue({
        ...createDto.aktivitas[0],
      });
      mockOvertimeRepo.create.mockReturnValue({
        user_id: userId,
        area_id: areaId,
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

    it('should reject submission for non-OVERTIME_SUBMITTERS role', async () => {
      await expect(
        service.submit(userId, UserRole.KORLAP, createDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.submit(userId, UserRole.KORLAP, createDto),
      ).rejects.toThrow('Only satgas and linmas can submit overtime');
    });

    it('should validate activity_type against user role', async () => {
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockActivityTypeRepo.findOne.mockResolvedValue({
        ...mockActivityType,
        applicable_roles: [UserRole.KORLAP], // Not available for SATGAS
      });

      await expect(
        service.submit(userId, UserRole.SATGAS, createDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.submit(userId, UserRole.SATGAS, createDto),
      ).rejects.toThrow('is not available for your role');
    });
  });

  describe('approve', () => {
    const overtimeId = 'overtime-uuid-1';
    const approverId = 'korlap-uuid-1';
    const areaId = 'area-uuid-1';

    const mockPendingOvertime = {
      id: overtimeId,
      user_id: 'worker-uuid-1',
      area_id: areaId,
      status: OvertimeStatus.PENDING,
    };

    const mockApprover = {
      id: approverId,
      area_id: areaId,
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

      const result = await service.approve(
        overtimeId,
        approverId,
        UserRole.KORLAP,
      );

      expect(result.status).toBe(OvertimeStatus.APPROVED);
      expect(result.approved_by).toBe(approverId);
    });

    it('should reject approval by non-korlap role', async () => {
      await expect(
        service.approve(overtimeId, approverId, UserRole.SATGAS),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.approve(overtimeId, approverId, UserRole.SATGAS),
      ).rejects.toThrow('Only korlap can approve overtime');
    });

    it('should reject approval if already approved', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        ...mockPendingOvertime,
        status: OvertimeStatus.APPROVED,
      });

      await expect(
        service.approve(overtimeId, approverId, UserRole.KORLAP),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.approve(overtimeId, approverId, UserRole.KORLAP),
      ).rejects.toThrow('Only pending overtime can be approved');
    });

    it('should reject approval if area mismatch', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        ...mockPendingOvertime,
        status: OvertimeStatus.PENDING,
      });
      mockUserRepo.findOne.mockResolvedValue({
        ...mockApprover,
        area_id: 'different-area-uuid',
      });

      await expect(
        service.approve(overtimeId, approverId, UserRole.KORLAP),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reject', () => {
    const overtimeId = 'overtime-uuid-1';
    const approverId = 'korlap-uuid-1';

    const mockPendingOvertime = {
      id: overtimeId,
      user_id: 'worker-uuid-1',
      status: OvertimeStatus.PENDING,
    };

    const rejectDto: RejectOvertimeDto = {
      reason: 'Overtime not pre-approved',
    };

    it('should reject pending overtime by korlap', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue(mockPendingOvertime);
      mockOvertimeRepo.save.mockResolvedValue({
        ...mockPendingOvertime,
        status: OvertimeStatus.REJECTED,
        approved_by: approverId,
        rejection_reason: rejectDto.reason,
      });

      const result = await service.reject(
        overtimeId,
        approverId,
        UserRole.KORLAP,
        rejectDto,
      );

      expect(result.status).toBe(OvertimeStatus.REJECTED);
      expect(result.rejection_reason).toBe(rejectDto.reason);
    });

    it('should reject rejection by non-korlap role', async () => {
      await expect(
        service.reject(overtimeId, approverId, UserRole.SATGAS, rejectDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('should reject rejection if area mismatch', async () => {
      mockOvertimeRepo.findOne.mockResolvedValue({
        ...mockPendingOvertime,
        area_id: 'area-uuid-1',
        status: OvertimeStatus.PENDING,
      });
      mockUserRepo.findOne.mockResolvedValue({
        id: approverId,
        area_id: 'different-area-uuid',
        role: UserRole.KORLAP,
      });

      await expect(
        service.reject(overtimeId, approverId, UserRole.KORLAP, rejectDto),
      ).rejects.toThrow(ForbiddenException);
      await expect(
        service.reject(overtimeId, approverId, UserRole.KORLAP, rejectDto),
      ).rejects.toThrow('You can only reject overtime for your area');
    });
  });

  describe('findMy', () => {
    const userId = 'user-uuid-1';

    it('should return user overtime list', async () => {
      const mockOvertimes = [
        { id: 'overtime-1', user_id: userId, status: OvertimeStatus.PENDING },
        { id: 'overtime-2', user_id: userId, status: OvertimeStatus.APPROVED },
      ];
      mockOvertimeRepo.find.mockResolvedValue(mockOvertimes);

      const result = await service.findMy(userId);

      expect(overtimeRepo.find).toHaveBeenCalledWith({
        where: { user_id: userId },
        relations: ['aktivitas', 'aktivitas.activity_type', 'area'],
        order: { created_at: 'DESC' },
      });
      expect(result).toHaveLength(2);
    });
  });

  describe('findPending', () => {
    const approverId = 'korlap-uuid-1';
    const areaId = 'area-uuid-1';

    it('should return pending overtime scoped to korlap area', async () => {
      const mockApprover = {
        id: approverId,
        area_id: areaId,
        role: UserRole.KORLAP,
      };
      mockUserRepo.findOne.mockResolvedValue(mockApprover);

      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([
          { id: 'overtime-1', area_id: areaId, status: OvertimeStatus.PENDING },
        ]),
      };
      mockOvertimeRepo.createQueryBuilder.mockReturnValue(mockQueryBuilder);

      const result = await service.findPending(approverId, UserRole.KORLAP);

      expect(mockQueryBuilder.andWhere).toHaveBeenCalledWith(
        'overtime.area_id = :areaId',
        { areaId },
      );
      expect(result).toHaveLength(1);
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

      await expect(service.findOne(overtimeId)).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
