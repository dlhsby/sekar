import {
  Injectable,
  Logger,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PruningRequest, PruningRequestStatus } from './entities/pruning-request.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';
import { ReviewPruningRequestDto } from './dto/review-pruning-request.dto';
import { AssignPruningRequestDto } from './dto/assign-pruning-request.dto';
import { ReschedulePruningRequestDto } from './dto/reschedule-pruning-request.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Task, TaskStatus } from '../tasks/entities/task.entity';
import { TaskDelegation } from '../tasks/entities/task-delegation.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { UsersService } from '../users/users.service';
import { ServiceCapacityService } from '../service-capacity/service-capacity.service';
import { getIsoWeek, isoWeekDays, isoWeekEnd } from './utils/iso-week.util';

/**
 * Service for managing pruning requests.
 *
 * Handles submission by `staff_kecamatan` users, review/approval/rejection by admins,
 * conversion to tasks, and retrieval with proper authorization.
 */
@Injectable()
export class PruningRequestsService {
  private readonly logger = new Logger(PruningRequestsService.name);

  constructor(
    @InjectRepository(PruningRequest)
    private readonly pruningRequestRepository: Repository<PruningRequest>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly dataSource: DataSource,
    private readonly serviceCapacityService: ServiceCapacityService,
    private readonly notificationsService: NotificationsService,
    private readonly usersService: UsersService,
  ) {}

  /**
   * Notify every admin_data + kepala_rayon in `rayonId` about a state change
   * on `request`. Best-effort; per-user push failures are logged but never
   * abort the calling business operation. Used on submit, cancel — anywhere
   * the kecamatan-side surface changes and admins need a heads-up without
   * having to poll the review queue.
   */
  private async notifyRayonAdmins(
    rayonId: string | null,
    title: string,
    body: string,
    request: PruningRequest,
  ): Promise<void> {
    if (!rayonId) {
      this.logger.warn(
        `Skipping rayon-admin notification for request ${request.id} — no rayon_id`,
      );
      return;
    }
    try {
      const admins = await this.userRepository.find({
        where: [
          { rayon_id: rayonId, role: UserRole.ADMIN_DATA, is_active: true },
          { rayon_id: rayonId, role: UserRole.KEPALA_RAYON, is_active: true },
        ],
        select: ['id'],
      });
      if (admins.length === 0) {
        this.logger.warn(
          `No active admin_data/kepala_rayon found for rayon ${rayonId} (request ${request.referenceCode})`,
        );
        return;
      }
      await Promise.all(
        admins.map((admin) =>
          this.notificationsService
            .sendToUser({
              user_id: admin.id,
              type: NotificationType.TASK_UPDATED,
              title,
              body,
              data: { pruning_request_id: request.id, reference_code: request.referenceCode },
            })
            .catch((err) =>
              this.logger.warn(
                `notifyRayonAdmins push failed (admin ${admin.id}, request ${request.id}): ${err.message}`,
              ),
            ),
        ),
      );
    } catch (err) {
      this.logger.error(
        `notifyRayonAdmins lookup failed for rayon ${rayonId}: ${(err as Error).message}`,
      );
    }
  }

  /**
   * Notify the request submitter about a state change. Mirrors the helper
   * above for the kecamatan side of the loop.
   */
  private async notifySubmitter(
    request: PruningRequest,
    title: string,
    body: string,
  ): Promise<void> {
    if (!request.submittedBy) return;
    this.notificationsService
      .sendToUser({
        user_id: request.submittedBy,
        type: NotificationType.TASK_UPDATED,
        title,
        body,
        data: { pruning_request_id: request.id, reference_code: request.referenceCode },
      })
      .catch((err) =>
        this.logger.warn(
          `notifySubmitter push failed (submitter ${request.submittedBy}, request ${request.id}): ${err.message}`,
        ),
      );
  }

