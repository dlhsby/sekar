import {
  Injectable,
  Logger,
  HttpStatus,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Activity, ActivityStatus } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { S3Service } from '../../shared/services/s3.service';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { UsersService } from '../users/users.service';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ACTIVITY_SUBMITTERS, MONITORING_CITY } from '../users/constants/role-groups';
import { AuditLogService } from '../audit/audit.service';

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
    private s3Service: S3Service,
    private readonly usersService: UsersService,
    private readonly auditLogService: AuditLogService,
  ) {}

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
    });

    const savedActivity = await this.activitiesRepository.save(activity);
    this.logger.log(`Activity created successfully: ${savedActivity.id}`);

    this.auditLogService
      .log({
        entity_type: 'activity',
        entity_id: savedActivity.id,
        action: 'create',
        actor_id: userId,
        new_value: { activity_type_id: dto.activity_type_id, area_id: savedActivity.area_id },
      })
      .catch((err) => this.logger.error(`Audit log failed: ${err.message}`));

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

    // Scope-based filtering (specific roles first, then generic groups)
    if (user.role === UserRole.KORLAP) {
      queryBuilder.andWhere('activity.area_id = :areaId', { areaId: user.area_id });
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
      if (activity.area_id !== user.area_id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.ACTIVITY_ACCESS_DENIED,
          'You can only access activities from your assigned area',
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
}
