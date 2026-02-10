import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WorkerAssignment } from './entities/worker-assignment.entity';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { UsersService } from '../users/users.service';
import { AreasService } from '../areas/areas.service';
import { UserRole } from '../users/entities/user.entity';

/**
 * Service for managing worker assignments to areas
 *
 * Handles the assignment of workers to specific work areas.
 * For MVP: One worker can only be assigned to one area at a time.
 */
@Injectable()
export class WorkerAssignmentsService {
  private readonly logger = new Logger(WorkerAssignmentsService.name);

  constructor(
    @InjectRepository(WorkerAssignment)
    private readonly assignmentRepository: Repository<WorkerAssignment>,
    private readonly usersService: UsersService,
    private readonly areasService: AreasService,
  ) {}

  /**
   * Assign a worker to an area
   *
   * @param workerId - Worker user ID
   * @param assignWorkerDto - Assignment data (area_id)
   * @returns The created assignment
   * @throws NotFoundException if worker or area not found
   * @throws BadRequestException if user is not a worker or area is inactive
   * @throws ConflictException if worker is already assigned to an area
   */
  async assignWorker(
    workerId: string,
    assignWorkerDto: AssignWorkerDto,
  ): Promise<WorkerAssignment> {
    this.logger.log(`Assigning worker ${workerId} to area ${assignWorkerDto.area_id}`);

    // Validate worker exists and has worker role
    const worker = await this.usersService.findOne(workerId);
    if (worker.role !== UserRole.SATGAS) {
      throw new BadRequestException('User must have worker role to be assigned to an area');
    }

    // Validate area exists and is active
    const area = await this.areasService.findOne(assignWorkerDto.area_id);
    if (!area.is_active) {
      throw new BadRequestException('Cannot assign worker to inactive area');
    }

    // Check if worker already has an assignment (MVP: one area per worker)
    const existingAssignment = await this.assignmentRepository.findOne({
      where: { worker_id: workerId },
    });

    if (existingAssignment) {
      throw new ConflictException(
        `Worker is already assigned to area ID ${existingAssignment.area_id}`,
      );
    }

    // Create assignment
    const assignment = this.assignmentRepository.create({
      worker_id: workerId,
      area_id: assignWorkerDto.area_id,
    });

    const savedAssignment = await this.assignmentRepository.save(assignment);

    this.logger.log(`Worker ${workerId} successfully assigned to area ${assignWorkerDto.area_id}`);
    return savedAssignment;
  }

  /**
   * Remove a worker's area assignment
   *
   * @param workerId - Worker user ID
   * @throws NotFoundException if assignment not found
   */
  async removeAssignment(workerId: string): Promise<void> {
    this.logger.log(`Removing assignment for worker ${workerId}`);

    const assignment = await this.assignmentRepository.findOne({
      where: { worker_id: workerId },
    });

    if (!assignment) {
      throw new NotFoundException(`Worker ${workerId} has no area assignment`);
    }

    await this.assignmentRepository.remove(assignment);

    this.logger.log(`Assignment removed for worker ${workerId} from area ${assignment.area_id}`);
  }

  /**
   * Get a worker's current assignment
   *
   * @param workerId - Worker user ID
   * @returns The worker's assignment or null if not assigned
   */
  async getWorkerAssignment(workerId: string): Promise<WorkerAssignment | null> {
    this.logger.log(`Fetching assignment for worker ${workerId}`);

    return this.assignmentRepository.findOne({
      where: { worker_id: workerId },
      relations: ['area', 'area.areaType'],
    });
  }

  /**
   * Count the number of workers assigned to an area
   *
   * Used to prevent deleting areas that have active assignments.
   *
   * @param areaId - Area UUID
   * @returns Number of workers assigned to this area
   */
  async countByAreaId(areaId: string): Promise<number> {
    return this.assignmentRepository.count({
      where: { area_id: areaId },
    });
  }

  /**
   * Get all assignments for an area
   *
   * @param areaId - Area UUID
   * @returns Array of assignments for this area
   */
  async getAreaAssignments(areaId: string): Promise<WorkerAssignment[]> {
    this.logger.log(`Fetching assignments for area ${areaId}`);

    return this.assignmentRepository.find({
      where: { area_id: areaId },
    });
  }
}
