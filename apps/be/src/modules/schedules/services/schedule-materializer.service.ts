import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ScheduleEvent } from '../entities/schedule-event.entity';
import { Schedule, ScheduleStatus } from '../entities/schedule.entity';
import { ScheduleLocation } from '../entities/schedule-area.entity';
import { ScheduleRecurrenceUtil } from '../utils/schedule-recurrence.util';
import { ScheduleOverlapService } from './schedule-overlap.service';
import { SystemConfigService } from '../../settings/services/system-config.service';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { User } from '../../users/entities/user.entity';

export interface MaterializationResult {
  created: number;
  skipped: Array<{
    user_id: string;
    date: string;
    reason: 'overlap' | 'tombstone';
  }>;
}

/**
 * Materializes ScheduleEvents into concrete Schedule occurrences.
 * Uses a rolling horizon to avoid unnecessary far-future materialization.
 */
@Injectable()
export class ScheduleMaterializerService {
  private readonly logger = new Logger(ScheduleMaterializerService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly scheduleRepo: Repository<Schedule>,
    @InjectRepository(ScheduleLocation)
    private readonly scheduleLocationRepo: Repository<ScheduleLocation>,
    @InjectRepository(ScheduleEvent)
    private readonly eventRepo: Repository<ScheduleEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly overlapService: ScheduleOverlapService,
    private readonly configService: SystemConfigService,
  ) {}

  /**
   * Get the materialization horizon in days from the config (default 30).
   */
  horizonDays(): number {
    return this.configService.getNumber('schedule.materialization_days', 30);
  }

  /**
   * Materialize a ScheduleEvent for a date range.
   *
   * @param event ScheduleEvent to materialize
   * @param from Start date (defaults to today WIB)
   * @param to End date (defaults to today + horizon)
   * @returns MaterializationResult with created count and skipped entries
   */
  async materializeEvent(
    event: ScheduleEvent,
    from?: string,
    to?: string,
  ): Promise<MaterializationResult> {
    const today = TimezoneUtil.jakartaDateString();
    const fromDate = from || today;
    const toDate = to || this.addDays(today, this.horizonDays());

    // Expand the event's recurrence into concrete dates
    const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, fromDate, toDate);

    // Resolve members: individual → [user_id]; team → [pic_user_id, ...members]
    const memberIds = await this.resolveMemberIds(event);

    let created = 0;
    const skipped: MaterializationResult['skipped'] = [];

    // For each (member, date) tuple, create or skip a schedule row
    for (const memberId of memberIds) {
      for (const dateStr of dates) {
        // Check for tombstone (soft-deleted or detached row already exists)
        const existing = await this.scheduleRepo.findOne({
          where: {
            user_id: memberId,
            schedule_date: dateStr,
            schedule_event_id: event.id,
          },
          withDeleted: true, // Include soft-deleted rows
        });

        if (existing) {
          // Tombstone or already-existing row for this event
          skipped.push({ user_id: memberId, date: dateStr, reason: 'tombstone' });
          continue;
        }

        // Check for overlap with other shifts
        const conflict = await this.overlapService.findConflict(
          memberId,
          dateStr,
          event.shift_definition,
          { excludeEventId: event.id },
        );

        if (conflict) {
          skipped.push({ user_id: memberId, date: dateStr, reason: 'overlap' });
          continue;
        }

        // Create the schedule row
        const rayon_id =
          event.scope === 'static' ? event.location?.rayon_id : event.region?.rayon_id;

        const schedule = this.scheduleRepo.create({
          user_id: memberId,
          schedule_date: dateStr,
          shift_definition_id: event.shift_definition_id,
          status: ScheduleStatus.PLANNED,
          source: 'event',
          schedule_event_id: event.id,
          region_id: event.scope === 'mobile' ? event.region_id : null,
          team_id: event.is_team ? event.team_id : null,
          rayon_id,
          created_by: event.created_by,
        });

        await this.scheduleRepo.save(schedule);

        // For static scope, add schedule_locations row
        if (event.scope === 'static' && event.location_id) {
          const schedLocation = this.scheduleLocationRepo.create({
            schedule_id: schedule.id,
            location_id: event.location_id,
          });
          await this.scheduleLocationRepo.save(schedLocation);
        }

        created++;
      }
    }

    return { created, skipped };
  }

  /**
   * Re-materialize a series starting from a given date.
   * Hard-deletes future non-detached rows of this event, then re-materializes.
   * Soft-deleted tombstones are left alone (they block regeneration).
   * Past rows (< fromDate) are never touched.
   *
   * @param event ScheduleEvent
   * @param fromDate Start date (defaults to today WIB)
   */
  async rematerializeSeries(
    event: ScheduleEvent,
    fromDate?: string,
  ): Promise<MaterializationResult> {
    const today = TimezoneUtil.jakartaDateString();
    const from = fromDate || today;
    const to = this.addDays(today, this.horizonDays());

    // Hard-delete future non-detached, non-soft-deleted rows of this event
    // (soft-deleted rows act as tombstones and must be preserved)
    const toDelete = await this.scheduleRepo.find({
      where: {
        schedule_event_id: event.id,
        schedule_date: from, // >= from (we'll filter client-side)
        is_detached: false,
        deleted_at: null as any, // Non-soft-deleted
      },
    });

    const rowsToDelete = toDelete.filter((r) => r.schedule_date >= from);
    if (rowsToDelete.length > 0) {
      // Hard delete via the connection to avoid soft-delete behavior
      await this.scheduleRepo
        .createQueryBuilder()
        .delete()
        .from(Schedule)
        .where('id IN (:...ids)', { ids: rowsToDelete.map((r) => r.id) })
        .execute();
    }

    // Re-materialize from fromDate forward
    return this.materializeEvent(event, from, to);
  }

  /**
   * Resolve all member IDs for an event.
   * - Individual: [user_id]
   * - Team: [pic_user_id, ...member_ids] (deduplicated)
   */
  private async resolveMemberIds(event: ScheduleEvent): Promise<string[]> {
    if (!event.is_team) {
      return [event.user_id!];
    }

    // Team: PIC + invited members
    const members = [event.pic_user_id!];
    if (event.members && event.members.length > 0) {
      members.push(...event.members.map((m) => m.user_id));
    }

    return Array.from(new Set(members)); // Deduplicate
  }

  private addDays(dateStr: string, days: number): string {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + days);
    return d.toISOString().split('T')[0];
  }
}
