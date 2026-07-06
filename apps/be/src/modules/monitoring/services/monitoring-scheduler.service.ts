import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Not, In, LessThanOrEqual } from 'typeorm';
import { UserTrackingStatus, TrackingStatus } from '../entities/user-tracking-status.entity';
import { StatusCalculatorService } from './status-calculator.service';
import { MonitoringCacheService } from './monitoring-cache.service';

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
}
