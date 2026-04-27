import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PruningRequest } from './entities/pruning-request.entity';
import { User } from '../users/entities/user.entity';
import { PruningRequestsService } from './pruning-requests.service';
import { PruningRequestsController } from './pruning-requests.controller';

@Module({
  imports: [TypeOrmModule.forFeature([PruningRequest, User])],
  controllers: [PruningRequestsController],
  providers: [PruningRequestsService],
  exports: [PruningRequestsService],
})
export class PruningRequestsModule {}
