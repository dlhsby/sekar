import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';

/**
 * OfflineSweeperService (Phase 4-3, §C4).
 *
 * Hourly cleanup that marks long-stale tracking rows OFFLINE — any record not
 * updated in 24h whose user has no open shift. Distinct from the 5-min
 * StaleStatusSweeper (which flips ACTIVE→MISSING at 15 min): this is the
 * long-tail garbage-collector so dashboards don't show stale MISSING/INACTIVE
 * rows indefinitely.
 *
 * Records are never deleted — that would lose tracking history; OFFLINE is the
 * correct terminal state.
 */
@Injectable()
export class OfflineSweeperService {
  private readonly logger = new Logger(OfflineSweeperService.name);

  constructor(
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
  ) {}

  @Cron(CronExpression.EVERY_HOUR, { name: 'offline-sweeper' })
  async sweep(): Promise<void> {
    try {
      const updated = await this.markStaleOffline();
      if (updated > 0) {
        this.logger.log(`OfflineSweeper: marked ${updated} stale tracking row(s) OFFLINE`);
      }
    } catch (err) {
      this.logger.error(`OfflineSweeper failed: ${(err as Error).message}`);
    }
  }

  /**
   * Mark every tracking row OFFLINE that hasn't updated in 24h and whose user
   * has no open (clocked-in, not clocked-out) shift. Returns the affected count.
   */
  async markStaleOffline(): Promise<number> {
    const result = await this.trackingRepository.query(
      `UPDATE user_tracking_status
         SET status = $1, updated_at = NOW()
       WHERE status <> $1
         AND updated_at < NOW() - INTERVAL '24 hours'
         AND user_id NOT IN (
           SELECT user_id FROM shifts
           WHERE clock_in_time IS NOT NULL
             AND clock_out_time IS NULL
             AND deleted_at IS NULL
         )`,
      [TrackingStatus.OFFLINE],
    );

    // node-postgres returns [rows, affectedCount] for UPDATE via TypeORM .query.
    return Array.isArray(result) && typeof result[1] === 'number' ? result[1] : 0;
  }
}
