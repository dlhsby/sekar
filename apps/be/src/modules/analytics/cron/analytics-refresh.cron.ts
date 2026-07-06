import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { AnalyticsService } from '../analytics.service';

@Injectable()
export class AnalyticsRefreshCron {
  private readonly logger = new Logger(AnalyticsRefreshCron.name);

  constructor(private readonly analyticsService: AnalyticsService) {}

  @Cron('0 2 * * *', { timeZone: 'Asia/Jakarta' })
  async refreshAnalyticsViews(): Promise<void> {
    try {
      const start = Date.now();
      this.logger.log('Starting materialized views refresh...');

      await this.analyticsService.refreshViews();

      const duration = Date.now() - start;
      this.logger.log(`Materialized views refresh completed in ${duration}ms`);
    } catch (err) {
      this.logger.error(`Materialized views refresh failed: ${(err as Error).message}`);
    }
  }
}
