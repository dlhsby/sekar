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
import { Activity } from './entities/activity.entity';
import { CreateActivityDto } from './dto/create-activity.dto';
import { UpdateActivityDto } from './dto/update-activity.dto';
import { S3Service } from '../../shared/services/s3.service';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  ACTIVITY_SUBMITTERS,
  MONITORING_CITY,
} from '../users/constants/role-groups';

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
  async createActivity(userId: string, userRole: UserRole, dto: CreateActivityDto): Promise<Activity> {
    this.logger.log(`User ${userId} (${userRole}) creating activity with activity type ${dto.activity_type_id}`);

    // 1. Auto-detect active shift
    const activeShift = await this.shiftsRepository.findOne({
      where: { user_id: userId, clock_out_time: IsNull() },
      relations: ['area'],
    });

    if (!activeShift) {
      throw new BadRequestException('No active shift found. Please clock in first before submitting activity.');
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
      from_date?: string;
      to_date?: string;
    },
    user: User,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Activity>> {
    const queryBuilder = this.activitiesRepository
      .createQueryBuilder('activity')
      .leftJoinAndSelect('activity.user', 'user')
      .leftJoinAndSelect('activity.shift', 'shift')
      .leftJoinAndSelect('shift.area', 'area');

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

    if (filters.from_date && filters.to_date) {
      queryBuilder.andWhere('activity.created_at BETWEEN :fromDate AND :toDate', {
        fromDate: new Date(filters.from_date),
        toDate: new Date(filters.to_date),
      });
    } else if (filters.from_date) {
      queryBuilder.andWhere('activity.created_at >= :fromDate', {
        fromDate: new Date(filters.from_date),
      });
    }

    // Pagination
    queryBuilder
      .orderBy('activity.created_at', 'DESC')
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
      relations: ['user', 'shift', 'shift.area'],
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
      relations: ['user', 'shift', 'shift.area', 'shift.area.rayon'],
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
  async update(
    id: string,
    dto: UpdateActivityDto,
    userId: string,
  ): Promise<Activity> {
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
        this.logger.error(`Failed to convert photo_urls for activity ${activity.id}: ${error.message}`);
        // Keep original URLs on error
      }
    }

    return activity;
  }
}
