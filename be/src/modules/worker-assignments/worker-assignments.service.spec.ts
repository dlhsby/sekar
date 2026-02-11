import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationLog } from '../location/entities/location-log.entity';
import { Area } from '../areas/entities/area.entity';
import { User } from '../users/entities/user.entity';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { WorkerAssignmentsService } from './worker-assignments.service';
import { WorkerAssignment } from './entities/worker-assignment.entity';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { UserRole } from '../users/entities/user.entity';
import { AssignWorkerDto } from './dto/assign-worker.dto';

describe('WorkerAssignmentsService', () => {
  let module: TestingModule;
  let service: WorkerAssignmentsService;
  let usersRepository: jest.Mocked<Repository<User>>;
  let areasRepository: jest.Mocked<Repository<Area>>;
  let workerAssignmentsRepository: jest.Mocked<Repository<WorkerAssignment>>;
  let locationLogsRepository: jest.Mocked<Repository<LocationLog>>;
  let repository: Repository<WorkerAssignment>;
  let usersService: UsersService;
  let areasService: AreasService;

  const mockWorker = {
    id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    username: 'worker1',
    role: UserRole.SATGAS,
    full_name: 'Worker One',
    is_active: true,
  };

  const mockSupervisor = {
    id: 'supervisor-uuid-2b3c4d5e-f6a7-8901-bcde-f12345678901',
    username: 'supervisor1',
    role: UserRole.KORLAP,
    full_name: 'Supervisor One',
    is_active: true,
  };

  const mockArea = {
    id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    name: 'Taman Bungkul',
    area_type_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    is_active: true,
    gps_lat: -7.2905,
    gps_lng: 112.7398,
    radius_meters: 100,
  };

  const mockAssignment: WorkerAssignment = {
    id: 'assignment-uuid-4d5e6f7a-b8c9-0123-def0-234567890123',
    worker_id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    worker: mockWorker as any,
    area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    area: mockArea as any,
    assigned_at: new Date(),
    deprecated: false,
    migrated_to_schedule_id: null,
  };

  const mockRepository = {
    create: jest.fn(),
    save: jest.fn(),
    findOne: jest.fn(),
    find: jest.fn(),
    remove: jest.fn(),
    count: jest.fn(),
  };

  const mockUsersService = {
    findOne: jest.fn(),
  };

  const mockAreasService = {
    findOne: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      providers: [
        WorkerAssignmentsService,
        {
          provide: getRepositoryToken(WorkerAssignment),
          useValue: mockRepository,
        },
        {
          provide: UsersService,
          useValue: mockUsersService,
        },
        {
          provide: AreasService,
          useValue: mockAreasService,
        },
      ],
    }).compile();

    service = module.get<WorkerAssignmentsService>(WorkerAssignmentsService);
    repository = module.get<Repository<WorkerAssignment>>(
      getRepositoryToken(WorkerAssignment),
    ) as jest.Mocked<Repository<WorkerAssignment>>;
    usersService = module.get<UsersService>(UsersService);
    areasService = module.get<AreasService>(AreasService);
  });

  afterEach(async () => {
    await module.close();
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('assignWorker', () => {
    const assignWorkerDto: AssignWorkerDto = {
      area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    };

    it('should assign a worker to an area successfully', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorker);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockRepository.findOne.mockResolvedValue(null); // No existing assignment
      mockRepository.create.mockReturnValue(mockAssignment);
      mockRepository.save.mockResolvedValue(mockAssignment);

      const result = await service.assignWorker(
        'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
        assignWorkerDto,
      );

      expect(result).toEqual(mockAssignment);
      expect(usersService.findOne).toHaveBeenCalledWith(
        'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
      );
      expect(areasService.findOne).toHaveBeenCalledWith(
        'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
      );
      expect(repository.create).toHaveBeenCalledWith({
        worker_id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
        area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
      });
    });

    it('should throw BadRequestException if user is not a worker', async () => {
      mockUsersService.findOne.mockResolvedValue(mockSupervisor);

      await expect(
        service.assignWorker(
          'supervisor-uuid-2b3c4d5e-f6a7-8901-bcde-f12345678901',
          assignWorkerDto,
        ),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignWorker(
          'supervisor-uuid-2b3c4d5e-f6a7-8901-bcde-f12345678901',
          assignWorkerDto,
        ),
      ).rejects.toThrow('User must have worker role');
    });

    it('should throw BadRequestException if area is inactive', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorker);
      mockAreasService.findOne.mockResolvedValue({
        ...mockArea,
        is_active: false,
      });

      await expect(
        service.assignWorker('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890', assignWorkerDto),
      ).rejects.toThrow(BadRequestException);
      await expect(
        service.assignWorker('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890', assignWorkerDto),
      ).rejects.toThrow('Cannot assign worker to inactive area');
    });

    it('should throw ConflictException if worker already has an assignment', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorker);
      mockAreasService.findOne.mockResolvedValue(mockArea);
      mockRepository.findOne.mockResolvedValue(mockAssignment); // Existing assignment

      await expect(
        service.assignWorker('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890', assignWorkerDto),
      ).rejects.toThrow(ConflictException);
      await expect(
        service.assignWorker('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890', assignWorkerDto),
      ).rejects.toThrow('Worker is already assigned');
    });

    it('should throw NotFoundException if worker not found', async () => {
      mockUsersService.findOne.mockRejectedValue(
        new NotFoundException('User with ID e5f6a7b8-c9d0-1234-ef01-345678901234 not found'),
      );

      await expect(
        service.assignWorker('e5f6a7b8-c9d0-1234-ef01-345678901234', assignWorkerDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if area not found', async () => {
      mockUsersService.findOne.mockResolvedValue(mockWorker);
      mockAreasService.findOne.mockRejectedValue(
        new NotFoundException('Area with ID f5f6a7b8-c9d0-1234-ef01-345678901234 not found'),
      );

      await expect(
        service.assignWorker('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890', {
          area_id: 'f5f6a7b8-c9d0-1234-ef01-345678901234',
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAssignment', () => {
    it('should remove a worker assignment', async () => {
      mockRepository.findOne.mockResolvedValue(mockAssignment);
      mockRepository.remove.mockResolvedValue(mockAssignment);

      await service.removeAssignment('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890');

      expect(repository.remove).toHaveBeenCalledWith(mockAssignment);
    });

    it('should throw NotFoundException if worker has no assignment', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeAssignment('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890'),
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.removeAssignment('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890'),
      ).rejects.toThrow(
        'Worker worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890 has no area assignment',
      );
    });
  });

  describe('getWorkerAssignment', () => {
    it('should return worker assignment', async () => {
      mockRepository.findOne.mockResolvedValue(mockAssignment);

      const result = await service.getWorkerAssignment(
        'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
      );

      expect(result).toEqual(mockAssignment);
      expect(repository.findOne).toHaveBeenCalledWith({
        where: { worker_id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890' },
        relations: ['area', 'area.areaType'],
      });
    });

    it('should return null if worker has no assignment', async () => {
      mockRepository.findOne.mockResolvedValue(null);

      const result = await service.getWorkerAssignment(
        'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
      );

      expect(result).toBeNull();
    });
  });

  describe('countByAreaId', () => {
    it('should count workers assigned to an area', async () => {
      mockRepository.count.mockResolvedValue(3);

      const result = await service.countByAreaId('area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012');

      expect(result).toBe(3);
      expect(repository.count).toHaveBeenCalledWith({
        where: { area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012' },
      });
    });
  });

  describe('getAreaAssignments', () => {
    it('should return all assignments for an area', async () => {
      mockRepository.find.mockResolvedValue([mockAssignment]);

      const result = await service.getAreaAssignments(
        'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
      );

      expect(result).toEqual([mockAssignment]);
      expect(repository.find).toHaveBeenCalledWith({
        where: { area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012' },
      });
    });
  });
});
