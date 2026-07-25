import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SchedulesService } from '../../schedules/schedules.service';
import { ScheduleStatus } from '../../schedules/entities/schedule.entity';
import { NotificationsService } from '../notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { RedisService } from '../../../common/services/redis.service';

/**
 * Shift reminder cron (Phase 4-3, §C3).
 *
 * Every 15 minutes (Asia/Jakarta), reads today's roster (ADR-013) and pushes a
 * one-time `SHIFT_REMINDER` to each worker whose shift's configured lead time
 * (`shift_definitions.start_reminder_min`, default 15, 0 = off) falls in the
 * current cron bucket. The dedup key is keyed on the Jakarta calendar date
 * the reminder fires (which IS the shift's day) so an ongoing daily schedule is
 * reminded once per day — a 24h Redis TTL guards against the cron's overlap.
 *
 * Time math is done in JS at the fixed Jakarta offset (+7, no DST) to avoid
 * server-timezone ambiguity; the window check wraps around midnight so a
 * 00:00 shift is still caught by the 23:45 run.
 */
@Injectable()
export class ShiftReminderCron {
  private readonly logger = new Logger(ShiftReminderCron.name);
  private static readonly JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
  /** Cron cadence in minutes — the width of the "fire" bucket around each lead time. */
  private static readonly WINDOW_MINUTES = 15;
  /** Fallback lead time when a shift has no configured `start_reminder_min`. */
  private static readonly DEFAULT_LEAD_MINUTES = 15;
  private static readonly DEDUP_TTL_SECONDS = 86_400;

  constructor(
    private readonly dailySchedulesService: SchedulesService,
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
  ) {}

  @Cron('*/15 * * * *', { name: 'shift-reminder', timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    try {
      await this.sendDueReminders();
    } catch (err) {
      this.logger.error(`Shift reminder cron failed: ${(err as Error).message}`);
    }
  }

  /**
   * Core logic, extracted for deterministic testing with an injected `now`.
   */
  async sendDueReminders(now: Date = new Date()): Promise<number> {
    const jakarta = new Date(now.getTime() + ShiftReminderCron.JAKARTA_OFFSET_MS);
    const dateStr = jakarta.toISOString().slice(0, 10); // YYYY-MM-DD (Jakarta day)
    const minutesNow = jakarta.getUTCHours() * 60 + jakarta.getUTCMinutes();

    // Today's roster — planned rows with a shift carry the start_time we remind on.
    const roster = await this.dailySchedulesService.findByDate(dateStr);
    const rows = roster
      .filter((r) => r.status === ScheduleStatus.PLANNED && !!r.shift_definition)
      .map((r) => ({
        user_id: r.user_id,
        location_id: r.location_id ?? null,
        shift_definition_id: r.shift_definition_id as string,
        shift_name: r.shift_definition!.name,
        start_time: r.shift_definition!.start_time,
        // Per-shift lead time (ADR-055). Null/undefined → the legacy 15 min; 0 = off.
        reminder_min:
          r.shift_definition!.start_reminder_min ?? ShiftReminderCron.DEFAULT_LEAD_MINUTES,
      }));

    let sent = 0;

    for (const row of rows) {
      if (!row.reminder_min || row.reminder_min <= 0) continue; // reminder disabled

      const startMinutes = this.parseStartMinutes(row.start_time);
      if (startMinutes === null) continue;

      // Minutes until the shift starts, wrapping across midnight. Fire once in the
      // cron-cadence bucket that contains the shift's configured lead time, i.e.
      // delta ∈ (reminder_min − CADENCE, reminder_min]. Dedup guards the overlap.
      const delta = (startMinutes - minutesNow + 1440) % 1440;
      if (delta <= 0) continue;
      if (delta > row.reminder_min || delta <= row.reminder_min - ShiftReminderCron.WINDOW_MINUTES)
        continue;

      const dedupKey = `shift-reminder:${dateStr}:${row.user_id}:${row.shift_definition_id}`;
      const first = await this.claimOnce(dedupKey);
      if (!first) continue;

      await this.notificationsService
        .sendToUser({
          user_id: row.user_id,
          title: 'Pengingat shift',
          body: `Shift ${row.shift_name} Anda dimulai dalam ${row.reminder_min} menit.`,
          type: NotificationType.SHIFT_REMINDER,
          data: { shift_definition_id: row.shift_definition_id, location_id: row.location_id },
        })
        .catch((err) =>
          this.logger.warn(
            `Shift reminder send failed for user ${row.user_id}: ${(err as Error).message}`,
          ),
        );
      sent++;
    }

    if (sent > 0) {
      this.logger.log(`ShiftReminderCron: sent ${sent} reminder(s) for ${dateStr}`);
    }
    return sent;
  }

  /** Parse a 'HH:MM[:SS]' time string into minutes-since-midnight. */
  private parseStartMinutes(startTime: string): number | null {
    if (!startTime) return null;
    const [h, m] = startTime.split(':').map((p) => parseInt(p, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  /**
   * Atomic once-per-key claim via Redis `SET key 1 NX EX <ttl>`. Returns true
   * only on the first claim. Fails SAFE: a Redis error returns false (skip the
   * send) so a connectivity blip can't trigger a duplicate-reminder storm.
   */
  private async claimOnce(key: string): Promise<boolean> {
    try {
      const res = await this.redisService
        .getClient()
        .set(key, '1', 'EX', ShiftReminderCron.DEDUP_TTL_SECONDS, 'NX');
      return res === 'OK';
    } catch (err) {
      this.logger.warn(`Shift reminder dedup claim failed (${key}): ${(err as Error).message}`);
      return false;
    }
  }
}
