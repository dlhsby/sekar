import { Test, TestingModule } from '@nestjs/testing';
import { OvertimeController } from './overtime.controller';
import { OvertimeService } from './overtime.service';
import { CreateOvertimeDto } from './dto/create-overtime.dto';
import { UpdateOvertimeDto } from './dto/update-overtime.dto';
import { RejectOvertimeDto } from './dto/reject-overtime.dto';
import { OvertimeFilterDto } from './dto/overtime-filter.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { OvertimeStatus } from './entities/overtime.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

describe('OvertimeController', () => {
  let controller: OvertimeController;
  let service: OvertimeService;

  const mockOvertimeService = {
    submit: jest.fn(),
    findMyPaginated: jest.fn(),
    findAllPaginated: jest.fn(),
    findOne: jest.fn(),
    approve: jest.fn(),
    reject: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
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
        start_datetime: '2026-02-10T17:00:00+07:00',
        end_datetime: '2026-02-10T20:00:00+07:00',
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

      expect(service.submit).toHaveBeenCalledWith(user.id, user.role, createDto);
      expect(result).toEqual(mockOvertime);
    });
  });

  describe('findMy', () => {
    it('should call service.findMyPaginated with user id and filters', async () => {
      const user = { id: 'user-uuid-1', role: UserRole.SATGAS } as User;
      const filterDto: OvertimeFilterDto = { status: OvertimeStatus.PENDING };
      const mockResponse = new PaginatedResponseDto(
        [{ id: 'overtime-1', status: OvertimeStatus.PENDING }],
        1,
        1,
        50,
      );

      mockOvertimeService.findMyPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findMy(user, filterDto);

      expect(service.findMyPaginated).toHaveBeenCalledWith(user.id, filterDto);
      expect(result.data).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findAll', () => {
    it('should call service.findAllPaginated with user id, role and filters', async () => {
      const user = { id: 'korlap-uuid-1', role: UserRole.KORLAP } as User;
      const filterDto: OvertimeFilterDto = {};
      const mockResponse = new PaginatedResponseDto(
        [{ id: 'overtime-1', status: OvertimeStatus.PENDING }],
        1,
        1,
        50,
      );

      mockOvertimeService.findAllPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findAll(user, filterDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(user.id, user.role, filterDto);
      expect(result.data).toHaveLength(1);
    });

    it('should call service.findAllPaginated for admin_data user', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid-1',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'rayon-uuid-1',
      } as User;
      const filterDto: OvertimeFilterDto = {};
      const mockResponse = new PaginatedResponseDto(
        [{ id: 'overtime-1' }, { id: 'overtime-2' }],
        2,
        1,
        50,
      );

      mockOvertimeService.findAllPaginated.mockResolvedValue(mockResponse);

      const result = await controller.findAll(adminDataUser, filterDto);

      expect(service.findAllPaginated).toHaveBeenCalledWith(
        adminDataUser.id,
        adminDataUser.role,
        filterDto,
      );
      expect(result.data).toHaveLength(2);
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

      expect(service.approve).toHaveBeenCalledWith(overtimeId, user.id);
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

      expect(service.reject).toHaveBeenCalledWith(overtimeId, user.id, rejectDto);
      expect(result).toEqual(mockOvertime);
    });
  });

  describe('update', () => {
    it('should call service.update with correct parameters', async () => {
      const overtimeId = 'overtime-uuid-1';
      const updateDto: UpdateOvertimeDto = {
        description: 'Updated description',
        photo_urls: ['https://s3.amazonaws.com/updated-photo.jpg'],
      };
      const mockOvertime = {
        id: overtimeId,
        status: OvertimeStatus.PENDING,
        description: updateDto.description,
        photo_urls: updateDto.photo_urls,
      };

      mockOvertimeService.update.mockResolvedValue(mockOvertime);

      const result = await controller.update(overtimeId, updateDto);

      expect(service.update).toHaveBeenCalledWith(overtimeId, updateDto);
      expect(result).toEqual(mockOvertime);
    });

    it('should update datetime fields', async () => {
      const overtimeId = 'overtime-uuid-1';
      const updateDto: UpdateOvertimeDto = {
        start_datetime: '2026-02-14T18:00:00+07:00',
        end_datetime: '2026-02-14T21:00:00+07:00',
      };
      const mockOvertime = {
        id: overtimeId,
        status: OvertimeStatus.PENDING,
        start_datetime: updateDto.start_datetime,
        end_datetime: updateDto.end_datetime,
      };

      mockOvertimeService.update.mockResolvedValue(mockOvertime);

      const result = await controller.update(overtimeId, updateDto);

      expect(service.update).toHaveBeenCalledWith(overtimeId, updateDto);
      expect(result).toEqual(mockOvertime);
    });
  });

  describe('remove', () => {
    it('should call service.remove with overtime id', async () => {
      const overtimeId = 'overtime-uuid-1';

      mockOvertimeService.remove.mockResolvedValue(undefined);

      await controller.remove(overtimeId);

      expect(service.remove).toHaveBeenCalledWith(overtimeId);
    });
  });
});
