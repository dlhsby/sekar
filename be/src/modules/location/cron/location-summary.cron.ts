import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TimezoneUtil } from '../../../common/utils/timezone.util';

/**
 * Daily attendance summary cron (Phase 4-6 B3).
 *
 * Aggregates yesterday's (WIB) location_logs into location_daily_summaries so
 * dashboards keep history after the 90-day retention purge (I1) removes the
 * raw pings. area_id/rayon_id come from the ping's shift; within/outside
 * counts are not derivable from raw logs (no per-ping flag) and stay 0.
 */
@Injectable()
export class LocationSummaryCron {
  private readonly logger = new Logger(LocationSummaryCron.name);

  constructor(
    @InjectDataSource()
    private readonly dataSource: DataSource,
  ) {}

  @Cron('0 3 * * *', { name: 'location-daily-summary', timeZone: 'Asia/Jakarta' })
  async summarizeYesterday(): Promise<void> {
    const today = TimezoneUtil.jakartaDateString();
    const yesterday = TimezoneUtil.jakartaDateString(new Date(Date.now() - 24 * 60 * 60 * 1000));

    try {
      const inserted = await this.summarizeDateRange(yesterday, yesterday, false);
      this.logger.log(
        `Daily location summary for ${yesterday} (WIB, ran ${today}): ${inserted} row(s) written`,
      );
    } catch (error) {
      this.logger.error(`Daily location summary failed: ${error.message}`, error.stack);
    }
  }

  /**
   * Aggregate pings for every WIB date in [fromDate, toDate] (inclusive,
   * YYYY-MM-DD). Existing (user, date) summaries are left untouched.
   * Returns the number of summary rows inserted.
   */
  async summarizeDateRange(
    fromDate: string,
    toDate: string,
    isBackfilled: boolean,
  ): Promise<number> {
    const result: unknown[] = await this.dataSource.query(
      `
      INSERT INTO location_daily_summaries
        (user_id, date, total_pings, first_ping_at, last_ping_at,
         avg_latitude, avg_longitude, area_id, rayon_id, is_backfilled)
      SELECT
        ll.user_id,
        (ll.logged_at AT TIME ZONE 'Asia/Jakarta')::date AS wib_date,
        COUNT(*),
        MIN(ll.logged_at),
        MAX(ll.logged_at),
        ROUND(AVG(ll.gps_lat), 7),
        ROUND(AVG(ll.gps_lng), 7),
        (ARRAY_AGG(s.area_id ORDER BY ll.logged_at DESC))[1],
        (ARRAY_AGG(a.rayon_id ORDER BY ll.logged_at DESC))[1],
        $3
      FROM location_logs ll
      LEFT JOIN shifts s ON s.id = ll.shift_id
      LEFT JOIN areas a ON a.id = s.area_id
      WHERE (ll.logged_at AT TIME ZONE 'Asia/Jakarta')::date BETWEEN $1::date AND $2::date
      GROUP BY ll.user_id, wib_date
      ON CONFLICT ON CONSTRAINT uq_location_summary_user_date DO NOTHING
      RETURNING id
      `,
      [fromDate, toDate, isBackfilled],
    );
    return result.length;
  }
}
