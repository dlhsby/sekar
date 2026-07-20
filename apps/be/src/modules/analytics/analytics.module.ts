import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PerformanceScoreService } from './services/performance-score.service';
import { AnalyticsRefreshCron } from './cron/analytics-refresh.cron';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { District } from '../districts/entities/district.entity';
import { UserLocation } from '../user-locations/entities/user-location.entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Location, District, UserLocation]), SharedModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PerformanceScoreService, AnalyticsRefreshCron],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
