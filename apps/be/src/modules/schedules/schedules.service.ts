import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Repository,
  type FindOptionsWhere,
} from 'typeorm';
import { Schedule, ScheduleStatus, ScheduleLocation } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { User } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { AuditLogService } from '../audit/audit.service';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';
import { ScheduleOverlapService } from './services/schedule-overlap.service';
import { ScheduleRecurrenceUtil } from './utils/schedule-recurrence.util';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import {
  canEditTargetRole,
  isGlobalRosterEditor,
  isRayonManagerRole,
  isNonRosteredRole,
} from './schedule-edit.policy';

/**
 * Absence (Ketidakhadiran) type → roster status. `izin` (permit) is an excused
 * absence like sick/annual; `libur` reuses OFF (a deliberate day off, not counted
 * as expected/absent). Keep in sync with the monitoring on-leave filter.
 */
const LEAVE_STATUS_BY_TYPE: Record<'sick' | 'annual' | 'permit' | 'off', ScheduleStatus> = {
  sick: ScheduleStatus.LEAVE_SICK,
  annual: ScheduleStatus.LEAVE_ANNUAL,
  permit: ScheduleStatus.LEAVE_PERMIT,
  off: ScheduleStatus.OFF,
};

/** Statuses that mean a worker is committed for the day and can't cover another shift. */
const BUSY_STATUSES = [
  ScheduleStatus.PLANNED,
  ScheduleStatus.PRESENT,
  ScheduleStatus.LEAVE_SICK,
  ScheduleStatus.LEAVE_ANNUAL,
  ScheduleStatus.LEAVE_PERMIT,
];

/**
 * Optional filters for the calendar range query (materialized + projected rows).
 * All are ANDed; omitted fields don't filter. `locationId` matches static rows
 * whose schedule_locations include it.
 */
export interface RangeFilters {
  rayonId?: string | null;
  regionId?: string | null;
  locationId?: string | null;
  userId?: string | null;
  shiftDefinitionId?: string | null;
  teamCategoryId?: string | null;
}

/**
 * Daily roster service — materializes recurring **ScheduleEvents** (the
 * calendar-like recurrence rules) into one concrete, editable `schedules`
 * (occurrence) row per worker per WIB day, and exposes the per-day edits ops
 * needs (leave, replacement, extra area, shift) plus read helpers for clock-in
 * and monitoring. Materialization is driven by the event-materialization cron
 * (ADR-047); `generateRoster` is the same expansion triggered on demand
 * (idempotent) — it reads active ScheduleEvents, not standing user assignments.
 * See ADR-047 (occurrences from events); ADR-013 is the earlier daily-roster
 * model it superseded.
 */
