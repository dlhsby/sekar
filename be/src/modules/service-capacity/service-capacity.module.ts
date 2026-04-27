import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceCapacity } from './entities/service-capacity.entity';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceCapacity])],
  exports: [TypeOrmModule],
})
export class ServiceCapacityModule {}
