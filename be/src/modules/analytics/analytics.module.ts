import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PerformanceScoreService } from './services/performance-score.service';
import { AnalyticsRefreshCron } from './cron/analytics-refresh.cron';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { Rayon } from '../rayons/entities/rayon.entity';
import { UserArea } from '../user-areas/entities/user-area.entity';
import { SharedModule } from '../../shared/shared.module';

@Module({
  imports: [TypeOrmModule.forFeature([User, Area, Rayon, UserArea]), SharedModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, PerformanceScoreService, AnalyticsRefreshCron],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
