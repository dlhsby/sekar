import { Injectable, Logger, BadRequestException, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, EntityManager } from 'typeorm';
import { PruningRequest, PruningRequestStatus } from '../entities/pruning-request.entity';
import { AssignPruningRequestDto } from '../dto/assign-pruning-request.dto';
import { ReschedulePruningRequestDto } from '../dto/reschedule-pruning-request.dto';
import { User } from '../../users/entities/user.entity';
import { Task, TaskStatus } from '../../tasks/entities/task.entity';
import { TaskDelegation } from '../../tasks/entities/task-delegation.entity';
import { UsersService } from '../../users/users.service';
import { ServiceCapacityService } from '../../service-capacity/service-capacity.service';
import { getIsoWeek, isoWeekDays } from '../utils/iso-week.util';
import { TimezoneUtil } from '../../../common/utils/timezone.util';
import { PruningRequestFinderService } from './pruning-request-finder.service';
import { PruningRequestNotificationsService } from './pruning-request-notifications.service';
import { assertAdminDataRayonScope } from '../pruning-request.policies';

interface ResolvedSchedule {
  /** Admin-confirmed concrete day; null when the day is auto-picked from the week. */
  scheduledDate: Date | null;
  year: number;
  isoWeek: number;
}

/**
 * May 10, 2026 — reschedule whitelist. `in_progress` joined on user request:
 * bumping `task.deadline` while `task.started_at` is set is safe (petugas
 * keeps the same shift/activity records, just a new finish-by target).
 * `done`, `rejected`, `cancelled` stay blocked: in-flight-terminal work is
 * the task's lifecycle to manage, not the parent permohonan's.
 */
const RESCHEDULABLE_STATUSES: PruningRequestStatus[] = [
  'submitted',
  'under_review',
  'approved',
  'assigned',
  'in_progress',
];

/**
 * Heavy transactional flows of the pruning-request lifecycle: conversion to
 * a task (capacity booking + task creation + delegation hop) and reschedule
 * (capacity rebooking + task-deadline cascade).
 *
 * NOTE on saves: inside transactions, entities are mutated and saved as
 * instances — `EntityManager.save` needs the entity class, which a spread
 * copy would lose. Non-transactional paths use immutable spreads.
 */
@Injectable()
export class PruningRequestWorkflowService {
  private readonly logger = new Logger(PruningRequestWorkflowService.name);

  constructor(
    @InjectRepository(PruningRequest)
    private readonly pruningRequestRepository: Repository<PruningRequest>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly serviceCapacityService: ServiceCapacityService,
    private readonly usersService: UsersService,
    private readonly finder: PruningRequestFinderService,
    private readonly notifications: PruningRequestNotificationsService,
  ) {}

  /**
   * Convert an approved pruning request to a task.
   *
   * Only 'approved' requests can be converted; if already converted, returns
   * the existing task (idempotent). Atomically books capacity, creates the
   * pre-assigned task, records the ADR-038 delegation hop and links the
   * request.
   */
  async assignToTask(
    id: string,
    dto: AssignPruningRequestDto,
    user: User,
  ): Promise<{ request: PruningRequest; task: Task }> {
    this.logger.log(`Converting pruning request ${id} to task by user ${user.id}`);
    const request = await this.finder.getOrFail(id);
    assertAdminDataRayonScope(request, user, 'convert');

    const existing = await this.findExistingConversion(request);
    if (existing) return existing;
    this.assertConvertible(request);

    const schedule = this.resolveSchedule(request, dto);
    if (!request.rayonId) {
      throw new ConflictException('Pruning request has no rayon assigned');
    }
    return this.convertInTransaction(request, dto, user, schedule);
  }

  /**
   * Reschedule the scheduled date of a pruning request.
   *
   * Pre-conversion requests just move the date. Once a task exists
   * (`assigned` / `in_progress`), the full cascade runs in a transaction:
   * capacity rebooks if the ISO week changed, the task deadline bumps, a
   * delegation audit row records the move, and assignee + submitter get a
   * push.
   */
  async reschedule(
    id: string,
    dto: ReschedulePruningRequestDto,
    user: User,
  ): Promise<PruningRequest> {
    this.logger.log(`Rescheduling pruning request ${id} to ${dto.expectedDate} by user ${user.id}`);
    const request = await this.finder.getOrFail(id);
    assertAdminDataRayonScope(request, user, 'reschedule');
    this.assertReschedulable(request);

    const newDate = this.parseFutureDate(dto.expectedDate);
    const task = await this.loadLinkedTask(request);
    if (!task) return this.saveDateOnly(request, newDate);
    return this.rescheduleWithCascade(request, task, newDate, user);
  }

  // ── assign-to-task internals ────────────────────────────────────────────

