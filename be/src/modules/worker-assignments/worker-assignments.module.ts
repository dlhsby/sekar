import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkerAssignmentsService } from './worker-assignments.service';
import { WorkerAssignmentsController } from './worker-assignments.controller';
import { WorkerAssignment } from './entities/worker-assignment.entity';
import { AuthModule } from '../auth/auth.module';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';

/**
 * WorkerAssignments Module
 *
 * Manages the assignment of workers to specific work areas.
 * For MVP, one worker can only be assigned to one area at a time.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([WorkerAssignment]),
    forwardRef(() => AuthModule), // For JwtAuthGuard and RolesGuard (circular dependency with AuthModule)
    UsersModule, // For validating worker_id
    forwardRef(() => AreasModule), // For validating area_id (circular dependency)
  ],
  controllers: [WorkerAssignmentsController],
  providers: [WorkerAssignmentsService],
  exports: [WorkerAssignmentsService], // Export for use in Areas module
})
export class WorkerAssignmentsModule {}
