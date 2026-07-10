import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { Area } from '../areas/entities/area.entity';
import { RegionsService } from './regions.service';
import { RegionsController } from './regions.controller';

/**
 * RegionsModule (Kawasan) — master data for the level between Rayon and Area
 * (ADR-045). Permission-gated (`region:*`).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Region, Rayon, Area])],
  controllers: [RegionsController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
