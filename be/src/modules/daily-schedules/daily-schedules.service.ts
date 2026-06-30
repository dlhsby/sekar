import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, IsNull, Repository } from 'typeorm';
import { DailySchedule, DailyScheduleStatus } from './entities/daily-schedule.entity';
import { DailyScheduleArea } from './entities/daily-schedule-area.entity';
import { User } from '../users/entities/user.entity';
import { Area } from '../areas/entities/area.entity';
import { UserAreasService } from '../user-areas/user-areas.service';
import { AuditLogService } from '../audit/audit.service';

/**
 * Daily roster service — materializes each worker's standing template into one
 * editable row per WIB day and exposes the per-day edits ops needs (leave,
 * replacement, extra area, shift) plus read helpers for clock-in and monitoring.
 * See ADR-013 (materialized daily-roster model).
 */
@Injectable()
export class DailySchedulesService {
  private readonly logger = new Logger(DailySchedulesService.name);

  constructor(
    @InjectRepository(DailySchedule)
    private readonly rosterRepo: Repository<DailySchedule>,
    @InjectRepository(DailyScheduleArea)
    private readonly rosterAreaRepo: Repository<DailyScheduleArea>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    private readonly userAreasService: UserAreasService,
    private readonly auditLogService: AuditLogService,
  ) {}

