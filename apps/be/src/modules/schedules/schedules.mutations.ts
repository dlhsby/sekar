import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { In, IsNull } from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ScheduleEvent } from './entities/schedule-event.entity';
import { User } from '../users/entities/user.entity';
import { BUSY_STATUSES, LEAVE_STATUS_BY_TYPE, schedulePlaceKey } from './schedules.support';
import { canEditTargetRole } from './schedule-edit.policy';

/** What the roster writes need from `SchedulesService`. */
export interface MutationDeps {
  rosterRepo: Repository<Schedule>;
  eventRepo: Repository<ScheduleEvent>;
  userRepo: Repository<User>;
  assertCanEdit(editor: User, row: Schedule): Promise<void>;
  audit(
    row: Schedule,
    action: string,
    actorId: string,
    before: Record<string, unknown>,
    after: Record<string, unknown>,
  ): Promise<void>;
  findOne(id: string): Promise<Schedule>;
  findByUserAndDate(userId: string, date: string): Promise<Schedule | null>;
  findAllByUserAndDate(userId: string, date: string): Promise<Schedule[]>;
  setPlace(rosterId: string, locationId: string | null): Promise<void>;
}

/**
 * Roster writes: leave, replacement, re-placing, re-shifting, per-day override
 * and delete (including the tombstone a PROJECTED occurrence needs, since it has
 * no row to remove). Split out of `schedules.service.ts`.
 */
/** Mark a row as sick / annual leave. */
export async function setLeave(
  svc: MutationDeps,
  id: string,
  leaveType: 'sick' | 'annual' | 'permit' | 'off',
  notes: string | undefined,
  actor: User,
): Promise<Schedule> {
  const actorId = actor.id;
  const row = await svc.findOne(id);
  await svc.assertCanEdit(actor, row);
  const prevStatus = row.status;
  row.status = LEAVE_STATUS_BY_TYPE[leaveType];
  row.notes = notes ?? null;
  row.source = 'manual';
  row.updated_by = actorId;
  const saved = await svc.rosterRepo.save(row);
  await svc.audit(
    saved,
    'set_leave',
    actorId,
    { status: prevStatus },
    { status: saved.status, notes: saved.notes },
  );
  return svc.findOne(saved.id);
}

/**
 * Replace the rostered worker for the day. The original row is marked
 * `replaced`; the covering worker's row for the same day is upserted to take
 * over the original's district/shift/areas, with `original_user_id` set.
 */
