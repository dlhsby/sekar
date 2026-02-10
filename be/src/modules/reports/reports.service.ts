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
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReportJsonDto } from './dto/create-report-json.dto';
import { CreateAktivitasDto } from './dto/create-aktivitas.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { S3Service } from '../../shared/services/s3.service';
import { Shift } from '../shifts/entities/shift.entity';
import { ActivityType } from '../activity-types/entities/activity-type.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import {
  AKTIVITAS_SUBMITTERS,
  MONITORING_AREA,
  MONITORING_RAYON,
  MONITORING_CITY,
} from '../users/constants/role-groups';

/**
 * Reports Service
 *
 * Handles business logic for work reports including photo uploads,
 * shift validation, and ownership verification.
 */
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    @InjectRepository(Report)
    private reportsRepository: Repository<Report>,
    @InjectRepository(Shift)
    private shiftsRepository: Repository<Shift>,
    @InjectRepository(ActivityType)
    private activityTypeRepository: Repository<ActivityType>,
    private s3Service: S3Service,
  ) {}

  /**
   * Create a new work report with optional photo upload
   *
   * @param dto Report creation data
   * @param file Photo file (optional)
   * @param workerId UUID of the worker creating the report
   * @returns Created report
   */
  async create(
    dto: CreateReportDto,
    file: Express.Multer.File | undefined,
    workerId: string,
  ): Promise<Report> {
    this.logger.log(`Worker ${workerId} creating report for shift ${dto.shift_id}`);

    // Validate shift exists and belongs to worker
    const shift = await this.shiftsRepository.findOne({
      where: { id: dto.shift_id, worker_id: workerId },
      relations: ['worker', 'area'],
    });

    if (!shift) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.REPORT_SHIFT_NOT_FOUND,
        `Shift not found or does not belong to worker ${workerId}`,
      );
    }

    // Validate shift is active (clock_in but no clock_out)
    if (shift.clock_out_time) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.REPORT_SHIFT_REQUIRED,
        'Cannot create report for completed shift. Reports must be created during active shifts.',
      );
    }

    // Upload photo to S3 if provided
    let photoUrl: string | undefined;
    if (file) {
      const key = this.s3Service.generateKey('reports', `${uuidv4()}-${file.originalname}`);
      photoUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
      this.logger.log(`Photo uploaded to S3: ${photoUrl}`);
    }

    // Create report
    const report = this.reportsRepository.create({
      worker_id: workerId,
      shift_id: dto.shift_id,
      area_id: shift.area_id,
      report_type: dto.report_type,
      description: dto.description,
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
      photo_url: photoUrl,
      // Phase 2 fields
      task_id: dto.task_id,
      activity_type_id: dto.activity_type_id,
    });

    const savedReport = await this.reportsRepository.save(report);
    this.logger.log(`Report created successfully: ${savedReport.id}`);

    return savedReport;
  }

  /**
   * Create a new work report from JSON with base64 photos
   * Used by mobile app which sends photos as base64 strings
   *
   * @param dto Report creation data with optional base64 photos
   * @param workerId UUID of the worker creating the report
   * @param file Optional file from multipart upload (for backward compatibility)
   * @returns Created report
   */
  async createFromJson(
    dto: CreateReportJsonDto,
    workerId: string,
    file?: Express.Multer.File,
  ): Promise<Report> {
    this.logger.log(`Worker ${workerId} creating report (JSON) for shift ${dto.shift_id}`);

    // Validate shift exists and belongs to worker
    const shift = await this.shiftsRepository.findOne({
      where: { id: dto.shift_id, worker_id: workerId },
      relations: ['worker', 'area'],
    });

    if (!shift) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.REPORT_SHIFT_NOT_FOUND,
        `Shift not found or does not belong to worker ${workerId}`,
      );
    }

    // Validate shift is active (clock_in but no clock_out)
    if (shift.clock_out_time) {
      throw new ApiException(
        HttpStatus.BAD_REQUEST,
        ApiErrorCode.REPORT_SHIFT_REQUIRED,
        'Cannot create report for completed shift. Reports must be created during active shifts.',
      );
    }

    // Handle photo upload - prefer file upload, fall back to base64
    let photoUrl: string | undefined;

    if (file) {
      // Handle multipart file upload
      const key = this.s3Service.generateKey('reports', `${uuidv4()}-${file.originalname}`);
      photoUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
      this.logger.log(`Photo uploaded to S3 (file): ${photoUrl}`);
    } else if (dto.photos && dto.photos.length > 0) {
      // Handle base64 photos - upload first photo (can extend to support multiple)
      const firstPhoto = dto.photos[0];
      const photoBuffer = this.decodeBase64Photo(firstPhoto);
      const key = this.s3Service.generateKey('reports', `${uuidv4()}.jpg`);
      photoUrl = await this.s3Service.uploadFile(photoBuffer, key, 'image/jpeg');
      this.logger.log(`Photo uploaded to S3 (base64): ${photoUrl}`);
    }

    // Create report
    const report = this.reportsRepository.create({
      worker_id: workerId,
      shift_id: dto.shift_id,
      area_id: shift.area_id,
      report_type: dto.report_type,
      description: dto.description,
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
      photo_url: photoUrl,
      // Phase 2 fields
      task_id: dto.task_id,
      activity_type_id: dto.activity_type_id,
    });

    const savedReport = await this.reportsRepository.save(report);
    this.logger.log(`Report created successfully (JSON): ${savedReport.id}`);

    return savedReport;
  }

  /**
   * Decode base64 photo string to Buffer
   * Handles both data URI format and raw base64
   */
  private decodeBase64Photo(base64String: string): Buffer {
    // Remove data URI prefix if present
    const base64Data = base64String.replace(/^data:image\/\w+;base64,/, '');
    return Buffer.from(base64Data, 'base64');
  }

  /**
   * Create a new aktivitas (Phase 2C)
   * Auto-detects active shift and validates activity type against user role
   *
   * @param userId UUID of the user creating the aktivitas
   * @param userRole Role of the user
   * @param dto Aktivitas creation data
   * @returns Created report
   */
  async createAktivitas(userId: string, userRole: UserRole, dto: CreateAktivitasDto): Promise<Report> {
    this.logger.log(`User ${userId} (${userRole}) creating aktivitas with activity type ${dto.activity_type_id}`);

    // 1. Auto-detect active shift
    const activeShift = await this.shiftsRepository.findOne({
      where: { worker_id: userId, clock_out_time: IsNull() },
      relations: ['area'],
    });

    if (!activeShift) {
      throw new BadRequestException('No active shift found. Please clock in first before submitting aktivitas.');
    }

    // 2. Validate activity_type exists and is active
    const activityType = await this.activityTypeRepository.findOne({
      where: { id: dto.activity_type_id, is_active: true },
    });

    if (!activityType) {
      throw new NotFoundException(`Activity type not found or inactive: ${dto.activity_type_id}`);
    }

    // 3. Validate activity type is applicable to user's role
    // Note: applicable_roles in DB uses PascalCase (Worker, Linmas)
    // UserRole enum values are UPPERCASE (SATGAS, LINMAS)
    // We need to map the role properly
    const roleMapping: Record<string, string[]> = {
      [UserRole.SATGAS]: ['Worker', 'Satgas'], // Legacy support
      [UserRole.LINMAS]: ['Linmas'],
      [UserRole.KORLAP]: ['Worker', 'Satgas', 'Linmas', 'Korlap'], // Can do all field work
      [UserRole.ADMIN_DATA]: ['Worker', 'Satgas', 'Linmas', 'AdminData'], // Can do all field work
    };

    const allowedRoleNames = roleMapping[userRole] || [];
    const isRoleAllowed = allowedRoleNames.some((roleName) =>
      activityType.applicable_roles.includes(roleName),
    );

    if (!isRoleAllowed) {
      throw new ForbiddenException(
        `Activity type "${activityType.name}" is not available for your role. Allowed roles: ${activityType.applicable_roles.join(', ')}`,
      );
    }

    // 4. Create report
    const report = this.reportsRepository.create({
      worker_id: userId,
      shift_id: activeShift.id,
      area_id: activeShift.area_id,
      activity_type_id: dto.activity_type_id,
      description: dto.description,
      photo_urls: dto.photo_urls,
      photo_url: dto.photo_urls[0], // backward compat - use first photo
      gps_lat: dto.gps_lat,
      gps_lng: dto.gps_lng,
      report_type: undefined, // Phase 2C: aktivitas doesn't use report_type
    });

    const savedReport = await this.reportsRepository.save(report);
    this.logger.log(`Aktivitas created successfully: ${savedReport.id}`);

    return savedReport;
  }

  /**
   * Find all reports with optional filters
   *
   * @param filters Query filters
   * @returns List of reports
   */
  async findAll(filters: {
    worker_id?: string;
    shift_id?: string;
    report_type?: string;
    from_date?: string;
    to_date?: string;
  }): Promise<Report[]> {
    const where: any = {};

    if (filters.worker_id) {
      where.worker_id = filters.worker_id;
    }

    if (filters.shift_id) {
      where.shift_id = filters.shift_id;
    }

    if (filters.report_type) {
      where.report_type = filters.report_type;
    }

    if (filters.from_date && filters.to_date) {
      where.created_at = Between(new Date(filters.from_date), new Date(filters.to_date));
    } else if (filters.from_date) {
      where.created_at = Between(new Date(filters.from_date), new Date());
    }

    return this.reportsRepository.find({
      where,
      relations: ['worker', 'shift', 'shift.area'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find all reports with pagination, filters, and scope-based access (Phase 2C)
   *
   * @param filters Query filters
   * @param user Requesting user with role, area_id, rayon_id
   * @param page Page number
   * @param limit Items per page
   * @returns Paginated reports
   */
  async findAllPaginated(
    filters: {
      worker_id?: string;
      shift_id?: string;
      report_type?: string;
      from_date?: string;
      to_date?: string;
    },
    user: User,
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Report>> {
    const queryBuilder = this.reportsRepository
      .createQueryBuilder('report')
      .leftJoinAndSelect('report.worker', 'worker')
      .leftJoinAndSelect('report.shift', 'shift')
      .leftJoinAndSelect('shift.area', 'area')
      .leftJoinAndSelect('area.rayon', 'rayon');

    // Scope-based filtering
    if (AKTIVITAS_SUBMITTERS.includes(user.role as UserRole)) {
      // Field workers only see their own reports
      queryBuilder.andWhere('report.worker_id = :userId', { userId: user.id });
    } else if (user.role === UserRole.KORLAP) {
      // KORLAP sees reports from their area
      queryBuilder.andWhere('report.area_id = :areaId', { areaId: user.area_id });
    } else if (user.role === UserRole.KEPALA_RAYON) {
      // KEPALA_RAYON sees reports from their rayon
      queryBuilder.andWhere('area.rayon_id = :rayonId', { rayonId: user.rayon_id });
    }
    // ADMIN_SYSTEM, SUPERADMIN, TOP_MANAGEMENT see all reports

    // Apply additional filters
    if (filters.worker_id) {
      queryBuilder.andWhere('report.worker_id = :workerId', { workerId: filters.worker_id });
    }

    if (filters.shift_id) {
      queryBuilder.andWhere('report.shift_id = :shiftId', { shiftId: filters.shift_id });
    }

    if (filters.report_type) {
      queryBuilder.andWhere('report.report_type = :reportType', { reportType: filters.report_type });
    }

    if (filters.from_date && filters.to_date) {
      queryBuilder.andWhere('report.created_at BETWEEN :fromDate AND :toDate', {
        fromDate: new Date(filters.from_date),
        toDate: new Date(filters.to_date),
      });
    } else if (filters.from_date) {
      queryBuilder.andWhere('report.created_at >= :fromDate', {
        fromDate: new Date(filters.from_date),
      });
    }

    // Pagination
    queryBuilder
      .orderBy('report.created_at', 'DESC')
      .skip((page - 1) * limit)
      .take(limit);

    const [data, total] = await queryBuilder.getManyAndCount();

    // Convert photo URLs to presigned URLs
    const dataWithPresignedUrls = await Promise.all(
      data.map((report) => this.convertPhotoUrlsToPresigned(report)),
    );

    return new PaginatedResponseDto(dataWithPresignedUrls, total, page, limit);
  }

  /**
   * Find all reports for a specific worker (my reports)
   *
   * @param workerId Worker UUID
   * @param date Optional date filter (YYYY-MM-DD)
   * @returns List of worker's reports with presigned photo URLs
   */
  async findMyReports(workerId: string, date?: string): Promise<Report[]> {
    const where: any = { worker_id: workerId };

    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      where.created_at = Between(startDate, endDate);
    }

    const reports = await this.reportsRepository.find({
      where,
      relations: ['worker', 'shift', 'shift.area'],
      order: { created_at: 'DESC' },
    });

    // Convert photo URLs to presigned URLs (24 hour expiry for mobile caching)
    return Promise.all(reports.map((report) => this.convertPhotoUrlsToPresigned(report)));
  }

  /**
   * Find report by ID with scope-based access control (Phase 2C)
   *
   * @param id Report UUID
   * @param user Requesting user with role, area_id, rayon_id
   * @returns Report details
   */
  async findOne(id: string, user: User): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id },
      relations: ['worker', 'shift', 'shift.area', 'shift.area.rayon'],
    });

    if (!report) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.REPORT_NOT_FOUND,
        `Report not found: ${id}`,
      );
    }

    // Scope-based access control
    if (AKTIVITAS_SUBMITTERS.includes(user.role as UserRole)) {
      // Field workers can only see their own reports
      if (report.worker_id !== user.id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.REPORT_ACCESS_DENIED,
          'You can only access your own reports',
        );
      }
    } else if (user.role === UserRole.KORLAP) {
      // KORLAP sees reports from their area
      if (report.area_id !== user.area_id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.REPORT_ACCESS_DENIED,
          'You can only access reports from your assigned area',
        );
      }
    } else if (user.role === UserRole.KEPALA_RAYON) {
      // KEPALA_RAYON sees reports from their rayon
      if (report.shift?.area?.rayon_id !== user.rayon_id) {
        throw new ApiException(
          HttpStatus.FORBIDDEN,
          ApiErrorCode.REPORT_ACCESS_DENIED,
          'You can only access reports from your assigned rayon',
        );
      }
    }
    // ADMIN_SYSTEM, SUPERADMIN, TOP_MANAGEMENT can see all reports

    // Convert photo URLs to presigned URLs (24 hour expiry)
    return this.convertPhotoUrlsToPresigned(report);
  }

  /**
   * Update report (worker can update own reports within 1 hour)
   *
   * @param id Report UUID
   * @param dto Update data
   * @param file New photo file (optional)
   * @param userId UUID of the requesting user
   * @returns Updated report
   */
  async update(
    id: string,
    dto: UpdateReportDto,
    file: Express.Multer.File | undefined,
    userId: string,
  ): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id },
      relations: ['worker'],
    });

    if (!report) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.REPORT_NOT_FOUND,
        `Report not found: ${id}`,
      );
    }

    // Check ownership
    if (report.worker_id !== userId) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.REPORT_ACCESS_DENIED,
        'You can only update your own reports',
      );
    }

    // Check time constraint (within 1 hour of creation)
    const hoursSinceCreation = (Date.now() - report.created_at.getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 1) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.REPORT_EDIT_WINDOW_CLOSED,
        'Reports can only be updated within 1 hour of creation',
      );
    }

    // Update description if provided
    if (dto.description) {
      report.description = dto.description;
    }

    // Upload new photo if provided
    if (file) {
      const key = this.s3Service.generateKey('reports', `${uuidv4()}-${file.originalname}`);
      const photoUrl = await this.s3Service.uploadFile(file.buffer, key, file.mimetype);
      report.photo_url = photoUrl;
      this.logger.log(`Photo replaced: ${photoUrl}`);
    }

    return this.reportsRepository.save(report);
  }

  /**
   * Delete report (Admin only)
   *
   * @param id Report UUID
   */
  async remove(id: string): Promise<void> {
    const report = await this.reportsRepository.findOne({ where: { id } });

    if (!report) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.REPORT_NOT_FOUND,
        `Report not found: ${id}`,
      );
    }

    await this.reportsRepository.remove(report);
    this.logger.log(`Report deleted: ${id}`);
  }

  /**
   * Convert photo URL to presigned URL if needed (backward compatibility)
   * Handles s3:// URIs, http/https URLs, or null values
   *
   * @param report Report with potentially non-presigned photo URL
   * @returns Report with presigned photo URL (24 hour expiry for mobile caching)
   */
  private async convertPhotoUrlToPresigned(report: Report): Promise<Report> {
    if (!report.photo_url) {
      return report;
    }

    try {
      // Convert to presigned URL (24 hours = 86400 seconds)
      // Longer expiry allows mobile clients to cache the URL
      report.photo_url = await this.s3Service.convertToPresignedUrl(report.photo_url, 86400);
    } catch (error) {
      this.logger.error(`Failed to convert photo URL for report ${report.id}: ${error.message}`);
      // Return original URL on error - better than blocking the entire request
    }

    return report;
  }

  /**
   * Convert photo_urls array to presigned URLs (Phase 2C)
   * Also converts photo_url for backward compatibility
   *
   * @param report Report with potentially non-presigned photo URLs
   * @returns Report with presigned photo URLs (24 hour expiry for mobile caching)
   */
  private async convertPhotoUrlsToPresigned(report: Report): Promise<Report> {
    // Convert photo_urls array
    if (report.photo_urls && report.photo_urls.length > 0) {
      try {
        report.photo_urls = await Promise.all(
          report.photo_urls.map((url) => this.s3Service.convertToPresignedUrl(url, 86400)),
        );
      } catch (error) {
        this.logger.error(`Failed to convert photo_urls for report ${report.id}: ${error.message}`);
        // Keep original URLs on error
      }
    }

    // Convert photo_url for backward compatibility
    if (report.photo_url) {
      try {
        report.photo_url = await this.s3Service.convertToPresignedUrl(report.photo_url, 86400);
      } catch (error) {
        this.logger.error(`Failed to convert photo_url for report ${report.id}: ${error.message}`);
        // Keep original URL on error
      }
    }

    return report;
  }
}
