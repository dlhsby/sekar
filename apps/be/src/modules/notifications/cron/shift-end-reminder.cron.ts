import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { SchedulesService } from '../../schedules/schedules.service';
import { ScheduleStatus } from '../../schedules/entities/schedule.entity';
import { NotificationsService } from '../notifications.service';
import { NotificationType } from '../entities/notification.entity';
import { RedisService } from '../../../common/services/redis.service';

/**
 * Shift-end reminder cron (ADR-055).
 *
 * Every 15 minutes (Asia/Jakarta) pushes a one-time `SHIFT_END_REMINDER` (a
 * clock-out nudge) to each rostered worker whose shift ends within its configured
 * lead time (`shift_definitions.end_reminder_min`; null/0 = off). Fires once in
 * the cron-cadence bucket that contains the lead time; a Redis SET-NX (24h TTL)
 * keyed on the shift's service day guards the overlap.
 *
 * A shift's end falls on "today" when it's a same-day shift on today's roster OR
 * a cross-midnight shift on YESTERDAY's roster (its end spills into today), so we
 * read both days and keep only the rows whose end is genuinely today. Time math
 * uses the fixed Jakarta offset (+7, no DST); the delta-to-end wraps around
 * midnight.
 */
@Injectable()
export class ShiftEndReminderCron {
  private readonly logger = new Logger(ShiftEndReminderCron.name);
  private static readonly JAKARTA_OFFSET_MS = 7 * 60 * 60 * 1000;
  /** Cron cadence in minutes — the width of the "fire" bucket around the lead time. */
  private static readonly WINDOW_MINUTES = 15;
  private static readonly DEDUP_TTL_SECONDS = 86_400;
  private static readonly DAY_MS = 24 * 60 * 60 * 1000;

  constructor(
    private readonly dailySchedulesService: SchedulesService,
    private readonly notificationsService: NotificationsService,
    private readonly redisService: RedisService,
  ) {}

  @Cron('*/15 * * * *', { name: 'shift-end-reminder', timeZone: 'Asia/Jakarta' })
  async run(): Promise<void> {
    try {
      await this.sendDueReminders();
    } catch (err) {
      this.logger.error(`Shift end reminder cron failed: ${(err as Error).message}`);
    }
  }

  /** Core logic, extracted for deterministic testing with an injected `now`. */
  async sendDueReminders(now: Date = new Date()): Promise<number> {
    const jakarta = new Date(now.getTime() + ShiftEndReminderCron.JAKARTA_OFFSET_MS);
    const todayStr = jakarta.toISOString().slice(0, 10);
    const yesterdayStr = new Date(jakarta.getTime() - ShiftEndReminderCron.DAY_MS)
      .toISOString()
      .slice(0, 10);
    const minutesNow = jakarta.getUTCHours() * 60 + jakarta.getUTCMinutes();

    const [today, yesterday] = await Promise.all([
      this.dailySchedulesService.findByDate(todayStr),
      this.dailySchedulesService.findByDate(yesterdayStr),
    ]);

    // A shift's end is TODAY when it's a same-day shift today, or a cross-midnight
    // shift from yesterday (whose end spills into today).
    const scheduled = (r: { status: ScheduleStatus; shift_definition?: unknown }): boolean =>
      (r.status === ScheduleStatus.PLANNED || r.status === ScheduleStatus.PRESENT) &&
      !!r.shift_definition;
    const rows = [
      ...today.filter((r) => scheduled(r) && !r.shift_definition!.crosses_midnight),
      ...yesterday.filter((r) => scheduled(r) && r.shift_definition!.crosses_midnight),
    ].map((r) => ({
      user_id: r.user_id,
      location_id: r.location_id ?? null,
      service_day: r.schedule_date,
      shift_definition_id: r.shift_definition_id as string,
      shift_name: r.shift_definition!.name,
      end_time: r.shift_definition!.end_time,
      reminder_min: r.shift_definition!.end_reminder_min ?? null,
    }));

    let sent = 0;

    for (const row of rows) {
      if (!row.reminder_min || row.reminder_min <= 0) continue; // reminder off

      const endMinutes = this.parseMinutes(row.end_time);
      if (endMinutes === null) continue;

      // Minutes until the shift ends, wrapping across midnight. Fire once in the
      // bucket that contains the configured lead time.
      const delta = (endMinutes - minutesNow + 1440) % 1440;
      if (delta <= 0) continue;
      if (
        delta > row.reminder_min ||
        delta <= row.reminder_min - ShiftEndReminderCron.WINDOW_MINUTES
      )
        continue;

      const dedupKey = `shift-end-reminder:${row.service_day}:${row.user_id}:${row.shift_definition_id}`;
      const first = await this.claimOnce(dedupKey);
      if (!first) continue;

      await this.notificationsService
        .sendToUser({
          user_id: row.user_id,
          title: 'Pengingat akhir shift',
          body: `Shift ${row.shift_name} Anda berakhir dalam ${row.reminder_min} menit. Jangan lupa clock-out.`,
          type: NotificationType.SHIFT_END_REMINDER,
          data: { shift_definition_id: row.shift_definition_id, location_id: row.location_id },
        })
        .catch((err) =>
          this.logger.warn(
            `Shift end reminder send failed for user ${row.user_id}: ${(err as Error).message}`,
          ),
        );
      sent++;
    }

    if (sent > 0) {
      this.logger.log(`ShiftEndReminderCron: sent ${sent} reminder(s) for ${todayStr}`);
    }
    return sent;
  }

  /** Parse a 'HH:MM[:SS]' time string into minutes-since-midnight. */
  private parseMinutes(time: string): number | null {
    if (!time) return null;
    const [h, m] = time.split(':').map((p) => parseInt(p, 10));
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  /**
   * Atomic once-per-key claim via Redis `SET key 1 NX EX <ttl>`. Fails SAFE: a
   * Redis error returns false (skip the send) so a blip can't storm reminders.
   */
  private async claimOnce(key: string): Promise<boolean> {
    try {
      const res = await this.redisService
        .getClient()
        .set(key, '1', 'EX', ShiftEndReminderCron.DEDUP_TTL_SECONDS, 'NX');
      return res === 'OK';
    } catch (err) {
      this.logger.warn(`Shift end reminder dedup claim failed (${key}): ${(err as Error).message}`);
      return false;
    }
  }
}
