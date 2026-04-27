import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PruningRequest } from './entities/pruning-request.entity';

@Module({
  imports: [TypeOrmModule.forFeature([PruningRequest])],
  exports: [TypeOrmModule],
})
export class PruningRequestsModule {}
