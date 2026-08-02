import type { FindOptionsWhere, Repository, SelectQueryBuilder } from 'typeorm';
import { Between, In, IsNull, LessThanOrEqual, MoreThanOrEqual, Not } from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { ScheduleRecurrenceUtil } from './utils/schedule-recurrence.util';
import {
  EVENT_PROJECTION_SELECT,
  eventPlace,
  schedulePlaceKey,
  slimProjectedRelations,
  type RangeFilters,
} from './schedules.support';

/** What the projection needs from `SchedulesService` — the two repositories. */
export interface ProjectionDeps {
  rosterRepo: Repository<Schedule>;
  eventRepo: Repository<ScheduleEvent>;
}

/**
 * Occurrence PROJECTION (ADR-047).
 *
 * Past the materialization horizon a day holds no rows at all — only the
 * occurrences an event will produce — so every read that must agree with the
 * board expands the recurrence rules in memory and subtracts what is already
 * materialized, tombstoned or occupied. Split out of `schedules.service.ts`;
 * the service keeps thin private methods that delegate here, so a test may
 * still stub `projectOccurrences` on the service.
 */
/**
 * `user:date:shift:place` for every LIVE roster row in the range, regardless of
 * which event (or none) produced it.
 *
 * `UQ_schedules_user_date_shift_place` makes a second row for the same
 * (user, date, shift, PLACE) impossible, so an event that would produce one can
 * never materialize. Without this set the projection still emitted it — a
 * greyed "projected" duplicate that showed forever, could not be deleted (its
 * id is `projected:…`, not a row), and silently inflated the board's role
 * counts. Projection skips any key a live row already owns.
 *
 * The PLACE component is what keeps this honest under ADR-053. Keying on the
 * (user, date, shift) triple alone — as this did while the old
 * `UQ_schedules_user_date_shift` index still existed — suppressed the second
 * occurrence of a worker legitimately covering two places in one shift, which
 * is precisely the case ADR-053 exists to allow.
 */
export async function occupiedShiftKeys(
  svc: ProjectionDeps,
  from: string,
  to: string,
  filters?: RangeFilters,
): Promise<Set<string>> {
  const rows = await svc.rosterRepo.find({
    where: {
      schedule_date: Between(from, to),
      ...projectionGuardScope(filters),
    },
    select: [
      'user_id',
      'schedule_date',
      'shift_definition_id',
      'location_id',
      'region_id',
      'district_id',
    ],
  });
  return new Set(
    rows
      .filter((r) => r.shift_definition_id)
      .map(
        (r) => `${r.user_id}:${r.schedule_date}:${r.shift_definition_id}:${schedulePlaceKey(r)}`,
      ),
  );
}

/**
 * `event:user:date` for every row in the range that an event produced,
 * INCLUDING soft-deleted tombstones and detached overrides — none of which may
 * be projected again.
 *
 * One query for the whole range. This used to run once per event, inside the
 * projection loop: ~1k active events on the staging clone meant ~1k sequential
 * round-trips, which dominated the 25 s a month-wide range took.
 * `getDailyCounts` already collected the same keys this way.
 */
export async function eventOccurrenceKeys(
  svc: ProjectionDeps,
  from: string,
  to: string,
  filters?: RangeFilters,
): Promise<Set<string>> {
  const rows = await svc.rosterRepo.find({
    where: {
      schedule_date: Between(from, to),
      schedule_event_id: Not(IsNull()),
      ...projectionGuardScope(filters),
    },
    withDeleted: true,
    select: ['schedule_event_id', 'user_id', 'schedule_date'],
  });
  return new Set(rows.map((r) => `${r.schedule_event_id}:${r.user_id}:${r.schedule_date}`));
}

/**
 * The subset of a range's filters that may narrow the two projection-guard
 * key sets above.
 *
 * Both sets exist to answer "could this projected occurrence collide with a
 * row that already exists?". A guard query must therefore keep every row that
 * could collide with an occurrence the caller will actually receive — and the
 * projection loop has already dropped events that don't match the filters, so
 * narrowing the guard the same way is safe for these dimensions:
 *
 * - `userId` / `shiftDefinitionId` — both are components of the collision key,
 *   so a row with a different value can never collide.
 * - `locationId` / `regionId` / `districtId` — the collision key includes the
 *   PLACE, and an occurrence's place comes from its event, which the loop has
 *   already filtered to this place.
 *
 * `teamCategoryId` is deliberately NOT here: a blocking row may belong to a
 * different team (or none) and still own the same (user, date, shift, place).
 * Filtering by it would drop that row from the guard and resurrect a phantom
 * projected duplicate — the exact bug `occupiedShiftKeys` was added to fix.
 *
 * Unfiltered (the default city-wide board) this is a no-op, by design.
 */
