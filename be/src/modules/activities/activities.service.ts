import {
  Injectable,
  Logger,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Optional,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Activity, ActivityStatus } from './entities/activity.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { S3Service } from '../../shared/services/s3.service';
import { TaskTypeRegistry } from '../tasks/registry/task-type-registry';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { ActivityPlantItem } from '../plants/entities/activity-plant-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ACTIVITY_SUBMITTERS, MONITORING_CITY } from '../users/constants/role-groups';
import { AuditLogService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';

/** Generate a reference code in the format SEKAR-YYYYMM + 6 random alphanumeric chars. */
function generateReferenceCode(): string {
  const now = new Date();
  const year = now.getFullYear().toString();
  const month = (now.getMonth() + 1).toString().padStart(2, '0');
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const random = Array.from({ length: 6 }, () =>
    chars.charAt(Math.floor(Math.random() * chars.length)),
  ).join('');
  return `SEKAR-${year}${month}${random}`;
}

/**
 * Activities Service
 *
 * Handles business logic for work activities including photo uploads,
 * shift validation, and ownership verification.
 */
@Injectable()
export class ActivitiesService {
  private readonly logger = new Logger(ActivitiesService.name);

  constructor(
    @InjectRepository(Activity)
    private activitiesRepository: Repository<Activity>,
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(ActivityType)
    private activityTypeRepository: Repository<ActivityType>,
    @InjectRepository(ActivityPlantItem)
    private plantItemRepository: Repository<ActivityPlantItem>,
    @InjectRepository(ActivityTag)
    private activityTagRepository: Repository<ActivityTag>,
    private s3Service: S3Service,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    // Audit M7 (2026-05-23): validate `custom_fields` against the registry
    // schema on the activity side too — previously only TasksService called
    // it, so the same column accepted any JSON when reached via /activities.
    private readonly taskTypeRegistry: TaskTypeRegistry,
    // Phase 4-3 (M2): activity approve/reject FCM notifications. Optional so
    // legacy specs that don't provide NotificationsService keep working — the
    // prod app wires it via NotificationsModule import in ActivitiesModule.
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  private notifyActivityDecision(
    activityId: string,
    userId: string,
    decision: 'approved' | 'rejected',
    reason?: string,
  ): void {
    if (!this.notificationsService) return;
    const isApproved = decision === 'approved';
    this.notificationsService
      .sendToUser({
        user_id: userId,
        title: isApproved ? 'Aktivitas disetujui' : 'Aktivitas ditolak',
        body: isApproved
          ? 'Aktivitas yang Anda submit telah disetujui.'
          : `Aktivitas yang Anda submit ditolak${reason ? `: ${reason}` : '.'}`,
        type: isApproved ? NotificationType.ACTIVITY_APPROVED : NotificationType.ACTIVITY_REJECTED,
        data: { activity_id: activityId, ...(reason ? { reason } : {}) },
      })
      .catch((err) =>
        this.logger.error(
          `Failed to enqueue activity ${decision} notification for ${userId}: ${err.message}`,
        ),
      );
  }

  /**
   * Resolve the set of area UUIDs a korlap is permanently assigned to via
   * `user_areas`. Falls back to `[user.area_id]` if no row exists, so legacy
   * single-area users keep working before backfill.
   */
  private async getKorlapAreaIds(user: User): Promise<string[]> {
    const rows: Array<{ area_id: string }> = await this.activitiesRepository.manager.query(
      `SELECT area_id FROM user_areas
        WHERE user_id = $1 AND assignment_type = 'permanent'`,
      [user.id],
    );
    const ids = rows.map((r) => r.area_id);
    if (ids.length > 0) return ids;
    return user.area_id ? [user.area_id] : [];
  }

  /**
   * Create a new activity (Phase 2C)
   * Auto-detects active shift and validates activity type against user role
   *
   * @param userId UUID of the user creating the activity
   * @param userRole Role of the user
   * @param dto Activity creation data
   * @returns Created activity
   */
  async createActivity(
    userId: string,
    userRole: UserRole,
    dto: CreateActivityDto,
  ): Promise<Activity> {
    this.logger.log(
      `User ${userId} (${userRole}) creating activity with activity type ${dto.activity_type_id}`,
    );

    // 1. Auto-detect active shift
    const activeShift = await this.shiftsRepository.findOne({
      where: { user_id: userId, clock_out_time: IsNull() },
      relations: ['area'],
    });

    if (!activeShift) {
      throw new BadRequestException(
        'No active shift found. Please clock in first before submitting activity.',
      );
    }

    // 2. Validate activity_type exists and is active
    const activityType = await this.activityTypeRepository.findOne({
      where: { id: dto.activity_type_id, is_active: true },
    });

    if (!activityType) {
      throw new NotFoundException(`Activity type not found or inactive: ${dto.activity_type_id}`);
    }

    // 3. Validate activity type is applicable to user's role
    if (!activityType.applicable_roles.includes(userRole)) {
      throw new ForbiddenException(
        `Activity type "${activityType.name}" is not available for your role. Allowed roles: ${activityType.applicable_roles.join(', ')}`,
      );
    }

    // 3b. Audit M7 (2026-05-23): validate `custom_fields` against the
    // TaskTypeRegistry schema. The activity's case_type acts as the routing
    // key — when present, fields are expected to satisfy the pruning schema
    // (ADR-031). Unknown / unset case_type falls through to the generic
    // passthrough schema (no-op), preserving the existing behaviour for
    // non-pruning activities.
    if (dto.custom_fields !== undefined && dto.custom_fields !== null) {
      const registryType = dto.case_type ? 'pruning' : 'generic';
      try {
        this.taskTypeRegistry.validate(registryType, dto.custom_fields);
      } catch {
        throw new BadRequestException(
          `custom_fields is invalid for an activity with case_type "${dto.case_type ?? 'none'}". Check required fields per ADR-031.`,
        );
      }
    }

    // 4. Create activity
    const activity = this.activitiesRepository.create({
      user_id: userId,
      shift_id: activeShift.id,
      area_id: activeShift.area_id,
      activity_type_id: dto.activity_type_id,
      description: dto.description,
      photo_urls: dto.photo_urls,
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
      // Phase 3 fields
      caseType: dto.case_type ?? null,
      customFields: dto.custom_fields ?? {},
      photoBeforeUrl: dto.photo_before_url ?? null,
      photoAfterUrl: dto.photo_after_url ?? null,
      referenceCode: dto.reference_code ?? generateReferenceCode(),
      pruningRequestId: dto.pruning_request_id ?? null,
    });

    const savedActivity = await this.activitiesRepository.save(activity);
    this.logger.log(`Activity created successfully: ${savedActivity.id}`);

    // Phase 3: persist plant item line-items when provided
    if (dto.plant_items && dto.plant_items.length > 0) {
      const plantItemEntities = dto.plant_items.map((item) =>
        this.plantItemRepository.create({
          activityId: savedActivity.id,
          speciesId: item.species_id,
          count: item.count,
          notes: item.notes ?? null,
        }),
      );
      await this.plantItemRepository.save(plantItemEntities);
      this.logger.log(
        `Saved ${plantItemEntities.length} plant items for activity ${savedActivity.id}`,
      );
    }

    // ADR-038 (May 2026): persist tag rows for involved users.
    // Dedup the input list and silently drop the owner's own id — tagging
    // yourself is a no-op, not an error.
    if (dto.tagged_user_ids && dto.tagged_user_ids.length > 0) {
      const uniqueIds = Array.from(new Set(dto.tagged_user_ids)).filter((id) => id !== userId);
      if (uniqueIds.length > 0) {
        const tagEntities = uniqueIds.map((taggedUserId) =>
          this.activityTagRepository.create({
            activity_id: savedActivity.id,
            user_id: taggedUserId,
            tagged_by: userId,
          }),
        );
        await this.activityTagRepository.save(tagEntities);
        this.logger.log(`Tagged ${tagEntities.length} users on activity ${savedActivity.id}`);

        // Phase 4-3 (ADR-038): push an FCM notification to each tagged user.
        // Fire-and-forget — a dispatch failure must never abort activity
        // creation. Respects per-user preferences via NotificationsService.
        if (this.notificationsService) {
          for (const taggedUserId of uniqueIds) {
            this.notificationsService
              .sendToUser({
                user_id: taggedUserId,
                title: 'Anda ditandai di aktivitas',
                body: 'Anda ditandai sebagai petugas yang terlibat pada sebuah aktivitas.',
                type: NotificationType.ACTIVITY_TAGGED,
                data: { activity_id: savedActivity.id },
              })
              .catch((err) =>
                this.logger.error(
                  `Failed to enqueue activity-tag notification for ${taggedUserId}: ${err.message}`,
                ),
              );
          }
        }
      }
    }

    this.auditLogService
      .log({
        entity_type: 'activity',
        entity_id: savedActivity.id,
        action: 'create',
        actor_id: userId,
        new_value: {
          activity_type_id: dto.activity_type_id,
          area_id: savedActivity.area_id,
          case_type: dto.case_type,
          reference_code: savedActivity.referenceCode,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    // Cascade to linked pruning_request when the activity references one.
    // Closes the loop on the no-task path (kecamatan request → korlap files
    // a direct activity tagged to the request). On the task path the
    // TasksService.complete cascade already fires by `assigned_task_id`;
    // this UPDATE is idempotent so a double-hit on the same row is fine.
    // Best-effort — a failed cascade never aborts the activity creation.
    if (dto.pruning_request_id) {
      try {
        await this.activitiesRepository.manager.query(
          `UPDATE pruning_requests
           SET status = 'done', updated_at = NOW()
           WHERE id = $1 AND status NOT IN ('done', 'rejected', 'cancelled')`,
          [dto.pruning_request_id],
        );
        this.logger.log(
          `Cascaded pruning_request ${dto.pruning_request_id} → done via activity ${savedActivity.id}`,
        );
      } catch (err) {
        this.logger.error(
          `Activity → pruning_request cascade failed for request ${dto.pruning_request_id}: ${(err as Error).message}`,
        );
      }
    }

    return savedActivity;
  }

  /**
   * Find all activities with pagination, filters, and scope-based access (Phase 2C)
   *
   * @param filters Query filters
   * @param user Requesting user with role, area_id, rayon_id
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated activities
   */
  async findAllPaginated(
    filters: {
      user_id?: string;
      shift_id?: string;
      area_id?: string;
      rayon_id?: string;
      activity_type_id?: string;
      from_date?: string;
      to_date?: string;
      status?: ActivityStatus;
      sort_by?: string;
      sort_dir?: string;
      // ADR-038 (May 2026) — return activities where the current user is the
      // owner OR appears in `activity_tags`. When set, this overrides the
      // default role-based scope below so tagged satgas/linmas see activities
      // filed for them by korlap/admin_data even outside their own area.
      involving_me?: boolean;
    },
    user: User,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Activity>> {
    const queryBuilder = this.activitiesRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .leftJoinAndSelect('activity.shift', 'shift')
      .leftJoinAndSelect('shift.area', 'shiftArea')
      .leftJoinAndSelect('activity.area', 'area')
      .leftJoinAndSelect('activity.activityType', 'activityType')
      .leftJoinAndSelect('activity.reviewer', 'reviewer');

    if (filters.involving_me) {
      // Owner OR tagged. Sub-select keeps the join out of the main row set so
      // pagination counts stay correct (one activity row even if N tags hit).
      queryBuilder.andWhere(
        `(activity.user_id = :involvingUserId OR EXISTS (
          SELECT 1 FROM activity_tags at
          WHERE at.activity_id = activity.id AND at.user_id = :involvingUserId
        ))`,
        { involvingUserId: user.id },
      );
    } else if (user.role === UserRole.KORLAP) {
      // Korlap may have multiple permanent areas via `user_areas` (e.g. korlap_pusat_1
      // → all 13 Rayon Pusat areas). The legacy single `user.area_id` only reflects
      // their primary area, which would hide activities in other assigned areas.
      const korlapAreaIds = await this.getKorlapAreaIds(user);
      if (korlapAreaIds.length === 0) {
        queryBuilder.andWhere('1=0');
      } else {
        queryBuilder.andWhere('activity.area_id IN (:...korlapAreaIds)', { korlapAreaIds });
      }
    } else if (user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_DATA) {
      queryBuilder.andWhere('area.rayon_id = :rayonId', { rayonId: user.rayon_id });
    } else if (ACTIVITY_SUBMITTERS.includes(user.role as UserRole)) {
      queryBuilder.andWhere('activity.user_id = :userId', { userId: user.id });
    }
    // ADMIN_SYSTEM, SUPERADMIN, TOP_MANAGEMENT see all activities

    // Apply additional filters
    if (filters.user_id) {
      queryBuilder.andWhere('activity.user_id = :userId', { userId: filters.user_id });
    }

    if (filters.shift_id) {
      queryBuilder.andWhere('activity.shift_id = :shiftId', { shiftId: filters.shift_id });
    }

    if (filters.area_id) {
      queryBuilder.andWhere('activity.area_id = :filterAreaId', { filterAreaId: filters.area_id });
    }

    if (filters.rayon_id) {
      queryBuilder.andWhere('area.rayon_id = :filterRayonId', { filterRayonId: filters.rayon_id });
    }

    if (filters.activity_type_id) {
      queryBuilder.andWhere('activity.activity_type_id = :activityTypeId', {
        activityTypeId: filters.activity_type_id,
      });
    }

    if (filters.from_date || filters.to_date) {
      const fromDate = filters.from_date ? new Date(filters.from_date) : null;
      const toDate = filters.to_date ? new Date(filters.to_date) : null;
      if (toDate) toDate.setHours(23, 59, 59, 999);

      if (fromDate && toDate) {
        queryBuilder.andWhere('activity.created_at BETWEEN :fromDate AND :toDate', {
          fromDate,
          toDate,
        });
      } else if (fromDate) {
        queryBuilder.andWhere('activity.created_at >= :fromDate', { fromDate });
      } else if (toDate) {
        queryBuilder.andWhere('activity.created_at <= :toDate', { toDate });
      }
    }

    if (filters.status) {
      queryBuilder.andWhere('activity.status = :status', { status: filters.status });
    }

    // Dynamic sort + pagination
    const sortField = filters.sort_by ?? 'created_at';
    const sortDir = (filters.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    queryBuilder
      .orderBy(`activity.${sortField}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Convert photo URLs to presigned URLs
    const dataWithPresignedUrls = await Promise.all(
      data.map((activity) => this.convertPhotoUrlsToPresigned(activity)),
    );

    return new PaginatedResponseDto(dataWithPresignedUrls, total, page, limit);
  }

  /**
   * Find all activities for a specific user (my activities)
   *
   * @param userId User UUID
   * @param date Optional date filter (YYYY-MM-DD)
   * @returns List of user's activities with presigned photo URLs
   */
  async findMyActivities(userId: string, date?: string): Promise<Activity[]> {
    const where: any = { user_id: userId };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = Between(startDate, endDate);
    }

    const activities = await this.activitiesRepository.find({
      where,
      relations: ['user', 'shift', 'shift.area', 'area', 'activityType', 'reviewer'],
      order: { created_at: 'DESC' },
    });

    // Convert photo URLs to presigned URLs (24 hour expiry for mobile caching)
    return Promise.all(activities.map((activity) => this.convertPhotoUrlsToPresigned(activity)));
  }

  /**
   * Find activity by ID with scope-based access control (Phase 2C)
   *
   * @param id Activity UUID
   * @param user Requesting user with role, area_id, rayon_id
   * @returns Activity details
   */
  async findOne(id: string, user: User): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id },
      relations: ['user', 'shift', 'shift.area', 'area', 'activityType', 'reviewer'],
    });

    if (!activity) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.ACTIVITY_NOT_FOUND,
        `Activity not found: ${id}`,
      );
    }

    // Scope-based access control (specific roles first, then generic groups)
    if (user.role === UserRole.KORLAP) {
      const korlapAreaIds = await this.getKorlapAreaIds(user);
      if (!activity.area_id || !korlapAreaIds.includes(activity.area_id)) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.ACTIVITY_ACCESS_DENIED,
          'You can only access activities from your assigned areas',
        );
      }
    } else if (user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_DATA) {
      if (activity.shift?.area?.rayon_id !== user.rayon_id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.ACTIVITY_ACCESS_DENIED,
          'You can only access activities from your assigned rayon',
        );
      }
    } else if (ACTIVITY_SUBMITTERS.includes(user.role as UserRole)) {
      if (activity.user_id !== user.id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.ACTIVITY_ACCESS_DENIED,
          'You can only access your own activities',
        );
      }
    }
    // ADMIN_SYSTEM, SUPERADMIN, TOP_MANAGEMENT can see all activities

    // Convert photo URLs to presigned URLs (24 hour expiry)
    return this.convertPhotoUrlsToPresigned(activity);
  }

  /**
   * Update activity (user can update own activities within 1 hour)
   *
   * @param id Activity UUID
   * @param dto Update data
   * @param userId UUID of the requesting user
   * @returns Updated activity
   */
  async update(id: string, dto: UpdateActivityDto, userId: string): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id },
      relations: ['user'],
    });

    if (!activity) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.ACTIVITY_NOT_FOUND,
        `Activity not found: ${id}`,
      );
    }

    // Check ownership
    if (activity.user_id !== userId) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.ACTIVITY_ACCESS_DENIED,
        'You can only update your own activities',
      );
    }

    // Check time constraint (within 1 hour of creation)
    const hoursSinceCreation = (Date.now() - activity.created_at.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 1) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.ACTIVITY_EDIT_WINDOW_CLOSED,
        'Activities can only be updated within 1 hour of creation',
      );
    }

    // Update description if provided
    if (dto.description) {
      activity.description = dto.description;
    }

    // Update photo_urls if provided
    if (dto.photo_urls) {
      activity.photo_urls = dto.photo_urls;
    }

    return this.activitiesRepository.save(activity);
  }

  /**
   * Delete activity (Admin only)
   *
   * @param id Activity UUID
   */
  async remove(id: string): Promise<void> {
    const activity = await this.activitiesRepository.findOne({ where: { id } });

    if (!activity) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.ACTIVITY_NOT_FOUND,
        `Activity not found: ${id}`,
      );
    }

    await this.activitiesRepository.remove(activity);
    this.logger.log(`Activity deleted: ${id}`);
  }

  /**
   * Approve a pending activity (Phase 2C)
   *
   * Only Korlap (for their area) and Kepala Rayon (for their rayon) can approve activities.
   * Hierarchy validation ensures approvers can only approve activities within their scope.
   *
   * @param activityId Activity UUID to approve
   * @param reviewerId UUID of the reviewer (Korlap or Kepala Rayon)
   * @returns Updated activity with APPROVED status
   */
  async approveActivity(activityId: string, reviewerId: string): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id: activityId },
      relations: ['user', 'area'],
    });

    if (!activity) {
      throw new NotFoundException('Aktivitas tidak ditemukan');
    }

    if (activity.status !== ActivityStatus.PENDING) {
      throw new BadRequestException('Aktivitas sudah diproses');
    }

    if (activity.user_id === reviewerId) {
      throw new ForbiddenException('Anda tidak dapat mereview aktivitas Anda sendiri');
    }

    const reviewer = await this.usersService.findOne(reviewerId);
    this.validateApprovalHierarchy(activity, reviewer);

    activity.status = ActivityStatus.APPROVED;
    activity.reviewed_by = reviewerId;
    activity.reviewed_at = new Date();

    await this.activitiesRepository.save(activity);

    this.auditLogService
      .log({
        entity_type: 'activity',
        entity_id: activityId,
        action: 'approve',
        actor_id: reviewerId,
        old_value: { status: ActivityStatus.PENDING },
        new_value: { status: ActivityStatus.APPROVED, reviewed_by: reviewerId },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    // Phase 4-3 (M2): notify the activity owner
    this.notifyActivityDecision(activityId, activity.user_id, 'approved');

    // Re-fetch with all relations for the response
    return this.activitiesRepository.findOneOrFail({
      where: { id: activityId },
      relations: ['user', 'area', 'activityType', 'reviewer'],
    });
  }

  /**
   * Reject a pending activity with a reason (Phase 2C)
   *
   * Only Korlap (for their area) and Kepala Rayon (for their rayon) can reject activities.
   * Hierarchy validation ensures approvers can only reject activities within their scope.
   *
   * @param activityId Activity UUID to reject
   * @param reviewerId UUID of the reviewer (Korlap or Kepala Rayon)
   * @param reason Reason for rejection (required)
   * @returns Updated activity with REJECTED status and rejection_reason
   */
  async rejectActivity(activityId: string, reviewerId: string, reason: string): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id: activityId },
      relations: ['user', 'area'],
    });

    if (!activity) {
      throw new NotFoundException('Aktivitas tidak ditemukan');
    }

    if (activity.status !== ActivityStatus.PENDING) {
      throw new BadRequestException('Aktivitas sudah diproses');
    }

    if (activity.user_id === reviewerId) {
      throw new ForbiddenException('Anda tidak dapat mereview aktivitas Anda sendiri');
    }

    const reviewer = await this.usersService.findOne(reviewerId);
    this.validateApprovalHierarchy(activity, reviewer);

    activity.status = ActivityStatus.REJECTED;
    activity.reviewed_by = reviewerId;
    activity.reviewed_at = new Date();
    activity.rejection_reason = reason;

    await this.activitiesRepository.save(activity);

    this.auditLogService
      .log({
        entity_type: 'activity',
        entity_id: activityId,
        action: 'reject',
        actor_id: reviewerId,
        old_value: { status: ActivityStatus.PENDING },
        new_value: { status: ActivityStatus.REJECTED, rejection_reason: reason },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

    // Phase 4-3 (M2): notify the activity owner with the rejection reason
    this.notifyActivityDecision(activityId, activity.user_id, 'rejected', reason);

    // Re-fetch with all relations for the response
    return this.activitiesRepository.findOneOrFail({
      where: { id: activityId },
      relations: ['user', 'area', 'activityType', 'reviewer'],
    });
  }

  /**
   * Validate that the reviewer has authority to approve/reject the activity (Phase 2C)
   *
   * Hierarchy rules:
   * - Korlap: Can approve Satgas and Linmas activities within their assigned area
   * - Kepala Rayon: Can approve Korlap and AdminData activities within their assigned rayon
   *
   * @param activity Activity to be approved/rejected (must have user and area loaded)
   * @param reviewer The user attempting to approve/reject
   * @throws ForbiddenException if reviewer lacks authority
   */
  private validateApprovalHierarchy(activity: Activity, reviewer: User): void {
    const submitterRole = activity.user?.role;

    if (reviewer.role === UserRole.KORLAP) {
      if (!['satgas', 'linmas'].includes(submitterRole)) {
        throw new ForbiddenException('Korlap hanya dapat menyetujui aktivitas satgas dan linmas');
      }
      if (!reviewer.area_id || activity.area_id !== reviewer.area_id) {
        throw new ForbiddenException('Anda hanya dapat menyetujui aktivitas di area Anda');
      }
    } else if (reviewer.role === UserRole.KEPALA_RAYON) {
      if (!reviewer.rayon_id) {
        throw new ForbiddenException('Akun Kepala Rayon Anda belum memiliki rayon');
      }
      if (!['korlap', 'admin_data'].includes(submitterRole)) {
        throw new ForbiddenException(
          'Kepala Rayon hanya dapat menyetujui aktivitas korlap dan admin data',
        );
      }
      if (submitterRole === 'korlap') {
        if (
          !activity.area ||
          !activity.area.rayon_id ||
          activity.area.rayon_id !== reviewer.rayon_id
        ) {
          throw new ForbiddenException('Anda hanya dapat menyetujui aktivitas di rayon Anda');
        }
      }
      if (submitterRole === 'admin_data') {
        if (!activity.user.rayon_id || activity.user.rayon_id !== reviewer.rayon_id) {
          throw new ForbiddenException('Anda hanya dapat menyetujui aktivitas di rayon Anda');
        }
      }
    } else {
      throw new ForbiddenException('Anda tidak memiliki wewenang untuk menyetujui aktivitas');
    }
  }

  /**
   * Convert photo_urls array to presigned URLs (Phase 2C)
   *
   * @param activity Activity with potentially non-presigned photo URLs
   * @returns Activity with presigned photo URLs (24 hour expiry for mobile caching)
   */
  private async convertPhotoUrlsToPresigned(activity: Activity): Promise<Activity> {
    // Convert photo_urls array
    if (activity.photo_urls && activity.photo_urls.length > 0) {
      try {
        activity.photo_urls = await Promise.all(
          activity.photo_urls.map((url) => this.s3Service.convertToPresignedUrl(url, 86400)),
        );
      } catch (error) {
        this.logger.error(
          `Failed to convert photo_urls for activity ${activity.id}: ${error.message}`,
        );
        // Keep original URLs on error
      }
    }

    return activity;
  }

  // ── ADR-038 (May 2026) — activity tagging ────────────────────────────────

  /**
   * Untag a user from an activity.
   *
   * Owner-only, before approval. Mirrors the 1-hour edit window posture in
   * `update`: tagging is part of authoring, and the activity becomes a
   * sealed record once it's approved.
   *
   * @param activityId Activity UUID
   * @param targetUserId User to remove from the tag list
   * @param requestingUserId Authenticated owner
   * @throws NotFoundException if activity or tag doesn't exist
   * @throws ForbiddenException if the requester isn't the owner
   * @throws BadRequestException if the activity is already approved
   */
  async untagUser(
    activityId: string,
    targetUserId: string,
    requestingUserId: string,
  ): Promise<void> {
    const activity = await this.activitiesRepository.findOne({
      where: { id: activityId },
    });
    if (!activity) {
      throw new NotFoundException(`Activity ${activityId} not found`);
    }
    if (activity.user_id !== requestingUserId) {
      throw new ForbiddenException('Only the activity owner can untag users');
    }
    if (activity.status === ActivityStatus.APPROVED) {
      throw new BadRequestException('Cannot untag users on an approved activity');
    }
    const result = await this.activityTagRepository.delete({
      activity_id: activityId,
      user_id: targetUserId,
    });
    if (!result.affected) {
      throw new NotFoundException(`User ${targetUserId} is not tagged on activity ${activityId}`);
    }
    this.logger.log(
      `Untagged user ${targetUserId} from activity ${activityId} by owner ${requestingUserId}`,
    );
  }

  /**
   * List the tag rows for an activity (with the user joined for display).
   * Caller is responsible for authorization — typically only invoked from
   * the controller after the standard activity-read scope check passes.
   */
  async findActivityTags(activityId: string): Promise<ActivityTag[]> {
    // 2026-05-23 audit (finding H1): project only the user columns the UI
    // renders. Previous `relations: ['user']` shape eager-loaded
    // phone_number, kecamatan_id, internal flags etc., leaking PII across
    // role boundaries.
    return this.activityTagRepository
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u')
      .addSelect(['u.id', 'u.username', 'u.full_name', 'u.role', 'u.profile_picture_url'])
      .where('t.activity_id = :activityId', { activityId })
      .orderBy('t.created_at', 'ASC')
      .getMany();
  }
}
