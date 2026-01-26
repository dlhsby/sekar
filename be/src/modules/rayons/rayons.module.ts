import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RayonsController } from './rayons.controller';
import { RayonsService } from './rayons.service';
import { Rayon } from './entities/rayon.entity';
import { Area } from '../areas/entities/area.entity';

/**
 * Module for managing rayons (geographic sectors)
 *
 * Provides CRUD operations for rayons with Admin-only modifications.
 * Exports RayonsService for use in other modules.
 */
@Module({
  imports: [TypeOrmModule.forFeature([Rayon, Area])],
  controllers: [RayonsController],
  providers: [RayonsService],
  exports: [RayonsService],
})
export class RayonsModule {}