  /**
   * Generate (materialize) the roster for a WIB day from every active user's
   * template. Idempotent: users with an existing live row for the day are
   * skipped, so re-running never duplicates and never overwrites manual edits.
   * Returns the number of rows created.
   */
  async generateRoster(date: string, actorId: string | null): Promise<number> {
    const users = await this.userRepo.find({ where: { is_active: true } });
    const existing = await this.rosterRepo.find({
      where: { schedule_date: date },
      select: ['id', 'user_id'],
    });
    const alreadyRostered = new Set(existing.map((r) => r.user_id));

    // Compute users to create and batch-fetch their permanent areas
    const usersToCreate = users.filter((u) => !alreadyRostered.has(u.id));
    const userAreaMap = await this.userAreasService.getPermanentAreaIdsForUsers(
      usersToCreate.map((u) => u.id),
    );

    let created = 0;
    for (const user of usersToCreate) {
      const areaIds = userAreaMap.get(user.id) ?? [];
      const hasShift = !!user.shift_definition_id;
      const row = this.rosterRepo.create({
        user_id: user.id,
        schedule_date: date,
        rayon_id: user.rayon_id ?? null,
        shift_definition_id: user.shift_definition_id ?? null,
        status: hasShift ? DailyScheduleStatus.PLANNED : DailyScheduleStatus.OFF,
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

  /** All roster rows for a WIB day, optionally scoped to one rayon. */
  async findByDate(date: string, rayonId?: string | null): Promise<DailySchedule[]> {
    const qb = this.rosterRepo
      .createQueryBuilder('ds')
      .leftJoinAndSelect('ds.shift_definition', 'sd')
      .leftJoinAndSelect('ds.daily_schedule_areas', 'dsa')
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
  async findByUserAndDate(userId: string, date: string): Promise<DailySchedule | null> {
    return this.rosterRepo.findOne({
      where: { user_id: userId, schedule_date: date, deleted_at: IsNull() },
      relations: ['shift_definition', 'daily_schedule_areas', 'daily_schedule_areas.area', 'rayon'],
    });
  }

  async findOne(id: string): Promise<DailySchedule> {
    const row = await this.rosterRepo.findOne({
      where: { id },
      relations: ['shift_definition', 'daily_schedule_areas', 'daily_schedule_areas.area'],
    });
    if (!row) throw new NotFoundException(`Daily schedule ${id} not found`);
    return row;
  }

  /** Mark a row as sick / annual leave. */
  async setLeave(
    id: string,
    leaveType: 'sick' | 'annual',
    notes: string | undefined,
    actorId: string,
  ): Promise<DailySchedule> {
    const row = await this.findOne(id);
    const prevStatus = row.status;
    row.status =
      leaveType === 'sick' ? DailyScheduleStatus.LEAVE_SICK : DailyScheduleStatus.LEAVE_ANNUAL;
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
    actorId: string,
  ): Promise<DailySchedule> {
    const original = await this.findOne(id);
    if (replacementUserId === original.user_id) {
      throw new BadRequestException('Replacement must be a different worker');
    }
    const replacement = await this.userRepo.findOne({ where: { id: replacementUserId } });
    if (!replacement) throw new NotFoundException('Replacement worker not found');

    const areaIds = (original.daily_schedule_areas ?? []).map((dsa) => dsa.area_id);

    // Mark the original as replaced.
    const prevStatus = original.status;
    original.status = DailyScheduleStatus.REPLACED;
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
        DailyScheduleStatus.PLANNED,
        DailyScheduleStatus.PRESENT,
        DailyScheduleStatus.LEAVE_SICK,
        DailyScheduleStatus.LEAVE_ANNUAL,
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
    coverRow.status = original.shift_definition_id
      ? DailyScheduleStatus.PLANNED
      : DailyScheduleStatus.OFF;
    coverRow.source = 'manual';
    coverRow.updated_by = actorId;
    const savedCover = await this.rosterRepo.save(coverRow);
    await this.setAreas(savedCover.id, areaIds, actorId);

    await this.audit(
      original,
      'replace_worker',
      actorId,
      { status: prevStatus },
      { status: DailyScheduleStatus.REPLACED, replacement_user_id: replacementUserId },
    );
    return this.findOne(original.id);
  }

  /** Set the day's areas (0..N). */
  async updateAreas(id: string, areaIds: string[], actorId: string): Promise<DailySchedule> {
    const row = await this.findOne(id);
    const before = (row.daily_schedule_areas ?? []).map((dsa) => dsa.area_id);
    await this.setAreas(row.id, areaIds, actorId);
    row.source = 'manual';
    row.updated_by = actorId;
    await this.rosterRepo.save(row);
    await this.audit(row, 'update_areas', actorId, { area_ids: before }, { area_ids: areaIds });
    return this.findOne(id);
  }

  /** Set (or clear) the day's shift. */
  async updateShift(
    id: string,
    shiftDefinitionId: string | null,
    actorId: string,
  ): Promise<DailySchedule> {
    const row = await this.findOne(id);
    const before = row.shift_definition_id;
    row.shift_definition_id = shiftDefinitionId;
    // Re-derive status only for the default planned/off pair; leave/replaced stay.
    if (row.status === DailyScheduleStatus.PLANNED || row.status === DailyScheduleStatus.OFF) {
      row.status = shiftDefinitionId ? DailyScheduleStatus.PLANNED : DailyScheduleStatus.OFF;
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
    return (row?.daily_schedule_areas ?? []).map((dsa) => dsa.area).filter(Boolean);
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
  async getExpectedForDate(date: string): Promise<DailySchedule[]> {
    return this.rosterRepo.find({
      where: {
        schedule_date: date,
        deleted_at: IsNull(),
        status: In([DailyScheduleStatus.PLANNED, DailyScheduleStatus.PRESENT]),
      },
      relations: ['shift_definition'],
    });
  }

  /**
   * All live roster rows for a day (any status), optionally rayon-scoped. The
   * monitoring service derives expected / present / absent / on-leave from this
   * (single query) without a new tracking column. `user` is eager-loaded.
   */
  async getRosterForMonitoring(date: string, rayonId?: string | null): Promise<DailySchedule[]> {
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
    await this.rosterAreaRepo.delete({ daily_schedule_id: rosterId });
    if (!desired.length) return;
    const rows = desired.map((areaId) =>
      this.rosterAreaRepo.create({
        daily_schedule_id: rosterId,
        area_id: areaId,
        assigned_by: actorId,
      }),
    );
    await this.rosterAreaRepo.save(rows);
  }

  private async audit(
    row: DailySchedule,
    action: string,
    actorId: string,
    oldValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
  ): Promise<void> {
    await this.auditLogService
      .log({
        entity_type: 'daily_schedule',
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
