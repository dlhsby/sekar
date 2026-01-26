import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';
import { ActivityTypesModule } from '../activity-types/activity-types.module';

/**
 * Module for task management
 *
 * Provides endpoints and services for creating, assigning,
 * and tracking work tasks for field workers.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Task]), UsersModule, AreasModule, ActivityTypesModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
