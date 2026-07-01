import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SchedulesService } from './schedules.service';
import { TimezoneUtil } from '../../common/utils/timezone.util';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Generates tomorrow's roster at 17:00 WIB the day before, so admins can
 * pre-adjust the next day's roster the evening before. Resilient — logs and
 * never throws (a failed generation must not crash the scheduler). The manual
 * generate endpoint covers first-run / today / demo.
 */
@Injectable()
export class DailyRosterGenerationCron {
  private readonly logger = new Logger(DailyRosterGenerationCron.name);

  constructor(private readonly dailySchedulesService: SchedulesService) {}

  @Cron('0 17 * * *', { timeZone: 'Asia/Jakarta' })
  async generateTomorrowRoster(): Promise<void> {
    const tomorrow = TimezoneUtil.jakartaDateString(new Date(Date.now() + ONE_DAY_MS));
    try {
      const created = await this.dailySchedulesService.generateRoster(tomorrow, null);
      this.logger.log(`Nightly roster generation for ${tomorrow}: ${created} rows created`);
    } catch (err) {
      this.logger.error(
        `Nightly roster generation for ${tomorrow} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
