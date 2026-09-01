import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Region } from './entities/region.entity';
import { District } from '../districts/entities/district.entity';
import { Location } from '../locations/entities/location.entity';
import { RegionsService } from './regions.service';
import { RegionsController } from './regions.controller';

/**
 * RegionsModule (Kawasan) — master data for the level between District and Location
 * (ADR-045). Permission-gated (`region:*`).
 */
@Module({
  imports: [TypeOrmModule.forFeature([Region, District, Location])],
  controllers: [RegionsController],
  providers: [RegionsService],
  exports: [RegionsService],
})
export class RegionsModule {}
