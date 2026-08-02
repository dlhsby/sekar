import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import {
  Between,
  In,
  IsNull,
  LessThanOrEqual,
  MoreThanOrEqual,
  Not,
  Repository,
  type FindOptionsWhere,
  type SelectQueryBuilder,
} from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import type { AttributionCandidate } from '../shifts/services/shift-attribution.service';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Location } from '../locations/entities/location.entity';
import { ShiftDefinition } from '../shift-definitions/entities/shift-definition.entity';
import { Shift } from '../shifts/entities/shift.entity';
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { AuditLogService } from '../audit/audit.service';
import { ScheduleMaterializerService } from './services/schedule-materializer.service';
import { ScheduleOverlapService } from './services/schedule-overlap.service';
import { SystemConfigService } from '../settings/services/system-config.service';
import { resolveShiftWindow } from '../monitoring/lib/presence-lifecycle';
import { ScheduleRecurrenceUtil } from './utils/schedule-recurrence.util';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import {
  canEditTargetRole,
  isGlobalRosterEditor,
  isDistrictManagerRole,
  isNonRosteredRole,
} from './schedule-edit.policy';
// The module's declarations and pure helpers. Re-exported so every existing
// `from './schedules.service'` import keeps resolving.
import {
  BUSY_STATUSES,
  DAY_MS,
  DEFAULT_SWEEP_LOOKBACK_DAYS,
  EVENT_PROJECTION_SELECT,
  EXCUSED_STATUSES,
  FREED_STATUSES,
  LEAVE_STATUS_BY_TYPE,
  NIL_PLACE_ID,
  SCHEDULABLE_WORKER_ROLES,
  eventPlace,
  isShiftWindowClosed,
  schedulePlaceKey,
  slimProjectedRelations,
  toDayString,
  type DaySummary,
  type DaySummaryGroup,
  type DaySummaryWorkers,
  type RangeFilters,
  type RangeSummary,
  type RangeSummaryCell,
  type SummaryTuple,
  type UnavailableWorkerDto,
  type UnscheduledResult,
  type UnscheduledWorkerDto,
} from './schedules.support';

export * from './schedules.support';
import {
  computeDailyCounts,
  computeDaySummary,
  computeRangeSummary,
  type SummaryDeps,
} from './schedules.summaries';
import {
  activeEventsOverlapping,
  applyRangeFilters,
  eventOccurrenceKeys,
  occupiedShiftKeys,
  findByDateRangeForUser,
  projectOccurrences,
  projectionGuardScope,
  type ProjectionDeps,
} from './schedules.projection';
import {
  addDaysToDate,
  findAllByUserAndDate,
  findByDate,
  findByUserAndDate,
  findCurrentForUser,
  markPresentForClockIn,
  type ReadDeps,
} from './schedules.reads';

/** The arguments of a `schedules.reads.ts` function minus its leading deps. */
type ReadTail<F> = F extends (deps: ReadDeps, ...rest: infer R) => unknown ? R : never;
import {
  findUnscheduled,
  sweepAbsences,
  type AvailabilityDeps,
  type UnscheduledFilters,
} from './schedules.availability';
import {
  getActiveAreasForDay,
  getActiveAreasNow,
  getAttributionCandidates,
  getExpectedForDate,
  getRosterForMonitoring,
  getShiftForDay,
  getTeamMembership,
  type LookupDeps,
} from './schedules.lookups';
import {
  overrideForDay,
  remove,
  replaceWorker,
  setLeave,
  updateAreas,
  updateShift,
  type MutationDeps,
} from './schedules.mutations';

/** The arguments of a `schedules.mutations.ts` function minus its leading deps. */
type TailArgs<F> = F extends (deps: MutationDeps, ...rest: infer R) => unknown ? R : never;

