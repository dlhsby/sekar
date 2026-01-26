import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialDayOverridesController } from './special-day-overrides.controller';
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { SpecialDayOverride } from './entities/special-day-override.entity';

/**
 * Module for managing special day overrides
 *
 * Provides CRUD operations for special day overrides with Admin-only modifications.
 * Supports date range filtering.
 * Exports SpecialDayOverridesService for use in other modules
 * (e.g., AreaStaffRequirements module for determining day type).
 */
@Module({
  imports: [TypeOrmModule.forFeature([SpecialDayOverride])],
  controllers: [SpecialDayOverridesController],
  providers: [SpecialDayOverridesService],
  exports: [SpecialDayOverridesService],
})
export class SpecialDayOverridesModule {}
