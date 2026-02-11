import { Test, TestingModule } from '@nestjs/testing';
import { WorkerAssignmentsController } from './worker-assignments.controller';
import { WorkerAssignmentsService } from './worker-assignments.service';
import { WorkerAssignment } from './entities/worker-assignment.entity';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { NotFoundException, ConflictException, BadRequestException } from '@nestjs/common';
import { UserRole } from '../users/entities/user.entity';

describe('WorkerAssignmentsController', () => {
  let module: TestingModule;
  let controller: WorkerAssignmentsController;
  let service: WorkerAssignmentsService;

  const mockAssignment: WorkerAssignment = {
    id: 'assignment-uuid-4d5e6f7a-b8c9-0123-def0-234567890123',
    worker_id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
    worker: {
      id: 'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
      username: 'worker1',
      role: UserRole.SATGAS,
      full_name: 'Worker One',
    } as any,
    area_id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
    area: {
      id: 'area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
      name: 'Taman Bungkul',
    } as any,
    assigned_at: new Date(),
    deprecated: false,
    migrated_to_schedule_id: null,
  };

  const mockWorkerAssignmentsService = {
    assignWorker: jest.fn(),
    removeAssignment: jest.fn(),
    getWorkerAssignment: jest.fn(),
  };

  beforeEach(async () => {
    module = await Test.createTestingModule({
      controllers: [WorkerAssignmentsController],
      providers: [
        {
          provide: WorkerAssignmentsService,
          useValue: mockWorkerAssignmentsService,
        },
      ],
    }).compile();

    controller = module.get<WorkerAssignmentsController>(WorkerAssignmentsController);
    service = module.get<WorkerAssignmentsService>(WorkerAssignmentsService);
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

    it('should assign a worker to an area', async () => {
      mockWorkerAssignmentsService.assignWorker.mockResolvedValue(mockAssignment);

      const result = await controller.assignWorker(
        'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
        assignWorkerDto,
      );

      expect(result).toEqual(mockAssignment);
      expect(service.assignWorker).toHaveBeenCalledWith(
        'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
        assignWorkerDto,
      );
      expect(service.assignWorker).toHaveBeenCalledTimes(1);
    });

    it('should throw ConflictException if worker already assigned', async () => {
      mockWorkerAssignmentsService.assignWorker.mockRejectedValue(
        new ConflictException(
          'Worker is already assigned to area area-uuid-3c4d5e6f-a7b8-9012-cdef-123456789012',
        ),
      );

      await expect(
        controller.assignWorker(
          'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
          assignWorkerDto,
        ),
      ).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException if user is not a worker', async () => {
      mockWorkerAssignmentsService.assignWorker.mockRejectedValue(
        new BadRequestException('User must have worker role'),
      );

      await expect(
        controller.assignWorker(
          'supervisor-uuid-2b3c4d5e-f6a7-8901-bcde-f12345678901',
          assignWorkerDto,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if worker or area not found', async () => {
      mockWorkerAssignmentsService.assignWorker.mockRejectedValue(
        new NotFoundException('User with ID e5f6a7b8-c9d0-1234-ef01-345678901234 not found'),
      );

      await expect(
        controller.assignWorker('e5f6a7b8-c9d0-1234-ef01-345678901234', assignWorkerDto),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('removeAssignment', () => {
    it('should remove a worker assignment', async () => {
      mockWorkerAssignmentsService.removeAssignment.mockResolvedValue(undefined);

      await controller.removeAssignment('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890');

      expect(service.removeAssignment).toHaveBeenCalledWith(
        'worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890',
      );
      expect(service.removeAssignment).toHaveBeenCalledTimes(1);
    });

    it('should throw NotFoundException if worker has no assignment', async () => {
      mockWorkerAssignmentsService.removeAssignment.mockRejectedValue(
        new NotFoundException(
          'Worker worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890 has no area assignment',
        ),
      );

      await expect(
        controller.removeAssignment('worker-uuid-1a2b3c4d-e5f6-7890-abcd-ef1234567890'),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
