import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { Schedule, ScheduleStatus } from './entities/schedule.entity';
import { ScheduleArea } from './entities/schedule-area.entity';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { UserAreasService } from '../user-areas/user-areas.service';
import { AuditLogService } from '../audit/audit.service';
import {
  canEditTargetRole,
  isGlobalRosterEditor,
  isRayonManagerRole,
  isNonRosteredRole,
} from './schedule-edit.policy';

/**
 * Daily roster service — materializes each worker's standing template into one
 * editable row per WIB day and exposes the per-day edits ops needs (leave,
 * replacement, extra area, shift) plus read helpers for clock-in and monitoring.
 * See ADR-013 (materialized daily-roster model).
 */
@Injectable()
export class SchedulesService {
  private readonly logger = new Logger(SchedulesService.name);

  constructor(
    @InjectRepository(Schedule)
    private readonly rosterRepo: Repository<Schedule>,
    @InjectRepository(ScheduleArea)
    private readonly rosterAreaRepo: Repository<ScheduleArea>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Area)
    private readonly areaRepo: Repository<Area>,
    private readonly userAreasService: UserAreasService,
    private readonly auditLogService: AuditLogService,
  ) {}

  // ---- Edit-permission hierarchy (ADR-013 addendum) ----

  /**
   * Enforce the roster edit hierarchy: the `editor` may only edit a row whose
   * worker role is below theirs (see schedule-edit.policy) AND within their
   * scope — rayon for kepala_rayon/admin_data, assigned areas for korlap.
   * admin_system/superadmin/top_management act globally. Throws otherwise.
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
    const editorAreaIds = await this.userAreasService.getPermanentAreaIds(editor.id);
    const overlap = rowAreas.some((a) => editorAreaIds.includes(a.area_id));
    if (!overlap) throw new ForbiddenException('This worker is outside your assigned areas');
  }

  /**
   * Generate (materialize) the roster for a WIB day from every active user's
   * template. Idempotent: users with an existing live row for the day are
   * skipped, so re-running never duplicates and never overwrites manual edits.
   * Returns the number of rows created.
   */
  async generateRoster(date: string, actorId: string | null): Promise<number> {
    // Top-of-org / oversight roles (top_management, admin_system, superadmin,
    // staff_kecamatan) get no roster row.
    const users = (await this.userRepo.find({ where: { is_active: true } })).filter(
      (u) => !isNonRosteredRole(u.role),
    );
    const existing = await this.rosterRepo.find({
      where: { schedule_date: date },
      select: ['id', 'user_id'],
    });
    const alreadyRostered = new Set(existing.map((r) => r.user_id));
    const usersToCreate = users.filter((u) => !alreadyRostered.has(u.id));

    // Field workers (satgas/linmas/korlap) get their permanent areas; rayon
    // managers (kepala_rayon/admin_data) get a fixed assignment to their WHOLE
    // rayon (all its areas) — editable only up the chain (top_management+).
    const fieldWorkers = usersToCreate.filter((u) => !isRayonManagerRole(u.role));
    const userAreaMap = await this.userAreasService.getPermanentAreaIdsForUsers(
      fieldWorkers.map((u) => u.id),
    );
    const managerRayonIds = [
      ...new Set(
        usersToCreate
          .filter((u) => isRayonManagerRole(u.role))
          .map((u) => u.rayon_id)
          .filter((id): id is string => !!id),
      ),
    ];
    const rayonAreaMap = await this.buildRayonAreaMap(managerRayonIds);

    let created = 0;
    for (const user of usersToCreate) {
      const areaIds = isRayonManagerRole(user.role)
        ? user.rayon_id
          ? (rayonAreaMap.get(user.rayon_id) ?? [])
          : []
        : (userAreaMap.get(user.id) ?? []);
      const hasShift = !!user.shift_definition_id;
      const row = this.rosterRepo.create({
        user_id: user.id,
        schedule_date: date,
        rayon_id: user.rayon_id ?? null,
        shift_definition_id: user.shift_definition_id ?? null,
        status: hasShift ? ScheduleStatus.PLANNED : ScheduleStatus.OFF,
        source: 'template',
        created_by: actorId,
      });
      const saved = await this.rosterRepo.save(row);
      await this.setAreas(saved.id, areaIds, actorId);
      created += 1;
    }

    this.logger.log(
      `Generated ${created} roster rows for ${date} (skipped ${alreadyRostered.size})`,
    );
    return created;
  }

  /** Map each rayon id → the ids of all areas in it (for whole-rayon assignment). */
  private async buildRayonAreaMap(rayonIds: string[]): Promise<Map<string, string[]>> {
    const map = new Map<string, string[]>();
    if (rayonIds.length === 0) return map;
    const areas = await this.areaRepo.find({
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

  /** A single worker's live roster row for a day (with areas/shift), or null. */
  async findByUserAndDate(userId: string, date: string): Promise<Schedule | null> {
    return this.rosterRepo.findOne({
      where: { user_id: userId, schedule_date: date, deleted_at: IsNull() },
      relations: ['shift_definition', 'schedule_areas', 'schedule_areas.area', 'rayon'],
    });
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
    leaveType: 'sick' | 'annual',
    notes: string | undefined,
    actor: User,
  ): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const prevStatus = row.status;
    row.status = leaveType === 'sick' ? ScheduleStatus.LEAVE_SICK : ScheduleStatus.LEAVE_ANNUAL;
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

    const areaIds = (original.schedule_areas ?? []).map((dsa) => dsa.area_id);

    // Mark the original as replaced.
    const prevStatus = original.status;
    original.status = ScheduleStatus.REPLACED;
    original.replacement_user_id = replacementUserId;
    original.notes = notes ?? original.notes;
    original.source = 'manual';
    original.updated_by = actorId;
    await this.rosterRepo.save(original);

    // Upsert the covering worker's row for the same day. If they already have a
    // committed row that day (their own shift or on leave) they can't cover —
    // reject rather than silently overwriting it. An `off`/`replaced` row is
    // free to take over.
    let coverRow = await this.findByUserAndDate(replacementUserId, original.schedule_date);
    if (
      coverRow &&
      [
        ScheduleStatus.PLANNED,
        ScheduleStatus.PRESENT,
        ScheduleStatus.LEAVE_SICK,
        ScheduleStatus.LEAVE_ANNUAL,
      ].includes(coverRow.status)
    ) {
      throw new BadRequestException(
        'Replacement worker already has a schedule or is on leave today',
      );
    }
    if (!coverRow) {
      coverRow = this.rosterRepo.create({
        user_id: replacementUserId,
        schedule_date: original.schedule_date,
        created_by: actorId,
      });
    }
    coverRow.rayon_id = original.rayon_id;
    coverRow.shift_definition_id = original.shift_definition_id;
    coverRow.original_user_id = original.user_id;
    coverRow.status = original.shift_definition_id ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
    coverRow.source = 'manual';
    coverRow.updated_by = actorId;
    const savedCover = await this.rosterRepo.save(coverRow);
    await this.setAreas(savedCover.id, areaIds, actorId);

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
  async updateAreas(id: string, areaIds: string[], actor: User): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const before = (row.schedule_areas ?? []).map((dsa) => dsa.area_id);
    await this.setAreas(row.id, areaIds, actorId);
    row.source = 'manual';
    row.updated_by = actorId;
    await this.rosterRepo.save(row);
    await this.audit(row, 'update_areas', actorId, { area_ids: before }, { area_ids: areaIds });
    return this.findOne(id);
  }

  /** Set (or clear) the day's shift. */
  async updateShift(id: string, shiftDefinitionId: string | null, actor: User): Promise<Schedule> {
    const actorId = actor.id;
    const row = await this.findOne(id);
    await this.assertCanEdit(actor, row);
    const before = row.shift_definition_id;
    row.shift_definition_id = shiftDefinitionId;
    // Re-derive status only for the default planned/off pair; leave/replaced stay.
    if (row.status === ScheduleStatus.PLANNED || row.status === ScheduleStatus.OFF) {
      row.status = shiftDefinitionId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
    }
    row.source = 'manual';
    row.updated_by = actorId;
    const saved = await this.rosterRepo.save(row);
    await this.audit(
      saved,
      'update_shift',
      actorId,
      { shift_definition_id: before },
      { shift_definition_id: shiftDefinitionId },
    );
    return this.findOne(saved.id);
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
    params: { areaId: string; rayonId?: string | null; shiftDefinitionId?: string | null },
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
      row.shift_definition_id = params.shiftDefinitionId;
      if (row.status === ScheduleStatus.PLANNED || row.status === ScheduleStatus.OFF) {
        row.status = params.shiftDefinitionId ? ScheduleStatus.PLANNED : ScheduleStatus.OFF;
      }
      row.source = 'manual';
      row.updated_by = actorId;
      await this.rosterRepo.save(row);
    }
    await this.setAreas(row.id, [params.areaId], actorId);
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
  async getActiveAreasForDay(userId: string, date: string): Promise<Area[]> {
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

  // ---- internals ----

  /** Reconcile a row's area set to exactly `areaIds`. */
  private async setAreas(
    rosterId: string,
    areaIds: string[],
    actorId: string | null,
  ): Promise<void> {
    const desired = [...new Set(areaIds)];
    await this.rosterAreaRepo.delete({ schedule_id: rosterId });
    if (!desired.length) return;
    const rows = desired.map((areaId) =>
      this.rosterAreaRepo.create({
        schedule_id: rosterId,
        area_id: areaId,
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
