import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, LessThanOrEqual } from 'typeorm';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { StatusCalculatorService } from './status-calculator.service';
import { MonitoringCacheService } from './monitoring-cache.service';
import { isShiftWindowClosed } from '../../schedules/schedules.support';
import { TimezoneUtil } from '../../../common/utils/timezone.util';

/** Fallback when a shift definition carries no explicit grace. Matches the absence sweep. */
const DEFAULT_CUTOFF_GRACE_MIN = 60;

/** Raw projection for the stale-session sweep — a session and its shift's window. */
interface StaleSessionRow {
  user_id: string;
  clock_out_time: Date | null;
  service_day: string | Date | null;
  end_time: string | null;
  crosses_midnight: boolean | null;
  cutoff_grace_min: number | null;
}

@Injectable()
export class MonitoringSchedulerService {
  private readonly logger = new Logger(MonitoringSchedulerService.name);
  private readonly BATCH_SIZE = 50;

  constructor(
    @InjectRepository(UserTrackingStatus)
    private readonly trackingRepository: Repository<UserTrackingStatus>,
    private readonly statusCalculator: StatusCalculatorService,
    private readonly cacheService: MonitoringCacheService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async reevaluateStaleStatuses(): Promise<void> {
    const thresholds = await this.cacheService.getThresholds();
    const staleThreshold = new Date(Date.now() - thresholds.active_max_age_seconds * 1000);

    const staleUsers = await this.trackingRepository.find({
      where: {
        status: Not(In([TrackingStatus.OFFLINE])),
        updated_at: LessThanOrEqual(staleThreshold),
      },
      order: { updated_at: 'ASC' },
      take: this.BATCH_SIZE,
    });

    if (staleUsers.length === 0) {
      return;
    }

    let transitionsCount = 0;

    for (const tracking of staleUsers) {
      const previousStatus = tracking.status;
      const result = await this.statusCalculator.recalculate(tracking.user_id);

      if (result && result.status !== previousStatus) {
        transitionsCount++;
      }
    }

    if (transitionsCount > 0) {
      this.logger.log(
        `Scheduler: evaluated ${staleUsers.length} users, ${transitionsCount} status transitions`,
      );
    }
  }

  /**
   * Release tracking rows whose session is over.
   *
   * `user_tracking_status.shift_id` is set on clock-in and cleared on clock-out
   * — but a worker who never clocks out leaves it set forever, and EVERY live
   * query in monitoring treats "this row remembers a shift" as "this worker is
   * on duty now". On the staging clone that meant **302 workers on the live map
   * with 0 genuinely on duty**, the oldest session from 25 July.
   *
   * Fixing it here rather than in each query is deliberate: there are 15 reads
   * gated on `shift_id IS NOT NULL`, and patching 15 predicates is how the next
   * one gets missed. Restore the invariant instead — `shift_id` is non-null iff
   * the session is live — and every reader is correct for free.
   *
   * "Over" is ADR-055's rule, not a calendar day: a session ends when it is
   * clocked out, or when its shift window plus `cutoff_grace_min` has passed.
   * A date-based check would evict shift 3 (21:00–05:00) at midnight, mid-shift.
   * `isShiftWindowClosed` is imported rather than reimplemented so this and the
   * absence sweep can never disagree about when a shift is finished.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async endStaleSessions(now: Date = TimezoneUtil.jakartaNow()): Promise<number> {
    const candidates: StaleSessionRow[] = await this.trackingRepository
      .createQueryBuilder('uts')
      .innerJoin('shifts', 'shift', 'shift.id = uts.shift_id')
      .leftJoin('shift_definitions', 'sd', 'sd.id = shift.shift_definition_id')
      .where('uts.shift_id IS NOT NULL')
      .select('uts.user_id', 'user_id')
      .addSelect('shift.clock_out_time', 'clock_out_time')
      .addSelect('shift.service_day', 'service_day')
      .addSelect('sd.end_time', 'end_time')
      .addSelect('sd.crosses_midnight', 'crosses_midnight')
      .addSelect('sd.cutoff_grace_min', 'cutoff_grace_min')
      .getRawMany();

    const ended = candidates.filter((row) => {
      // Clocked out already — the tracking row simply never caught up. This is
      // also what a session closed by an operator or a data fix looks like.
      if (row.clock_out_time) return true;
      // Still open. Live until its own window closes, whatever day that lands on.
      if (!row.end_time || !row.service_day) return false;
      return isShiftWindowClosed(
        typeof row.service_day === 'string'
          ? row.service_day
          : TimezoneUtil.jakartaDateString(row.service_day),
        row.end_time,
        row.crosses_midnight ?? false,
        row.cutoff_grace_min ?? DEFAULT_CUTOFF_GRACE_MIN,
        now,
      );
    });

    if (ended.length === 0) return 0;

    // Reuses the clock-out write so a swept session and a punched one leave the
    // row in exactly the same shape — one definition of "not on duty".
    for (const row of ended) {
      await this.statusCalculator.onClockOut(row.user_id);
    }

    this.logger.log(`Scheduler: released ${ended.length} tracking rows whose session had ended`);
    return ended.length;
  }
}
