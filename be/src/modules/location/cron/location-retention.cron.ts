import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { LocationSummaryCron } from './location-summary.cron';

/** Days of raw location pings to keep (spec backend.md §I1) */
export const LOCATION_RETENTION_DAYS = 90;

/**
 * Location log retention cron (Phase 4-6 B1/I1).
 *
 * Daily at 02:00 WIB (one hour before the summary cron):
 * 1. Backfill daily summaries for any not-yet-summarized days that are about
 *    to be purged — no reporting data is lost.
 * 2. Delete location_logs older than 90 days (WIB day boundary).
 */
@Injectable()
export class LocationRetentionCron {
  private readonly logger = new Logger(LocationRetentionCron.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
    private readonly summaryCron: LocationSummaryCron,
  ) {}

  @Cron('0 2 * * *', { name: 'location-retention', timeZone: 'Asia/Jakarta' })
  async purgeOldLocationLogs(): Promise<void> {
    try {
      const cutoffInstant = new Date(
        TimezoneUtil.jakartaStartOfToday().getTime() -
          LOCATION_RETENTION_DAYS * 24 * 60 * 60 * 1000,
      );
      const cutoffDate = TimezoneUtil.jakartaDateString(cutoffInstant);

      // 1. Backfill summaries for everything strictly before the cutoff date.
      const backfilled = await this.summaryCron.summarizeDateRange(
        '1970-01-01',
        this.previousDate(cutoffDate),
        true,
      );

      // 2. Purge raw pings older than the cutoff instant (midnight WIB).
      const deleteResult: { affectedRows?: number }[] | [unknown[], number] =
        await this.dataSource.query(
          `DELETE FROM location_logs WHERE logged_at < $1`,
          [cutoffInstant.toISOString()],
        );
      const deletedCount = Array.isArray(deleteResult) ? (deleteResult[1] ?? 0) : 0;

      this.logger.log(
        `Location retention: purged ${deletedCount} log(s) older than ${cutoffDate} (90d), backfilled ${backfilled} summary row(s)`,
      );
    } catch (error) {
      this.logger.error(`Location retention failed: ${error.message}`, error.stack);
    }
  }

  /** YYYY-MM-DD minus one day */
  private previousDate(isoDate: string): string {
    const d = new Date(`${isoDate}T00:00:00.000Z`);
    return new Date(d.getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  }
}
