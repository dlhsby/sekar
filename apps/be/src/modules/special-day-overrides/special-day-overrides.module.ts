import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { SpecialDayOverridesController } from './special-day-overrides.controller';
import { SpecialDayOverride } from './entities/special-day-override.entity';

@Module({
  imports: [TypeOrmModule.forFeature([SpecialDayOverride])],
  controllers: [SpecialDayOverridesController],
  providers: [SpecialDayOverridesService],
  exports: [SpecialDayOverridesService],
})
export class SpecialDayOverridesModule {}
