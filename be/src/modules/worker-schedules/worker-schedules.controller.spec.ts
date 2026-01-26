import { Test, TestingModule } from '@nestjs/testing';
import { WorkerSchedulesController } from './worker-schedules.controller';
import { WorkerSchedulesService } from './worker-schedules.service';
import { WorkerSchedule } from './entities/worker-schedule.entity';
import { CreateWorkerScheduleDto } from './dto/create-worker-schedule.dto';
import { UpdateWorkerScheduleDto } from './dto/update-worker-schedule.dto';
import { User, UserRole } from '../users/entities/user.entity';

describe('WorkerSchedulesController', () => {
  let module: TestingModule;
  let controller: WorkerSchedulesController;
  let schedulesService: WorkerSchedulesService;

  const mockWorkerUser: User = {
    id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    username: 'worker1',
    password_hash: 'hashed',
    full_name: 'Test Worker',
    role: UserRole.WORKER,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockAdminUser: User = {
    id: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    username: 'admin',
    password_hash: 'hashed',
    full_name: 'Test Admin',
    role: UserRole.ADMIN,
    is_active: true,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const mockArea = {
    id: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
  };

  const mockShiftDefinition = {
    id: '22222222-2222-2222-2222-222222222201',
    name: 'Shift 1',
    code: 'SHIFT1',
    start_time: '06:00:00',
    end_time: '15:00:00',
  };

  const mockSchedule: WorkerSchedule = {
    id: '55555555-5555-5555-5555-555555555501',
    user_id: mockWorkerUser.id,
    area_id: mockArea.id,
    shift_definition_id: mockShiftDefinition.id,
    effective_date: new Date('2026-01-20'),
    created_by: mockAdminUser.id,
    created_at: new Date('2024-01-01T00:00:00Z'),
    updated_at: new Date('2024-01-01T00:00:00Z'),
    user: mockWorkerUser as any,
    area: mockArea as any,
    shiftDefinition: mockShiftDefinition as any,
    creator: mockAdminUser as any,
  };

  const mockSchedulesService = {
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
      controllers: [WorkerSchedulesController],
      providers: [
        {
          provide: WorkerSchedulesService,
          useValue: mockSchedulesService,
        },
      ],
    }).compile();

    controller = module.get<WorkerSchedulesController>(WorkerSchedulesController);
    schedulesService = module.get<WorkerSchedulesService>(WorkerSchedulesService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all schedules without filters', async () => {
      const schedules = [mockSchedule];
      mockSchedulesService.findAll.mockResolvedValue(schedules);

      const result = await controller.findAll();

      expect(result).toEqual(schedules);
      expect(schedulesService.findAll).toHaveBeenCalledWith(undefined, undefined, false);
    });

    it('should return schedules filtered by areaId', async () => {
      const schedules = [mockSchedule];
      mockSchedulesService.findAll.mockResolvedValue(schedules);

      const result = await controller.findAll(mockArea.id);

      expect(result).toEqual(schedules);
      expect(schedulesService.findAll).toHaveBeenCalledWith(mockArea.id, undefined, false);
    });

    it('should return schedules filtered by userId', async () => {
      const schedules = [mockSchedule];
      mockSchedulesService.findAll.mockResolvedValue(schedules);

      const result = await controller.findAll(undefined, mockWorkerUser.id);

      expect(result).toEqual(schedules);
      expect(schedulesService.findAll).toHaveBeenCalledWith(undefined, mockWorkerUser.id, false);
    });

    it('should return active schedules only', async () => {
      const schedules = [mockSchedule];
      mockSchedulesService.findAll.mockResolvedValue(schedules);

      const result = await controller.findAll(undefined, undefined, 'true');

      expect(result).toEqual(schedules);
      expect(schedulesService.findAll).toHaveBeenCalledWith(undefined, undefined, true);
    });

    it('should return empty array when no schedules exist', async () => {
      mockSchedulesService.findAll.mockResolvedValue([]);

      const result = await controller.findAll();

      expect(result).toEqual([]);
    });
  });

  describe('getMySchedule', () => {
    it('should return current schedule for authenticated user', async () => {
      mockSchedulesService.findCurrentByUserId.mockResolvedValue(mockSchedule);

      const result = await controller.getMySchedule(mockWorkerUser);

      expect(result).toEqual(mockSchedule);
      expect(schedulesService.findCurrentByUserId).toHaveBeenCalledWith(mockWorkerUser.id);
    });

    it('should return null when user has no current schedule', async () => {
      mockSchedulesService.findCurrentByUserId.mockResolvedValue(null);

      const result = await controller.getMySchedule(mockWorkerUser);

      expect(result).toBeNull();
    });
  });

  describe('findByArea', () => {
    it('should return schedules for an area', async () => {
      const schedules = [mockSchedule];
      mockSchedulesService.findByAreaId.mockResolvedValue(schedules);

      const result = await controller.findByArea(mockArea.id);

      expect(result).toEqual(schedules);
      expect(schedulesService.findByAreaId).toHaveBeenCalledWith(mockArea.id, false);
    });

    it('should return active schedules only for an area', async () => {
      const schedules = [mockSchedule];
      mockSchedulesService.findByAreaId.mockResolvedValue(schedules);

      const result = await controller.findByArea(mockArea.id, 'true');

      expect(result).toEqual(schedules);
      expect(schedulesService.findByAreaId).toHaveBeenCalledWith(mockArea.id, true);
    });
  });

  describe('findOne', () => {
    it('should return a schedule by ID', async () => {
      mockSchedulesService.findOne.mockResolvedValue(mockSchedule);

      const result = await controller.findOne(mockSchedule.id);

      expect(result).toEqual(mockSchedule);
      expect(schedulesService.findOne).toHaveBeenCalledWith(mockSchedule.id);
    });
  });

  describe('create', () => {
    it('should create a new schedule', async () => {
      const createDto: CreateWorkerScheduleDto = {
        user_id: mockWorkerUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-01-20',
      };

      mockSchedulesService.create.mockResolvedValue(mockSchedule);

      const result = await controller.create(createDto, mockAdminUser);

      expect(result).toEqual(mockSchedule);
      expect(schedulesService.create).toHaveBeenCalledWith(createDto, mockAdminUser.id);
    });

    it('should create schedule with end_date', async () => {
      const createDto: CreateWorkerScheduleDto = {
        user_id: mockWorkerUser.id,
        area_id: mockArea.id,
        shift_definition_id: mockShiftDefinition.id,
        effective_date: '2026-01-20',
        end_date: '2026-12-31',
      };

      const scheduleWithEndDate = {
        ...mockSchedule,
        end_date: new Date('2026-12-31'),
      };
      mockSchedulesService.create.mockResolvedValue(scheduleWithEndDate);

      const result = await controller.create(createDto, mockAdminUser);

      expect(result.end_date).toEqual(new Date('2026-12-31'));
    });
  });

  describe('update', () => {
    it('should update a schedule', async () => {
      const updateDto: UpdateWorkerScheduleDto = {
        area_id: 'd4e5f6a7-b8c9-0123-def0-234567890123',
      };

      const updatedSchedule = { ...mockSchedule, area_id: updateDto.area_id };
      mockSchedulesService.update.mockResolvedValue(updatedSchedule);

      const result = await controller.update(mockSchedule.id, updateDto);

      expect(result.area_id).toBe(updateDto.area_id);
      expect(schedulesService.update).toHaveBeenCalledWith(mockSchedule.id, updateDto);
    });

    it('should update schedule dates', async () => {
      const updateDto: UpdateWorkerScheduleDto = {
        effective_date: '2026-02-01',
        end_date: '2026-06-30',
      };

      const updatedSchedule = {
        ...mockSchedule,
        effective_date: new Date('2026-02-01'),
        end_date: new Date('2026-06-30'),
      };
      mockSchedulesService.update.mockResolvedValue(updatedSchedule);

      const result = await controller.update(mockSchedule.id, updateDto);

      expect(result.effective_date).toEqual(new Date('2026-02-01'));
      expect(result.end_date).toEqual(new Date('2026-06-30'));
    });
  });

  describe('remove', () => {
    it('should remove a schedule', async () => {
      mockSchedulesService.remove.mockResolvedValue(undefined);

      await controller.remove(mockSchedule.id);

      expect(schedulesService.remove).toHaveBeenCalledWith(mockSchedule.id);
    });
  });
});
