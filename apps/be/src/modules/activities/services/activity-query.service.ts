import { Injectable, Logger, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { Activity, ActivityStatus } from '../entities/activity.entity';
import { S3Service } from '../../../shared/services/s3.service';
import { User, UserRole } from '../../users/entities/user.entity';
import { ApiException } from '../../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../../common/dto/pagination.dto';
import { ACTIVITY_SUBMITTERS } from '../../users/constants/role-groups';

export interface ActivityListFilters {
  user_id?: string;
  shift_id?: string;
  location_id?: string;
  district_id?: string;
  activity_type_id?: string;
  from_date?: string;
  to_date?: string;
  status?: ActivityStatus;
  sort_by?: string;
  sort_dir?: string;
  // ADR-038 (May 2026) — return activities where the current user is the
  // owner OR appears in `activity_tags`. When set, this overrides the
  // default role-based scope so tagged satgas/linmas see activities filed
  // for them by korlap/admin_rayon even outside their own area.
  involving_me?: boolean;
}

const ACTIVITY_DETAIL_RELATIONS = [
  'user',
  'shift',
  'shift.area',
  'area',
  'activityType',
  'reviewer',
];

/**
 * Hard cap on the "my activities" list. Without a date it would otherwise load a
 * worker's ENTIRE history in one query; combined with the old full-payload select
 * that was an OOM path (F9). The list is day-oriented in the UI, so this ceiling
 * is never reached in normal use — it only bounds the pathological case.
 */
const MY_ACTIVITIES_MAX = 200;

/**
 * Read side of activities: filtered/paginated/role-scoped listings, detail
 * lookup with scope checks, and presigned photo URL conversion.
 */
@Injectable()
export class ActivityQueryService {
  private readonly logger = new Logger(ActivityQueryService.name);

  constructor(
    @InjectRepository(Activity)
    private readonly activitiesRepository: Repository<Activity>,
    private readonly s3Service: S3Service,
  ) {}

  /** Find all activities with pagination, filters, and scope-based access (Phase 2C). */
  async findAllPaginated(
    filters: ActivityListFilters,
    user: User,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Activity>> {
    const queryBuilder = this.buildListQuery();
    await this.applyAccessScope(queryBuilder, filters, user);
    this.applyEntityFilters(queryBuilder, filters);
    this.applyDateRange(queryBuilder, filters);
    this.applySortAndPagination(queryBuilder, filters, page, limit);

    // List responses carry photo_count, NOT the photo payload (F9) — see
    // buildListQuery / attachPhotoCount. No presigning here: there are no URLs to sign.
    const total = await queryBuilder.getCount();
    const { entities, raw } = await queryBuilder.getRawAndEntities();
    const data = this.attachPhotoCount(entities, raw);
    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Find a user's own activities (my activities). Bounded and photo-payload-free:
   * an unbounded `find()` returning full data-URI `photo_urls` was a direct OOM
   * path (F9). Callers that need the actual photos open the detail read.
   */
  async findMyActivities(userId: string, date?: string): Promise<Activity[]> {
    const qb = this.buildListQuery()
      .where('activity.user_id = :userId', { userId })
      .orderBy('activity.created_at', 'DESC')
      .take(MY_ACTIVITIES_MAX);
    const bounds = this.createdAtBounds(date);
    if (bounds) {
      qb.andWhere('activity.created_at BETWEEN :from AND :to', bounds);
    }
    const { entities, raw } = await qb.getRawAndEntities();
    return this.attachPhotoCount(entities, raw);
  }

  /** Find activity by ID with scope-based access control (Phase 2C). */
  async findOne(id: string, user: User): Promise<Activity> {
    const activity = await this.activitiesRepository.findOne({
      where: { id },
      relations: ACTIVITY_DETAIL_RELATIONS,
    });
    if (!activity) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.ACTIVITY_NOT_FOUND,
        `Activity not found: ${id}`,
      );
    }
    await this.assertReadScope(activity, user);
    return this.convertPhotoUrlsToPresigned(activity);
  }

  /**
   * Resolve the set of area UUIDs a korlap is permanently assigned to via
   * `user_areas`. Falls back to `[user.location_id]` if no row exists, so legacy
   * single-area users keep working before backfill.
   */
  async getKorlapAreaIds(user: User): Promise<string[]> {
    const rows: Array<{ location_id: string }> = await this.activitiesRepository.manager.query(
      `SELECT location_id FROM user_locations
        WHERE user_id = $1 AND assignment_type = 'permanent'`,
      [user.id],
    );
    const ids = rows.map((r) => r.location_id);
    if (ids.length > 0) return ids;
    return user.location_id ? [user.location_id] : [];
  }

  /**
   * Convert photo_urls to presigned URLs (24 hour expiry for mobile caching).
   * Keeps original URLs when conversion fails.
   */
  async convertPhotoUrlsToPresigned(activity: Activity): Promise<Activity> {
    if (activity.photo_urls && activity.photo_urls.length > 0) {
      try {
        activity.photo_urls = await Promise.all(
          activity.photo_urls.map((url) => this.s3Service.convertToPresignedUrl(url, 86400)),
        );
      } catch (error) {
        this.logger.error(
          `Failed to convert photo_urls for activity ${activity.id}: ${error.message}`,
        );
      }
    }
    return activity;
  }

  /**
   * List query for activities. Selects every activity column EXCEPT the
   * `photo_urls` payload — a page of rows carrying inline base64 data-URIs was a
   * direct OOM path (F9) — and computes `cardinality(photo_urls)` as a cheap
   * scalar the DB never has to ship. `attachPhotoCount` maps it onto the entities.
   * The column list comes from entity metadata so a future column is included
   * automatically (and only `photo_urls` is ever dropped).
   */
  private buildListQuery(): SelectQueryBuilder<Activity> {
    const scalarCols = this.activitiesRepository.metadata.columns
      .filter((c) => c.databaseName !== 'photo_urls')
      .map((c) => `activity.${c.propertyName}`);

    return this.activitiesRepository
      .createQueryBuilder('activity')
      .select(scalarCols)
      .addSelect('COALESCE(cardinality(activity.photo_urls), 0)', 'activity_photo_count')
      .leftJoinAndSelect('activity.user', 'user')
      .leftJoinAndSelect('activity.shift', 'shift')
      .leftJoinAndSelect('shift.area', 'shiftArea')
      .leftJoinAndSelect('activity.area', 'area')
      .leftJoinAndSelect('activity.activityType', 'activityType')
      .leftJoinAndSelect('activity.reviewer', 'reviewer');
  }

  /**
   * Map the computed `activity_photo_count` raw column onto each entity and blank
   * the payload. Raw rows are 1:1 with entities here — every activity relation is
   * to-one, so no fan-out. Keeping `photo_urls: []` (not undefined) preserves the
   * array contract for any client still reading `.length`.
   */
  private attachPhotoCount(entities: Activity[], raw: Array<Record<string, unknown>>): Activity[] {
    entities.forEach((activity, i) => {
      activity.photo_count = Number(raw[i]?.activity_photo_count ?? 0);
      activity.photo_urls = [];
    });
    return entities;
  }

  /**
   * Listing scope: involving_me (owner OR tagged) overrides the role scope;
   * otherwise korlap sees their assigned areas, kepala_rayon/admin_rayon their
   * district, submitters their own rows. ADMIN_SYSTEM / SUPERADMIN /
   * MANAGEMENT see all.
   */
  private async applyAccessScope(
    queryBuilder: SelectQueryBuilder<Activity>,
    filters: ActivityListFilters,
    user: User,
  ): Promise<void> {
    if (filters.involving_me) {
      // Sub-select keeps the join out of the main row set so pagination
      // counts stay correct (one activity row even if N tags hit).
      queryBuilder.andWhere(
        `(activity.user_id = :involvingUserId OR EXISTS (
          SELECT 1 FROM activity_tags at
          WHERE at.activity_id = activity.id AND at.user_id = :involvingUserId
        ))`,
        { involvingUserId: user.id },
      );
      return;
    }
    if (user.role === UserRole.KORLAP) {
      return this.applyKorlapScope(queryBuilder, user);
    }
    if (user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_RAYON) {
      queryBuilder.andWhere('area.district_id = :districtId', { districtId: user.district_id });
      return;
    }
    if (ACTIVITY_SUBMITTERS.includes(user.role as UserRole)) {
      queryBuilder.andWhere('activity.user_id = :userId', { userId: user.id });
    }
  }

  /**
   * Korlap may have multiple permanent areas via `user_areas` (e.g.
   * korlap_pusat_1 → all 13 Rayon Pusat areas); the legacy single
   * `user.location_id` only reflects their primary area.
   */
  private async applyKorlapScope(
    queryBuilder: SelectQueryBuilder<Activity>,
    user: User,
  ): Promise<void> {
    const korlapAreaIds = await this.getKorlapAreaIds(user);
    if (korlapAreaIds.length === 0) {
      queryBuilder.andWhere('1=0');
      return;
    }
    queryBuilder.andWhere('activity.location_id IN (:...korlapAreaIds)', { korlapAreaIds });
  }

  private applyEntityFilters(
    queryBuilder: SelectQueryBuilder<Activity>,
    filters: ActivityListFilters,
  ): void {
    if (filters.user_id) {
      queryBuilder.andWhere('activity.user_id = :userId', { userId: filters.user_id });
    }
    if (filters.shift_id) {
      queryBuilder.andWhere('activity.shift_id = :shiftId', { shiftId: filters.shift_id });
    }
    if (filters.location_id) {
      queryBuilder.andWhere('activity.location_id = :filterAreaId', {
        filterAreaId: filters.location_id,
      });
    }
    if (filters.district_id) {
      queryBuilder.andWhere('area.district_id = :filterDistrictId', {
        filterDistrictId: filters.district_id,
      });
    }
    if (filters.activity_type_id) {
      queryBuilder.andWhere('activity.activity_type_id = :activityTypeId', {
        activityTypeId: filters.activity_type_id,
      });
    }
    if (filters.status) {
      queryBuilder.andWhere('activity.status = :status', { status: filters.status });
    }
  }

  private applyDateRange(
    queryBuilder: SelectQueryBuilder<Activity>,
    filters: ActivityListFilters,
  ): void {
    if (!filters.from_date && !filters.to_date) return;
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

  private applySortAndPagination(
    queryBuilder: SelectQueryBuilder<Activity>,
    filters: ActivityListFilters,
    page: number,
    limit: number,
  ): void {
    const sortField = filters.sort_by ?? 'created_at';
    const sortDir = (filters.sort_dir?.toUpperCase() ?? 'DESC') as 'ASC' | 'DESC';
    queryBuilder
      .orderBy(`activity.${sortField}`, sortDir)
      .skip((page - 1) * limit)
      .take(limit);
  }

  /** The [start, end] of a single day, or null when no date is given. */
  private createdAtBounds(date?: string): { from: Date; to: Date } | null {
    if (!date) return null;
    const from = new Date(date);
    from.setHours(0, 0, 0, 0);
    const to = new Date(date);
    to.setHours(23, 59, 59, 999);
    return { from, to };
  }

  private async assertReadScope(activity: Activity, user: User): Promise<void> {
    if (user.role === UserRole.KORLAP) {
      return this.assertKorlapReadScope(activity, user);
    }
    if (user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_RAYON) {
      return this.assertDistrictReadScope(activity, user);
    }
    if (ACTIVITY_SUBMITTERS.includes(user.role as UserRole) && activity.user_id !== user.id) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.ACTIVITY_ACCESS_DENIED,
        'You can only access your own activities',
      );
    }
    // ADMIN_SYSTEM, SUPERADMIN, MANAGEMENT can see all activities
  }

  private async assertKorlapReadScope(activity: Activity, user: User): Promise<void> {
    const korlapAreaIds = await this.getKorlapAreaIds(user);
    if (!activity.location_id || !korlapAreaIds.includes(activity.location_id)) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.ACTIVITY_ACCESS_DENIED,
        'You can only access activities from your assigned areas',
      );
    }
  }

  private assertDistrictReadScope(activity: Activity, user: User): void {
    if (activity.shift?.area?.district_id !== user.district_id) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.ACTIVITY_ACCESS_DENIED,
        'You can only access activities from your assigned district',
      );
    }
  }
}
