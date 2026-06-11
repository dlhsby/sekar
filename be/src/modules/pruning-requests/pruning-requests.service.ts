import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { PruningRequest } from './entities/pruning-request.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';
import { ReviewPruningRequestDto } from './dto/review-pruning-request.dto';
import { AssignPruningRequestDto } from './dto/assign-pruning-request.dto';
import { ReschedulePruningRequestDto } from './dto/reschedule-pruning-request.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { getIsoWeek, isoWeekEnd } from './utils/iso-week.util';
import { TimezoneUtil } from '../../common/utils/timezone.util';
import {
  PruningRequestFinderService,
  SAFE_PRUNING_REQUEST_SELECT,
} from './services/pruning-request-finder.service';
import { PruningRequestNotificationsService } from './services/pruning-request-notifications.service';
import { PruningRequestWorkflowService } from './services/pruning-request-workflow.service';
import {
  assertAdminDataRayonScope,
  assertCanCancel,
  assertCancellableStatus,
  canReadPruningRequest,
} from './pruning-request.policies';

interface PruningRequestListQuery {
  status?: string;
  rayonId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
  // May 2026 — admin filter UX additions
  referenceCode?: string;
  requesterName?: string;
}

interface RequestedWeek {
  expectedYear: number | null;
  expectedIsoWeek: number | null;
}

/**
 * Façade for pruning requests: submission by `staff_kecamatan`, review by
 * admins, queries and cancellation. The transactional conversion/reschedule
 * flows live in PruningRequestWorkflowService; pushes in
 * PruningRequestNotificationsService — behind this unchanged public API.
 */
@Injectable()
export class PruningRequestsService {
  private readonly logger = new Logger(PruningRequestsService.name);

  constructor(
    @InjectRepository(PruningRequest)
    private readonly pruningRequestRepository: Repository<PruningRequest>,
    private readonly finder: PruningRequestFinderService,
    private readonly notifications: PruningRequestNotificationsService,
    private readonly workflowService: PruningRequestWorkflowService,
  ) {}

  /**
   * Submit a new pruning request: status 'submitted', submitter info, GPS,
   * photo keys and a unique reference code.
   */
  async create(dto: CreatePruningRequestDto, user: User): Promise<PruningRequest> {
    this.logger.log(`Creating pruning request from user ${user.id}`);
    const requestedWeek = this.resolveRequestedWeek(dto);
    const saved = await this.pruningRequestRepository.save(
      this.buildRequest(dto, user, requestedWeek),
    );
    this.logger.log(
      `Pruning request ${saved.id} created with reference code ${saved.referenceCode}`,
    );
    // May 13 — heads-up push to every admin_data / kepala_rayon in the
    // request's rayon. Fire-and-forget; submit must not block on FCM.
    void this.notifications.notifyRayonAdmins(
      saved.rayonId,
      'Permohonan Perantingan Baru',
      `${saved.kecamatanName || 'Kecamatan'} mengajukan permohonan ${saved.referenceCode}. Mohon ditinjau.`,
      saved,
    );
    return saved;
  }

  /**
   * ADR-035 amendment 2026-05-01: kecamatan picks an ISO week, not a day.
   * Input shapes in priority order: (expected_year, expected_iso_week) from
   * new mobile builds; detail_date alone from legacy builds (one-release
   * deprecation); neither — admin sets the week later. Always normalized to
   * (expectedYear, expectedIsoWeek); `expectedDate` stays NULL on submit and
   * is set at assign-to-task time.
   */
  private resolveRequestedWeek(dto: CreatePruningRequestDto): RequestedWeek {
    if (dto.expected_year != null && dto.expected_iso_week != null) {
      this.assertWeekNotPassed(dto.expected_year, dto.expected_iso_week);
      return { expectedYear: dto.expected_year, expectedIsoWeek: dto.expected_iso_week };
    }
    if (dto.detail_date) return this.deriveWeekFromLegacyDate(dto.detail_date);
    return { expectedYear: null, expectedIsoWeek: null };
  }

  /** Reject weeks that have already fully ended (Sun is past). */
  private assertWeekNotPassed(year: number, isoWeek: number): void {
    if (isoWeekEnd(year, isoWeek) < TimezoneUtil.jakartaStartOfToday()) {
      throw new BadRequestException('Preferred week has already passed');
    }
  }

  /** Legacy single-day input → derive the ISO week so the new columns are populated. */
  private deriveWeekFromLegacyDate(detailDateString: string): RequestedWeek {
    const detailDate = new Date(detailDateString);
    if (detailDate < TimezoneUtil.jakartaStartOfToday()) {
      throw new BadRequestException('Detail date must be today or in the future');
    }
    const iso = getIsoWeek(detailDate);
    return { expectedYear: iso.year, expectedIsoWeek: iso.isoWeek };
  }

