import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { Location } from '../locations/entities/location.entity';
import { RegionsService } from './regions.service';
import { RegionsController } from './regions.controller';

/**
 * RegionsModule (Kawasan) — master data for the level between Rayon and Location
 * (ADR-045). Permission-gated (`region:*`).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Region, Rayon, Location])],
  controllers: [RegionsController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
