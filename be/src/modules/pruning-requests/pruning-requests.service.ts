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
import { PruningRequest } from './entities/pruning-request.entity';
import { CreatePruningRequestDto } from './dto/create-pruning-request.dto';
import { ReviewPruningRequestDto } from './dto/review-pruning-request.dto';
import { ConvertPruningRequestDto } from './dto/convert-pruning-request.dto';
import { ReschedulePruningRequestDto } from './dto/reschedule-pruning-request.dto';
import { User, UserRole } from '../users/entities/user.entity';
import { Task } from '../tasks/entities/task.entity';
import { ServiceCapacityService } from '../service-capacity/service-capacity.service';
import { getIsoWeek } from './utils/iso-week.util';

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
  ) {}

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

    // Validate detail_date is today or future (only when supplied — Phase 3
    // redesign made the field optional since the new mobile form omits it).
    let detailDate: Date | null = null;
    if (dto.detail_date) {
      detailDate = new Date(dto.detail_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (detailDate < today) {
        throw new BadRequestException(
          'Detail date must be today or in the future',
        );
      }
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
      expectedDate: detailDate,
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

    request.status = dto.decision === 'approve' ? 'approved' : 'rejected';
    request.reviewedBy = user.id;
    request.reviewedAt = new Date();
    request.reviewNotes = dto.reviewNotes || null;

    const updated = await this.pruningRequestRepository.save(request);
    this.logger.log(
      `Pruning request ${id} reviewed: ${dto.decision} by ${user.id}`,
    );

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
  async convertToTask(
    id: string,
    dto: ConvertPruningRequestDto,
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
    if (request.convertedTaskId) {
      const task = await this.taskRepository.findOne({
        where: { id: request.convertedTaskId },
      });
      if (task) {
        this.logger.log(
          `Pruning request ${id} already converted to task ${request.convertedTaskId}`,
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
    const scheduledDateObj = new Date(dto.scheduledDate);
    const { year, isoWeek } = getIsoWeek(scheduledDateObj);

    // Atomic transaction: book capacity + create task + update request
    return this.dataSource.transaction(async (tm) => {
      // Book capacity for pruning service (guard against null rayon_id)
      if (!request.rayonId) {
        throw new ConflictException('Pruning request has no rayon assigned');
      }

      try {
        await this.serviceCapacityService.bookAtomic({
          rayonId: request.rayonId,
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

      // Create task
      const task = tm.create(Task, {
        title: `Pruning Request ${request.referenceCode}`,
        description: `Convert from pruning request: ${request.address}`,
        area_id: dto.areaId,
        assigned_to: dto.assignedTo,
        deadline: scheduledDateObj,
        created_by: user.id,
      });

      const savedTask = await tm.save(task);

      // Update request
      request.status = 'converted';
      request.convertedTaskId = savedTask.id;

      const updatedRequest = await tm.save(request);

      this.logger.log(
        `Pruning request ${id} converted to task ${savedTask.id}`,
      );

      return { request: updatedRequest, task: savedTask };
    });
  }

  /**
   * Reschedule the expected date of a pruning request without converting it.
   *
   * Round 4 (Apr 28): allows admins to adjust `expected_date` after submission.
   *
   * - admin_data is scoped to its own rayon.
   * - Only requests in 'submitted', 'under_review', or 'approved' status can be rescheduled.
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

    if (!['submitted', 'under_review', 'approved'].includes(request.status)) {
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

    request.expectedDate = newDate;
    return this.pruningRequestRepository.save(request);
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

    let qb = this.pruningRequestRepository.createQueryBuilder('pr');

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

    const [items, total] = await qb
      .orderBy('pr.createdAt', 'DESC')
      .skip(skip)
      .take(limit)
      .getManyAndCount();

    return { items, total, page, limit };
  }
}
