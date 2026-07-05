import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ServiceCapacity } from './entities/service-capacity.entity';
import { ServiceCapacityService } from './service-capacity.service';
import { ServiceCapacityController } from './service-capacity.controller';

@Module({
  imports: [TypeOrmModule.forFeature([ServiceCapacity])],
  controllers: [ServiceCapacityController],
  providers: [ServiceCapacityService],
  exports: [ServiceCapacityService],
})
export class ServiceCapacityModule {}
