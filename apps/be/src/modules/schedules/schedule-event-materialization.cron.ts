import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';
import { TimezoneUtil } from '../../common/utils/timezone.util';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily materialization of ScheduleEvents into concrete occurrences.
 * Replaces the template-based daily-roster-generation cron. Runs:
 *   - 00:15 WIB: materialize today + horizon for all active events
 *   - 17:00 WIB: pre-generate tomorrow so admins can pre-adjust evening before
 *   - on boot: self-heal to catch up if a cron was missed (server downtime, deployment)
 *
 * Never throws — logs failures and continues.
 */
@Injectable()
export class ScheduleEventMaterializationCron implements OnApplicationBootstrap {
  private readonly logger = new Logger(ScheduleEventMaterializationCron.name);

  constructor(
    @InjectRepository(ScheduleEvent)
    private readonly eventRepo: Repository<ScheduleEvent>,
    private readonly materializer: ScheduleMaterializerService,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    // Self-heal on boot: ensure today's occurrences are materialized (fire-and-forget).
    void this.selfHeal().catch((err) => {
      this.logger.error(`Boot self-heal failed: ${(err as Error).message}`, (err as Error).stack);
    });
  }

  @Cron('15 0 * * *', { timeZone: 'Asia/Jakarta' }) // 00:15 WIB
  async onDailyMaterialization(): Promise<void> {
    try {
      const today = TimezoneUtil.jakartaDateString();
      const created = await this.materialize(today);
      this.logger.log(
        `Schedule events materialization (today) for ${today}: ${created} rows created`,
      );
    } catch (err) {
      // Non-fatal: log and continue (prevents cron from poisoning the app).
      this.logger.error(
        `Daily materialization failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  @Cron('0 17 * * *', { timeZone: 'Asia/Jakarta' }) // 17:00 WIB (tomorrow pre-generation)
  async onTomorrowPreGeneration(): Promise<void> {
    try {
      const tomorrow = TimezoneUtil.jakartaDateString(new Date(Date.now() + ONE_DAY_MS));
      const created = await this.materialize(tomorrow);
      this.logger.log(
        `Schedule events materialization (tomorrow) for ${tomorrow}: ${created} rows created`,
      );
    } catch (err) {
      this.logger.error(
        `Tomorrow pre-generation failed: ${(err as Error).message}`,
        (err as Error).stack,
      );
    }
  }

  private async selfHeal(): Promise<void> {
    const today = TimezoneUtil.jakartaDateString();
    this.logger.debug(`Boot self-heal: materializing today (${today})`);
    const created = await this.materialize(today);
    this.logger.log(`Boot self-heal: ${created} rows created for ${today}`);
  }

  private async materialize(date: string): Promise<number> {
    // Fetch all active, non-deleted events
    const events = await this.eventRepo.find({
      where: {
        is_active: true,
        deleted_at: IsNull(),
      },
      relations: [
        'shift_definition',
        'location',
        'region',
        'team_category',
        'pic_user',
        'user',
        'members',
      ],
    });

    let totalCreated = 0;
    let totalSkipped = 0;

    // Materialize each event
    for (const event of events) {
      try {
        const result = await this.materializer.materializeEvent(event, date);
        totalCreated += result.created;
        totalSkipped += result.skipped.length;

        if (result.skipped.length > 0) {
          this.logger.debug(
            `Event ${event.id}: created ${result.created}, skipped ${result.skipped.length}`,
          );
        }
      } catch (err) {
        this.logger.warn(`Failed to materialize event ${event.id}: ${(err as Error).message}`);
      }
    }

    this.logger.debug(
      `Materialization for ${date}: ${totalCreated} created, ${totalSkipped} skipped`,
    );
    return totalCreated;
  }
}
