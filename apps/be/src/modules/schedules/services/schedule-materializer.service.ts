import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In, MoreThanOrEqual } from 'typeorm';
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
    reason: 'exists' | 'duplicate';
  }>;
  conflicts: Array<{
    user_id: string;
    date: string;
    conflicting_shift: string;
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
    const conflicts: MaterializationResult['conflicts'] = [];

    // One query for every existing row of this event in the window (incl.
    // soft-deleted tombstones and detached overrides) — none of these may be
    // regenerated. Avoids a findOne per (member, date).
    const existingRows =
      dates.length === 0
        ? []
        : await this.scheduleRepo.find({
            where: { schedule_event_id: event.id, schedule_date: In(dates) },
            withDeleted: true,
            select: ['user_id', 'schedule_date'],
          });
    const occupied = new Set(existingRows.map((r) => `${r.user_id}:${r.schedule_date}`));

    // For each (member, date) tuple, create or skip a schedule row
    for (const memberId of memberIds) {
      for (const dateStr of dates) {
        if (occupied.has(`${memberId}:${dateStr}`)) {
          // Tombstone, detached override, or already-materialized occurrence.
          skipped.push({ user_id: memberId, date: dateStr, reason: 'exists' });
          continue;
        }

        // Check for overlap with other shifts. Unlike Phase 3, we now CREATE the
        // row and warn, not skip (ADR-047 amended, overlap policy).
        const conflict = await this.overlapService.findConflict(
          memberId,
          dateStr,
          event.shift_definition,
          { excludeEventId: event.id },
        );

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
          team_type_id: event.is_team ? event.team_type_id : null,
          rayon_id,
          created_by: event.created_by,
        });

        try {
          await this.scheduleRepo.save(schedule);
        } catch (err) {
          // (user, date, shift) unique — the worker already holds this EXACT
          // shift that day via another event/manual row. The only thing still
          // impossible: report as skipped, never crash the fan-out.
          if ((err as { code?: string }).code === '23505') {
            skipped.push({ user_id: memberId, date: dateStr, reason: 'duplicate' });
            continue;
          }
          throw err;
        }

        // For static scope, add schedule_locations row
        if (event.scope === 'static' && event.location_id) {
          const schedLocation = this.scheduleLocationRepo.create({
            schedule_id: schedule.id,
            location_id: event.location_id,
          });
          await this.scheduleLocationRepo.save(schedLocation);
        }

        created++;

        // Log conflict as warning if one was detected
        if (conflict) {
          this.logger.warn(
            `Overlap detected: user ${memberId} on ${dateStr} has ${conflict.shift_name}; ` +
              `created ${event.shift_definition.name} anyway`,
          );
          conflicts.push({
            user_id: memberId,
            date: dateStr,
            conflicting_shift: conflict.shift_name,
          });
        }
      }
    }

    return { created, skipped, conflicts };
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

    // Hard-delete future non-detached rows of this event (>= from). Default
    // repository finds already exclude soft-deleted rows, so tombstones —
    // which must survive to keep blocking regeneration — are never selected.
    const rowsToDelete = await this.scheduleRepo.find({
      where: {
        schedule_event_id: event.id,
        schedule_date: MoreThanOrEqual(from),
        is_detached: false,
      },
      select: ['id'],
    });

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