  /** Idempotency: if the request already has a live task, return it untouched. */
  private async findExistingConversion(
    request: PruningRequest,
  ): Promise<{ request: PruningRequest; task: Task } | null> {
    if (!request.assignedTaskId) return null;
    const task = await this.taskRepository.findOne({ where: { id: request.assignedTaskId } });
    if (!task) return null;
    this.logger.log(
      `Pruning request ${request.id} already converted to task ${request.assignedTaskId}`,
    );
    return { request, task };
  }

  private assertConvertible(request: PruningRequest): void {
    if (request.status === 'approved') return;
    throw new ConflictException(
      `Pruning request status is ${request.status}, only approved requests can be converted`,
    );
  }

  /**
   * Resolve the concrete day + (year, isoWeek) for the booking.
   *
   * ADR-035 amendment 2026-05-01:
   *   - Admin can pass `scheduledDate` and we honour it (logging when it
   *     falls outside the submitter's preferred ISO week — admin discretion).
   *   - Otherwise, with (expectedYear, expectedIsoWeek) on the request, the
   *     first future day of that week with capacity is auto-picked.
   *   - Neither → clear 400 so the admin UI can prompt.
   */
  private resolveSchedule(request: PruningRequest, dto: AssignPruningRequestDto): ResolvedSchedule {
    if (dto.scheduledDate) return this.scheduleFromAdminDate(request, dto.scheduledDate);
    if (request.expectedYear != null && request.expectedIsoWeek != null) {
      return { scheduledDate: null, year: request.expectedYear, isoWeek: request.expectedIsoWeek };
    }
    throw new BadRequestException(
      'Either scheduledDate or a preferred week (expected_year + expected_iso_week) must be present',
    );
  }

  private scheduleFromAdminDate(request: PruningRequest, scheduledDate: string): ResolvedSchedule {
    const date = new Date(scheduledDate);
    const { year, isoWeek } = getIsoWeek(date);
    this.warnIfOutsidePreferredWeek(request, year, isoWeek);
    return { scheduledDate: date, year, isoWeek };
  }

  private warnIfOutsidePreferredWeek(request: PruningRequest, year: number, isoWeek: number): void {
    if (request.expectedYear == null || request.expectedIsoWeek == null) return;
    if (year === request.expectedYear && isoWeek === request.expectedIsoWeek) return;
    this.logger.warn(
      `Convert override: admin chose date in week ${year}-W${isoWeek}, request preferred ${request.expectedYear}-W${request.expectedIsoWeek}`,
    );
  }

  /** Atomic: book capacity + create task + delegation hop + link request. */
  private convertInTransaction(
    request: PruningRequest,
    dto: AssignPruningRequestDto,
    user: User,
    schedule: ResolvedSchedule,
  ): Promise<{ request: PruningRequest; task: Task }> {
    const units = dto.units ?? 1;
    return this.dataSource.transaction(async (tm) => {
      const scheduledDate = await this.bookCapacity(request.rayonId!, schedule, units);
      const savedTask = await this.createAssignedTask(tm, request, dto, user, scheduledDate);
      await this.recordDelegationHop(tm, savedTask.id, user, dto.assignedTo, null);
      const updatedRequest = await this.linkRequestToTask(
        tm,
        request,
        savedTask.id,
        scheduledDate,
        schedule,
      );
      this.logger.log(
        `Pruning request ${request.id} converted to task ${savedTask.id} on ${scheduledDate.toISOString().slice(0, 10)} (W${schedule.isoWeek}/${schedule.year})`,
      );
      // Best-effort push; failure must not roll back the transaction.
      this.notifications.notifyAssignee(
        dto.assignedTo,
        `Tugas baru: ${savedTask.title}`,
        'Anda mendapat penugasan pemangkasan dari kecamatan. Buka aplikasi untuk melihat detail.',
        { task_id: savedTask.id, source: 'pruning_request' },
        'assign-to-task',
      );
      return { request: updatedRequest, task: savedTask };
    });
  }

  private async bookCapacity(
    rayonId: string,
    schedule: ResolvedSchedule,
    units: number,
  ): Promise<Date> {
    if (schedule.scheduledDate) {
      await this.bookWeek(rayonId, schedule, units, 'Capacity booking failed: ');
      return schedule.scheduledDate;
    }
    return this.bookFirstAvailableDay(rayonId, schedule, units);
  }

  private async bookWeek(
    rayonId: string,
    schedule: Pick<ResolvedSchedule, 'year' | 'isoWeek'>,
    units: number,
    conflictPrefix: string,
  ): Promise<void> {
    try {
      await this.serviceCapacityService.bookAtomic({
        rayonId,
        year: schedule.year,
        isoWeek: schedule.isoWeek,
        serviceType: 'pruning',
        units,
      });
    } catch (error) {
      if (error instanceof ConflictException) {
        throw new ConflictException(conflictPrefix + error.message);
      }
      throw error;
    }
  }

