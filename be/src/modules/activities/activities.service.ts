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
import { Repository, IsNull } from 'typeorm';
import { Activity, ActivityStatus } from './entities/activity.entity';
import { ActivityTag } from './entities/activity-tag.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { TaskTypeRegistry } from '../tasks/registry/task-type-registry';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { ActivityPlantItem } from '../plants/entities/activity-plant-item.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { AuditLogService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { NotificationType } from '../notifications/entities/notification.entity';
import { ActivityQueryService, ActivityListFilters } from './services/activity-query.service';

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
 * Activities façade: creation (shift detection, type/role validation, plant
 * items, ADR-038 tagging), the 1-hour edit window, the approve/reject review
 * workflow and tag management. Read paths live in ActivityQueryService
 * behind this unchanged public API.
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
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
    // Audit M7 (2026-05-23): validate `custom_fields` against the registry
    // schema on the activity side too — previously only TasksService called
    // it, so the same column accepted any JSON when reached via /activities.
    private readonly taskTypeRegistry: TaskTypeRegistry,
    private readonly queryService: ActivityQueryService,
    // Phase 4-3 (M2): activity approve/reject FCM notifications. Optional so
    // legacy specs that don't provide NotificationsService keep working — the
    // prod app wires it via NotificationsModule import in ActivitiesModule.
    @Optional()
    private readonly notificationsService?: NotificationsService,
  ) {}

  /**
   * Create a new activity (Phase 2C): auto-detects the active shift and
   * validates the activity type against the user's role.
   */
  async createActivity(
    userId: string,
    userRole: UserRole,
    dto: CreateActivityDto,
  ): Promise<Activity> {
    this.logger.log(
      `User ${userId} (${userRole}) creating activity with activity type ${dto.activity_type_id}`,
    );
    const activeShift = await this.getActiveShiftOrFail(userId);
    await this.assertActivityTypeAllowed(dto.activity_type_id, userRole);
    this.validateCustomFields(dto);

    const savedActivity = await this.activitiesRepository.save(
      this.buildActivity(userId, activeShift, dto),
    );
    this.logger.log(`Activity created successfully: ${savedActivity.id}`);

    await this.savePlantItems(savedActivity.id, dto.plant_items);
    await this.saveTagsAndNotify(savedActivity.id, userId, dto.tagged_user_ids);
    this.auditCreate(savedActivity, userId, dto);
    await this.cascadePruningRequestDone(dto.pruning_request_id, savedActivity.id);
    return savedActivity;
  }

  private async getActiveShiftOrFail(userId: string): Promise<Shift> {
    const activeShift = await this.shiftsRepository.findOne({
      where: { user_id: userId, clock_out_time: IsNull() },
      relations: ['area'],
    });
    if (!activeShift) {
      throw new BadRequestException(
        'No active shift found. Please clock in first before submitting activity.',
      );
    }
    return activeShift;
  }

  private async assertActivityTypeAllowed(
    activityTypeId: string,
    userRole: UserRole,
  ): Promise<void> {
    const activityType = await this.activityTypeRepository.findOne({
      where: { id: activityTypeId, is_active: true },
    });
    if (!activityType) {
      throw new NotFoundException(`Activity type not found or inactive: ${activityTypeId}`);
    }
    if (!activityType.applicable_roles.includes(userRole)) {
      throw new ForbiddenException(
        `Activity type "${activityType.name}" is not available for your role. Allowed roles: ${activityType.applicable_roles.join(', ')}`,
      );
    }
  }

  /**
   * Audit M7 (2026-05-23): the activity's case_type acts as the routing key —
   * when present, fields must satisfy the pruning schema (ADR-031). Unknown /
   * unset case_type falls through to the generic passthrough schema (no-op).
   */
  private validateCustomFields(dto: CreateActivityDto): void {
    if (dto.custom_fields === undefined || dto.custom_fields === null) return;
    const registryType = dto.case_type ? 'pruning' : 'generic';
    try {
      this.taskTypeRegistry.validate(registryType, dto.custom_fields);
    } catch {
      throw new BadRequestException(
        `custom_fields is invalid for an activity with case_type "${dto.case_type ?? 'none'}". Check required fields per ADR-031.`,
      );
    }
  }

  private buildActivity(userId: string, activeShift: Shift, dto: CreateActivityDto): Activity {
    return this.activitiesRepository.create({
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
  }

  /** Phase 3: persist plant item line-items when provided. */
  private async savePlantItems(
    activityId: string,
    items?: CreateActivityDto['plant_items'],
  ): Promise<void> {
    if (!items?.length) return;
    const plantItemEntities = items.map((item) =>
      this.plantItemRepository.create({
        activityId,
        speciesId: item.species_id,
        count: item.count,
        notes: item.notes ?? null,
      }),
    );
    await this.plantItemRepository.save(plantItemEntities);
    this.logger.log(`Saved ${plantItemEntities.length} plant items for activity ${activityId}`);
  }

  /**
   * ADR-038 (May 2026): persist tag rows for involved users. Dedups the
   * input and silently drops the owner's own id — self-tagging is a no-op,
   * not an error.
   */
  private async saveTagsAndNotify(
    activityId: string,
    ownerId: string,
    taggedUserIds?: string[],
  ): Promise<void> {
    if (!taggedUserIds?.length) return;
    const uniqueIds = Array.from(new Set(taggedUserIds)).filter((id) => id !== ownerId);
    if (uniqueIds.length === 0) return;

    const tagEntities = uniqueIds.map((taggedUserId) =>
      this.activityTagRepository.create({
        activity_id: activityId,
        user_id: taggedUserId,
        tagged_by: ownerId,
      }),
    );
    await this.activityTagRepository.save(tagEntities);
    this.logger.log(`Tagged ${tagEntities.length} users on activity ${activityId}`);
    this.notifyTaggedUsers(activityId, uniqueIds);
  }

  /**
   * Phase 4-3 (ADR-038): FCM push to each tagged user. Fire-and-forget — a
   * dispatch failure must never abort activity creation.
   */
  private notifyTaggedUsers(activityId: string, userIds: string[]): void {
    if (!this.notificationsService) return;
    for (const taggedUserId of userIds) {
      this.notificationsService
        .sendToUser({
          user_id: taggedUserId,
          title: 'Anda ditandai di aktivitas',
          body: 'Anda ditandai sebagai petugas yang terlibat pada sebuah aktivitas.',
          type: NotificationType.ACTIVITY_TAGGED,
          data: { activity_id: activityId },
        })
        .catch((err) =>
          this.logger.error(
            `Failed to enqueue activity-tag notification for ${taggedUserId}: ${err.message}`,
          ),
        );
    }
  }

  private auditCreate(activity: Activity, userId: string, dto: CreateActivityDto): void {
    this.auditLogService
      .log({
        entity_type: 'activity',
        entity_id: activity.id,
        action: 'create',
        actor_id: userId,
        new_value: {
          activity_type_id: dto.activity_type_id,
          area_id: activity.area_id,
          case_type: dto.case_type,
          reference_code: activity.referenceCode,
        },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }

  /**
   * Cascade to the linked pruning_request when the activity references one.
   * Closes the loop on the no-task path (kecamatan request → korlap files a
   * direct activity tagged to the request). On the task path the
   * TasksService.complete cascade already fires by `assigned_task_id`; this
   * UPDATE is idempotent so a double-hit on the same row is fine.
   * Best-effort — a failed cascade never aborts the activity creation.
   */
  private async cascadePruningRequestDone(
    pruningRequestId: string | undefined,
    activityId: string,
  ): Promise<void> {
    if (!pruningRequestId) return;
    try {
      await this.activitiesRepository.manager.query(
        `UPDATE pruning_requests
         SET status = 'done', updated_at = NOW()
         WHERE id = $1 AND status NOT IN ('done', 'rejected', 'cancelled')`,
        [pruningRequestId],
      );
      this.logger.log(
        `Cascaded pruning_request ${pruningRequestId} → done via activity ${activityId}`,
      );
    } catch (err) {
      this.logger.error(
        `Activity → pruning_request cascade failed for request ${pruningRequestId}: ${(err as Error).message}`,
      );
    }
  }

  /** Find all activities with pagination and scope (delegated to query service). */
  findAllPaginated(
    filters: ActivityListFilters,
    user: User,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Activity>> {
    return this.queryService.findAllPaginated(filters, user, page, limit);
  }

  /** Find all activities for a specific user (delegated to query service). */
  findMyActivities(userId: string, date?: string): Promise<Activity[]> {
    return this.queryService.findMyActivities(userId, date);
  }

  /** Find activity by ID with scope checks (delegated to query service). */
  findOne(id: string, user: User): Promise<Activity> {
    return this.queryService.findOne(id, user);
  }

  /** Update activity (owner only, within 1 hour of creation). */
  async update(id: string, dto: UpdateActivityDto, userId: string): Promise<Activity> {
    const activity = await this.loadOwnedEditable(id, userId);
    return this.activitiesRepository.save({
      ...activity,
      description: dto.description || activity.description,
      photo_urls: dto.photo_urls || activity.photo_urls,
    });
  }

  private async loadOwnedEditable(id: string, userId: string): Promise<Activity> {
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
    if (activity.user_id !== userId) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.ACTIVITY_ACCESS_DENIED,
        'You can only update your own activities',
      );
    }
    this.assertWithinEditWindow(activity);
    return activity;
  }

  private assertWithinEditWindow(activity: Activity): void {
    const hoursSinceCreation = (Date.now() - activity.created_at.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 1) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.ACTIVITY_EDIT_WINDOW_CLOSED,
        'Activities can only be updated within 1 hour of creation',
      );
    }
  }

  /** Delete activity (admin only). */
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
   * Approve a pending activity (Phase 2C). Korlap approves satgas/linmas in
   * their area; Kepala Rayon approves korlap/admin_data in their rayon.
   */
  async approveActivity(activityId: string, reviewerId: string): Promise<Activity> {
    const activity = await this.loadPendingForReview(activityId, reviewerId);
    await this.assertReviewerAuthority(activity, reviewerId);

    await this.activitiesRepository.save({
      ...activity,
      status: ActivityStatus.APPROVED,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
    });
    this.auditDecision(activityId, reviewerId, 'approve', {
      status: ActivityStatus.APPROVED,
      reviewed_by: reviewerId,
    });
    // Phase 4-3 (M2): notify the activity owner
    this.notifyActivityDecision(activityId, activity.user_id, 'approved');
    return this.reloadForResponse(activityId);
  }

  /** Reject a pending activity with a required reason (Phase 2C). */
  async rejectActivity(activityId: string, reviewerId: string, reason: string): Promise<Activity> {
    const activity = await this.loadPendingForReview(activityId, reviewerId);
    await this.assertReviewerAuthority(activity, reviewerId);

    await this.activitiesRepository.save({
      ...activity,
      status: ActivityStatus.REJECTED,
      reviewed_by: reviewerId,
      reviewed_at: new Date(),
      rejection_reason: reason,
    });
    this.auditDecision(activityId, reviewerId, 'reject', {
      status: ActivityStatus.REJECTED,
      rejection_reason: reason,
    });
    // Phase 4-3 (M2): notify the activity owner with the rejection reason
    this.notifyActivityDecision(activityId, activity.user_id, 'rejected', reason);
    return this.reloadForResponse(activityId);
  }

  private async loadPendingForReview(activityId: string, reviewerId: string): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id: activityId },
      relations: ['user', 'area'],
    });
    if (!activity) {
      throw new NotFoundException('Activity not found');
    }
    if (activity.status !== ActivityStatus.PENDING) {
      throw new BadRequestException('The activity has already been processed');
    }
    if (activity.user_id === reviewerId) {
      throw new ForbiddenException('You cannot review your own activity');
    }
    return activity;
  }

  private async assertReviewerAuthority(activity: Activity, reviewerId: string): Promise<void> {
    const reviewer = await this.usersService.findOne(reviewerId);
    this.validateApprovalHierarchy(activity, reviewer);
  }

  /**
   * Hierarchy rules (Phase 2C): Korlap approves satgas/linmas within their
   * area; Kepala Rayon approves korlap/admin_data within their rayon.
   */
  private validateApprovalHierarchy(activity: Activity, reviewer: User): void {
    if (reviewer.role === UserRole.KORLAP) {
      return this.assertKorlapApprovalScope(activity, reviewer);
    }
    if (reviewer.role === UserRole.KEPALA_RAYON) {
      return this.assertKepalaRayonApprovalScope(activity, reviewer);
    }
    throw new ForbiddenException('You are not authorized to approve activities');
  }

  private assertKorlapApprovalScope(activity: Activity, reviewer: User): void {
    if (!['satgas', 'linmas'].includes(activity.user?.role)) {
      throw new ForbiddenException('Korlap can only approve satgas and linmas activities');
    }
    if (!reviewer.area_id || activity.area_id !== reviewer.area_id) {
      throw new ForbiddenException('You can only approve activities in your area');
    }
  }

  private assertKepalaRayonApprovalScope(activity: Activity, reviewer: User): void {
    if (!reviewer.rayon_id) {
      throw new ForbiddenException('Your Kepala Rayon account has no rayon assigned');
    }
    const submitterRole = activity.user?.role;
    if (!['korlap', 'admin_data'].includes(submitterRole)) {
      throw new ForbiddenException(
        'Kepala Rayon hanya dapat menyetujui aktivitas korlap dan admin data',
      );
    }
    if (submitterRole === 'korlap' && activity.area?.rayon_id !== reviewer.rayon_id) {
      throw new ForbiddenException('You can only approve activities in your rayon');
    }
    if (
      submitterRole === 'admin_data' &&
      (!activity.user.rayon_id || activity.user.rayon_id !== reviewer.rayon_id)
    ) {
      throw new ForbiddenException('You can only approve activities in your rayon');
    }
  }

  private auditDecision(
    activityId: string,
    reviewerId: string,
    action: 'approve' | 'reject',
    newValue: Record<string, unknown>,
  ): void {
    this.auditLogService
      .log({
        entity_type: 'activity',
        entity_id: activityId,
        action,
        actor_id: reviewerId,
        old_value: { status: ActivityStatus.PENDING },
        new_value: newValue,
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));
  }

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

  /** Re-fetch with all relations for the review response. */
  private reloadForResponse(activityId: string): Promise<Activity> {
    return this.activitiesRepository.findOneOrFail({
      where: { id: activityId },
      relations: ['user', 'area', 'activityType', 'reviewer'],
    });
  }

  // ── ADR-038 (May 2026) — activity tagging ────────────────────────────────

  /**
   * Untag a user from an activity. Owner-only, before approval — mirrors the
   * 1-hour edit window posture in `update`: tagging is part of authoring,
   * and the activity becomes a sealed record once it's approved.
   */
  async untagUser(
    activityId: string,
    targetUserId: string,
    requestingUserId: string,
  ): Promise<void> {
    const activity = await this.activitiesRepository.findOne({ where: { id: activityId } });
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
   * List the tag rows for an activity (user joined for display). Caller is
   * responsible for authorization — typically invoked from the controller
   * after the standard activity-read scope check passes.
   */
  async findActivityTags(activityId: string): Promise<ActivityTag[]> {
    // 2026-05-23 audit (finding H1): project only the user columns the UI
    // renders; eager `relations: ['user']` leaked PII across role boundaries.
    return this.activityTagRepository
      .createQueryBuilder('t')
      .leftJoin('t.user', 'u')
      .addSelect(['u.id', 'u.username', 'u.full_name', 'u.role', 'u.profile_picture_url'])
      .where('t.activity_id = :activityId', { activityId })
      .orderBy('t.created_at', 'ASC')
      .getMany();
  }
}
