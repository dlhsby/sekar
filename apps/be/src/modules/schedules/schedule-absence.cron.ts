import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SchedulesService } from './schedules.service';

/**
 * Absence sweep cron (ADR schedule-status-lifecycle).
 *
 * Hourly (Asia/Jakarta) persists the outcome of every PAST `planned` roster row
 * whose clock-in window + grace has closed: a no-show → `absent`, a
 * clocked-in-but-still-planned row → `present` (self-heal). This is the
 * persistence half of the hybrid — the web/mobile display helpers already show
 * the same result in real time; the cron makes it truthful for monitoring /
 * reports / raw queries too.
 *
 * Deliberately low-frequency: marking a no-show absent is not time-critical
 * (unlike the shift reminders), so hourly is plenty and far lighter than the
 * 15-minute reminder crons. Never throws — logs and continues.
 */
@Injectable()
export class ScheduleAbsenceCron {
  private readonly logger = new Logger(ScheduleAbsenceCron.name);

  constructor(private readonly schedules: SchedulesService) {}

  @Cron('0 * * * *', { name: 'schedule-absence', timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    try {
      const { absent, present } = await this.schedules.sweepAbsences();
      if (absent > 0 || present > 0) {
        this.logger.log(`Absence sweep: ${absent} absent, ${present} present`);
      }
    } catch (err) {
      this.logger.error(`Absence sweep failed: ${(err as Error).message}`, (err as Error).stack);
    }
  }
}
