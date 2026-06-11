import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { TaskFinderService } from './services/task-finder.service';
import { TaskDelegationService } from './services/task-delegation.service';
import { TaskStatusTransitionsService } from './services/task-status-transitions.service';
import { TaskVerificationService } from './services/task-verification.service';
import { Task } from './entities/task.entity';
import { TaskTag } from './entities/task-tag.entity';
import { TaskDelegation } from './entities/task-delegation.entity';
import { TaskTypeRegistry } from './registry/task-type-registry';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';

/**
 * Module for task management
 *
 * Provides endpoints and services for creating, assigning,
 * and tracking work tasks for field workers.
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([Task, TaskTag, TaskDelegation]),
    UsersModule,
    AreasModule,
    AuditModule,
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [
    TasksService,
    TaskTypeRegistry,
    TaskFinderService,
    TaskDelegationService,
    TaskStatusTransitionsService,
    TaskVerificationService,
  ],
  exports: [TasksService, TaskTypeRegistry],
})
export class TasksModule {}
