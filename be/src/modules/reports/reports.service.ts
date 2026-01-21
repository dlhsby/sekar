import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, IsNull } from 'typeorm';
import { Report } from './entities/report.entity';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReportJsonDto } from './dto/create-report-json.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { S3Service } from '../../shared/services/s3.service';
import { Shift } from '../shifts/entities/shift.entity';
import { UserRole } from '../users/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';
import { ApiException } from '../../common/exceptions/api.exception';
import { ApiErrorCode } from '../../common/enums/api-error-codes.enum';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

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
   * Find all reports with pagination and optional filters
   *
   * @param filters Query filters
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
    page: number = 1,
    limit: number = 50,
  ): Promise<PaginatedResponseDto<Report>> {
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

    const [data, total] = await this.reportsRepository.findAndCount({
      where,
      relations: ['worker', 'shift', 'shift.area'],
      order: { created_at: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Find all reports for a specific worker (my reports)
   *
   * @param workerId Worker UUID
   * @param date Optional date filter (YYYY-MM-DD)
   * @returns List of worker's reports
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

    return this.reportsRepository.find({
      where,
      relations: ['worker', 'shift', 'shift.area'],
      order: { created_at: 'DESC' },
    });
  }

  /**
   * Find report by ID with access control
   *
   * @param id Report UUID
   * @param userId UUID of the requesting user
   * @param userRole Role of the requesting user
   * @returns Report details
   */
  async findOne(id: string, userId: string, userRole: UserRole): Promise<Report> {
    const report = await this.reportsRepository.findOne({
      where: { id },
      relations: ['worker', 'shift', 'shift.area'],
    });

    if (!report) {
      throw new ApiException(
        HttpStatus.NOT_FOUND,
        ApiErrorCode.REPORT_NOT_FOUND,
        `Report not found: ${id}`,
      );
    }

    // Workers can only see their own reports
    if (userRole === UserRole.WORKER && report.worker_id !== userId) {
      throw new ApiException(
        HttpStatus.FORBIDDEN,
        ApiErrorCode.REPORT_ACCESS_DENIED,
        'You can only access your own reports',
      );
    }

    return report;
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
}