  /**
   * Auto-pick path: capacity is week-aggregated, so one booking covers the
   * whole week and the first future day of the preferred week is the
   * scheduled day (a 409 means the entire week is full).
   */
  private async bookFirstAvailableDay(
    rayonId: string,
    schedule: Pick<ResolvedSchedule, 'year' | 'isoWeek'>,
    units: number,
  ): Promise<Date> {
    const today = TimezoneUtil.jakartaStartOfToday();
    const candidates = isoWeekDays(schedule.year, schedule.isoWeek).filter((d) => d >= today);
    if (candidates.length === 0) {
      throw new ConflictException(
        'Preferred week has no future days remaining; ask the submitter to reschedule',
      );
    }
    await this.bookWeek(
      rayonId,
      schedule,
      units,
      'Capacity booking failed for the preferred week: ',
    );
    return candidates[0];
  }

  /**
   * Create the task pre-assigned (`assigned` + `assigned_at`) so the satgas
   * can accept/start/complete. May 11, 2026: `area_id` is optional (pruning
   * often happens in neighborhoods / private yards); `rayon_id` is stamped
   * from the request so monitoring + rayon-scoped queries keep working.
   */
  private createAssignedTask(
    tm: EntityManager,
    request: PruningRequest,
    dto: AssignPruningRequestDto,
    user: User,
    scheduledDate: Date,
  ): Promise<Task> {
    const task = tm.create(Task, {
      title: `Permintaan Perantingan ${request.referenceCode}`,
      description: this.buildTaskDescription(request),
      area_id: dto.areaId ?? null,
      rayon_id: request.rayonId ?? null,
      assigned_to: dto.assignedTo,
      deadline: scheduledDate,
      created_by: user.id,
      status: TaskStatus.ASSIGNED,
      assigned_at: new Date(),
    });
    return tm.save(task);
  }

  /**
   * May 12, 2026 — rendered in Bahasa Indonesia since this surfaces verbatim
   * on the satgas's Detail Tugas screen; the kecamatan + address pair tells
   * the satgas where to go before opening the linked permohonan.
   */
  private buildTaskDescription(request: PruningRequest): string {
    if (!request.kecamatanName) return `Permintaan Perantingan : ${request.address}`;
    return `Permintaan Perantingan dari Kecamatan ${request.kecamatanName} : ${request.address}`;
  }

  /**
   * ADR-038: record the hop in the delegation chain so the audit trail and
   * mobile "Riwayat Penugasan" card cover request-driven tasks too. Roles
   * are snapshotted at the time of the hop.
   */
  private async recordDelegationHop(
    tm: EntityManager,
    taskId: string,
    user: User,
    assignedTo: string,
    reason: string | null,
  ): Promise<void> {
    const assignee = await this.usersService.findOne(assignedTo);
    await tm.save(TaskDelegation, {
      task_id: taskId,
      from_user_id: user.id,
      from_role: user.role,
      to_user_id: assignedTo,
      to_role: assignee.role,
      reason,
    });
  }

  /**
   * Walk the request to `assigned`, set the admin-confirmed date
   * (`scheduled_date`, NOT the legacy `expected_date` — see the
   * 17460008000000 migration), link the task, and backfill the week pair if
   * it was missing (legacy admin-direct path).
   */
  private linkRequestToTask(
    tm: EntityManager,
    request: PruningRequest,
    taskId: string,
    scheduledDate: Date,
    schedule: ResolvedSchedule,
  ): Promise<PruningRequest> {
    request.status = 'assigned';
    request.assignedTaskId = taskId;
    request.scheduledDate = scheduledDate;
    if (request.expectedYear == null) request.expectedYear = schedule.year;
    if (request.expectedIsoWeek == null) request.expectedIsoWeek = schedule.isoWeek;
    return tm.save(request);
  }

  // ── reschedule internals ────────────────────────────────────────────────

  private assertReschedulable(request: PruningRequest): void {
    if (RESCHEDULABLE_STATUSES.includes(request.status)) return;
    throw new ConflictException(
      `Pruning request status is ${request.status}, cannot reschedule once ${request.status}`,
    );
  }

  private parseFutureDate(dateString: string): Date {
    const newDate = new Date(dateString);
    if (newDate < TimezoneUtil.jakartaStartOfToday()) {
      throw new BadRequestException('expectedDate must be today or in the future');
    }
    return newDate;
  }