  /**
   * Submit a new pruning request.
   *
   * Sets status to 'submitted', captures submitter info, GPS, and photo keys.
   * Generates a unique reference code.
   *
   * @param dto - Pruning request creation data
   * @param user - Authenticated user submitting the request (should be staff_kecamatan)
   * @returns The created pruning request
   */
  async create(
    dto: CreatePruningRequestDto,
    user: User,
  ): Promise<PruningRequest> {
    this.logger.log(`Creating pruning request from user ${user.id}`);

    // ADR-035 amendment 2026-05-01: kecamatan picks an ISO week, not a day.
    // Three valid input shapes (in priority order):
    //   1. (expected_year, expected_iso_week)  — new mobile builds
    //   2. detail_date alone                   — legacy mobile builds (one-release deprecation)
    //   3. neither                             — admin will set the week later
    //
    // We always normalize to (expectedYear, expectedIsoWeek) when possible.
    // `expectedDate` (concrete day) stays NULL on submit; it's set at
    // assign-to-task time (admin override or auto-pick first available day).
    let expectedYear: number | null = null;
    let expectedIsoWeek: number | null = null;
    let detailDate: Date | null = null;

    if (dto.expected_year != null && dto.expected_iso_week != null) {
      expectedYear = dto.expected_year;
      expectedIsoWeek = dto.expected_iso_week;
      // Reject weeks that have already fully ended (Sun is past).
      const weekEnd = isoWeekEnd(expectedYear, expectedIsoWeek);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (weekEnd < today) {
        throw new BadRequestException(
          'Preferred week has already passed',
        );
      }
    } else if (dto.detail_date) {
      detailDate = new Date(dto.detail_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (detailDate < today) {
        throw new BadRequestException(
          'Detail date must be today or in the future',
        );
      }
      // Derive the ISO week from the legacy single-day input so the new
      // (expectedYear, expectedIsoWeek) columns are always populated when the
      // submitter expressed any timing preference.
      const iso = getIsoWeek(detailDate);
      expectedYear = iso.year;
      expectedIsoWeek = iso.isoWeek;
    }

    // Generate unique reference code (timestamp-based for readability)
    const referenceCode = `PR-${Date.now()}-${uuidv4().slice(0, 8)}`;

    // Phase 3 Apr 27 — auto-derive kecamatan_name + rayon_id from the user's
    // profile. Each staff_kecamatan user has both attributes set at seed time,
    // so the mobile client doesn't need to send them. Fall back to
    // user.full_name if kecamatan_name is unset (preserves prior behavior).
    //
    // Apr 27 round 3: client may now override either field — admin-style
    // submissions on behalf of a different kecamatan / rayon are valid.
    const kecamatanName = dto.kecamatan_name?.trim() || user.kecamatan_name || user.full_name;
    const rayonId = dto.rayon_id ?? user.rayon_id ?? null;

    const pruningRequest = this.pruningRequestRepository.create({
      referenceCode,
      submittedBy: user.id,
      kecamatanName,
      address: dto.address,
      gpsLat: dto.lat,
      gpsLng: dto.lng,
      photoUrls: dto.photo_keys,
      // May 9, 2026 — `expected_date` is no longer written from submit.
      // Kecamatan submissions express preference at week granularity
      // (expectedYear + expectedIsoWeek). The concrete day is set by
      // admin_data via `scheduled_date` at assign-to-task or Atur Jadwal.
      // We retain `detailDate` only to derive the ISO week above for legacy
      // clients that still send `detail_date`.
      expectedDate: null,
      expectedYear,
      expectedIsoWeek,
      estimatedPlantCount: dto.target_count ?? dto.tree_count ?? null,
      treeCount: dto.tree_count ?? dto.target_count ?? null,
      treeHeightEstimate: dto.tree_height_estimate ?? null,
      treeDiameterEstimate: dto.tree_diameter_estimate ?? null,
      requesterName: dto.requester_name ?? null,
      requesterPhone: dto.requester_phone ?? null,
      rtLeaderName: dto.rt_leader_name ?? null,
      rtLeaderPhone: dto.rt_leader_phone ?? null,
      notes: dto.notes || null,
      status: 'submitted',
      rayonId,
    });

    const saved = await this.pruningRequestRepository.save(pruningRequest);
    this.logger.log(
      `Pruning request ${saved.id} created with reference code ${saved.referenceCode}`,
    );

    // May 13 — heads-up push to every admin_data / kepala_rayon in the
    // request's rayon so they don't have to poll the review queue.
    // Fire-and-forget; submit must not block on FCM dispatch.
    void this.notifyRayonAdmins(
      saved.rayonId,
      'Permohonan Perantingan Baru',
      `${saved.kecamatanName || 'Kecamatan'} mengajukan permohonan ${saved.referenceCode}. Mohon ditinjau.`,
      saved,
    );

    return saved;
  }

  /**
   * Get pruning requests submitted by the authenticated user.
   *
   * @param user - Authenticated user
   * @param limit - Maximum results (default 20)
   * @param offset - Pagination offset (default 0)
   * @returns Array of pruning requests created by the user
   */
  async findMine(
    user: User,
    limit = 20,
    offset = 0,
  ): Promise<PruningRequest[]> {
    this.logger.log(
      `Fetching pruning requests for user ${user.id} (limit ${limit}, offset ${offset})`,
    );

    return this.pruningRequestRepository.find({
      where: { submittedBy: user.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      // Submitter is always self here, but we still hydrate so the list card
      // renders the same chip on both kecamatan and admin views.
      relations: ['submitter', 'reviewer', 'rayon'],
    });
  }

  /**
   * Get a single pruning request by ID with authorization checks.
   *
   * Access allowed to:
   * - The submitter (owner)
   * - admin_data users with matching rayon_id
   * - kepala_rayon users with matching rayon_id
   * - top_management users (read-all)
   * - admin_system users (read-all)
   * - superadmin users (read-all)
   *
   * @param id - Pruning request ID
   * @param user - Authenticated user
   * @returns The pruning request
   * @throws NotFoundException if request not found
   * @throws ForbiddenException if user lacks authorization
   */
  async findById(id: string, user: User): Promise<PruningRequest> {
    this.logger.log(
      `Fetching pruning request ${id} for user ${user.id} (role: ${user.role})`,
    );

    const request = await this.pruningRequestRepository.findOne({
      where: { id },
      relations: ['submitter', 'reviewer', 'rayon'],
    });

    if (!request) {
      this.logger.warn(`Pruning request ${id} not found`);
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }

    // Check authorization
    const isOwner = request.submittedBy === user.id;
    const isAdmin = [
      UserRole.ADMIN_DATA,
      UserRole.ADMIN_SYSTEM,
      UserRole.SUPERADMIN,
      UserRole.TOP_MANAGEMENT,
      UserRole.KEPALA_RAYON,
    ].includes(user.role as UserRole);
    const rayonMatches = request.rayonId === user.rayon_id;
    const isUnrestrictedAdmin = [
      UserRole.ADMIN_SYSTEM,
      UserRole.SUPERADMIN,
      UserRole.TOP_MANAGEMENT,
    ].includes(user.role as UserRole);

    const hasAccess =
      isOwner ||
      isUnrestrictedAdmin ||
      (isAdmin && rayonMatches && request.rayonId !== null);

    if (!hasAccess) {
      this.logger.warn(
        `Access denied for user ${user.id} to request ${id}. Submitter: ${request.submittedBy}, Request rayon: ${request.rayonId}, User rayon: ${user.rayon_id}`,
      );
      throw new ForbiddenException(
        'You do not have permission to access this pruning request',
      );
    }

    return request;
  }

  /**
   * Review a pruning request (approve or reject).
   *
   * Only requests in 'submitted' or 'under_review' status can be reviewed.
   * Sets reviewedBy, reviewedAt, status, and reviewNotes.
   *
   * @param id - Pruning request ID
   * @param dto - Review decision and notes
   * @param user - Authenticated admin user
   * @returns Updated pruning request
   * @throws NotFoundException if request not found
   * @throws ForbiddenException if user lacks authorization (admin_data + mismatched rayon)
   * @throws ConflictException if request is not reviewable (wrong status)
   */
  async review(
    id: string,
    dto: ReviewPruningRequestDto,
    user: User,
  ): Promise<PruningRequest> {
    this.logger.log(
      `Reviewing pruning request ${id} (decision: ${dto.decision}) by user ${user.id}`,
    );

    const request = await this.pruningRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }

    // Check authorization: admin_data scoped by rayon
    if (user.role === UserRole.ADMIN_DATA) {
      if (request.rayonId !== user.rayon_id) {
        this.logger.warn(
          `Access denied for admin_data ${user.id} to request ${id}. Request rayon: ${request.rayonId}, User rayon: ${user.rayon_id}`,
        );
        throw new ForbiddenException(
          'You do not have permission to review this pruning request',
        );
      }
    }

    // Check status: only submitted or under_review can be reviewed
    if (!['submitted', 'under_review'].includes(request.status)) {
      throw new ConflictException(
        `Pruning request status is ${request.status}, cannot review when already ${request.status}`,
      );
    }

    // May 10, 2026 — approval requires a confirmed scheduledDate. The mobile
    // RequestDetailScreen already gates Setujui on this field; mirror the
    // rule on the backend so direct API callers (web admin, Postman, future
    // clients) cannot bypass and create the "approved-without-date" limbo
    // state that leaves the warga without a real expectation. Use
    // `under_review` for tentative dispositions instead.
    if (dto.decision === 'approve' && !request.scheduledDate) {
      throw new ConflictException(
        'Atur jadwal terlebih dahulu sebelum menyetujui permohonan',
      );
    }

    request.status = dto.decision === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = user.id;
    request.reviewedAt = new Date();
    request.reviewNotes = dto.reviewNotes || null;

    const updated = await this.pruningRequestRepository.save(request);
    this.logger.log(
      `Pruning request ${id} reviewed: ${dto.decision} by ${user.id}`,
    );

    // May 13 — close the loop on the submitter side. Approved → "your
    // request is approved + scheduled for date". Rejected → "your
    // request was rejected" (+ reason if provided).
    if (dto.decision === 'approve') {
      const dateStr = updated.scheduledDate
        ? new Date(updated.scheduledDate).toISOString().slice(0, 10)
        : '';
      void this.notifySubmitter(
        updated,
        'Permohonan Perantingan Disetujui',
        `Permohonan ${updated.referenceCode} disetujui. Jadwal: ${dateStr}.`,
      );
    } else {
      const reasonSuffix = dto.reviewNotes ? ` Alasan: ${dto.reviewNotes}` : '';
      void this.notifySubmitter(
        updated,
        'Permohonan Perantingan Ditolak',
        `Permohonan ${updated.referenceCode} ditolak.${reasonSuffix}`,
      );
    }

    return updated;
  }

  /**
   * Convert an approved pruning request to a task.
   *
   * Only 'approved' requests can be converted. If already converted, returns existing task (idempotent).
   * Atomically books capacity via ServiceCapacityService and creates a task.
   *
   * @param id - Pruning request ID
   * @param dto - Task conversion data (areaId, assignedTo, scheduledDate, caseType, pruningAction, units)
   * @param user - Authenticated admin user
   * @returns Object with updated request and newly created task
   * @throws NotFoundException if request not found
   * @throws ForbiddenException if user lacks authorization
   * @throws ConflictException if request is not approved, or if capacity booking fails
   */
  async assignToTask(
    id: string,
    dto: AssignPruningRequestDto,
    user: User,
  ): Promise<{ request: PruningRequest; task: Task }> {
    this.logger.log(
      `Converting pruning request ${id} to task by user ${user.id}`,
    );

    const request = await this.pruningRequestRepository.findOne({
      where: { id },
    });

    if (!request) {
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }

    // Check authorization: admin_data scoped by rayon
    if (user.role === UserRole.ADMIN_DATA) {
      if (request.rayonId !== user.rayon_id) {
        throw new ForbiddenException(
          'You do not have permission to convert this pruning request',
        );
      }
    }

    // Idempotent: if already converted, return existing task
    if (request.assignedTaskId) {
      const task = await this.taskRepository.findOne({
        where: { id: request.assignedTaskId },
      });
      if (task) {
        this.logger.log(
          `Pruning request ${id} already converted to task ${request.assignedTaskId}`,
        );
        return { request, task };
      }
    }

    // Check status: only 'approved' can be converted
    if (request.status !== 'approved') {
      throw new ConflictException(
        `Pruning request status is ${request.status}, only approved requests can be converted`,
      );
    }

    const units = dto.units ?? 1;

    // Resolve the concrete day + (year, isoWeek) for the booking.
    //
    // ADR-035 amendment 2026-05-01:
    //   - Admin can pass `scheduledDate` and we honour it (with a sanity check
    //     that the date lies inside the requested ISO week if the submitter
    //     expressed a preference).
    //   - Otherwise, if the request has (expectedYear, expectedIsoWeek), we
    //     iterate Mon→Sun of that week and book the first day with capacity.
    //   - If neither path can produce a date, we throw a clear 400 so the
    //     admin UI can prompt the user.
    let scheduledDateObj: Date | null = null;
    let year: number;
    let isoWeek: number;

    if (dto.scheduledDate) {
      scheduledDateObj = new Date(dto.scheduledDate);
      const iso = getIsoWeek(scheduledDateObj);
      year = iso.year;
      isoWeek = iso.isoWeek;
      if (
        request.expectedYear != null &&
        request.expectedIsoWeek != null &&
        (year !== request.expectedYear || isoWeek !== request.expectedIsoWeek)
      ) {
        this.logger.warn(
          `Convert override: admin chose date in week ${year}-W${isoWeek}, request preferred ${request.expectedYear}-W${request.expectedIsoWeek}`,
        );
        // Allow the override (admin discretion) but log it for audit.
      }
    } else if (request.expectedYear != null && request.expectedIsoWeek != null) {
      year = request.expectedYear;
      isoWeek = request.expectedIsoWeek;
      // Day pick happens inside the booking transaction below so the
      // bookAtomic loop is the same one that decides the day. We mark
      // scheduledDateObj as null here and let the transaction fill it.
    } else {
      throw new BadRequestException(
        'Either scheduledDate or a preferred week (expected_year + expected_iso_week) must be present',
      );
    }

    if (!request.rayonId) {
      throw new ConflictException('Pruning request has no rayon assigned');
    }

    // Atomic transaction: book capacity + create task + update request
    return this.dataSource.transaction(async (tm) => {
      // Path A — admin specified a concrete date: single bookAtomic call.
      if (scheduledDateObj) {
        try {
          await this.serviceCapacityService.bookAtomic({
            rayonId: request.rayonId!,
            year,
            isoWeek,
            serviceType: 'pruning',
            units,
          });
        } catch (error) {
          if (error instanceof ConflictException) {
            throw new ConflictException(
              'Capacity booking failed: ' + error.message,
            );
          }
          throw error;
        }
      } else {
        // Path B — auto-pick the first day in the preferred week with capacity.
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const candidates = isoWeekDays(year, isoWeek).filter((d) => d >= today);
        if (candidates.length === 0) {
          throw new ConflictException(
            'Preferred week has no future days remaining; ask the submitter to reschedule',
          );
        }
        let bookedAny = false;
        for (const candidate of candidates) {
          try {
            await this.serviceCapacityService.bookAtomic({
              rayonId: request.rayonId!,
              year,
              isoWeek,
              serviceType: 'pruning',
              units,
            });
            scheduledDateObj = candidate;
            bookedAny = true;
            break;
          } catch (error) {
            // Capacity is week-aggregated, so a 409 on one day means the
            // entire week is full — no point trying the rest.
            if (error instanceof ConflictException) {
              throw new ConflictException(
                'Capacity booking failed for the preferred week: ' + error.message,
              );
            }
            throw error;
          }
        }
        // Defensive: bookedAny should always be true once we reach here.
        if (!bookedAny || !scheduledDateObj) {
          throw new ConflictException(
            'No day in the preferred week could be booked',
          );
        }
      }

      // Create task — pre-assigned, so it must land in `assigned` status
      // with `assigned_at` set so the satgas can accept/start/complete.
      // May 11, 2026: `area_id` is optional (pruning often happens in
      // neighborhoods / private yards, not managed areas). When omitted,
      // we still stamp `rayon_id` from the request so monitoring + rayon-
      // scoped queries continue to work. The GPS + address from the
      // request itself become the work location.
      // May 12, 2026 — title/description rendered in Bahasa Indonesia
      // since these surface verbatim on the satgas's Detail Tugas screen.
      // Description uses the kecamatan + address pair the warga gave us
      // so the satgas knows where to go even before opening the linked
      // permohonan.
      const taskDescription = request.kecamatanName
        ? `Permintaan Perantingan dari Kecamatan ${request.kecamatanName} : ${request.address}`
        : `Permintaan Perantingan : ${request.address}`;
      const task = tm.create(Task, {
        title: `Permintaan Perantingan ${request.referenceCode}`,
        description: taskDescription,
        area_id: dto.areaId ?? null,
        rayon_id: request.rayonId ?? null,
        assigned_to: dto.assignedTo,
        deadline: scheduledDateObj,
        created_by: user.id,
        status: TaskStatus.ASSIGNED,
        assigned_at: new Date(),
      });

      const savedTask = await tm.save(task);

      // ADR-038: record this hop in the delegation chain so the audit
      // trail and mobile "Riwayat Penugasan" card cover requests-driven
      // tasks too. Snapshot roles at the time of the hop.
      const assigneeUser = await this.usersService.findOne(dto.assignedTo);
      await tm.save(TaskDelegation, {
        task_id: savedTask.id,
        from_user_id: user.id,
        from_role: user.role,
        to_user_id: dto.assignedTo,
        to_role: assigneeUser.role,
        reason: null,
      });

      // Update request: walk to `converted`, set the admin-confirmed date,
      // link task. May 9, 2026 — writes to `scheduled_date` (NEW) instead of
      // `expected_date`. The latter stays NULL going forward; see the
      // 17460008000000 migration for the schema split rationale.
      request.status = 'assigned';
      request.assignedTaskId = savedTask.id;
      request.scheduledDate = scheduledDateObj;
      // Backfill the week pair if it was missing (legacy admin-direct path).
      if (request.expectedYear == null) request.expectedYear = year;
      if (request.expectedIsoWeek == null) request.expectedIsoWeek = isoWeek;

      const updatedRequest = await tm.save(request);

      this.logger.log(
        `Pruning request ${id} converted to task ${savedTask.id} on ${scheduledDateObj.toISOString().slice(0, 10)} (W${isoWeek}/${year})`,
      );

      // Best-effort push to the new assignee. Failure must not roll back
      // the (now-committed) transaction.
      this.notificationsService
        .sendToUser({
          user_id: dto.assignedTo,
          title: `Tugas baru: ${savedTask.title}`,
          body: 'Anda mendapat penugasan pemangkasan dari kecamatan. Buka aplikasi untuk melihat detail.',
          type: NotificationType.TASK_ASSIGNED,
          data: { task_id: savedTask.id, source: 'pruning_request' },
        })
        .catch((err) =>
          this.logger.error(
            `Failed to send assign-to-task notification: ${(err as Error).message}`,
          ),
        );

      return { request: updatedRequest, task: savedTask };
    });
  }

  /**
   * Reschedule the scheduled date of a pruning request.
   *
   * Round 4 (Apr 28): admins can adjust the date pre-conversion.
   * May 10, 2026: extended to `assigned` status with full cascade — task
   * deadline updates, capacity rebooks if the ISO week changed, and the
   * assignee gets a push + audit row. Statuses `in_progress`, `done`,
   * `rejected`, `cancelled` remain blocked: in-flight or terminal work is
   * the task's lifecycle to manage, not the parent permohonan's.
   *
   * - admin_data is scoped to its own rayon.
   * - The new date must be today or in the future.
   */
  async reschedule(
    id: string,
    dto: ReschedulePruningRequestDto,
    user: User,
  ): Promise<PruningRequest> {
    this.logger.log(
      `Rescheduling pruning request ${id} to ${dto.expectedDate} by user ${user.id}`,
    );

    const request = await this.pruningRequestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }

    if (user.role === UserRole.ADMIN_DATA && request.rayonId !== user.rayon_id) {
      throw new ForbiddenException(
        'You do not have permission to reschedule this pruning request',
      );
    }

    // May 10, 2026 (late+1) — `in_progress` joined the whitelist on user
    // request. Bumping `task.deadline` while `task.started_at` is already
    // set is safe: petugas keeps the same shift/activity records and just
    // gets a new finish-by target. Capacity is week-aggregated for
    // planning, not tied to actual clock-in hours, so a rebook is a clean
    // booking move. The cascade body below is unchanged — `isAssigned`
    // already keys on `assignedTaskId`, which is set the moment a task is
    // created, so it covers in_progress too.
    const RESCHEDULABLE_STATUSES: PruningRequestStatus[] = [
      'submitted',
      'under_review',
      'approved',
      'assigned',
      'in_progress',
    ];
    if (!RESCHEDULABLE_STATUSES.includes(request.status)) {
      throw new ConflictException(
        `Pruning request status is ${request.status}, cannot reschedule once ${request.status}`,
      );
    }

    const newDate = new Date(dto.expectedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (newDate < today) {
      throw new BadRequestException('expectedDate must be today or in the future');
    }

    // Pre-cascade: capture the old date + linked task before we mutate, so
    // we know whether to rebook capacity and whose deadline to bump. The
    // request row may not have eager `task` relation loaded, so look it up
    // explicitly when needed.
    const oldScheduledDate = request.scheduledDate;
    // Cascade fires whenever a task exists (assigned or in_progress). The
    // `assignedTaskId` FK is set the moment assign-to-task creates the
    // task, so it's a more reliable predicate than the request status.
    const hasLinkedTask =
      ['assigned', 'in_progress'].includes(request.status) &&
      request.assignedTaskId != null;

    // The non-cascade path is unchanged — just update the date. No task,
    // no capacity booking yet (capacity is consumed at assign-to-task time).
    if (!hasLinkedTask) {
      request.scheduledDate = newDate;
      return this.pruningRequestRepository.save(request);
    }

    // Assigned path — wrap the cascade in a transaction so we either
    // commit all of {capacity rebook, task.deadline, request.scheduledDate,
    // delegation audit row} or none. Capacity is week-aggregated; we only
    // touch it when the ISO week changes (intra-week moves are free).
    const oldIso =
      oldScheduledDate != null ? getIsoWeek(oldScheduledDate) : null;
    const newIso = getIsoWeek(newDate);
    const weekChanged =
      oldIso == null ||
      oldIso.year !== newIso.year ||
      oldIso.isoWeek !== newIso.isoWeek;

    const task = await this.taskRepository.findOne({
      where: { id: request.assignedTaskId! },
    });
    if (!task) {
      // Defensive: the FK should always resolve; if it doesn't, the request
      // is in a bad state — fall back to non-cascading update so the admin
      // isn't blocked, but log loudly for the audit.
      this.logger.error(
        `Reschedule cascade: linked task ${request.assignedTaskId} not found for request ${id}`,
      );
      request.scheduledDate = newDate;
      return this.pruningRequestRepository.save(request);
    }

    return this.dataSource.transaction(async (tm) => {
      // 1. Rebook capacity if the ISO week changed. Order matters — book
      // the new week first; if it's full we abort BEFORE touching the old
      // week's ledger, so the original booking stays intact.
      if (weekChanged && request.rayonId) {
        const units = 1;
        try {
          await this.serviceCapacityService.bookAtomic({
            rayonId: request.rayonId,
            year: newIso.year,
            isoWeek: newIso.isoWeek,
            serviceType: 'pruning',
            units,
          });
        } catch (error) {
          if (error instanceof ConflictException) {
            throw new ConflictException(
              'Capacity penuh untuk minggu yang dipilih: ' + error.message,
            );
          }
          throw error;
        }
        if (oldIso) {
          // Best effort — if release fails (e.g. capacity row was deleted),
          // log but don't reverse the new booking; the old row is stale by
          // definition once we've moved on.
          try {
            await this.serviceCapacityService.releaseAtomic({
              rayonId: request.rayonId,
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
      }

      // 2. Bump the task deadline so the satgas's app reflects the new date.
      task.deadline = newDate;
      await tm.save(task);

      // 3. Update the request row. Keep `expectedYear`/`expectedIsoWeek`
      // (the warga's preference) untouched — only the admin-confirmed
      // schedule moves.
      request.scheduledDate = newDate;
      const savedRequest = await tm.save(request);

      // 4. Audit hop — record the reschedule in the delegation chain so
      // the mobile "Riwayat Penugasan" card surfaces it. Same actor on
      // both sides; the `reason` field carries the schedule note.
      if (task.assigned_to) {
        await tm.save(TaskDelegation, {
          task_id: task.id,
          from_user_id: user.id,
          from_role: user.role,
          to_user_id: task.assigned_to,
          to_role: (await this.usersService.findOne(task.assigned_to)).role,
          reason: `Jadwal diubah ke ${newDate.toISOString().slice(0, 10)}`,
        });
      }

      this.logger.log(
        `Pruning request ${id} rescheduled to ${newDate.toISOString().slice(0, 10)} (W${newIso.isoWeek}/${newIso.year}); task ${task.id} deadline updated`,
      );

      // 5. Best-effort push to the assignee. Failure must not roll back
      // the (now-committed) transaction.
      if (task.assigned_to) {
        const assigneeId = task.assigned_to;
        this.notificationsService
          .sendToUser({
            user_id: assigneeId,
            title: `Jadwal tugas diubah`,
            body: `Tugas "${task.title}" dijadwalkan ulang ke ${newDate.toISOString().slice(0, 10)}.`,
            type: NotificationType.TASK_ASSIGNED,
            data: {
              task_id: task.id,
              source: 'pruning_request_reschedule',
            },
          })
          .catch((err) =>
            this.logger.error(
              `Failed to send reschedule notification: ${(err as Error).message}`,
            ),
          );
      }

      return savedRequest;
    });
  }

  /**
   * List pruning requests with filtering and pagination.
   *
   * For admin_data users, rayonId is auto-forced to their rayon_id.
   *
   * @param user - Authenticated admin user
   * @param query - Filter and pagination parameters
   * @returns Paginated list with total count
   * @throws ForbiddenException if user is not admin
   */
  async findAll(
    user: User,
    query: {
      status?: string;
      rayonId?: string;
      from?: string;
      to?: string;
      page?: number;
      limit?: number;
      // May 2026 — admin filter UX additions
      referenceCode?: string;
      requesterName?: string;
    },
  ): Promise<{
    items: PruningRequest[];
    total: number;
    page: number;
    limit: number;
  }> {
    this.logger.log(
      `Fetching pruning requests for user ${user.id} with filters:`,
      query,
    );

    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    let qb = this.pruningRequestRepository
      .createQueryBuilder('pr')
      .leftJoinAndSelect('pr.submitter', 'submitter')
      .leftJoinAndSelect('pr.reviewer', 'reviewer')
      .leftJoinAndSelect('pr.rayon', 'rayon');

    // Status filter
    if (query.status) {
      qb = qb.where('pr.status = :status', { status: query.status });
    }

    // Rayon filter: auto-force for admin_data
    let rayonId = query.rayonId;
    if (user.role === UserRole.ADMIN_DATA) {
      rayonId = user.rayon_id;
    }
    if (rayonId) {
      if (query.status) {
        qb = qb.andWhere('pr.rayonId = :rayonId', { rayonId });
      } else {
        qb = qb.where('pr.rayonId = :rayonId', { rayonId });
      }
    }

    // Date range filters
    if (query.from) {
      const fromDate = new Date(query.from);
      fromDate.setHours(0, 0, 0, 0);
      qb = qb.andWhere('pr.createdAt >= :from', { from: fromDate });
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      qb = qb.andWhere('pr.createdAt <= :to', { to: toDate });
    }

    // Reference code (case-insensitive substring; users typically paste full
    // codes but may type only the suffix).
    if (query.referenceCode && query.referenceCode.trim()) {
      qb = qb.andWhere('pr.referenceCode ILIKE :ref', {
        ref: `%${query.referenceCode.trim()}%`,
      });
    }

    // Requester name (case-insensitive substring on the kontak pemohon).
    if (query.requesterName && query.requesterName.trim()) {
      qb = qb.andWhere('pr.requesterName ILIKE :reqName', {
        reqName: `%${query.requesterName.trim()}%`,
      });
    }

    const [items, total] = await qb
      .orderBy('pr.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }

  /**
   * Cancel a pruning request (May 2026).
   *
   * Allowed actors:
   *   - the original submitter (typically staff_kecamatan)
   *   - admin_data scoped to the request's rayon
   *   - kepala_rayon, top_management, admin_system, superadmin
   *
   * Allowed source statuses (whitelist — May 10, 2026): only requests still
   * in the kecamatan-submission / admin-review window can be cancelled.
   *   - `submitted`     — new, awaiting admin
   *   - `under_review`  — admin has opened but not decided
   *   - `approved`      — admin signed off but no task created yet
   *
   * Disallowed: `rejected` (admin already terminated), `converted` /
   * `in_progress` (a task exists and the work is committed), `done` /
   * `cancelled` (already terminal).
   */
  async cancel(id: string, user: User, reason?: string): Promise<PruningRequest> {
    const request = await this.pruningRequestRepository.findOne({ where: { id } });
    if (!request) {
      throw new NotFoundException(`Pruning request with ID ${id} not found`);
    }

    const isSubmitter = request.submittedBy === user.id;
    const isAdminScoped =
      user.role === UserRole.ADMIN_DATA && request.rayonId === user.rayon_id;
    const isAdminBroad = [
      UserRole.KEPALA_RAYON,
      UserRole.TOP_MANAGEMENT,
      UserRole.ADMIN_SYSTEM,
      UserRole.SUPERADMIN,
    ].includes(user.role);

    if (!isSubmitter && !isAdminScoped && !isAdminBroad) {
      throw new ForbiddenException(
        'You do not have permission to cancel this pruning request',
      );
    }

    const CANCELLABLE_STATUSES: PruningRequestStatus[] = [
      'submitted',
      'under_review',
      'approved',
    ];
    if (!CANCELLABLE_STATUSES.includes(request.status)) {
      throw new ConflictException(
        `Cannot cancel a permohonan that is already ${request.status}`,
      );
    }

    request.status = 'cancelled';
    if (reason && reason.trim()) {
      request.notes = request.notes
        ? `${request.notes}\n[Dibatalkan] ${reason.trim()}`
        : `[Dibatalkan] ${reason.trim()}`;
    }
    const saved = await this.pruningRequestRepository.save(request);

    // May 13 — notify admins in the rayon when the submitter cancels so
    // they remove it from the queue without having to refresh.
    const cancelledByName = user.full_name || user.username;
    void this.notifyRayonAdmins(
      saved.rayonId,
      'Permohonan Perantingan Dibatalkan',
      `${cancelledByName} membatalkan permohonan ${saved.referenceCode}.`,
      saved,
    );

    return saved;
  }
}
