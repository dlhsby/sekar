import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThanOrEqual } from 'typeorm';
import { ReportSchedule } from '../entities/report-schedule.entity';
import { ReportingService } from '../reporting.service';

/**
 * Report Scheduler Cron
 *
 * Runs every minute to check for due scheduled reports and enqueue them.
 * Updates next_run_at based on cron expression and timezone.
 */
@Injectable()
export class ReportSchedulerCron {
  private readonly logger = new Logger(ReportSchedulerCron.name);

  constructor(
    @InjectRepository(ReportSchedule)
    private scheduleRepo: Repository<ReportSchedule>,
    private reportingService: ReportingService,
  ) {}

  @Cron('* * * * *', { timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    try {
      await this.processDueSchedules();
    } catch (error) {
      this.logger.error(`Report scheduler cron failed: ${(error as Error).message}`);
    }
  }

  private async processDueSchedules(): Promise<void> {
    const now = new Date();

    // Find schedules due for execution
    const dueSchedules = await this.scheduleRepo.find({
      where: {
        is_active: true,
        next_run_at: LessThanOrEqual(now),
      },
    });

    if (dueSchedules.length === 0) {
      return;
    }

    let processed = 0;

    for (const schedule of dueSchedules) {
      try {
        await this.reportingService.generateFromSchedule(schedule);
        processed++;
      } catch (error) {
        this.logger.error(`Failed to process schedule ${schedule.id}: ${(error as Error).message}`);
      }
    }

    if (processed > 0) {
      this.logger.log(`Report scheduler: processed ${processed} schedule(s)`);
    }
  }
}
