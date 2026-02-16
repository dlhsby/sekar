import { Test, TestingModule } from '@nestjs/testing';
import { OvertimeController } from './overtime.controller';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { OvertimeStatus } from './entities/overtime.entity';

describe('OvertimeController', () => {
  let controller: OvertimeController;
  let service: OvertimeService;

  const mockOvertimeService = {
    submit: jest.fn(),
    findMy: jest.fn(),
    findPending: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OvertimeController],
      providers: [
        {
          provide: OvertimeService,
          useValue: mockOvertimeService,
        },
      ],
    }).compile();

    controller = module.get<OvertimeController>(OvertimeController);
    service = module.get<OvertimeService>(OvertimeService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('submit', () => {
    it('should call service.submit with correct parameters', async () => {
      const createDto: CreateOvertimeDto = {
        date: '2026-02-10',
        start_time: '17:00',
        end_time: '20:00',
        notes: 'Extra work',
        activity_type_id: 'activity-uuid-1',
        description: 'Cleaned park',
        photo_urls: ['https://s3.amazonaws.com/photo1.jpg'],
        gps_lat: -7.250445,
        gps_lng: 112.768845,
      };
      const user = { id: 'user-uuid-1', role: UserRole.SATGAS } as User;
      const mockOvertime = {
        id: 'overtime-uuid-1',
        ...createDto,
        status: OvertimeStatus.PENDING,
      };

      mockOvertimeService.submit.mockResolvedValue(mockOvertime);

      const result = await controller.submit(createDto, user);

      expect(service.submit).toHaveBeenCalledWith(
        user.id,
        user.role,
        createDto,
      );
      expect(result).toEqual(mockOvertime);
    });
  });

  describe('findMy', () => {
    it('should call service.findMy with user id', async () => {
      const user = { id: 'user-uuid-1', role: UserRole.SATGAS } as User;
      const mockOvertimes = [
        { id: 'overtime-1', status: OvertimeStatus.PENDING },
      ];

      mockOvertimeService.findMy.mockResolvedValue(mockOvertimes);

      const result = await controller.findMy(user);

      expect(service.findMy).toHaveBeenCalledWith(user.id);
      expect(result).toEqual(mockOvertimes);
    });
  });

  describe('findPending', () => {
    it('should call service.findPending with user id and role', async () => {
      const user = { id: 'korlap-uuid-1', role: UserRole.KORLAP } as User;
      const mockOvertimes = [
        { id: 'overtime-1', status: OvertimeStatus.PENDING },
      ];

      mockOvertimeService.findPending.mockResolvedValue(mockOvertimes);

      const result = await controller.findPending(user);

      expect(service.findPending).toHaveBeenCalledWith(user.id, user.role);
      expect(result).toEqual(mockOvertimes);
    });

    it('should call service.findPending for admin_data user (rayon-scoped)', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid-1',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'rayon-uuid-1',
      } as User;
      const mockOvertimes = [
        { id: 'overtime-1', status: OvertimeStatus.PENDING },
        { id: 'overtime-2', status: OvertimeStatus.PENDING },
      ];

      mockOvertimeService.findPending.mockResolvedValue(mockOvertimes);

      const result = await controller.findPending(adminDataUser);

      expect(service.findPending).toHaveBeenCalledWith(adminDataUser.id, adminDataUser.role);
      expect(result).toEqual(mockOvertimes);
    });
  });

  describe('findOne', () => {
    it('should call service.findOne with overtime id', async () => {
      const overtimeId = 'overtime-uuid-1';
      const mockOvertime = { id: overtimeId, status: OvertimeStatus.PENDING };

      mockOvertimeService.findOne.mockResolvedValue(mockOvertime);

      const result = await controller.findOne(overtimeId);

      expect(service.findOne).toHaveBeenCalledWith(overtimeId);
      expect(result).toEqual(mockOvertime);
    });
  });

  describe('approve', () => {
    it('should call service.approve with correct parameters', async () => {
      const overtimeId = 'overtime-uuid-1';
      const user = { id: 'korlap-uuid-1', role: UserRole.KORLAP } as User;
      const mockOvertime = {
        id: overtimeId,
        status: OvertimeStatus.APPROVED,
      };

      mockOvertimeService.approve.mockResolvedValue(mockOvertime);

      const result = await controller.approve(overtimeId, user);

      expect(service.approve).toHaveBeenCalledWith(
        overtimeId,
        user.id,
        user.role,
      );
      expect(result).toEqual(mockOvertime);
    });
  });

  describe('reject', () => {
    it('should call service.reject with correct parameters', async () => {
      const overtimeId = 'overtime-uuid-1';
      const rejectDto: RejectOvertimeDto = { reason: 'Not pre-approved' };
      const user = { id: 'korlap-uuid-1', role: UserRole.KORLAP } as User;
      const mockOvertime = {
        id: overtimeId,
        status: OvertimeStatus.REJECTED,
        rejection_reason: rejectDto.reason,
      };

      mockOvertimeService.reject.mockResolvedValue(mockOvertime);

      const result = await controller.reject(overtimeId, rejectDto, user);

      expect(service.reject).toHaveBeenCalledWith(
        overtimeId,
        user.id,
        user.role,
        rejectDto,
      );
      expect(result).toEqual(mockOvertime);
    });
  });
});
