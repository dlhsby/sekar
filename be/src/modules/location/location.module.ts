import { forwardRef, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LocationService } from './location.service';
import { LocationController } from './location.controller';
import { LocationLog } from './entities/location-log.entity';
import { LocationDailySummary } from './entities/location-daily-summary.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { MonitoringModule } from '../monitoring/monitoring.module';
import { LocationSummaryCron } from './cron/location-summary.cron';
import { LocationRetentionCron } from './cron/location-retention.cron';

/**
 * Location Module
 *
 * Provides functionality for GPS location tracking:
 * - Batch location uploads by workers
 * - Location history queries
 * - Real-time worker location
 * - Daily summaries + 90-day retention crons (Phase 4-6)
 */
@Module({
  imports: [
    TypeOrmModule.forFeature([LocationLog, LocationDailySummary, Shift]),
    forwardRef(() => MonitoringModule),
  ],
  controllers: [LocationController],
  providers: [LocationService, LocationSummaryCron, LocationRetentionCron],
  exports: [LocationService],
})
export class LocationModule {}
