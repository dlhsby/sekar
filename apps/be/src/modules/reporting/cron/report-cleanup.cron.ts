import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { ReportingService } from '../reporting.service';

/**
 * Report Cleanup Cron
 *
 * Runs weekly to delete old generated reports (>90 days) and their S3 files.
 * Triggered every Sunday at 02:00 WIB.
 */
@Injectable()
export class ReportCleanupCron {
  private readonly logger = new Logger(ReportCleanupCron.name);

  constructor(private reportingService: ReportingService) {}

  @Cron('0 2 * * 0', { timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    try {
      const count = await this.reportingService.deleteOldReports(90);
      if (count > 0) {
        this.logger.log(`Report cleanup: deleted ${count} old report(s)`);
      }
    } catch (error) {
      this.logger.error(`Report cleanup cron failed: ${(error as Error).message}`);
    }
  }
}
