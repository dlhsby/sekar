import {
  Controller,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { WorkerAssignmentsService } from './worker-assignments.service';
import { AssignWorkerDto } from './dto/assign-worker.dto';
import { WorkerAssignment } from './entities/worker-assignment.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Controller for worker assignment operations
 *
 * Manages the assignment of workers to specific work areas.
 * Admin and Supervisor can assign/unassign workers.
 */
@ApiTags('worker-assignments')
@ApiBearerAuth('JWT-auth')
@Controller('workers')
@UseGuards(JwtAuthGuard, RolesGuard)
export class WorkerAssignmentsController {
  constructor(
    private readonly workerAssignmentsService: WorkerAssignmentsService,
  ) {}

  /**
   * Assign a worker to an area
   *
   * Admin and Supervisor only.
   * For MVP, one worker can only be assigned to one area at a time.
   *
   * @param workerId - Worker user ID
   * @param assignWorkerDto - Assignment data (area_id)
   * @returns The created assignment
   */
  @Post(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Assign worker to area',
    description:
      'Assign a worker to a work area. Admin and Supervisor only. For MVP, one worker can only have one active area assignment.',
  })
  @ApiParam({
    name: 'id',
    description: 'Worker user ID (UUID)',
    example: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 201,
    description: 'Worker assigned successfully',
    type: WorkerAssignment,
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - User is not a worker, area is inactive, or invalid data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Supervisor role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Worker or area not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Conflict - Worker is already assigned to an area',
  })
  assignWorker(
    @Param('id') workerId: string,
    @Body() assignWorkerDto: AssignWorkerDto,
  ): Promise<WorkerAssignment> {
    return this.workerAssignmentsService.assignWorker(
      workerId,
      assignWorkerDto,
    );
  }

  /**
   * Remove a worker's area assignment
   *
   * Admin and Supervisor only.
   *
   * @param workerId - Worker user ID
   */
  @Delete(':id/assign')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({
    summary: 'Remove worker assignment',
    description:
      'Remove a worker\'s area assignment. Admin and Supervisor only.',
  })
  @ApiParam({
    name: 'id',
    description: 'Worker user ID (UUID)',
    example: '8127dc81-97cf-4c6e-a1b4-b1ace284ea78',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment removed successfully',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin or Supervisor role required',
  })
  @ApiResponse({
    status: 404,
    description: 'Worker has no area assignment',
  })
  removeAssignment(@Param('id') workerId: string): Promise<void> {
    return this.workerAssignmentsService.removeAssignment(workerId);
  }
}