export async function replaceWorker(
  svc: MutationDeps,
  id: string,
  replacementUserId: string,
  notes: string | undefined,
  actor: User,
): Promise<Schedule> {
  const actorId = actor.id;
  const original = await svc.findOne(id);
  await svc.assertCanEdit(actor, original);
  if (replacementUserId === original.user_id) {
    throw new BadRequestException('Replacement must be a different worker');
  }
  const replacement = await svc.userRepo.findOne({ where: { id: replacementUserId } });
  if (!replacement) throw new NotFoundException('Replacement worker not found');
  // The stand-in must also be someone the editor is allowed to schedule.
  if (!canEditTargetRole(actor.role, replacement.role)) {
    throw new ForbiddenException('You cannot assign this replacement worker');
  }

  const locationIds = original.location_id ? [original.location_id] : [];

  // Mark the original as replaced.
  const prevStatus = original.status;
  original.status = ScheduleStatus.REPLACED;
  original.replacement_user_id = replacementUserId;
  original.notes = notes ?? original.notes;
  original.source = 'manual';
  original.updated_by = actorId;
  await svc.rosterRepo.save(original);

  // Upsert the covering worker's row for the same day. If they already have
  // ANY committed row that day (their own shift — even a different one — or
  // leave) they can't cover; reject rather than silently overwriting.
  // `off`/`replaced` rows are free to take over. Checks every row of the day
  // since a worker may hold multiple shifts (ADR-047).
  const coverRows = await svc.findAllByUserAndDate(replacementUserId, original.schedule_date);
  const busyRow = coverRows.find((r) => BUSY_STATUSES.includes(r.status));
  if (busyRow) {
    throw new BadRequestException('Replacement worker already has a schedule or is on leave today');
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
    const saved = await svc.rosterRepo.save(
      svc.rosterRepo.create({
        user_id: replacementUserId,
        schedule_date: original.schedule_date,
        district_id: original.district_id,
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
    // explicitly loads `shift_definition`/`district`/`location`, so
    // `coverRow` holds stale relation objects; saving the entity would let
    // TypeORM reconcile those FKs from the stale objects and revert them.
    coverRowId = coverRow.id;
    await svc.rosterRepo.update(coverRowId, {
      district_id: original.district_id,
      shift_definition_id: original.shift_definition_id,
      original_user_id: original.user_id,
      status: coverStatus,
      source: 'manual',
      updated_by: actorId,
    });
  }
  await svc.setPlace(coverRowId, locationIds[0] ?? null);

  await svc.audit(
    original,
    'replace_worker',
    actorId,
    { status: prevStatus },
    { status: ScheduleStatus.REPLACED, replacement_user_id: replacementUserId },
  );
  return svc.findOne(original.id);
}

/**
 * Set the day's PLACE — at most one lokasi, or one kawasan, plus the parent
 * rayon.
 *
 * ADR-053: one row = one worker, one shift, one place. A worker covering three
 * taman holds three occurrences, not one occurrence naming three lokasi.
 * `area_ids` stays an array for wire compatibility, but more than one id is now
 * a contradiction rather than something to silently truncate — it used to keep
 * `[0]` and drop the rest with a 200, so an operator's second and third picks
 * vanished without a word and the audit trail recorded ids the row never had.
 *
 * `district_id`/`region_id` omitted (undefined) leave those columns untouched;
 * passing null clears them.
 */
export async function updateAreas(
  svc: MutationDeps,
  id: string,
  locationIds: string[],
  actor: User,
  districtId?: string | null,
  regionId?: string | null,
): Promise<Schedule> {
  const actorId = actor.id;
  const row = await svc.findOne(id);
  await svc.assertCanEdit(actor, row);

  if (locationIds.length > 1) {
    throw new BadRequestException(
      'A schedule row covers exactly one place (ADR-053). Create one row per lokasi instead of listing several.',
    );
  }

  // A lokasi and a kawasan on the same row name two different places, and only
  // the deeper one would ever be honoured: `schedulePlaceKey` (and the
  // `UQ_schedules_user_date_shift_place` index behind it) resolves lokasi first,
  // so the kawasan would linger as unreachable state that still matched the
  // board's `region_id` filter — the row would show up under both containers.
  const nextLocationId = locationIds[0] ?? null;
  const nextRegionId = regionId !== undefined ? regionId : (row.region_id ?? null);
  if (nextLocationId && nextRegionId) {
    throw new BadRequestException(
      'A schedule row is scoped to a lokasi OR a kawasan, not both (ADR-053).',
    );
  }

  const before = row.location_id ? [row.location_id] : [];
  // ONE raw column UPDATE, not `save(row)` — `row` holds relation objects loaded
  // by `findOne()` above, and entity save would reconcile FK columns back from
  // those stale objects, silently reverting what was just written.
  await svc.rosterRepo.update(id, {
    location_id: nextLocationId,
    ...(districtId !== undefined ? { district_id: districtId } : {}),
    ...(regionId !== undefined ? { region_id: regionId } : {}),
    source: 'manual',
    updated_by: actorId,
  });
  await svc.audit(row, 'update_areas', actorId, { area_ids: before }, { area_ids: locationIds });
  return svc.findOne(id);
}

/** Set (or clear) the day's shift. */
export async function updateShift(
  svc: MutationDeps,
  id: string,
  shiftDefinitionId: string | null,
  actor: User,
): Promise<Schedule> {
  const actorId = actor.id;
  const row = await svc.findOne(id);
  await svc.assertCanEdit(actor, row);
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
  await svc.rosterRepo.update(id, {
    shift_definition_id: shiftDefinitionId,
    status,
    source: 'manual',
    updated_by: actorId,
  });
  await svc.audit(
    row,
    'update_shift',
    actorId,
    { shift_definition_id: before },
    { shift_definition_id: shiftDefinitionId },
  );
  return svc.findOne(id);
}

/**
 * Override today's roster for a worker (used by monitoring reassign): ensure a
 * row exists for the day, set its single area to `areaId`, and optionally its
 * district/shift. Replaces the legacy range-based `schedules` override layer.
 * Returns the affected roster row id.
 */
export async function overrideForDay(
  svc: MutationDeps,
  userId: string,
  date: string,
  params: { locationId: string; districtId?: string | null; shiftDefinitionId?: string | null },
  actorId: string,
): Promise<string> {
  // NOTE: monitoring-reassign is authorized by its own guard; this path
  // deliberately uses the internal primitives (not the hierarchy-gated
  // updateShift/updateAreas) so the roster edit-hierarchy isn't applied here.
  let row = await svc.findByUserAndDate(userId, date);
  if (!row) {
    const shiftId = params.shiftDefinitionId ?? null;
    row = await svc.rosterRepo.save(
      svc.rosterRepo.create({
        user_id: userId,
        schedule_date: date,
        district_id: params.districtId ?? null,
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
    await svc.rosterRepo.update(row.id, {
      shift_definition_id: params.shiftDefinitionId,
      status,
      source: 'manual',
      updated_by: actorId,
    });
  }
  await svc.setPlace(row.id, params.locationId);
  return row.id;
}

/** Soft-delete a roster row (admin). */
export async function remove(svc: MutationDeps, id: string, actorId: string): Promise<void> {
  // A PROJECTED occurrence has no row to delete — its id is
  // `projected:<eventId>:<userId>:<date>`. "Hanya hari ini" on one used to hit
  // `DELETE /schedules/projected:…` and fail, so the chip could not be removed
  // at all. Write the tombstone the materializer already understands (a
  // soft-deleted row for that event/user/date) so the day is skipped forever
  // without touching the rest of the recurrence.
  if (id.startsWith('projected:')) {
    return tombstoneProjected(svc, id, actorId);
  }
  const row = await svc.findOne(id);
  row.deleted_by = actorId;
  await svc.rosterRepo.save(row);
  await svc.rosterRepo.softDelete(id);
}

/**
 * Materialize a tombstone for a single projected occurrence, so that day is
 * dropped from the recurrence while every other date keeps projecting.
 * The unique index on (user, date, shift) is partial (`WHERE deleted_at IS
 * NULL`), so a tombstone never collides with a live row.
 */
export async function tombstoneProjected(
  svc: MutationDeps,
  id: string,
  actorId: string,
): Promise<void> {
  const [, eventId, userId, date] = id.split(':');
  if (!eventId || !userId || !date) {
    throw new BadRequestException('Malformed projected occurrence id');
  }
  const event = await svc.eventRepo.findOne({ where: { id: eventId } });
  if (!event) throw new NotFoundException('Schedule event not found');

  const existing = await svc.rosterRepo.findOne({
    where: { schedule_event_id: eventId, user_id: userId, schedule_date: date },
    withDeleted: true,
  });
  if (existing) {
    // Already materialized (or already tombstoned) — fall back to the normal path.
    if (!existing.deleted_at) await remove(svc, existing.id, actorId);
    return;
  }

  const row = await svc.rosterRepo.save(
    svc.rosterRepo.create({
      user_id: userId,
      schedule_date: date,
      shift_definition_id: event.shift_definition_id,
      district_id: event.district_id ?? null,
      region_id: event.scope === 'mobile' ? (event.region_id ?? null) : null,
      team_category_id: event.is_team ? (event.team_category_id ?? null) : null,
      status: ScheduleStatus.PLANNED,
      source: 'event',
      schedule_event_id: eventId,
      created_by: actorId,
      deleted_by: actorId,
    }),
  );
  await svc.rosterRepo.softDelete(row.id);
}
