import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SchedulesService } from './schedules.service';
import { TimezoneUtil } from '../../common/utils/timezone.util';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Keeps the daily schedule materialized so workers always have today's row and
 * admins can pre-adjust tomorrow's the evening before:
 *   - 17:00 WIB → generate TOMORROW (pre-adjust window).
 *   - 00:05 WIB → generate TODAY (covers the fresh day).
 *   - on boot   → generate TODAY if missing (self-heal after a deploy/seed that
 *     lands after 17:00, so the day is never left without a schedule).
 * Generation is idempotent (`generateRoster` skips users already scheduled).
 * Resilient — logs and never throws (a failed generation must not crash the
 * scheduler or block app startup). The manual generate endpoint still covers
 * ad-hoc/backfill.
 */
@Injectable()
export class DailyRosterGenerationCron implements OnModuleInit {
  private readonly logger = new Logger(DailyRosterGenerationCron.name);

  constructor(private readonly dailySchedulesService: SchedulesService) {}

  /** Self-heal on boot: ensure today's schedule exists (non-blocking). */
  onModuleInit(): void {
    // Fire-and-forget so a slow/failing generation never delays readiness.
    void this.generateForDay(TimezoneUtil.jakartaDateString(), 'boot');
  }

  @Cron('5 0 * * *', { timeZone: 'Asia/Jakarta' })
  async generateTodaySchedule(): Promise<void> {
    await this.generateForDay(TimezoneUtil.jakartaDateString(), 'today');
  }

  @Cron('0 17 * * *', { timeZone: 'Asia/Jakarta' })
  async generateTomorrowSchedule(): Promise<void> {
    const tomorrow = TimezoneUtil.jakartaDateString(new Date(Date.now() + ONE_DAY_MS));
    await this.generateForDay(tomorrow, 'tomorrow');
  }

  private async generateForDay(date: string, label: string): Promise<void> {
    try {
      const created = await this.dailySchedulesService.generateRoster(date, null);
      this.logger.log(`Schedule generation (${label}) for ${date}: ${created} rows created`);
    } catch (err) {
      this.logger.error(
        `Schedule generation (${label}) for ${date} failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }
}
