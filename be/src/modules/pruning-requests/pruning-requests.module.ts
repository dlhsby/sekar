import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PruningRequest } from './entities/pruning-request.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { TaskDelegation } from '../tasks/entities/task-delegation.entity';
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequestFinderService } from './services/pruning-request-finder.service';
import { PruningRequestNotificationsService } from './services/pruning-request-notifications.service';
import { PruningRequestWorkflowService } from './services/pruning-request-workflow.service';
import { PruningRequestsController } from './pruning-requests.controller';
import { ServiceCapacityModule } from '../service-capacity/service-capacity.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PruningRequest, User, Task, TaskDelegation]),
    ServiceCapacityModule,
    NotificationsModule,
    UsersModule,
  ],
  controllers: [PruningRequestsController],
  providers: [
    PruningRequestsService,
    PruningRequestFinderService,
    PruningRequestNotificationsService,
    PruningRequestWorkflowService,
  ],
  exports: [PruningRequestsService],
})
export class PruningRequestsModule {}
