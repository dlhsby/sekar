import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { StatusCalculatorService } from './status-calculator.service';
import { SystemConfigService } from '../../settings/services/system-config.service';

const BATCH_SIZE = 50;

/**
 * StaleStatusSweeperService
 *
 * Runs every 5 minutes and promotes ACTIVE workers whose last_location_at
 * is older than the missing threshold (monitoring.missing_threshold_sec,
 * default 3600 s / 1 hour — unified with the status calculator) to MISSING.
 *
 * This is a safety net for workers whose devices stop sending pings without
 * going through a clean clock-out — e.g. device battery death, network loss,
 * or app crash. The Redis Stream projector handles real-time updates; this
 * sweep catches anything that slips through.
 *
 * Processes in batches of 50 to avoid long-running transactions.
 */
@Injectable()
export class StaleStatusSweeperService {
  private readonly logger = new Logger(StaleStatusSweeperService.name);
  private sweepRunning = false;

  constructor(
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    private readonly systemConfig: SystemConfigService,
    // Phase 4-3 (§C1 #8): reuse the calculator's recipient-resolution + dedup so
    // workers the sweeper flips directly (bypassing recalculate) still alert
    // korlap + kepala_rayon.
    private readonly statusCalculator: StatusCalculatorService,
  ) {}

  /** Resolved at use-time (DB → env → default) so overrides apply without restart.
   *  Unified with the status calculator's missing threshold (ADR-049). */
  private get missingStaleSecs(): number {
    return this.systemConfig.getNumber('monitoring.missing_threshold_sec', 3600);
  }

  @Cron('*/5 * * * *')
  async sweep(): Promise<void> {
    if (this.sweepRunning) {
      this.logger.warn('StaleStatusSweeper: previous sweep still running, skipping');
      return;
    }
    this.sweepRunning = true;
    try {
      await this.doSweep();
    } finally {
      this.sweepRunning = false;
    }
  }

  private async doSweep(): Promise<void> {
    const cutoff = new Date(Date.now() - this.missingStaleSecs * 1000);
    let total = 0;

    while (true) {
      const stale = await this.trackingRepository.find({
        where: {
          status: TrackingStatus.ACTIVE,
          last_location_at: LessThan(cutoff),
        },
        take: BATCH_SIZE,
      });

      if (stale.length === 0) break;

      const now = new Date();
      for (const record of stale) {
        record.status = TrackingStatus.MISSING;
        record.updated_at = now;
      }

      await this.trackingRepository.save(stale);
      total += stale.length;

      // Alert korlap + kepala_rayon for each worker the sweep flips. The
      // calculator's per-(worker,day) Redis dedup ensures the every-minute
      // scheduler and this sweep can't double-fire. Fire-and-forget — a slow
      // or failing dispatch must not stall the sweep.
      for (const record of stale) {
        void this.statusCalculator.notifyMissingWorker(
          record.user_id,
          record.location_id,
          record.rayon_id,
        );
      }

      if (stale.length < BATCH_SIZE) break;
    }

    if (total > 0) {
      this.logger.log(`StaleStatusSweeper: flipped ${total} ACTIVE → MISSING`);
    }
  }
}