export function projectionGuardScope(filters?: RangeFilters): FindOptionsWhere<Schedule> {
  if (!filters) return {};
  const { userId, shiftDefinitionId, locationId, regionId, districtId } = filters;
  return {
    ...(userId ? { user_id: userId } : {}),
    ...(shiftDefinitionId ? { shift_definition_id: shiftDefinitionId } : {}),
    ...(locationId ? { location_id: locationId } : {}),
    ...(regionId ? { region_id: regionId } : {}),
    ...(districtId ? { district_id: districtId } : {}),
  };
}

/**
 * `where` for active events that can contribute an occurrence in `[from, to]`.
 * An event starting after `to`, or ending before `from`, expands to zero
 * occurrences in the window (see `expandOccurrenceDates`), so it's excluded at
 * the DB — the projections no longer load every active event into memory.
 * (`end_date IS NULL` = open-ended, always a candidate.)
 */
/**
 * Active events overlapping a range.
 *
 * `shift_definition: { is_active: true }` matters as much as the event's own
 * flag: a retired shift must stop producing occurrences, including the
 * PROJECTED ones this feeds, or the board keeps showing a shift that no picker
 * offers.
 */
export function activeEventsOverlapping(
  from: string,
  to: string,
): FindOptionsWhere<ScheduleEvent>[] {
  return [
    {
      is_active: true,
      shift_definition: { is_active: true },
      start_date: LessThanOrEqual(to),
      end_date: MoreThanOrEqual(from),
    },
    {
      is_active: true,
      shift_definition: { is_active: true },
      start_date: LessThanOrEqual(to),
      end_date: IsNull(),
    },
  ];
}

/**
 * The range filters as SQL, applied identically wherever occurrences are
 * counted or listed. Shared so a card's headcount and the rows it expands to
 * can never be filtered differently.
 */
export function applyRangeFilters(qb: SelectQueryBuilder<Schedule>, f: RangeFilters): void {
  if (f.cityScopeOnly) {
    qb.andWhere('ds.location_id IS NULL')
      .andWhere('ds.region_id IS NULL')
      .andWhere('ds.district_id IS NULL');
  }
  if (f.districtId) qb.andWhere('ds.district_id = :districtId', { districtId: f.districtId });
  if (f.regionId) qb.andWhere('ds.region_id = :regionId', { regionId: f.regionId });
  if (f.userId) qb.andWhere('ds.user_id = :userId', { userId: f.userId });
  if (f.shiftDefinitionId)
    qb.andWhere('ds.shift_definition_id = :shiftDefinitionId', {
      shiftDefinitionId: f.shiftDefinitionId,
    });
  if (f.teamCategoryId)
    qb.andWhere('ds.team_category_id = :teamCategoryId', { teamCategoryId: f.teamCategoryId });
  // One place per row (ADR-053), so the filter is a plain column match.
  if (f.locationId) qb.andWhere('ds.location_id = :locationId', { locationId: f.locationId });
}

/**
 * Virtual occurrences for a range: the ones an active event WILL produce but
 * that no roster row holds yet (beyond the materialization horizon, ADR-047).
 *
 * Extracted so the roster read and the day summary project from exactly the
 * same code. They have to agree — a card counting 0 for a day the board can
 * still open and list people in is worse than a slow board — and two copies of
 * this loop would drift the first time either was touched.
 */
export async function projectOccurrences(
  svc: ProjectionDeps,
  from: string,
  to: string,
  f: RangeFilters,
  materializedKey: Set<string>,
): Promise<Schedule[]> {
  const { districtId, regionId, locationId, userId, shiftDefinitionId, teamCategoryId } = f;
  // Tombstones and detached overrides for the whole range, in one query rather
  // than one per event inside the loop below.
  const existingKey = await eventOccurrenceKeys(svc, from, to, f);

  // Load active events and expand them beyond the materialized window.
  const events = await svc.eventRepo.find({
    where: activeEventsOverlapping(from, to),
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
    select: EVENT_PROJECTION_SELECT,
  });

  const shiftOccupied = await occupiedShiftKeys(svc, from, to, f);
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
    const eventDistrictForFilter =
      event.scope === 'static'
        ? event.location?.district_id
        : event.scope === 'mobile'
          ? event.region?.district_id
          : event.district_id;
    if (districtId && eventDistrictForFilter !== districtId) continue;
    // "Seluruh Surabaya" is bound to no geography, so it has no id to scope
    // by and asks for the rows that carry none. The materialized query honours
    // this (three IS NULL predicates); without the same gate here every
    // geography-bound event still projected into the city container's fetch —
    // 99 foreign rows out of 100 on the 2026-08-01 clone.
    if (
      f.cityScopeOnly &&
      (event.location_id || event.region_id || event.district_id || eventRegionId)
    ) {
      continue;
    }

    // Expand the event's recurrence into concrete dates
    const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);
    // Constant across this event's users and dates (ADR-053: one place per row).
    const eventPlaceId = schedulePlaceKey(eventPlace(event));

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
    // Never project an occurrence for a deactivated member — the materialized
    // path already excludes them, so projections must match.
    const activeById = new Map<string, boolean>(
      [event.user, ...(event.members?.map((m) => m.user) ?? [])]
        .filter((u): u is NonNullable<typeof u> => !!u)
        .map((u) => [u.id, u.is_active !== false]),
    );
    memberIds = memberIds.filter((id) => activeById.get(id) !== false);

    // Check which (member, date) pairs are already in DB with this event
    if (dates.length > 0) {
      // For each (member, date) NOT already in DB, emit a virtual projected row
      for (const memberId of memberIds) {
        for (const dateStr of dates) {
          const key = `${event.id}:${memberId}:${dateStr}`;
          if (!materializedKey.has(key)) {
            // Also check withDeleted to avoid resurrecting tombstones
            if (existingKey.has(key)) continue;
            // …and never project a (user, date, shift, PLACE) a live row already
            // owns (see `occupiedShiftKeys`) — it could never materialize anyway.
            // Keyed on the place too, so a second occurrence at a DIFFERENT
            // place in the same shift still projects (ADR-053).
            if (
              shiftOccupied.has(
                `${memberId}:${dateStr}:${event.shift_definition_id}:${eventPlaceId}`,
              )
            )
              continue;
            {
              // Filter by district if needed
              const district_id =
                event.scope === 'static'
                  ? event.location?.district_id
                  : event.scope === 'mobile'
                    ? event.region?.district_id
                    : event.district_id;
              if (districtId && district_id !== districtId) continue;

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
              projected.district_id = district_id ?? null;
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

              // Static scope → the occurrence's single lokasi (ADR-053).
              if (event.scope === 'static' && event.location) {
                projected.location_id = event.location_id ?? null;
                projected.location = event.location;
              }

              projectedRows.push(slimProjectedRelations(projected));
            }
          }
        }
      }
    }
  }

  return projectedRows;
}