@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly rosterRepo: Repository<Schedule>,
    @InjectRepository(ScheduleEvent)
    private readonly eventRepo: Repository<ScheduleEvent>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Location)
    private readonly locationRepo: Repository<Location>,
    @InjectRepository(ShiftDefinition)
    private readonly shiftDefinitionRepo: Repository<ShiftDefinition>,
    // Read-only: resolve the roster row a still-open shift was started from, so a
    // dangling/overrun cross-midnight shift keeps its schedule + area. Registered
    // via TypeOrmModule.forFeature in schedules.module — no ShiftsModule import,
    // so no circular dependency (shifts already depends on schedules).
    @InjectRepository(Shift)
    private readonly shiftRepo: Repository<Shift>,
    private readonly userAreasService: UserLocationsService,
    private readonly auditLogService: AuditLogService,
    private readonly materializer: ScheduleMaterializerService,
    private readonly overlapService: ScheduleOverlapService,
    // Optional so the many existing unit specs that construct this service by
    // hand keep working; absent, the sweep falls back to its documented default.
    @Optional()
    private readonly configService?: SystemConfigService,
  ) {}

  // ---- Edit-permission hierarchy (ADR-013 addendum) ----

  /**
   * Enforce the roster edit hierarchy: the `editor` may only edit a row whose
   * worker role is below theirs (see schedule-edit.policy) AND within their
   * scope — district for kepala_rayon/admin_rayon, assigned areas for korlap.
   * admin_system/superadmin/management act globally. Throws otherwise.
   */
  private async assertCanEdit(editor: User, row: Schedule): Promise<void> {
    const target = row.user ?? (await this.userRepo.findOne({ where: { id: row.user_id } }));
    if (!target) throw new NotFoundException('Roster worker not found');

    if (!canEditTargetRole(editor.role, target.role)) {
      throw new ForbiddenException("You cannot edit this worker's schedule");
    }
    if (isGlobalRosterEditor(editor.role)) return;

    if (isDistrictManagerRole(editor.role)) {
      if (!editor.district_id) {
        throw new ForbiddenException('Your account is missing a district assignment');
      }
      const inDistrict =
        row.district_id === editor.district_id || row.location?.district_id === editor.district_id;
      if (!inDistrict) throw new ForbiddenException('This worker is outside your district');
      return;
    }
    // korlap: the row's areas must overlap the coordinator's own assigned areas.
    const editorAreaIds = await this.userAreasService.getPermanentLocationIds(editor.id);
    const overlap = !!row.location_id && editorAreaIds.includes(row.location_id);
    if (!overlap) throw new ForbiddenException('This worker is outside your assigned areas');
  }

  /**
   * Authorize scheduling a NEW row for `target` (no existing row to gate on).
   * Mirrors assertCanEdit's hierarchy + scope, but keyed off the target user's
   * own district / permanent areas rather than a row's.
   */
  private async assertCanScheduleUser(editor: User, target: User): Promise<void> {
    if (!canEditTargetRole(editor.role, target.role)) {
      throw new ForbiddenException('You cannot schedule this worker');
    }
    if (isGlobalRosterEditor(editor.role)) return;
    if (isDistrictManagerRole(editor.role)) {
      if (!editor.district_id) {
        throw new ForbiddenException('Your account is missing a district assignment');
      }
      if (target.district_id !== editor.district_id) {
        throw new ForbiddenException('This worker is outside your district');
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

    // ADR-053: one row covers exactly one place, so a request naming several is
    // a contradiction. Checked BEFORE anything is written — it used to be
    // validated after `save`, which answered 400 while leaving the row behind.
    if (dto.area_ids && dto.area_ids.length > 1) {
      throw new BadRequestException(
        'A schedule row covers exactly one place (ADR-053). Create one row per lokasi instead of listing several.',
      );
    }

    // The place this row will land on, resolved BEFORE the duplicate check —
    // the check is about (shift, PLACE), so it cannot run after `setPlace`.
    // The permanent-assignment FALLBACK legitimately holds several (a korlap
    // covers many taman), so it seeds this row with the first by id and leaves
    // the rest to further rows; sorted so the pick is deterministic.
    const locationIds =
      dto.area_ids ??
      [...(await this.userAreasService.getPermanentLocationIds(dto.user_id))].sort();
    const placeId = schedulePlaceKey({
      location_id: locationIds[0] ?? null,
      district_id: target.district_id ?? null,
    });

    // Phase 4: overlaps are warned, not rejected (ADR-047 amended, Google-Calendar style).
    // A shiftless (OFF) row still enforces one-per-day.
    if (shiftId) {
      const shift = await this.shiftDefinitionRepo.findOne({ where: { id: shiftId } });
      if (!shift) throw new NotFoundException('Shift definition not found');

      // The uniqueness key is (user, date, shift, PLACE) — migration 17517 —
      // and one worker covering two lokasi during the SAME shift is the normal,
      // intended case (ADR-053), not a duplicate. Matching on the shift alone
      // rejected exactly that: "Worker already has this exact shift that day"
      // on a second lokasi, which is the one thing the model exists to allow.
      const sameDay = await this.findAllByUserAndDate(dto.user_id, dto.date);
      const exactMatch = sameDay.find(
        (r) => r.shift_definition_id === shiftId && schedulePlaceKey(r) === placeId,
      );
      if (exactMatch) {
        throw new BadRequestException('Worker already has this shift at this place that day');
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
        district_id: target.district_id ?? null,
        shift_definition_id: shiftId,
        status: shiftId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF,
        source: 'manual',
        created_by: actor.id,
      }),
    );
    await this.setPlace(row.id, locationIds[0] ?? null);
    await this.audit(
      row,
      'add_schedule',
      actor.id,
      {},
      { user_id: dto.user_id, shift_definition_id: shiftId, area_ids: locationIds },
    );
    return this.findOne(row.id);
  }

  private occupiedShiftKeys(from: string, to: string, filters?: RangeFilters) {
    return occupiedShiftKeys(this.projectionDeps(), from, to, filters);
  }

  private eventOccurrenceKeys(from: string, to: string, filters?: RangeFilters) {
    return eventOccurrenceKeys(this.projectionDeps(), from, to, filters);
  }

  private projectionGuardScope(filters?: RangeFilters) {
    return projectionGuardScope(filters);
  }

  private activeEventsOverlapping(from: string, to: string) {
    return activeEventsOverlapping(from, to);
  }

  private applyRangeFilters(qb: SelectQueryBuilder<Schedule>, f: RangeFilters): void {
    applyRangeFilters(qb, f);
  }

  private projectOccurrences(
    from: string,
    to: string,
    f: RangeFilters,
    materializedKey: Set<string>,
  ): Promise<Schedule[]> {
    return projectOccurrences(this.projectionDeps(), from, to, f, materializedKey);
  }

  private projectionDeps(): ProjectionDeps {
    return { rosterRepo: this.rosterRepo, eventRepo: this.eventRepo };
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

  /** Map each district id → the ids of all areas in it (for whole-district assignment). */
  private async buildDistrictAreaMap(districtIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (districtIds.length === 0) return map;
    const areas = await this.locationRepo.find({
      where: { district_id: In(districtIds) },
      select: ['id', 'district_id'],
    });
    for (const a of areas) {
      if (!a.district_id) continue;
      const list = map.get(a.district_id) ?? [];
      list.push(a.id);
      map.set(a.district_id, list);
    }
    return map;
  }

  /** Roster reads — see `schedules.reads.ts`. */
  findByDate(date: string, districtId?: string | null): Promise<Schedule[]> {
    return findByDate(this.readDeps(), date, districtId);
  }

  findAllByUserAndDate(userId: string, date: string): Promise<Schedule[]> {
    return findAllByUserAndDate(this.readDeps(), userId, date);
  }

  markPresentForClockIn(...args: ReadTail<typeof markPresentForClockIn>) {
    return markPresentForClockIn(this.readDeps(), ...args);
  }

  findCurrentForUser(userId: string): Promise<Schedule | null> {
    return findCurrentForUser(this.readDeps(), userId);
  }

  findByUserAndDate(userId: string, date: string): Promise<Schedule | null> {
    return findByUserAndDate(this.readDeps(), userId, date);
  }

  private addDaysToDate(dateStr: string, days: number): string {
    return addDaysToDate(dateStr, days);
  }

  private readDeps(): ReadDeps {
    return { rosterRepo: this.rosterRepo, shiftRepo: this.shiftRepo };
  }

  /** ADR-056 absence sweep — see `schedules.availability.ts`. */
  async sweepAbsences(
    now: Date = new Date(),
    lookbackDays?: number,
  ): Promise<{ absent: number; present: number }> {
    return sweepAbsences(this.availabilityDeps(), now, lookbackDays);
  }

  /** The gap panel: clockable workers the day does not cover. */
  async findUnscheduled(
    date: string,
    filters: UnscheduledFilters = {},
  ): Promise<UnscheduledResult> {
    return findUnscheduled(this.availabilityDeps(), date, filters);
  }

  private availabilityDeps(): AvailabilityDeps {
    return {
      rosterRepo: this.rosterRepo,
      userRepo: this.userRepo,
      shiftRepo: this.shiftRepo,
      logger: this.logger,
      configService: this.configService,
      findByDateRange: (from, to, filters) => this.findByDateRange(from, to, filters),
    };
  }

  /** A worker's own range, materialized + projected — see `schedules.projection.ts`. */
  findByDateRangeForUser(from: string, to: string, userId: string): Promise<Schedule[]> {
    return findByDateRangeForUser(this.projectionDeps(), from, to, userId);
  }

  /**
   * How many MATERIALIZED rows a range would return, without hydrating any.
   *
   * The controller uses this to refuse a response too large to serialize rather
   * than OOMing mid-flight. It deliberately counts only materialized rows:
   * projected ones require expanding every recurrence, which is most of the cost
   * the guard exists to avoid. A range dominated by projections is beyond the
   * horizon and small in practice.
   */
  async countByDateRange(
    from: string,
    to: string,
    filters?: RangeFilters | string | null,
  ): Promise<number> {
    const f: RangeFilters = typeof filters === 'string' ? { districtId: filters } : (filters ?? {});
    const { districtId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .innerJoin('ds.user', 'u')
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL')
      .andWhere('u.is_active = TRUE');
    if (f.cityScopeOnly) {
      qb.andWhere('ds.location_id IS NULL')
        .andWhere('ds.region_id IS NULL')
        .andWhere('ds.district_id IS NULL');
    }
    if (districtId) qb.andWhere('ds.district_id = :districtId', { districtId });
    if (regionId) qb.andWhere('ds.region_id = :regionId', { regionId });
    if (userId) qb.andWhere('ds.user_id = :userId', { userId });
    if (shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });
    if (teamCategoryId) qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId });
    if (locationId) qb.andWhere('ds.location_id = :locationId', { locationId });
    return qb.getCount();
  }

  async findByDateRange(
    from: string,
    to: string,
    filters?: RangeFilters | string | null,
  ): Promise<Schedule[]> {
    // Back-compat: a bare districtId string is still accepted.
    const f: RangeFilters = typeof filters === 'string' ? { districtId: filters } : (filters ?? {});
    const { districtId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;

    // Fetch materialized rows for the range
    // Explicit column lists, NOT leftJoinAndSelect.
    //
    // `location` and `region` carry `boundary_polygon` (~2 KB of GeoJSON each),
    // and joining them wholesale stamps that polygon onto every single roster
    // row. Measured on the staging clone: a 31-day, all-district range returned
    // **293 MB in 29 s** for 31k rows — and staging runs the API with
    // `--max-old-space-size=384`, so serializing that response is an OOM, not a
    // slow page. The web board and mobile's personal calendar only ever render
    // these as NAMES; boundaries are fetched per-subject by the map modal.
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoin('ds.user', 'u')
      .addSelect(['u.id', 'u.full_name', 'u.username', 'u.role', 'u.is_active'])
      .leftJoin('ds.shift_definition', 'sd')
      .addSelect([
        'sd.id',
        'sd.name',
        'sd.start_time',
        'sd.end_time',
        'sd.crosses_midnight',
        // Drives the lazy no-show flip on both frontends (ADR-056).
        'sd.cutoff_grace_min',
      ])
      .leftJoin('ds.location', 'location')
      .addSelect(['location.id', 'location.name'])
      .leftJoin('ds.region', 'r')
      .addSelect(['r.id', 'r.name'])
      .leftJoin('ds.team_category', 'tt')
      .addSelect(['tt.id', 'tt.name', 'tt.marker_color'])
      .where('ds.schedule_date >= :from', { from })
      .andWhere('ds.schedule_date <= :to', { to })
      .andWhere('ds.deleted_at IS NULL')
      // Deactivated workers drop off the board: their rows stay in the DB for
      // history, but the roster only shows people who can actually work.
      .andWhere('u.is_active = TRUE');
    if (f.cityScopeOnly) {
      qb.andWhere('ds.location_id IS NULL')
        .andWhere('ds.region_id IS NULL')
        .andWhere('ds.district_id IS NULL');
    }
    if (districtId) qb.andWhere('ds.district_id = :districtId', { districtId });
    if (regionId) qb.andWhere('ds.region_id = :regionId', { regionId });
    if (userId) qb.andWhere('ds.user_id = :userId', { userId });
    if (shiftDefinitionId)
      qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', { shiftDefinitionId });
    if (teamCategoryId) qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId });
    // One place per row (ADR-053), so the filter is a plain column match.
    if (locationId) qb.andWhere('ds.location_id = :locationId', { locationId });
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

    // Projection: the occurrences active events will produce that no row holds
    // yet. Shared with `getDaySummary` so the two can never disagree.
    const projectedRows = await this.projectOccurrences(from, to, f, materializedKey);
    // Merge materialized and projected rows, sorted by date + status
    const all = [...materialized, ...projectedRows];
    return all.sort((a, b) => {
      const dateCompare = a.schedule_date.localeCompare(b.schedule_date);
      if (dateCompare !== 0) return dateCompare;
      return (a.status ?? '').localeCompare(b.status ?? '');
    });
  }

  /** ADR-057 — the collapsed day board, as counts. See `schedules.summaries.ts`. */
  async getDaySummary(date: string, filters?: RangeFilters): Promise<DaySummary> {
    return computeDaySummary(this.summaryDeps(), date, filters);
  }

  /** ADR-057 — the week and month grids, as counts. */
  async getRangeSummary(from: string, to: string, filters?: RangeFilters): Promise<RangeSummary> {
    return computeRangeSummary(this.summaryDeps(), from, to, filters);
  }

  /** Per-day occupancy for the year heatmap. */
  async getDailyCounts(
    from: string,
    to: string,
    filters?: RangeFilters,
  ): Promise<Array<{ date: string; count: number }>> {
    return computeDailyCounts(this.summaryDeps(), from, to, filters);
  }

  /**
   * The aggregates read through this rather than owning repositories, so they
   * cannot drift from the roster read they must agree with.
   */
  private summaryDeps(): SummaryDeps {
    return {
      rosterRepo: this.rosterRepo,
      locationRepo: this.locationRepo,
      eventRepo: this.eventRepo,
      activeEventsOverlapping: (from, to) => this.activeEventsOverlapping(from, to),
      applyRangeFilters: (qb, f) => this.applyRangeFilters(qb, f),
      projectOccurrences: (from, to, f, key) => this.projectOccurrences(from, to, f, key),
    };
  }

  async findOne(id: string): Promise<Schedule> {
    const row = await this.rosterRepo.findOne({
      where: { id },
      // `user` is loaded so the edit-permission hierarchy can read the target's role.
      relations: ['user', 'shift_definition', 'location'],
    });
    if (!row) throw new NotFoundException(`Daily schedule ${id} not found`);
    return row;
  }

  /** Roster writes — see `schedules.mutations.ts`. */
  setLeave(...args: TailArgs<typeof setLeave>) {
    return setLeave(this.mutationDeps(), ...args);
  }

  replaceWorker(...args: TailArgs<typeof replaceWorker>) {
    return replaceWorker(this.mutationDeps(), ...args);
  }

  updateAreas(...args: TailArgs<typeof updateAreas>) {
    return updateAreas(this.mutationDeps(), ...args);
  }

  updateShift(...args: TailArgs<typeof updateShift>) {
    return updateShift(this.mutationDeps(), ...args);
  }

  overrideForDay(...args: TailArgs<typeof overrideForDay>) {
    return overrideForDay(this.mutationDeps(), ...args);
  }

  remove(...args: TailArgs<typeof remove>) {
    return remove(this.mutationDeps(), ...args);
  }

  private mutationDeps(): MutationDeps {
    return {
      rosterRepo: this.rosterRepo,
      eventRepo: this.eventRepo,
      userRepo: this.userRepo,
      assertCanEdit: (editor, row) => this.assertCanEdit(editor, row),
      audit: (row, action, actorId, before, after) =>
        this.audit(row, action, actorId, before, after),
      findOne: (id) => this.findOne(id),
      findByUserAndDate: (u, d) => this.findByUserAndDate(u, d),
      findAllByUserAndDate: (u, d) => this.findAllByUserAndDate(u, d),
      setPlace: (id, locationId) => this.setPlace(id, locationId),
    };
  }

  // ---- Read helpers for clock-in ----

  /** Per-worker reads — see `schedules.lookups.ts`. */
  getActiveAreasForDay(userId: string, date: string): Promise<Location[]> {
    return getActiveAreasForDay(this.lookupDeps(), userId, date);
  }

  getActiveAreasNow(userId: string): Promise<Location[]> {
    return getActiveAreasNow(this.lookupDeps(), userId);
  }

  getShiftForDay(userId: string, date: string) {
    return getShiftForDay(this.lookupDeps(), userId, date);
  }

  getAttributionCandidates(userId: string): Promise<AttributionCandidate[]> {
    return getAttributionCandidates(this.lookupDeps(), userId);
  }

  getExpectedForDate(date: string): Promise<Schedule[]> {
    return getExpectedForDate(this.lookupDeps(), date);
  }

  getRosterForMonitoring(date: string, districtId?: string | null): Promise<Schedule[]> {
    return getRosterForMonitoring(this.lookupDeps(), date, districtId);
  }

  getTeamMembership(userIds: string[], date: string): ReturnType<typeof getTeamMembership> {
    return getTeamMembership(this.lookupDeps(), userIds, date);
  }

  private lookupDeps(): LookupDeps {
    return {
      rosterRepo: this.rosterRepo,
      locationRepo: this.locationRepo,
      addDaysToDate: (d, n) => this.addDaysToDate(d, n),
      findByUserAndDate: (u, d) => this.findByUserAndDate(u, d),
      findAllByUserAndDate: (u, d) => this.findAllByUserAndDate(u, d),
      findCurrentForUser: (u) => this.findCurrentForUser(u),
    };
  }

  // ---- internals ----

  /** Reconcile a row's area set to exactly `locationIds`. */
  /**
   * Set the occurrence's lokasi. ONE place per row (ADR-053) — callers that want
   * wider coverage create another schedule, so this takes a single id (or null)
   * rather than an array it would have to silently truncate.
   */
  private async setPlace(rosterId: string, locationId: string | null): Promise<void> {
    await this.rosterRepo.update(rosterId, { location_id: locationId });
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
