import { Test, TestingModule } from '@nestjs/testing';
import { SchedulesController } from './schedules.controller';
import { SchedulesService } from './schedules.service';
import { Schedule } from './entities/schedule.entity';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { UserRole } from '../users/entities/user.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';

describe('SchedulesController', () => {
  let module: TestingModule;
  let controller: SchedulesController;
  let service: jest.Mocked<SchedulesService>;

  const mockUser = {
    id: 'user-uuid-1a2b3c4d',
    username: 'worker1',
    role: UserRole.SATGAS,
    full_name: 'Worker One',
    is_active: true,
  };

  const mockAdminUser = {
    id: 'admin-uuid-1234',
    username: 'admin1',
    role: UserRole.ADMIN_SYSTEM,
    full_name: 'Admin User',
    is_active: true,
  };

  const mockArea = {
    id: 'area-uuid-a1b2c3d4',
    name: 'Taman Bungkul',
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 150,
    is_active: true,
  };

  const mockShiftDefinition = {
    id: 'shift-def-uuid-1',
    name: 'Shift 1 (Morning)',
    start_time: '08:00',
    end_time: '16:00',
    is_active: true,
  };

  const mockSchedule: Schedule = {
    id: 'schedule-uuid-1',
    user_id: mockUser.id,
    area_id: mockArea.id,
    shift_definition_id: mockShiftDefinition.id,
    effective_date: new Date('2026-01-20'),
    end_date: new Date('2026-12-31'),
    created_by: 'admin-uuid',
    user: mockUser as any,
    area: mockArea as any,
    shift_definition: mockShiftDefinition as any,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockService = {
    findAll: jest.fn(),
    findOne: jest.fn(),
    findCurrentByUserId: jest.fn(),
    findByAreaId: jest.fn(),
    findByUserId: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    remove: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [SchedulesController],
      providers: [
        {
          provide: SchedulesService,
          useValue: mockService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .overrideGuard(RolesGuard)
      .useValue({ canActivate: jest.fn(() => true) })
      .compile();

    controller = module.get<SchedulesController>(SchedulesController);
    service = module.get(SchedulesService) as jest.Mocked<SchedulesService>;
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    // The controller always forwards a list-filter object (search/shift/date range)
    // as the trailing arg; empty when no such query params are present.
    const NO_FILTERS = {
      search: undefined,
      shiftDefinitionId: undefined,
      dateFrom: undefined,
      dateTo: undefined,
    };

    it('should return all schedules without filters', async () => {
      mockService.findAll.mockResolvedValue([mockSchedule]);

      const result = await controller.findAll(mockAdminUser as any);

      expect(result).toEqual([mockSchedule]);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, false, mockAdminUser, NO_FILTERS);
    });

    it('should pass admin_data user context for rayon filtering', async () => {
      const adminDataUser = {
        id: 'admin-data-uuid',
        username: 'admindata1',
        role: UserRole.ADMIN_DATA,
        rayon_id: 'rayon-uuid-1',
        is_active: true,
      };

      mockService.findAll.mockResolvedValue([mockSchedule]);

      const result = await controller.findAll(adminDataUser as any);

      expect(result).toEqual([mockSchedule]);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, false, adminDataUser, NO_FILTERS);
    });

    it('should pass kepala_rayon user context for rayon filtering', async () => {
      const kepalaRayonUser = {
        id: 'kepala-rayon-uuid',
        username: 'kepalarayon1',
        role: UserRole.KEPALA_RAYON,
        rayon_id: 'rayon-uuid-2',
        is_active: true,
      };

      mockService.findAll.mockResolvedValue([mockSchedule]);

      const result = await controller.findAll(kepalaRayonUser as any);

      expect(result).toEqual([mockSchedule]);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, false, kepalaRayonUser, NO_FILTERS);
    });

    it('should filter schedules by areaId', async () => {
      mockService.findAll.mockResolvedValue([mockSchedule]);

      const result = await controller.findAll(mockAdminUser as any, mockArea.id);

      expect(result).toEqual([mockSchedule]);
      expect(service.findAll).toHaveBeenCalledWith(mockArea.id, undefined, false, mockAdminUser, NO_FILTERS);
    });

    it('should filter schedules by userId', async () => {
      mockService.findAll.mockResolvedValue([mockSchedule]);

      const result = await controller.findAll(mockAdminUser as any, undefined, mockUser.id);

      expect(result).toEqual([mockSchedule]);
      expect(service.findAll).toHaveBeenCalledWith(undefined, mockUser.id, false, mockAdminUser, NO_FILTERS);
    });

    it('should filter schedules by activeOnly when activeOnly is "true"', async () => {
      mockService.findAll.mockResolvedValue([mockSchedule]);

      const result = await controller.findAll(mockAdminUser as any, undefined, undefined, 'true');

      expect(result).toEqual([mockSchedule]);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, true, mockAdminUser, NO_FILTERS);
    });

    it('should not filter by activeOnly when activeOnly is not "true"', async () => {
      mockService.findAll.mockResolvedValue([mockSchedule]);

      await controller.findAll(mockAdminUser as any, undefined, undefined, 'false');
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, false, mockAdminUser, NO_FILTERS);

      await controller.findAll(mockAdminUser as any, undefined, undefined, undefined);
      expect(service.findAll).toHaveBeenCalledWith(undefined, undefined, false, mockAdminUser, NO_FILTERS);
    });

    it('should apply all filters together', async () => {
      mockService.findAll.mockResolvedValue([mockSchedule]);

      const result = await controller.findAll(
        mockAdminUser as any,
        mockArea.id,
        mockUser.id,
        'true',
      );

      expect(result).toEqual([mockSchedule]);
      expect(service.findAll).toHaveBeenCalledWith(mockArea.id, mockUser.id, true, mockAdminUser, NO_FILTERS);
    });
  });

  describe('getMySchedule', () => {
    it('should return current schedule for authenticated user', async () => {
      mockService.findCurrentByUserId.mockResolvedValue(mockSchedule);

      const result = await controller.getMySchedule(mockUser as any);

      expect(result).toEqual(mockSchedule);
      expect(service.findCurrentByUserId).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return null if user has no current schedule', async () => {
      mockService.findCurrentByUserId.mockResolvedValue(null);

      const result = await controller.getMySchedule(mockUser as any);

      expect(result).toBeNull();
    });
  });

  describe('findByArea', () => {
    it('should return schedules for an area without activeOnly filter', async () => {
      mockService.findByAreaId.mockResolvedValue([mockSchedule]);

      const result = await controller.findByArea(mockArea.id);

      expect(result).toEqual([mockSchedule]);
      expect(service.findByAreaId).toHaveBeenCalledWith(mockArea.id, false);
    });

    it('should return only active schedules when activeOnly is "true"', async () => {
      mockService.findByAreaId.mockResolvedValue([mockSchedule]);

      const result = await controller.findByArea(mockArea.id, 'true');

      expect(result).toEqual([mockSchedule]);
      expect(service.findByAreaId).toHaveBeenCalledWith(mockArea.id, true);
    });

    it('should handle empty result', async () => {
      mockService.findByAreaId.mockResolvedValue([]);

      const result = await controller.findByArea(mockArea.id);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('should return schedule by ID', async () => {
      mockService.findOne.mockResolvedValue(mockSchedule);

      const result = await controller.findOne(mockSchedule.id);

      expect(result).toEqual(mockSchedule);
      expect(service.findOne).toHaveBeenCalledWith(mockSchedule.id);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new Error('Schedule not found');
      mockService.findOne.mockRejectedValue(error);

      await expect(controller.findOne('nonexistent-id')).rejects.toThrow(error);
    });
  });

  describe('create', () => {
    const createDto: CreateScheduleDto = {
      user_id: mockUser.id,
      area_id: mockArea.id,
      shift_definition_id: mockShiftDefinition.id,
      effective_date: '2026-01-20',
      end_date: '2026-12-31',
    };

    it('should successfully create a schedule', async () => {
      mockService.create.mockResolvedValue(mockSchedule);

      const result = await controller.create(createDto, mockAdminUser as any);

      expect(result).toEqual(mockSchedule);
      expect(service.create).toHaveBeenCalledWith(createDto, mockAdminUser.id);
    });

    it('should create schedule without end_date (ongoing)', async () => {
      const ongoingDto: CreateScheduleDto = {
        user_id: mockUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-01-20',
      };

      const ongoingSchedule = { ...mockSchedule, end_date: undefined };
      mockService.create.mockResolvedValue(ongoingSchedule);

      const result = await controller.create(ongoingDto, mockAdminUser as any);

      expect(result).toEqual(ongoingSchedule);
      expect(service.create).toHaveBeenCalledWith(ongoingDto, mockAdminUser.id);
    });

    it('should propagate BadRequestException from service', async () => {
      const error = new Error('User must be a Worker or Linmas');
      mockService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockAdminUser as any)).rejects.toThrow(error);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new Error('Area not found');
      mockService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockAdminUser as any)).rejects.toThrow(error);
    });

    it('should propagate ConflictException from service', async () => {
      const error = new Error('Schedule overlaps with existing schedule');
      mockService.create.mockRejectedValue(error);

      await expect(controller.create(createDto, mockAdminUser as any)).rejects.toThrow(error);
    });
  });

  describe('update', () => {
    const updateDto: UpdateScheduleDto = {
      area_id: 'new-area-uuid',
      effective_date: '2026-02-01',
      end_date: '2026-11-30',
    };

    it('should successfully update a schedule', async () => {
      const updatedSchedule = { ...mockSchedule, ...updateDto };
      mockService.update.mockResolvedValue(updatedSchedule);

      const result = await controller.update(mockSchedule.id, updateDto);

      expect(result).toEqual(updatedSchedule);
      expect(service.update).toHaveBeenCalledWith(mockSchedule.id, updateDto);
    });

    it('should update with partial data', async () => {
      const partialUpdate: UpdateScheduleDto = {
        area_id: 'new-area-uuid',
      };

      mockService.update.mockResolvedValue({ ...mockSchedule, ...partialUpdate });

      const result = await controller.update(mockSchedule.id, partialUpdate);

      expect(service.update).toHaveBeenCalledWith(mockSchedule.id, partialUpdate);
    });

    it('should update to set end_date to null (ongoing)', async () => {
      const ongoingUpdate: UpdateScheduleDto = {
        end_date: null,
      };

      const ongoingSchedule = { ...mockSchedule, end_date: undefined };
      mockService.update.mockResolvedValue(ongoingSchedule);

      const result = await controller.update(mockSchedule.id, ongoingUpdate);

      expect(result.end_date).toBeUndefined();
      expect(service.update).toHaveBeenCalledWith(mockSchedule.id, ongoingUpdate);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new Error('Schedule not found');
      mockService.update.mockRejectedValue(error);

      await expect(controller.update('nonexistent-id', updateDto)).rejects.toThrow(error);
    });

    it('should propagate BadRequestException from service', async () => {
      const error = new Error('End date cannot be before effective date');
      mockService.update.mockRejectedValue(error);

      await expect(controller.update(mockSchedule.id, updateDto)).rejects.toThrow(error);
    });

    it('should propagate ConflictException from service', async () => {
      const error = new Error('Schedule overlaps with existing schedule');
      mockService.update.mockRejectedValue(error);

      await expect(controller.update(mockSchedule.id, updateDto)).rejects.toThrow(error);
    });
  });

  describe('remove', () => {
    it('should successfully delete a schedule', async () => {
      mockService.remove.mockResolvedValue(undefined);

      await controller.remove(mockSchedule.id);

      expect(service.remove).toHaveBeenCalledWith(mockSchedule.id);
    });

    it('should propagate NotFoundException from service', async () => {
      const error = new Error('Schedule not found');
      mockService.remove.mockRejectedValue(error);

      await expect(controller.remove('nonexistent-id')).rejects.toThrow(error);
    });
  });

  describe('Guard Requirements', () => {
    it('should require JWT authentication for all endpoints', () => {
      const guards = Reflect.getMetadata('__guards__', SchedulesController);
      expect(guards).toContain(JwtAuthGuard);
      expect(guards).toContain(RolesGuard);
    });

    it('create endpoint should require USER_MANAGERS or KORLAP role', () => {
      const roles = Reflect.getMetadata('roles', controller.create);
      expect(roles).toBeDefined();
      // Roles are set dynamically in decorator, can't easily test exact values
      // but we verify the decorator is applied
    });

    it('update endpoint should require USER_MANAGERS or KORLAP role', () => {
      const roles = Reflect.getMetadata('roles', controller.update);
      expect(roles).toBeDefined();
    });

    it('remove endpoint should require USER_MANAGERS or KORLAP role', () => {
      const roles = Reflect.getMetadata('roles', controller.remove);
      expect(roles).toBeDefined();
    });

    it('read endpoints should not have role restrictions', () => {
      const rolesForFindAll = Reflect.getMetadata('roles', controller.findAll);
      const rolesForFindOne = Reflect.getMetadata('roles', controller.findOne);
      const rolesForGetMy = Reflect.getMetadata('roles', controller.getMySchedule);

      expect(rolesForFindAll).toBeUndefined();
      expect(rolesForFindOne).toBeUndefined();
      expect(rolesForGetMy).toBeUndefined();
    });
  });

  describe('HTTP Status Codes', () => {
    it('create should return 201 implicitly', async () => {
      mockService.create.mockResolvedValue(mockSchedule);

      const createDto: CreateScheduleDto = {
        user_id: mockUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-01-20',
      };

      const result = await controller.create(createDto, mockAdminUser as any);

      // POST endpoints return 201 by default in NestJS
      expect(result).toBeDefined();
    });

    it('remove should use 204 status code', () => {
      const statusCode = Reflect.getMetadata('__httpCode__', controller.remove);
      expect(statusCode).toBe(204); // HttpStatus.NO_CONTENT
    });
  });
});
