import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PruningRequest } from './entities/pruning-request.entity';
import { User } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequestsController } from './pruning-requests.controller';
import { ServiceCapacityModule } from '../service-capacity/service-capacity.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([PruningRequest, User, Task]),
    ServiceCapacityModule,
  ],
  controllers: [PruningRequestsController],
  providers: [PruningRequestsService],
  exports: [PruningRequestsService],
})
export class PruningRequestsModule {}