  /**
   * The cascade fires whenever a live task exists. `assignedTaskId` is set
   * the moment assign-to-task creates the task, so it's a more reliable
   * predicate than status alone. A dangling FK falls back to the
   * non-cascading update (admin isn't blocked) but logs loudly.
   */
  private async loadLinkedTask(request: PruningRequest): Promise<Task | null> {
    const hasLinkedTask =
      ['assigned', 'in_progress'].includes(request.status) && request.assignedTaskId != null;
    if (!hasLinkedTask) return null;
    const task = await this.taskRepository.findOne({ where: { id: request.assignedTaskId! } });
    if (!task) {
      this.logger.error(
        `Reschedule cascade: linked task ${request.assignedTaskId} not found for request ${request.id}`,
      );
    }
    return task;
  }

  /** Pre-conversion path: just move the date; capacity is consumed at convert time. */
  private saveDateOnly(request: PruningRequest, newDate: Date): Promise<PruningRequest> {
    return this.pruningRequestRepository.save({ ...request, scheduledDate: newDate });
  }

  /**
   * Assigned path — commit all of {capacity rebook, task.deadline,
   * request.scheduledDate, delegation audit row} or none. Capacity is
   * week-aggregated; only touched when the ISO week changes.
   */
  private rescheduleWithCascade(
    request: PruningRequest,
    task: Task,
    newDate: Date,
    user: User,
  ): Promise<PruningRequest> {
    const oldIso = request.scheduledDate != null ? getIsoWeek(request.scheduledDate) : null;
    const newIso = getIsoWeek(newDate);
    const weekChanged =
      oldIso == null || oldIso.year !== newIso.year || oldIso.isoWeek !== newIso.isoWeek;

    return this.dataSource.transaction(async (tm) => {
      if (weekChanged && request.rayonId) {
        await this.rebookCapacity(request.rayonId, oldIso, newIso);
      }
      task.deadline = newDate;
      await tm.save(task);
      request.scheduledDate = newDate;
      const savedRequest = await tm.save(request);
      await this.auditRescheduleHop(tm, task, user, newDate);
      this.logger.log(
        `Pruning request ${request.id} rescheduled to ${newDate.toISOString().slice(0, 10)} (W${newIso.isoWeek}/${newIso.year}); task ${task.id} deadline updated`,
      );
      this.sendReschedulePushes(savedRequest, task, newDate);
      return savedRequest;
    });
  }

  /**
   * Order matters — book the new week first; if it's full we abort BEFORE
   * touching the old week's ledger, so the original booking stays intact.
   */
  private async rebookCapacity(
    rayonId: string,
    oldIso: { year: number; isoWeek: number } | null,
    newIso: { year: number; isoWeek: number },
  ): Promise<void> {
    const units = 1;
    await this.bookWeek(rayonId, newIso, units, 'Capacity penuh untuk minggu yang dipilih: ');
    await this.releaseOldWeek(rayonId, oldIso, units);
  }

  /**
   * Best effort — if release fails (e.g. capacity row was deleted), log but
   * don't reverse the new booking; the old row is stale once we've moved on.
   */
  private async releaseOldWeek(
    rayonId: string,
    oldIso: { year: number; isoWeek: number } | null,
    units: number,
  ): Promise<void> {
    if (!oldIso) return;
    try {
      await this.serviceCapacityService.releaseAtomic({
        rayonId,
        year: oldIso.year,
        isoWeek: oldIso.isoWeek,
        serviceType: 'pruning',
        units,
      });
    } catch (err) {
      this.logger.warn(
        `Reschedule cascade: failed to release old capacity ${oldIso.year}-W${oldIso.isoWeek}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Audit hop — surfaces the reschedule on the mobile "Riwayat Penugasan"
   * card. Same actor on both sides; `reason` carries the schedule note.
   */
  private async auditRescheduleHop(
    tm: EntityManager,
    task: Task,
    user: User,
    newDate: Date,
  ): Promise<void> {
    if (!task.assigned_to) return;
    await this.recordDelegationHop(
      tm,
      task.id,
      user,
      task.assigned_to,
      `Jadwal diubah ke ${newDate.toISOString().slice(0, 10)}`,
    );
  }

  /**
   * May 13 — notify both the assignee (so they can plan) AND the submitter
   * (previously only the assignee got the push, leaving the warga to find
   * out by polling MyRequestsScreen). Best-effort, post-commit.
   */
  private sendReschedulePushes(savedRequest: PruningRequest, task: Task, newDate: Date): void {
    const newDateStr = newDate.toISOString().slice(0, 10);
    if (task.assigned_to) {
      this.notifications.notifyAssignee(
        task.assigned_to,
        'Jadwal tugas diubah',
        `Tugas "${task.title}" dijadwalkan ulang ke ${newDateStr}.`,
        { task_id: task.id, source: 'pruning_request_reschedule' },
        'reschedule',
      );
    }
    void this.notifications.notifySubmitter(
      savedRequest,
      'Jadwal Permohonan Diubah',
      `Permohonan ${savedRequest.referenceCode} dijadwalkan ulang ke ${newDateStr}.`,
    );
  }
}