  private buildRequest(
    dto: CreatePruningRequestDto,
    user: User,
    requestedWeek: RequestedWeek,
  ): PruningRequest {
    // Phase 3 Apr 27 — kecamatan_name + rayon_id auto-derive from the user's
    // profile, with client override allowed (admin-style submissions on
    // behalf of a different kecamatan / rayon are valid).
    const kecamatanName = dto.kecamatan_name?.trim() || user.kecamatan_name || user.full_name;
    return this.pruningRequestRepository.create({
      referenceCode: `PR-${Date.now()}-${uuidv4().slice(0, 8)}`,
      submittedBy: user.id,
      kecamatanName,
      address: dto.address,
      gpsLat: dto.lat,
      gpsLng: dto.lng,
      photoUrls: dto.photo_keys,
      // May 9, 2026 — `expected_date` is no longer written from submit; the
      // concrete day is set by admin_data via `scheduled_date` later.
      expectedDate: null,
      expectedYear: requestedWeek.expectedYear,
      expectedIsoWeek: requestedWeek.expectedIsoWeek,
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
      rayonId: dto.rayon_id ?? user.rayon_id ?? null,
    });
  }

  /** Get pruning requests submitted by the authenticated user. */
  async findMine(user: User, limit = 20, offset = 0): Promise<PruningRequest[]> {
    this.logger.log(
      `Fetching pruning requests for user ${user.id} (limit ${limit}, offset ${offset})`,
    );
    return this.pruningRequestRepository.find({
      where: { submittedBy: user.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
      relations: ['submitter', 'reviewer', 'rayon'],
      // Audit H1 (2026-05-23): safe user columns only on the joined rows.
      select: SAFE_PRUNING_REQUEST_SELECT,
    });
  }

  /**
   * Get a single pruning request by ID. Access: the submitter, rayon-scoped
   * admins (admin_data / kepala_rayon with matching rayon) and read-all
   * roles (top_management / admin_system / superadmin).
   */
  async findById(id: string, user: User): Promise<PruningRequest> {
    this.logger.log(`Fetching pruning request ${id} for user ${user.id} (role: ${user.role})`);
    const request = await this.finder.getWithPartiesOrFail(id);
    if (!canReadPruningRequest(request, user)) {
      this.logger.warn(
        `Access denied for user ${user.id} to request ${id}. Submitter: ${request.submittedBy}, Request rayon: ${request.rayonId}, User rayon: ${user.rayon_id}`,
      );
      throw new ForbiddenException('You do not have permission to access this pruning request');
    }
    return request;
  }

  /**
   * Review a pruning request (approve or reject). Only 'submitted' /
   * 'under_review' requests are reviewable; admin_data is rayon-scoped.
   */
  async review(id: string, dto: ReviewPruningRequestDto, user: User): Promise<PruningRequest> {
    this.logger.log(
      `Reviewing pruning request ${id} (decision: ${dto.decision}) by user ${user.id}`,
    );
    const request = await this.finder.getOrFail(id);
    assertAdminDataRayonScope(request, user, 'review');
    this.assertReviewable(request, dto);

    const updated = await this.pruningRequestRepository.save(this.withReview(request, dto, user));
    this.logger.log(`Pruning request ${id} reviewed: ${dto.decision} by ${user.id}`);
    this.notifyReviewOutcome(updated, dto);
    return updated;
  }

  private assertReviewable(request: PruningRequest, dto: ReviewPruningRequestDto): void {
    if (!['submitted', 'under_review'].includes(request.status)) {
      throw new ConflictException(
        `Pruning request status is ${request.status}, cannot review when already ${request.status}`,
      );
    }
    // May 10, 2026 — approval requires a confirmed scheduledDate, mirroring
    // the mobile gate so direct API callers cannot create the
    // "approved-without-date" limbo state. Use `under_review` for tentative
    // dispositions instead.
    if (dto.decision === 'approve' && !request.scheduledDate) {
      throw new ConflictException('Atur jadwal terlebih dahulu sebelum menyetujui permohonan');
    }
  }

  private withReview(
    request: PruningRequest,
    dto: ReviewPruningRequestDto,
    reviewer: User,
  ): PruningRequest {
    return {
      ...request,
      status: dto.decision === 'approve' ? ('approved' as const) : ('rejected' as const),
      reviewedBy: reviewer.id,
      reviewedAt: new Date(),
      reviewNotes: dto.reviewNotes || null,
    };
  }

  /** May 13 — close the loop on the submitter side. */
  private notifyReviewOutcome(updated: PruningRequest, dto: ReviewPruningRequestDto): void {
    if (dto.decision === 'approve') {
      const dateStr = updated.scheduledDate
        ? new Date(updated.scheduledDate).toISOString().slice(0, 10)
        : '';
      void this.notifications.notifySubmitter(
        updated,
        'Permohonan Perantingan Disetujui',
        `Permohonan ${updated.referenceCode} disetujui. Jadwal: ${dateStr}.`,
      );
      return;
    }
    const reasonSuffix = dto.reviewNotes ? ` Alasan: ${dto.reviewNotes}` : '';
    void this.notifications.notifySubmitter(
      updated,
      'Permohonan Perantingan Ditolak',
      `Permohonan ${updated.referenceCode} ditolak.${reasonSuffix}`,
    );
  }

  /** Convert an approved pruning request to a task (delegated to workflow). */
  assignToTask(
    id: string,
    dto: AssignPruningRequestDto,
    user: User,
  ): Promise<{ request: PruningRequest; task: Task }> {
    return this.workflowService.assignToTask(id, dto, user);
  }

  /** Reschedule the scheduled date of a pruning request (delegated to workflow). */
  reschedule(id: string, dto: ReschedulePruningRequestDto, user: User): Promise<PruningRequest> {
    return this.workflowService.reschedule(id, dto, user);
  }

  /**
   * List pruning requests with filtering and pagination. For admin_data
   * users, rayonId is auto-forced to their rayon_id.
   */
  async findAll(
    user: User,
    query: PruningRequestListQuery,
  ): Promise<{ items: PruningRequest[]; total: number; page: number; limit: number }> {
    this.logger.log(`Fetching pruning requests for user ${user.id} with filters:`, query);
    const page = query.page ?? 1;
    const limit = Math.min(query.limit ?? 20, 100);

    const qb = this.buildAdminListQuery();
    this.applyStatusAndRayonFilters(qb, user, query);
    this.applyDateAndSearchFilters(qb, query);

    const [items, total] = await qb
      .orderBy('pr.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();
    return { items, total, page, limit };
  }

  private buildAdminListQuery(): SelectQueryBuilder<PruningRequest> {
    return (
      this.pruningRequestRepository
        .createQueryBuilder('pr')
        .leftJoin('pr.submitter', 'submitter')
        .leftJoin('pr.reviewer', 'reviewer')
        .leftJoinAndSelect('pr.rayon', 'rayon')
        // Audit H1: cherry-pick the public-safe User columns (mirrors
        // SAFE_PRUNING_REQUEST_SELECT used by the find/findOne paths).
        .addSelect([
          'submitter.id',
          'submitter.username',
          'submitter.full_name',
          'submitter.role',
          'submitter.profile_picture_url',
        ])
        .addSelect([
          'reviewer.id',
          'reviewer.username',
          'reviewer.full_name',
          'reviewer.role',
          'reviewer.profile_picture_url',
        ])
    );
  }

  private applyStatusAndRayonFilters(
    qb: SelectQueryBuilder<PruningRequest>,
    user: User,
    query: PruningRequestListQuery,
  ): void {
    if (query.status) {
      qb.where('pr.status = :status', { status: query.status });
    }
    const rayonId = user.role === UserRole.ADMIN_DATA ? user.rayon_id : query.rayonId;
    if (!rayonId) return;
    if (query.status) {
      qb.andWhere('pr.rayonId = :rayonId', { rayonId });
    } else {
      qb.where('pr.rayonId = :rayonId', { rayonId });
    }
  }

  private applyDateAndSearchFilters(
    qb: SelectQueryBuilder<PruningRequest>,
    query: PruningRequestListQuery,
  ): void {
    if (query.from) {
      const fromDate = new Date(query.from);
      fromDate.setHours(0, 0, 0, 0);
      qb.andWhere('pr.createdAt >= :from', { from: fromDate });
    }
    if (query.to) {
      const toDate = new Date(query.to);
      toDate.setHours(23, 59, 59, 999);
      qb.andWhere('pr.createdAt <= :to', { to: toDate });
    }
    // Case-insensitive substrings: users typically paste full reference
    // codes but may type only the suffix; requester name matches the kontak
    // pemohon field.
    if (query.referenceCode?.trim()) {
      qb.andWhere('pr.referenceCode ILIKE :ref', { ref: `%${query.referenceCode.trim()}%` });
    }
    if (query.requesterName?.trim()) {
      qb.andWhere('pr.requesterName ILIKE :reqName', {
        reqName: `%${query.requesterName.trim()}%`,
      });
    }
  }

  /** Cancel a pruning request (May 2026). */
  async cancel(id: string, user: User, reason?: string): Promise<PruningRequest> {
    const request = await this.finder.getOrFail(id);
    assertCanCancel(request, user);
    assertCancellableStatus(request);

    const saved = await this.pruningRequestRepository.save(this.withCancellation(request, reason));
    // May 13 — notify admins in the rayon when the submitter cancels so they
    // remove it from the queue without having to refresh.
    void this.notifications.notifyRayonAdmins(
      saved.rayonId,
      'Permohonan Perantingan Dibatalkan',
      `${user.full_name || user.username} membatalkan permohonan ${saved.referenceCode}.`,
      saved,
    );
    return saved;
  }

  private withCancellation(request: PruningRequest, reason?: string): PruningRequest {
    const cancellationNote = reason?.trim() ? `[Dibatalkan] ${reason.trim()}` : null;
    return {
      ...request,
      status: 'cancelled' as const,
      notes: cancellationNote
        ? request.notes
          ? `${request.notes}\n${cancellationNote}`
          : cancellationNote
        : request.notes,
    };
  }
}