/**
 * All roster rows for a date range [from, to] inclusive, district-scoped.
 * Relations: user, shift_definition, location, region, team_category.
 *
 * Phase 4 (ADR-047 amended): includes materialized rows + projected rows from
 * active events that expand beyond the materialization horizon. Projected rows
 * are virtual (is_projected=true) and not persisted.
 */
export async function findByDateRangeForUser(
  svc: ProjectionDeps,
  from: string,
  to: string,
  userId: string,
): Promise<Schedule[]> {
  // Fetch materialized rows for this user in the range
  const qb = svc.rosterRepo
    .createQueryBuilder('ds')
    .leftJoinAndSelect('ds.user', 'u')
    .leftJoinAndSelect('ds.shift_definition', 'sd')
    .leftJoinAndSelect('ds.location', 'location')
    // `district` (rayon) is joined alongside `region` so a rayon-scope row
    // carries its boundary — parity with findAllByUserAndDate, and what the
    // client needs to geofence a rayon assignment (QueryBuilder skips eager
    // relations, so this must be explicit).
    .leftJoinAndSelect('ds.district', 'd')
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

  // Tombstones and detached overrides for the whole range, in one query rather
  // than one per event inside the projection loop below.
  const existingKey = await eventOccurrenceKeys(svc, from, to, { userId });

  // Projection: load active events that include this user and expand beyond the materialized window
  const events = await svc.eventRepo.find({
    where: activeEventsOverlapping(from, to),
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
    select: EVENT_PROJECTION_SELECT,
  });

  const shiftOccupied = await occupiedShiftKeys(svc, from, to, { userId });
  const projectedRows: Schedule[] = [];
  for (const event of events) {
    // Expand the event's recurrence into concrete dates
    const dates = ScheduleRecurrenceUtil.expandOccurrenceDates(event, from, to);
    // Constant across this event's users and dates (ADR-053: one place per row).
    const eventPlaceId = schedulePlaceKey(eventPlace(event));

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
      // For each date NOT already in DB, emit a virtual projected row
      for (const dateStr of dates) {
        const key = `${event.id}:${userId}:${dateStr}`;
        if (!materializedKey.has(key)) {
          // Also check withDeleted to avoid resurrecting tombstones
          if (existingKey.has(key)) continue;
          // …and never project a (user, date, shift, PLACE) a live row already
          // owns (see `occupiedShiftKeys`) — it could never materialize anyway.
          // Keyed on the place too, so a second occurrence at a DIFFERENT place
          // in the same shift still projects (ADR-053).
          if (
            shiftOccupied.has(`${userId}:${dateStr}:${event.shift_definition_id}:${eventPlaceId}`)
          )
            continue;
          {
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

            const district_id =
              event.scope === 'static'
                ? event.location?.district_id
                : event.scope === 'mobile'
                  ? event.region?.district_id
                  : event.district_id;
            projected.district_id = district_id ?? null;
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

            // Static scope → the occurrence's single lokasi (ADR-053).
            if (event.scope === 'static' && event.location) {
              projected.location_id = event.location_id ?? null;
              projected.location = event.location;
            }

            projectedRows.push(slimProjectedRelations(projected));
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
