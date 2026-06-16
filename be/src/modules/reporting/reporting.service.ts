import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';

import { User } from '../users/entities/user.entity';
import { ReportTemplate } from './entities/report-template.entity';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { ReportType, ReportFormat, GeneratedReportStatus } from './enums/report.enums';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { S3Service } from '../../shared/services/s3.service';
import { AuditLogService } from '../audit/audit.service';
import { PdfGeneratorService } from './generators/pdf.generator';
import { REPORTING_VIEWERS, REPORTING_ADMINS } from '../users/constants/role-groups';

/**
 * Reporting Service
 *
 * Orchestrates report generation, scheduling, and management.
 * Handles:
 * - Template CRUD and retrieval
 * - Synchronous report generation to queue
 * - User-scoped report history and access
 * - Scheduled report management
 * - S3 cleanup (via cron)
 */
@Injectable()
export class ReportingService {
  private readonly logger = new Logger(ReportingService.name);

  constructor(
    @InjectRepository(ReportTemplate)
    private templateRepo: Repository<ReportTemplate>,
    @InjectRepository(GeneratedReport)
    private generatedReportRepo: Repository<GeneratedReport>,
    @InjectRepository(ReportSchedule)
    private scheduleRepo: Repository<ReportSchedule>,
    @InjectQueue('reporting')
    private reportingQueue: Queue,
    private s3Service: S3Service,
    private auditLogService: AuditLogService,
    private pdfGeneratorService: PdfGeneratorService,
  ) {}