@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly rosterRepo: Repository<Schedule>,
    @InjectRepository(ScheduleLocation)
    private readonly rosterAreaRepo: Repository<ScheduleLocation>,
    @InjectRepository(ScheduleEvent)
    private readonly eventRepo: Repository<ScheduleEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepo: Repository<ShiftDefinition>,
    private readonly userAreasService: UserLocationsService,
    private readonly auditLogService: AuditLogService,
    private readonly materializer: ScheduleMaterializerService,
    private readonly overlapService: ScheduleOverlapService,
  ) {}

  // ---- Edit-permission hierarchy (ADR-013 addendum) ----

  /**
   * Enforce the roster edit hierarchy: the `editor` may only edit a row whose
   * worker role is below theirs (see schedule-edit.policy) AND within their
   * scope — rayon for kepala_rayon/admin_rayon, assigned areas for korlap.
   * admin_system/superadmin/management act globally. Throws otherwise.
   */
  private async assertCanEdit(editor: User, row: Schedule): Promise<void> {
    const target = row.user ?? (await this.userRepo.findOne({ where: { id: row.user_id } }));
    if (!target) throw new NotFoundException('Roster worker not found');

    if (!canEditTargetRole(editor.role, target.role)) {
      throw new ForbiddenException("You cannot edit this worker's schedule");
    }
    if (isGlobalRosterEditor(editor.role)) return;

    const rowAreas = row.schedule_areas ?? [];
    if (isRayonManagerRole(editor.role)) {
      if (!editor.rayon_id) {
        throw new ForbiddenException('Your account is missing a rayon assignment');
      }
      const inRayon =
        row.rayon_id === editor.rayon_id ||
        rowAreas.some((a) => a.area?.rayon_id === editor.rayon_id);
      if (!inRayon) throw new ForbiddenException('This worker is outside your rayon');
      return;
    }
    // korlap: the row's areas must overlap the coordinator's own assigned areas.
    const editorAreaIds = await this.userAreasService.getPermanentLocationIds(editor.id);
    const overlap = rowAreas.some((a) => editorAreaIds.includes(a.location_id));
    if (!overlap) throw new ForbiddenException('This worker is outside your assigned areas');
  }

  /**
   * Authorize scheduling a NEW row for `target` (no existing row to gate on).
   * Mirrors assertCanEdit's hierarchy + scope, but keyed off the target user's
   * own rayon / permanent areas rather than a row's.
   */
  private async assertCanScheduleUser(editor: User, target: User): Promise<void> {
    if (!canEditTargetRole(editor.role, target.role)) {
      throw new ForbiddenException('You cannot schedule this worker');
    }
    if (isGlobalRosterEditor(editor.role)) return;
    if (isRayonManagerRole(editor.role)) {
      if (!editor.rayon_id) {
        throw new ForbiddenException('Your account is missing a rayon assignment');
      }
      if (target.rayon_id !== editor.rayon_id) {
        throw new ForbiddenException('This worker is outside your rayon');
      }
      return;
    }
    // korlap: the worker's permanent areas must overlap the coordinator's.
    const [editorAreaIds, targetAreaIds] = await Promise.all([
      this.userAreasService.getPermanentLocationIds(editor.id),
      this.userAreasService.getPermanentLocationIds(target.id),
    ]);
    if (!targetAreaIds.some((a) => editorAreaIds.includes(a))) {
      throw new ForbiddenException('This worker is outside your assigned areas');
    }
  }

  /**
   * Add a single worker to a day's roster (worker joined mid-day / missed by
   * generate). Enforces one live row per worker per day: rejects if the worker
   * already has one. Defaults shift + areas to the worker's template when omitted.
   */
  async addForDay(
    dto: {
      user_id: string;
      date: string;
      shift_definition_id?: string | null;
      area_ids?: string[];
    },
    actor: User,
  ): Promise<Schedule> {
    const target = await this.userRepo.findOne({ where: { id: dto.user_id } });
    if (!target) throw new NotFoundException('Worker not found');
    if (!target.is_active) throw new BadRequestException('Worker is inactive');
    if (isNonRosteredRole(target.role)) {
      throw new BadRequestException('This role is not schedulable');
    }
    await this.assertCanScheduleUser(actor, target);

    const shiftId =
      dto.shift_definition_id !== undefined
        ? dto.shift_definition_id
        : (target.shift_definition_id ?? null);

    // Phase 4: overlaps are warned, not rejected (ADR-047 amended, Google-Calendar style).
    // Pre-check exact duplicate (same user+date+shift) via the unique index.
    // A shiftless (OFF) row still enforces one-per-day.
    if (shiftId) {
      const shift = await this.shiftDefinitionRepo.findOne({ where: { id: shiftId } });
      if (!shift) throw new NotFoundException('Shift definition not found');

      // Check for exact duplicate (same shift that day already exists)
      const exactDuplicates = await this.findAllByUserAndDate(dto.user_id, dto.date);
      const exactMatch = exactDuplicates.find((r) => r.shift_definition_id === shiftId);
      if (exactMatch) {
        throw new BadRequestException('Worker already has this exact shift that day');
      }

      // Check for overlap and log warning if found (but don't reject)
      const conflict = await this.overlapService.findConflict(dto.user_id, dto.date, shift);
      if (conflict) {
        this.logger.warn(
          `Overlap detected: user ${dto.user_id} on ${dto.date} has ${conflict.shift_name}; ` +
            `adding ${shift.name} anyway`,
        );
      }
    } else {
      const existing = await this.findAllByUserAndDate(dto.user_id, dto.date);
      if (existing.length > 0) {
        throw new BadRequestException('Worker already has a schedule for this day');
      }
    }
    const row = await this.rosterRepo.save(
      this.rosterRepo.create({
        user_id: dto.user_id,
        schedule_date: dto.date,
        rayon_id: target.rayon_id ?? null,
        shift_definition_id: shiftId,
        status: shiftId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF,
        source: 'manual',
        created_by: actor.id,
      }),
    );
    const locationIds =
      dto.area_ids ?? (await this.userAreasService.getPermanentLocationIds(dto.user_id));
    await this.setAreas(row.id, locationIds, actor.id);
    await this.audit(
      row,
      'add_schedule',
      actor.id,
      {},
      { user_id: dto.user_id, shift_definition_id: shiftId, area_ids: locationIds },
    );
    return this.findOne(row.id);
  }

  /**
   * `where` for active events that can contribute an occurrence in `[from, to]`.
   * An event starting after `to`, or ending before `from`, expands to zero
   * occurrences in the window (see `expandOccurrenceDates`), so it's excluded at
   * the DB — the projections no longer load every active event into memory.
   * (`end_date IS NULL` = open-ended, always a candidate.)
   */
  private activeEventsOverlapping(from: string, to: string): FindOptionsWhere<ScheduleEvent>[] {
    return [
      { is_active: true, start_date: LessThanOrEqual(to), end_date: MoreThanOrEqual(from) },
      { is_active: true, start_date: LessThanOrEqual(to), end_date: IsNull() },
    ];
  }

  /**
   * Generate (materialize) the roster for a WIB day from all active ScheduleEvents.
   * Materializes occurrences for any event whose recurrence includes the given date.
   * Idempotent: existing rows (including tombstones) are skipped, so re-running
   * never duplicates and never overwrites manual edits or detached overrides.
   * Returns the number of new rows created (not including skipped/conflicts).
   *
   * Supports manual ad-hoc scheduling and backfill. The POST /schedules/generate
   * endpoint calls this; the daily cron uses ScheduleEventMaterializationCron instead.
   */
  async generateRoster(date: string, actorId: string | null): Promise<number> {
    // Fetch all active, non-deleted schedule events
    const events = await this.eventRepo.find({
      // Soft-deleted events are excluded by the repository's default scope; only
      // events that can occur on this date are loaded.
      where: this.activeEventsOverlapping(date, date),
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

    // Materialize each event for the given date
    for (const event of events) {
      try {
        const result = await this.materializer.materializeEvent(event, date, date);
        totalCreated += result.created;

        if (result.skipped.length > 0) {
          this.logger.debug(
            `Event ${event.id} for ${date}: created ${result.created}, skipped ${result.skipped.length}`,
          );
        }
      } catch (err) {
        this.logger.warn(
          `Failed to materialize event ${event.id} for ${date}: ${(err as Error).message}`,
        );
      }
    }

    this.logger.log(
      `Generated ${totalCreated} roster rows for ${date} from active schedule events`,
    );
    return totalCreated;
  }

  /** Map each rayon id → the ids of all areas in it (for whole-rayon assignment). */
  private async buildRayonAreaMap(rayonIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (rayonIds.length === 0) return map;
    const areas = await this.locationRepo.find({
      where: { rayon_id: In(rayonIds) },
      select: ['id', 'rayon_id'],
    });
    for (const a of areas) {
      if (!a.rayon_id) continue;
      const list = map.get(a.rayon_id) ?? [];
      list.push(a.id);
      map.set(a.rayon_id, list);
    }
    return map;
  }

  /** All roster rows for a WIB day, optionally scoped to one rayon. */
  async findByDate(date: string, rayonId?: string | null): Promise<Schedule[]> {
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      // `user` is eager on the entity, but createQueryBuilder ignores eager
      // relations — join it explicitly or every row comes back with no user
      // (the web table reads row.user.full_name and crashes).
      .leftJoinAndSelect('ds.user', 'u')
      .leftJoinAndSelect('ds.shift_definition', 'sd')
      .leftJoinAndSelect('ds.schedule_areas', 'dsa')
      .leftJoinAndSelect('dsa.area', 'area')
      .leftJoinAndSelect('ds.replacement_user', 'ru')
      .where('ds.schedule_date = :date', { date })
      .andWhere('ds.deleted_at IS NULL');
    if (rayonId) {
      qb.andWhere('ds.rayon_id = :rayonId', { rayonId });
    }
    return qb.orderBy('ds.status', 'ASC').addOrderBy('ds.created_at', 'ASC').getMany();
  }

  /**
   * ALL of a worker's live roster rows for a day, ordered by shift start time.
   * A worker may hold multiple non-overlapping shifts per day (ADR-047).
   */
  async findAllByUserAndDate(userId: string, date: string): Promise<Schedule[]> {
    const rows = await this.rosterRepo.find({
      where: { user_id: userId, schedule_date: date },
      relations: ['shift_definition', 'schedule_areas', 'schedule_areas.area', 'rayon'],
    });
    return rows.sort((a, b) =>
      (a.shift_definition?.start_time ?? '99:99:99').localeCompare(
        b.shift_definition?.start_time ?? '99:99:99',
      ),
    );
  }

  /**
   * The worker's MOST RELEVANT roster row for a day. With a single row this is
   * simply that row; with multiple shifts it picks, in order: the shift whose
   * time window covers "now" (WIB, honoring crosses_midnight) → the next
   * upcoming shift today → the last shift of the day. Deterministic — callers
   * that need every shift use findAllByUserAndDate.
   */
  async findByUserAndDate(userId: string, date: string): Promise<Schedule | null> {
    const rows = await this.findAllByUserAndDate(userId, date);
    if (rows.length <= 1) return rows[0] ?? null;

    const now = TimezoneUtil.jakartaNow();
    const nowMin = now.getUTCHours() * 60 + now.getUTCMinutes();

    const minutesOf = (hms: string): number => {
      const [h, m] = hms.split(':').map(Number);
      return h * 60 + m;
    };
    // A crosses-midnight shift on THIS date covers from its start tonight into
    // tomorrow — the after-midnight tail is served by the PREVIOUS day's row
    // (callers querying yesterday's date), so coverage here is simply
    // [start, end-possibly-past-1440) against today's clock.
    const covering = rows.find((r) => {
      const sd = r.shift_definition;
      if (!sd) return false;
      const start = minutesOf(sd.start_time);
      const end = minutesOf(sd.end_time) + (sd.crosses_midnight ? 24 * 60 : 0);
      return nowMin >= start && nowMin < end;
    });
    if (covering) return covering;

    const upcoming = rows.find(
      (r) => r.shift_definition && minutesOf(r.shift_definition.start_time) > nowMin,
    );
    return upcoming ?? rows[rows.length - 1];
  }

  /**
   * All roster rows for a date range [from, to] inclusive, rayon-scoped.
   * Relations: user, shift_definition, schedule_areas/locations, region, team_category.
   *
   * Phase 4 (ADR-047 amended): includes materialized rows + projected rows from
   * active events that expand beyond the materialization horizon. Projected rows
   * are virtual (is_projected=true) and not persisted.
   */
  async findByDateRangeForUser(from: string, to: string, userId: string): Promise<Schedule[]> {
    // Fetch materialized rows for this user in the range
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoinAndSelect('ds.user', 'u')
      .leftJoinAndSelect('ds.shift_definition', 'sd')
      .leftJoinAndSelect('ds.schedule_areas', 'dsa')
      .leftJoinAndSelect('dsa.area', 'area')
      .leftJoinAndSelect('ds.region', 'r')
      .leftJoinAndSelect('ds.team_category', 'tt')
      .where('ds.user_id = :userId', { userId })
      .andWhere('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL');
    const materialized = await qb
      .orderBy('ds.schedule_date', 'ASC')
      .addOrderBy('ds.status', 'ASC')
      .getMany();

    // Build a set of (event_id, user_id, date) tuples already materialized
    const materializedKey = new Set(
      materialized
        .filter((r) => r.schedule_event_id)
        .map((r) => `${r.schedule_event_id}:${r.user_id}:${r.schedule_date}`),
    );

    // Projection: load active events that include this user and expand beyond the materialized window
    const events = await this.eventRepo.find({
      where: this.activeEventsOverlapping(from, to),
      relations: [
        'shift_definition',
        'location',
        'region',
        'team_category',
        'pic_user',
        'user',
        'members',
        'members.user',
      ],
    });

    const projectedRows: Schedule[] = [];
    for (const event of events) {
      // Expand the event's recurrence into concrete dates
      const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);

      // Resolve member IDs (same logic as materializer)
      const memberIds = event.is_team
        ? Array.from(
            new Set(
              [event.pic_user_id, ...(event.members?.map((m) => m.user_id) ?? [])].filter(
                (id): id is string => id != null,
              ),
            ),
          )
        : event.user_id
          ? [event.user_id]
          : [];

      // Skip this event if the user is not in it
      if (!memberIds.includes(userId)) continue;

      // Check which (member, date) pairs are already in DB with this event
      if (dates.length > 0) {
        const existingRows = await this.rosterRepo.find({
          where: { schedule_event_id: event.id, user_id: userId, schedule_date: In(dates) },
          withDeleted: true, // Include soft-deleted tombstones
          select: ['user_id', 'schedule_date'],
        });
        const existingKey = new Set(existingRows.map((r) => `${r.user_id}:${r.schedule_date}`));

        // For each date NOT already in DB, emit a virtual projected row
        for (const dateStr of dates) {
          const key = `${event.id}:${userId}:${dateStr}`;
          if (!materializedKey.has(key)) {
            // Also check withDeleted to avoid resurrecting tombstones
            if (!existingKey.has(`${userId}:${dateStr}`)) {
              // Emit a virtual projected row
              const projected = new Schedule();
              projected.id = `projected:${event.id}:${userId}:${dateStr}`;
              projected.user_id = userId;
              projected.schedule_date = dateStr;
              projected.shift_definition_id = event.shift_definition_id;
              projected.shift_definition = event.shift_definition;
              projected.status = ScheduleStatus.PLANNED;
              projected.source = 'event';
              projected.schedule_event_id = event.id;
              projected.region_id = event.scope === 'mobile' ? event.region_id : null;
              projected.region = event.scope === 'mobile' ? event.region : null;
              projected.team_category_id = event.is_team ? event.team_category_id : null;
              projected.team_category = event.is_team ? event.team_category : null;

              const rayon_id =
                event.scope === 'static'
                  ? event.location?.rayon_id
                  : event.scope === 'mobile'
                    ? event.region?.rayon_id
                    : event.rayon_id;
              projected.rayon_id = rayon_id ?? null;
              projected.is_detached = false;
              projected.is_projected = true;

              // Load user
              if (event.is_team) {
                if (userId === event.pic_user_id && event.pic_user) {
                  projected.user = event.pic_user;
                } else if (event.members?.length > 0) {
                  const memberObj = event.members.find((m) => m.user_id === userId);
                  if (memberObj?.user) {
                    projected.user = memberObj.user;
                  }
                }
              } else if (event.user) {
                projected.user = event.user;
              }

              // For static scope, add schedule_areas
              if (event.scope === 'static' && event.location) {
                projected.schedule_areas = [
                  {
                    id: `projected:${event.id}:${userId}:${dateStr}:area`,
                    schedule_id: projected.id,
                    location_id: event.location_id,
                    area: event.location,
                  } as ScheduleLocation,
                ];
              }

              projectedRows.push(projected);
            }
          }
        }
      }
    }

    // Merge materialized and projected rows, sorted by date + status
    const all = [...materialized, ...projectedRows];
    return all.sort((a, b) => {
      const dateCompare = a.schedule_date.localeCompare(b.schedule_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.status ?? '').localeCompare(b.status ?? '');
    });
  }

  async findByDateRange(
    from: string,
    to: string,
    filters?: RangeFilters | string | null,
  ): Promise<Schedule[]> {
    // Back-compat: a bare rayonId string is still accepted.
    const f: RangeFilters = typeof filters === 'string' ? { rayonId: filters } : (filters ?? {});
    const { rayonId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;

    // Fetch materialized rows for the range
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoinAndSelect('ds.user', 'u')
      .leftJoinAndSelect('ds.shift_definition', 'sd')
      .leftJoinAndSelect('ds.schedule_areas', 'dsa')
      .leftJoinAndSelect('dsa.area', 'area')
      .leftJoinAndSelect('ds.region', 'r')
      .leftJoinAndSelect('ds.team_category', 'tt')
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL');
    if (rayonId) qb.andWhere('ds.rayon_id = :rayonId', { rayonId });
    if (regionId) qb.andWhere('ds.region_id = :regionId', { regionId });
    if (userId) qb.andWhere('ds.user_id = :userId', { userId });
    if (shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });
    if (teamCategoryId) qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId });
    // A location filter matches static rows whose schedule_areas include it.
    if (locationId)
      qb.andWhere(
        'EXISTS (SELECT 1 FROM schedule_locations sl WHERE sl.schedule_id = ds.id AND sl.location_id = :locationId)',
        { locationId },
      );
    const materialized = await qb
      .orderBy('ds.schedule_date', 'ASC')
      .addOrderBy('ds.status', 'ASC')
      .getMany();

    // Build a set of (event_id, user_id, date) tuples already materialized
    const materializedKey = new Set(
      materialized
        .filter((r) => r.schedule_event_id)
        .map((r) => `${r.schedule_event_id}:${r.user_id}:${r.schedule_date}`),
    );

    // Projection: load active events and expand beyond the materialized window
    const events = await this.eventRepo.find({
      where: this.activeEventsOverlapping(from, to),
      relations: [
        'shift_definition',
        'location',
        'region',
        'team_category',
        'pic_user',
        'user',
        'members',
        'members.user',
      ],
    });

    const projectedRows: Schedule[] = [];
    for (const event of events) {
      // Event-level filter gate — skip whole events that can't match, so we
      // never expand their recurrence needlessly.
      if (shiftDefinitionId && event.shift_definition_id !== shiftDefinitionId) continue;
      if (teamCategoryId && event.team_category_id !== teamCategoryId) continue;
      if (locationId && event.location_id !== locationId) continue;
      const eventRegionId =
        event.scope === 'mobile' ? event.region_id : (event.location?.region_id ?? null);
      if (regionId && eventRegionId !== regionId) continue;
      const eventRayonForFilter =
        event.scope === 'static'
          ? event.location?.rayon_id
          : event.scope === 'mobile'
            ? event.region?.rayon_id
            : event.rayon_id;
      if (rayonId && eventRayonForFilter !== rayonId) continue;

      // Expand the event's recurrence into concrete dates
      const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);

      // Resolve member IDs (same logic as materializer)
      let memberIds = event.is_team
        ? Array.from(
            new Set(
              [event.pic_user_id, ...(event.members?.map((m) => m.user_id) ?? [])].filter(
                (id): id is string => id != null,
              ),
            ),
          )
        : event.user_id
          ? [event.user_id]
          : [];
      // A user filter narrows to just that member (and drops events they aren't on).
      if (userId) memberIds = memberIds.filter((id) => id === userId);

      // Check which (member, date) pairs are already in DB with this event
      if (dates.length > 0) {
        const existingRows = await this.rosterRepo.find({
          where: { schedule_event_id: event.id, schedule_date: In(dates) },
          withDeleted: true, // Include soft-deleted tombstones
          select: ['user_id', 'schedule_date'],
        });
        const existingKey = new Set(existingRows.map((r) => `${r.user_id}:${r.schedule_date}`));

        // For each (member, date) NOT already in DB, emit a virtual projected row
        for (const memberId of memberIds) {
          for (const dateStr of dates) {
            const key = `${event.id}:${memberId}:${dateStr}`;
            if (!materializedKey.has(key)) {
              // Also check withDeleted to avoid resurrecting tombstones
              if (!existingKey.has(`${memberId}:${dateStr}`)) {
                // Filter by rayon if needed
                const rayon_id =
                  event.scope === 'static'
                    ? event.location?.rayon_id
                    : event.scope === 'mobile'
                      ? event.region?.rayon_id
                      : event.rayon_id;
                if (rayonId && rayon_id !== rayonId) continue;

                // Emit a virtual projected row
                const projected = new Schedule();
                projected.id = `projected:${event.id}:${memberId}:${dateStr}`;
                projected.user_id = memberId;
                projected.schedule_date = dateStr;
                projected.shift_definition_id = event.shift_definition_id;
                projected.shift_definition = event.shift_definition;
                projected.status = ScheduleStatus.PLANNED;
                projected.source = 'event';
                projected.schedule_event_id = event.id;
                projected.region_id = event.scope === 'mobile' ? event.region_id : null;
                projected.region = event.scope === 'mobile' ? event.region : null;
                projected.team_category_id = event.is_team ? event.team_category_id : null;
                projected.team_category = event.is_team ? event.team_category : null;
                projected.rayon_id = rayon_id ?? null;
                projected.is_detached = false;
                projected.is_projected = true;

                // Load user from event.user or event.pic_user (will be loaded via relations)
                if (event.is_team) {
                  // For team events, find the member user via relations
                  if (memberId === event.pic_user_id && event.pic_user) {
                    projected.user = event.pic_user;
                  } else if (event.members?.length > 0) {
                    const memberObj = event.members.find((m) => m.user_id === memberId);
                    if (memberObj?.user) {
                      projected.user = memberObj.user;
                    }
                  }
                } else if (event.user) {
                  // Individual event
                  projected.user = event.user;
                }

                // For static scope, add schedule_areas
                if (event.scope === 'static' && event.location) {
                  projected.schedule_areas = [
                    {
                      id: `projected:${event.id}:${memberId}:${dateStr}:area`,
                      schedule_id: projected.id,
                      location_id: event.location_id,
                      area: event.location,
                    } as ScheduleLocation,
                  ];
                }

                projectedRows.push(projected);
              }
            }
          }
        }
      }
    }

    // Merge materialized and projected rows, sorted by date + status
    const all = [...materialized, ...projectedRows];
    return all.sort((a, b) => {
      const dateCompare = a.schedule_date.localeCompare(b.schedule_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.status ?? '').localeCompare(b.status ?? '');
    });
  }

  /**
   * Per-day occupancy counts for a (potentially long) date range — the year
   * heatmap. Counts materialized roster rows plus projected event occurrences
   * beyond the horizon, deduped against a single tombstone query (unlike
   * findByDateRange, no per-event DB round-trip, no row hydration). Returns only
   * days with count > 0. `userId` self-scopes for workers.
   */
  async getDailyCounts(
    from: string,
    to: string,
    filters?: RangeFilters,
  ): Promise<Array<{ date: string; count: number }>> {
    const f: RangeFilters = filters ?? {};
    const { rayonId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;

    // getRawMany returns `date` columns as JS Date; normalize to YYYY-MM-DD so
    // keys/sorting line up with the projection's string dates.
    const toDay = (v: unknown): string =>
      v instanceof Date ? v.toISOString().slice(0, 10) : String(v).slice(0, 10);

    // Materialized rows (light select — no relations).
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .select(['ds.schedule_date', 'ds.user_id', 'ds.schedule_event_id'])
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL');
    if (rayonId) qb.andWhere('ds.rayon_id = :rayonId', { rayonId });
    if (regionId) qb.andWhere('ds.region_id = :regionId', { regionId });
    if (userId) qb.andWhere('ds.user_id = :userId', { userId });
    if (shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });
    if (teamCategoryId) qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId });
    if (locationId)
      qb.andWhere(
        'EXISTS (SELECT 1 FROM schedule_locations sl WHERE sl.schedule_id = ds.id AND sl.location_id = :locationId)',
        { locationId },
      );
    const materialized = await qb.getRawMany<{
      ds_schedule_date: string;
      ds_user_id: string;
      ds_schedule_event_id: string | null;
    }>();

    const counts = new Map<string, number>();
    const bump = (date: string) => counts.set(date, (counts.get(date) ?? 0) + 1);
    for (const r of materialized) bump(toDay(r.ds_schedule_date));

    // Every (event, user, date) key in the range, INCLUDING tombstones, so
    // projection never double-counts a materialized/deleted occurrence.
    const keyRows = await this.rosterRepo
      .createQueryBuilder('ds')
      .select(['ds.schedule_event_id', 'ds.user_id', 'ds.schedule_date'])
      .withDeleted()
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.schedule_event_id IS NOT NULL')
      .getRawMany<{
        ds_schedule_event_id: string;
        ds_user_id: string;
        ds_schedule_date: string;
      }>();
    const existingKey = new Set(
      keyRows.map((r) => `${r.ds_schedule_event_id}:${r.ds_user_id}:${toDay(r.ds_schedule_date)}`),
    );

    // Projection: expand active events across the range, adding only occurrences
    // not already represented by a materialized/tombstoned row.
    const events = await this.eventRepo.find({
      where: this.activeEventsOverlapping(from, to),
      relations: ['location', 'region', 'members'],
    });
    for (const event of events) {
      if (shiftDefinitionId && event.shift_definition_id !== shiftDefinitionId) continue;
      if (teamCategoryId && event.team_category_id !== teamCategoryId) continue;
      if (locationId && event.location_id !== locationId) continue;
      const eventRegionId =
        event.scope === 'mobile' ? event.region_id : (event.location?.region_id ?? null);
      if (regionId && eventRegionId !== regionId) continue;
      const eventRayon =
        event.scope === 'static'
          ? event.location?.rayon_id
          : event.scope === 'mobile'
            ? event.region?.rayon_id
            : event.rayon_id;
      if (rayonId && eventRayon !== rayonId) continue;

      let memberIds = event.is_team
        ? Array.from(
            new Set(
              [event.pic_user_id, ...(event.members?.map((m) => m.user_id) ?? [])].filter(
                (id): id is string => id != null,
              ),
            ),
          )
        : event.user_id
          ? [event.user_id]
          : [];
      if (userId) memberIds = memberIds.filter((id) => id === userId);
      if (memberIds.length === 0) continue;

      const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);
      for (const rawDate of dates) {
        // NONE-recurrence events push the entity's start_date (a Date) — normalize.
        const dateStr = toDay(rawDate);
        for (const memberId of memberIds) {
          if (existingKey.has(`${event.id}:${memberId}:${dateStr}`)) continue;
          bump(dateStr);
        }
      }
    }

    return Array.from(counts.entries())
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  async findOne(id: string): Promise<Schedule> {
    const row = await this.rosterRepo.findOne({
      where: { id },
      // `user` is loaded so the edit-permission hierarchy can read the target's role.
      relations: ['user', 'shift_definition', 'schedule_areas', 'schedule_areas.area'],
    });
    if (!row) throw new NotFoundException(`Daily schedule ${id} not found`);
    return row;
  }

  /** Mark a row as sick / annual leave. */
  async setLeave(
    id: string,
    leaveType: 'sick' | 'annual' | 'permit' | 'off',
    notes: string | undefined,
    actor: User,
  ): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const prevStatus = row.status;
    row.status = LEAVE_STATUS_BY_TYPE[leaveType];
    row.notes = notes ?? null;
    row.source = 'manual';
    row.updated_by = actorId;
    const saved = await this.rosterRepo.save(row);
    await this.audit(
      saved,
      'set_leave',
      actorId,
      { status: prevStatus },
      { status: saved.status, notes: saved.notes },
    );
    return this.findOne(saved.id);
  }

  /**
   * Replace the rostered worker for the day. The original row is marked
   * `replaced`; the covering worker's row for the same day is upserted to take
   * over the original's rayon/shift/areas, with `original_user_id` set.
   */
  async replaceWorker(
    id: string,
    replacementUserId: string,
    notes: string | undefined,
    actor: User,
  ): Promise<Schedule> {
    const actorId = actor.id;
    const original = await this.findOne(id);
    await this.assertCanEdit(actor, original);
    if (replacementUserId === original.user_id) {
      throw new BadRequestException('Replacement must be a different worker');
    }
    const replacement = await this.userRepo.findOne({ where: { id: replacementUserId } });
    if (!replacement) throw new NotFoundException('Replacement worker not found');
    // The stand-in must also be someone the editor is allowed to schedule.
    if (!canEditTargetRole(actor.role, replacement.role)) {
      throw new ForbiddenException('You cannot assign this replacement worker');
    }

    const locationIds = (original.schedule_areas ?? []).map((dsa) => dsa.location_id);

    // Mark the original as replaced.
    const prevStatus = original.status;
    original.status = ScheduleStatus.REPLACED;
    original.replacement_user_id = replacementUserId;
    original.notes = notes ?? original.notes;
    original.source = 'manual';
    original.updated_by = actorId;
    await this.rosterRepo.save(original);

    // Upsert the covering worker's row for the same day. If they already have
    // ANY committed row that day (their own shift — even a different one — or
    // leave) they can't cover; reject rather than silently overwriting.
    // `off`/`replaced` rows are free to take over. Checks every row of the day
    // since a worker may hold multiple shifts (ADR-047).
    const coverRows = await this.findAllByUserAndDate(replacementUserId, original.schedule_date);
    const busyRow = coverRows.find((r) => BUSY_STATUSES.includes(r.status));
    if (busyRow) {
      throw new BadRequestException(
        'Replacement worker already has a schedule or is on leave today',
      );
    }
    // Reuse the row keyed by the same shift when present (the (user, date,
    // shift) unique index), else any free shiftless row.
    const coverRow =
      coverRows.find((r) => r.shift_definition_id === original.shift_definition_id) ??
      coverRows.find((r) => r.shift_definition_id == null) ??
      null;
    const coverStatus = original.shift_definition_id ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
    let coverRowId: string;
    if (!coverRow) {
      // Brand-new entity — no eager/cascaded relations were ever loaded onto
      // it, so a plain save() is safe here.
      const saved = await this.rosterRepo.save(
        this.rosterRepo.create({
          user_id: replacementUserId,
          schedule_date: original.schedule_date,
          rayon_id: original.rayon_id,
          shift_definition_id: original.shift_definition_id,
          original_user_id: original.user_id,
          status: coverStatus,
          source: 'manual',
          created_by: actorId,
          updated_by: actorId,
        }),
      );
      coverRowId = saved.id;
    } else {
      // Raw column UPDATE, not `save(coverRow)` — findByUserAndDate() eager/
      // explicitly loads `shift_definition`/`rayon`/`schedule_areas`, so
      // `coverRow` holds stale relation objects; saving the entity would let
      // TypeORM reconcile those FKs from the stale objects and revert them.
      coverRowId = coverRow.id;
      await this.rosterRepo.update(coverRowId, {
        rayon_id: original.rayon_id,
        shift_definition_id: original.shift_definition_id,
        original_user_id: original.user_id,
        status: coverStatus,
        source: 'manual',
        updated_by: actorId,
      });
    }
    await this.setAreas(coverRowId, locationIds, actorId);

    await this.audit(
      original,
      'replace_worker',
      actorId,
      { status: prevStatus },
      { status: ScheduleStatus.REPLACED, replacement_user_id: replacementUserId },
    );
    return this.findOne(original.id);
  }

  /** Set the day's areas (0..N). */
  async updateAreas(id: string, locationIds: string[], actor: User): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const before = (row.schedule_areas ?? []).map((dsa) => dsa.location_id);
    await this.setAreas(row.id, locationIds, actorId);
    // Raw column UPDATE, not `save(row)` — `schedule_areas` is a `cascade: true`
    // relation and `row` still holds the now-stale in-memory array from
    // `findOne()` above. Saving the full entity would cascade-reinsert those
    // rows right after `setAreas()` just deleted them, silently reverting the
    // change (the bug: areas appeared to save but reverted on refresh).
    await this.rosterRepo.update(id, { source: 'manual', updated_by: actorId });
    await this.audit(row, 'update_areas', actorId, { area_ids: before }, { area_ids: locationIds });
    return this.findOne(id);
  }

  /** Set (or clear) the day's shift. */
  async updateShift(id: string, shiftDefinitionId: string | null, actor: User): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const before = row.shift_definition_id;
    // Re-derive status only for the default planned/off pair; leave/replaced stay.
    let status = row.status;
    if (status === ScheduleStatus.PLANNED || status === ScheduleStatus.OFF) {
      status = shiftDefinitionId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
    }
    // Raw column UPDATE, not `save(row)` — `shift_definition` is an `eager: true`
    // relation, so `row.shift_definition` is still the OLD shift object from
    // `findOne()`. TypeORM's entity save reconciles the FK column from that
    // stale relation object, silently reverting `shift_definition_id` back to
    // the old value (the bug: clearing the shift never actually persisted).
    await this.rosterRepo.update(id, {
      shift_definition_id: shiftDefinitionId,
      status,
      source: 'manual',
      updated_by: actorId,
    });
    await this.audit(
      row,
      'update_shift',
      actorId,
      { shift_definition_id: before },
      { shift_definition_id: shiftDefinitionId },
    );
    return this.findOne(id);
  }

  /**
   * Override today's roster for a worker (used by monitoring reassign): ensure a
   * row exists for the day, set its single area to `areaId`, and optionally its
   * rayon/shift. Replaces the legacy range-based `schedules` override layer.
   * Returns the affected roster row id.
   */
  async overrideForDay(
    userId: string,
    date: string,
    params: { locationId: string; rayonId?: string | null; shiftDefinitionId?: string | null },
    actorId: string,
  ): Promise<string> {
    // NOTE: monitoring-reassign is authorized by its own guard; this path
    // deliberately uses the internal primitives (not the hierarchy-gated
    // updateShift/updateAreas) so the roster edit-hierarchy isn't applied here.
    let row = await this.findByUserAndDate(userId, date);
    if (!row) {
      const shiftId = params.shiftDefinitionId ?? null;
      row = await this.rosterRepo.save(
        this.rosterRepo.create({
          user_id: userId,
          schedule_date: date,
          rayon_id: params.rayonId ?? null,
          shift_definition_id: shiftId,
          // Mirror generateRoster: a row with no shift is OFF, not PLANNED.
          status: shiftId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF,
          source: 'manual',
          created_by: actorId,
        }),
      );
    } else if (params.shiftDefinitionId !== undefined) {
      // Raw column UPDATE, not `save(row)` — same stale-eager-relation pitfall
      // as updateShift() above (`shift_definition` would otherwise win over our
      // manually-set FK column on save).
      let status = row.status;
      if (status === ScheduleStatus.PLANNED || status === ScheduleStatus.OFF) {
        status = params.shiftDefinitionId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
      }
      await this.rosterRepo.update(row.id, {
        shift_definition_id: params.shiftDefinitionId,
        status,
        source: 'manual',
        updated_by: actorId,
      });
    }
    await this.setAreas(row.id, [params.locationId], actorId);
    return row.id;
  }

  /** Soft-delete a roster row (admin). */
  async remove(id: string, actorId: string): Promise<void> {
    const row = await this.findOne(id);
    row.deleted_by = actorId;
    await this.rosterRepo.save(row);
    await this.rosterRepo.softDelete(id);
  }

  // ---- Read helpers for clock-in ----

  /** Today's rostered areas for a worker (empty when no roster row / no areas). */
  async getActiveAreasForDay(userId: string, date: string): Promise<Location[]> {
    const row = await this.findByUserAndDate(userId, date);
    return (row?.schedule_areas ?? []).map((dsa) => dsa.area).filter(Boolean);
  }

  /** Today's rostered shift for a worker, or null. */
  async getShiftForDay(userId: string, date: string) {
    const row = await this.findByUserAndDate(userId, date);
    return row?.shift_definition ?? null;
  }

  /**
   * Rows expected to work on a day (real shift, not on leave / off / replaced).
   * Used by monitoring to compute the present/absent denominator.
   */
  async getExpectedForDate(date: string): Promise<Schedule[]> {
    return this.rosterRepo.find({
      where: {
        schedule_date: date,
        deleted_at: IsNull(),
        status: In([ScheduleStatus.PLANNED, ScheduleStatus.PRESENT]),
      },
      relations: ['shift_definition'],
    });
  }

  /**
   * All live roster rows for a day (any status), optionally rayon-scoped. The
   * monitoring service derives expected / present / absent / on-leave from this
   * (single query) without a new tracking column. `user` is eager-loaded.
   */
  async getRosterForMonitoring(date: string, rayonId?: string | null): Promise<Schedule[]> {
    return this.rosterRepo.find({
      where: {
        schedule_date: date,
        deleted_at: IsNull(),
        ...(rayonId ? { rayon_id: rayonId } : {}),
      },
      // `user` is eager on the entity; list it explicitly so the monitoring
      // absent_users mapping (full_name/role) never depends on that subtlety.
      relations: ['user', 'shift_definition'],
    });
  }

  /**
   * Team membership lookup for live (clocked-in) workers on a date.
   * Returns a Map of user_id → { team_id, team_name, team_color } where:
   * - team_id = schedule_event_id ?? team_category_id (ADR-048 grouping key)
   * - team_name = team_category.name
   * - team_color = team_category.marker_color ?? null
   *
   * Single batch query (no N+1): schedules where user_id IN (...) AND
   * schedule_date = date AND deleted_at IS NULL AND team_category_id IS NOT NULL,
   * left-joining team_category for name + marker_color.
   *
   * If a user has multiple team schedules on the same day, the first one wins.
   * Empty userIds returns an empty Map.
   */
  async getTeamMembership(
    userIds: string[],
    date: string,
  ): Promise<Map<string, { team_id: string; team_name: string; team_color: string | null }>> {
    const map = new Map<
      string,
      { team_id: string; team_name: string; team_color: string | null }
    >();
    if (userIds.length === 0) return map;

    const rows = await this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoinAndSelect('ds.team_category', 'tc')
      .where('ds.user_id IN (:...userIds)', { userIds })
      .andWhere('ds.schedule_date = :date', { date })
      .andWhere('ds.deleted_at IS NULL')
      .andWhere('ds.team_category_id IS NOT NULL')
      // Only a live team assignment counts — a worker who is off/replaced/on-leave
      // for a team schedule isn't on that team's bubble today.
      .andWhere('ds.status IN (:...statuses)', {
        statuses: [ScheduleStatus.PLANNED, ScheduleStatus.PRESENT],
      })
      .orderBy('ds.created_at', 'ASC')
      .getMany();

    for (const row of rows) {
      if (!row.user_id || map.has(row.user_id)) continue;
      if (!row.team_category) continue;

      const teamId = row.schedule_event_id ?? row.team_category_id;
      if (!teamId) continue;

      map.set(row.user_id, {
        team_id: teamId,
        team_name: row.team_category.name,
        team_color: row.team_category.marker_color ?? null,
      });
    }

    return map;
  }

  // ---- internals ----

  /** Reconcile a row's area set to exactly `locationIds`. */
  private async setAreas(
    rosterId: string,
    locationIds: string[],
    actorId: string | null,
  ): Promise<void> {
    const desired = [...new Set(locationIds)];
    await this.rosterAreaRepo.delete({ schedule_id: rosterId });
    if (!desired.length) return;
    const rows = desired.map((areaId) =>
      this.rosterAreaRepo.create({
        schedule_id: rosterId,
        location_id: areaId,
        assigned_by: actorId,
      }),
    );
    await this.rosterAreaRepo.save(rows);
  }

  private async audit(
    row: Schedule,
    action: string,
    actorId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogService
      .log({
        entity_type: 'schedule',
        entity_id: row.id,
        action,
        actor_id: actorId,
        old_value: oldValue,
        new_value: newValue,
        metadata: { date: row.schedule_date, user_id: row.user_id },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }
}
