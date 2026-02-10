import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TasksController } from './tasks.controller';
import { TasksService } from './tasks.service';
import { Task } from './entities/task.entity';
import { TaskTag } from './entities/task-tag.entity';
import { UsersModule } from '../users/users.module';
import { AreasModule } from '../areas/areas.module';

/**
 * Module for task management
 *
 * Provides endpoints and services for creating, assigning,
 * and tracking work tasks for field workers.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Task, TaskTag]), UsersModule, AreasModule],
  controllers: [TasksController],
  providers: [TasksService],
  exports: [TasksService],
})
export class TasksModule {}