  /**
   * Get all report templates (system + admin-created)
   */
  async getTemplates(): Promise<ReportTemplate[]> {
    return this.templateRepo.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a specific template by slug
   */
  async getTemplate(slug: string): Promise<ReportTemplate> {
    const template = await this.templateRepo.findOne({
      where: { slug },
    });

    if (!template) {
      throw new NotFoundException('Report template not found');
    }

    return template;
  }

  /**
   * Generate a report asynchronously
   *
   * Creates a GeneratedReport record with status=processing,
   * enqueues an async job to render and upload to S3.
   *
   * Returns 202 Accepted with the job record.
   */
  async generateReport(dto: GenerateReportDto, user: User): Promise<GeneratedReport> {
    if (!REPORTING_VIEWERS.includes(user.role as any)) {
      throw new ForbiddenException('You do not have permission to generate reports');
    }

    // Find template by slug or report_type
    let template: ReportTemplate | null = null;
    if (dto.slug) {
      template = await this.templateRepo.findOne({ where: { slug: dto.slug } });
    } else {
      template = await this.templateRepo.findOne({
        where: { report_type: dto.report_type },
      });
    }

    if (!template) {
      throw new NotFoundException('Report template not found');
    }

    const reportTitle = `${template.name} - ${new Date().toLocaleDateString('id-ID')}`;
    const generatedReport = this.generatedReportRepo.create({
      template_id: template.id,
      generated_by: user.id,
      title: reportTitle,
      report_type: template.report_type,
      format: dto.format,
      status: GeneratedReportStatus.PROCESSING,
      parameters: dto.parameters || {},
      started_at: new Date(),
    });

    const saved = await this.generatedReportRepo.save(generatedReport);

    // Enqueue async generation job
    await this.reportingQueue.add(
      'generate-report',
      {
        reportId: saved.id,
        templateId: template.id,
        templateSlug: template.slug,
        format: dto.format,
        parameters: dto.parameters || {},
        userId: user.id,
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    await this.auditLogService.log({
      entity_type: 'generated_report',
      entity_id: saved.id,
      action: 'created',
      actor_id: user.id,
      new_value: {
        template_id: template.id,
        report_type: template.report_type,
        format: dto.format,
      },
    });

    this.logger.log(
      `Report generation queued: ${saved.id} (${template.report_type}/${dto.format})`,
    );
    return saved;
  }

  /**
   * Get generated reports (user-scoped or admin-unrestricted)
   *
   * Non-admins see only their own reports.
   */
  async getReports(
    user: User,
    query: QueryReportsDto,
  ): Promise<PaginatedResponseDto<GeneratedReport>> {
    const qb = this.generatedReportRepo.createQueryBuilder('report');

    // Scope: non-admins see only their own
    const isAdmin = REPORTING_ADMINS.includes(user.role as any);
    if (!isAdmin) {
      qb.andWhere('report.generated_by = :userId', { userId: user.id });
    }

    // Filters
    if (query.report_type) {
      qb.andWhere('report.report_type = :reportType', { reportType: query.report_type });
    }
    if (query.template_slug) {
      qb.leftJoinAndSelect('report.template_id', 'template');
      qb.andWhere('template.slug = :slug', { slug: query.template_slug });
    }
    if (query.search) {
      qb.andWhere('LOWER(report.title) LIKE LOWER(:search)', {
        search: `%${query.search}%`,
      });
    }

    qb.orderBy('report.created_at', 'DESC');

    const page = query.page ?? 1;
    const limit = query.limit ?? 50;
    const skip = (page - 1) * limit;

    const [data, total] = await qb.skip(skip).take(limit).getManyAndCount();

    return new PaginatedResponseDto(data, total, page, limit);
  }

  /**
   * Get a specific generated report
   */
  async getReport(id: string, user: User): Promise<GeneratedReport> {
    const report = await this.generatedReportRepo.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Scope check: non-admins can only view their own
    const isAdmin = REPORTING_ADMINS.includes(user.role as any);
    if (!isAdmin && report.generated_by !== user.id) {
      throw new ForbiddenException('You do not have permission to view this report');
    }

    // Convert file_url to presigned URL if present
    if (report.file_url) {
      try {
        report.file_url = await this.s3Service.getPresignedUrl(report.file_url, 3600);
      } catch (error) {
        this.logger.warn(`Failed to presign URL for report ${id}: ${(error as Error).message}`);
      }
    }

    return report;
  }

  /**
   * Delete a generated report
   *
   * Removes from database and S3 if file exists.
   */
  async deleteReport(id: string, user: User): Promise<void> {
    const report = await this.generatedReportRepo.findOne({ where: { id } });

    if (!report) {
      throw new NotFoundException('Report not found');
    }

    // Scope check: non-admins can only delete their own
    const isAdmin = REPORTING_ADMINS.includes(user.role as any);
    if (!isAdmin && report.generated_by !== user.id) {
      throw new ForbiddenException('You do not have permission to delete this report');
    }

    // Delete S3 file if present
    if (report.file_url) {
      try {
        await this.s3Service.deleteFile(report.file_url);
      } catch (error) {
        this.logger.warn(
          `Failed to delete S3 file ${report.file_url}: ${(error as Error).message}`,
        );
      }
    }

    await this.generatedReportRepo.remove(report);

    await this.auditLogService.log({
      entity_type: 'generated_report',
      entity_id: id,
      action: 'deleted',
      actor_id: user.id,
      old_value: { template_id: report.template_id, file_url: report.file_url },
    });
  }

  /**
   * Create a scheduled report (admin only)
   */
  async createSchedule(dto: CreateScheduleDto, user: User): Promise<ReportSchedule> {
    if (!REPORTING_ADMINS.includes(user.role as any)) {
      throw new ForbiddenException('Only admins can create schedules');
    }

    // Verify template exists
    const template = await this.templateRepo.findOne({
      where: { id: dto.template_id },
    });
    if (!template) {
      throw new BadRequestException('Invalid template ID');
    }

    const schedule = this.scheduleRepo.create({
      template_id: dto.template_id,
      name: dto.name,
      frequency: dto.frequency,
      cron_expression: dto.cron_expression,
      timezone: dto.timezone || 'Asia/Jakarta',
      parameters: dto.parameters || {},
      is_active: true,
      created_by: user.id,
      next_run_at: this.calculateNextRun(dto.cron_expression, dto.timezone || 'Asia/Jakarta'),
    });

    const saved = await this.scheduleRepo.save(schedule);

    await this.auditLogService.log({
      entity_type: 'report_schedule',
      entity_id: saved.id,
      action: 'created',
      actor_id: user.id,
      new_value: {
        template_id: dto.template_id,
        frequency: dto.frequency,
        name: dto.name,
      },
    });

    return saved;
  }

  /**
   * Get all schedules (admin only)
   */
  async getSchedules(user: User): Promise<ReportSchedule[]> {
    if (!REPORTING_ADMINS.includes(user.role as any)) {
      throw new ForbiddenException('Only admins can view schedules');
    }

    return this.scheduleRepo.find({
      order: { name: 'ASC' },
    });
  }

  /**
   * Get a specific schedule (admin only)
   */
  async getSchedule(id: string, user: User): Promise<ReportSchedule> {
    if (!REPORTING_ADMINS.includes(user.role as any)) {
      throw new ForbiddenException('Only admins can view schedules');
    }

    const schedule = await this.scheduleRepo.findOne({ where: { id } });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    return schedule;
  }

  /**
   * Update a schedule (admin only)
   */
  async updateSchedule(id: string, dto: UpdateScheduleDto, user: User): Promise<ReportSchedule> {
    if (!REPORTING_ADMINS.includes(user.role as any)) {
      throw new ForbiddenException('Only admins can update schedules');
    }

    const schedule = await this.scheduleRepo.findOne({ where: { id } });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    const oldValue = { ...schedule };

    if (dto.name) schedule.name = dto.name;
    if (dto.frequency) schedule.frequency = dto.frequency;
    if (dto.cron_expression) schedule.cron_expression = dto.cron_expression;
    if (dto.timezone) schedule.timezone = dto.timezone;
    if (dto.is_active !== undefined) schedule.is_active = dto.is_active;
    if (dto.parameters) schedule.parameters = dto.parameters;

    const updated = await this.scheduleRepo.save(schedule);

    await this.auditLogService.log({
      entity_type: 'report_schedule',
      entity_id: id,
      action: 'updated',
      actor_id: user.id,
      old_value: oldValue,
      new_value: updated,
    });

    return updated;
  }

  /**
   * Delete a schedule (admin only)
   */
  async deleteSchedule(id: string, user: User): Promise<void> {
    if (!REPORTING_ADMINS.includes(user.role as any)) {
      throw new ForbiddenException('Only admins can delete schedules');
    }

    const schedule = await this.scheduleRepo.findOne({ where: { id } });

    if (!schedule) {
      throw new NotFoundException('Schedule not found');
    }

    await this.scheduleRepo.remove(schedule);

    await this.auditLogService.log({
      entity_type: 'report_schedule',
      entity_id: id,
      action: 'deleted',
      actor_id: user.id,
      old_value: { name: schedule.name, frequency: schedule.frequency },
    });
  }

  /**
   * Generate report from a schedule (called by cron)
   */
  async generateFromSchedule(schedule: ReportSchedule): Promise<GeneratedReport> {
    const template = await this.templateRepo.findOne({
      where: { id: schedule.template_id },
    });

    if (!template) {
      throw new NotFoundException('Template not found');
    }

    const reportTitle = `${template.name} - ${new Date().toLocaleDateString('id-ID')}`;
    const generatedReport = this.generatedReportRepo.create({
      template_id: template.id,
      schedule_id: schedule.id,
      title: reportTitle,
      report_type: template.report_type,
      format: ReportFormat.PDF,
      status: GeneratedReportStatus.PROCESSING,
      parameters: schedule.parameters || {},
      started_at: new Date(),
    });

    const saved = await this.generatedReportRepo.save(generatedReport);

    // Enqueue async generation job
    await this.reportingQueue.add(
      'generate-report',
      {
        reportId: saved.id,
        templateId: template.id,
        templateSlug: template.slug,
        format: ReportFormat.PDF,
        parameters: schedule.parameters || {},
      },
      { attempts: 3, backoff: { type: 'exponential', delay: 2000 } },
    );

    // Update schedule next run times
    schedule.last_run_at = new Date();
    schedule.next_run_at = this.calculateNextRun(schedule.cron_expression, schedule.timezone);
    await this.scheduleRepo.save(schedule);

    return saved;
  }

  /**
   * Get due schedules (for cron to process)
   */
  async getDueSchedules(): Promise<ReportSchedule[]> {
    const { LessThanOrEqual } = await import('typeorm');
    const now = new Date();
    return this.scheduleRepo.find({
      where: {
        is_active: true,
        next_run_at: LessThanOrEqual(now),
      },
    });
  }

  /**
   * Delete old generated reports and their S3 files (cleanup cron)
   *
   * Deletes reports older than 90 days.
   */
  async deleteOldReports(retentionDays: number = 90): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const oldReports = await this.generatedReportRepo.find({
      where: {
        created_at: import('typeorm').then((typeorm) => typeorm.LessThan(cutoffDate)) as any,
      },
    });

    let deletedCount = 0;

    for (const report of oldReports) {
      try {
        if (report.file_url) {
          await this.s3Service.deleteFile(report.file_url);
        }
        await this.generatedReportRepo.remove(report);
        deletedCount++;
      } catch (error) {
        this.logger.warn(`Failed to delete old report ${report.id}: ${(error as Error).message}`);
      }
    }

    if (deletedCount > 0) {
      this.logger.log(`Cleanup cron deleted ${deletedCount} old report(s)`);
    }

    return deletedCount;
  }

  /**
   * Simple cron expression next-run calculator
   *
   * For MVP, handles basic patterns: "0 6 * * *" (daily at 06:00).
   * For production, consider using cron parser library.
   */
  private calculateNextRun(cronExpression: string, timezone: string): Date {
    // MVP: parse simple daily pattern (minute hour * * *)
    const parts = cronExpression.trim().split(/\s+/);
    if (parts.length < 5) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const [minute, hour] = [parseInt(parts[0], 10), parseInt(parts[1], 10)];

    if (Number.isNaN(minute) || Number.isNaN(hour)) {
      return new Date(Date.now() + 24 * 60 * 60 * 1000);
    }

    const next = new Date();
    next.setHours(hour, minute, 0, 0);

    // If that time has passed today, schedule for tomorrow
    if (next <= new Date()) {
      next.setDate(next.getDate() + 1);
    }

    return next;
  }
}
