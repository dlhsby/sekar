import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ReportingService } from './reporting.service';
import { ReportTemplate } from './entities/report-template.entity';
import { GeneratedReport } from './entities/generated-report.entity';
import { ReportSchedule } from './entities/report-schedule.entity';
import { GenerateReportDto } from './dto/generate-report.dto';
import { QueryReportsDto } from './dto/query-reports.dto';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { REPORTING_VIEWERS, REPORTING_ADMINS } from '../users/constants/role-groups';

/**
 * Reporting Controller
 *
 * Endpoints for report generation, retrieval, and scheduling.
 * Per spec: 8 endpoints covering templates, generation, retrieval, and scheduling.
 */
@ApiTags('reporting')
@ApiBearerAuth()
@Controller('reporting')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportingController {
  constructor(private readonly reportingService: ReportingService) {}

  /**
   * GET /reporting/templates
   *
   * Retrieve all available report templates.
   */
  @Get('templates')
  @Roles(...REPORTING_VIEWERS)
  @ApiOperation({ summary: 'Get all report templates' })
  @ApiResponse({ status: 200, description: 'List of templates', type: [ReportTemplate] })
  async getTemplates(): Promise<ReportTemplate[]> {
    return this.reportingService.getTemplates();
  }

  /**
   * GET /reporting/templates/:slug
   *
   * Retrieve a specific template by slug.
   */
  @Get('templates/:slug')
  @Roles(...REPORTING_VIEWERS)
  @ApiOperation({ summary: 'Get template by slug' })
  @ApiResponse({ status: 200, description: 'Template details', type: ReportTemplate })
  async getTemplate(@Param('slug') slug: string): Promise<ReportTemplate> {
    return this.reportingService.getTemplate(slug);
  }

  /**
   * POST /reporting/generate
   *
   * Request a report to be generated.
   * Returns 202 Accepted with the GeneratedReport record (status=processing).
   */
  @Post('generate')
  @Roles(...REPORTING_VIEWERS)
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({
    summary: 'Generate a report',
    description: 'Queues a report for asynchronous generation. Returns 202 Accepted.',
  })
  @ApiResponse({ status: 202, description: 'Report queued', type: GeneratedReport })
  async generateReport(
    @Body() dto: GenerateReportDto,
    @GetUser() user: User,
  ): Promise<GeneratedReport> {
    return this.reportingService.generateReport(dto, user);
  }

  /**
   * GET /reporting/reports
   *
   * List generated reports (paginated, user-scoped).
   * Non-admins see only their own; admins see all.
   */
  @Get('reports')
  @Roles(...REPORTING_VIEWERS)
  @ApiOperation({ summary: 'List generated reports (paginated)' })
  @ApiResponse({ status: 200, description: 'Paginated generated reports' })
  async listReports(
    @Query() query: QueryReportsDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<GeneratedReport>> {
    return this.reportingService.getReports(user, query);
  }

  /**
   * GET /reporting/reports/:id
   *
   * Retrieve a specific generated report.
   * Returns presigned URL for file_url if present.
   */
  @Get('reports/:id')
  @Roles(...REPORTING_VIEWERS)
  @ApiOperation({ summary: 'Get generated report by ID' })
  @ApiResponse({
    status: 200,
    description: 'Report details with presigned URL',
    type: GeneratedReport,
  })
  async getReport(@Param('id') id: string, @GetUser() user: User): Promise<GeneratedReport> {
    return this.reportingService.getReport(id, user);
  }

  /**
   * DELETE /reporting/reports/:id
   *
   * Delete a generated report and remove its S3 file.
   */
  @Delete('reports/:id')
  @Roles(...REPORTING_VIEWERS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a generated report' })
  @ApiResponse({ status: 204, description: 'Report deleted' })
  async deleteReport(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    return this.reportingService.deleteReport(id, user);
  }

  /**
   * GET /reporting/schedules
   *
   * List all scheduled reports (admin only).
   */
  @Get('schedules')
  @Roles(...REPORTING_ADMINS)
  @ApiOperation({ summary: 'List scheduled reports (admin only)' })
  @ApiResponse({ status: 200, description: 'List of schedules', type: [ReportSchedule] })
  async listSchedules(@GetUser() user: User): Promise<ReportSchedule[]> {
    return this.reportingService.getSchedules(user);
  }

  /**
   * POST /reporting/schedules
   *
   * Create a new scheduled report (admin only).
   */
  @Post('schedules')
  @Roles(...REPORTING_ADMINS)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create a scheduled report (admin only)' })
  @ApiResponse({ status: 201, description: 'Schedule created', type: ReportSchedule })
  async createSchedule(
    @Body() dto: CreateScheduleDto,
    @GetUser() user: User,
  ): Promise<ReportSchedule> {
    return this.reportingService.createSchedule(dto, user);
  }

  /**
   * GET /reporting/schedules/:id
   *
   * Retrieve a specific schedule (admin only).
   */
  @Get('schedules/:id')
  @Roles(...REPORTING_ADMINS)
  @ApiOperation({ summary: 'Get schedule by ID (admin only)' })
  @ApiResponse({ status: 200, description: 'Schedule details', type: ReportSchedule })
  async getSchedule(@Param('id') id: string, @GetUser() user: User): Promise<ReportSchedule> {
    return this.reportingService.getSchedule(id, user);
  }

  /**
   * PATCH /reporting/schedules/:id
   *
   * Update a scheduled report (admin only).
   */
  @Patch('schedules/:id')
  @Roles(...REPORTING_ADMINS)
  @ApiOperation({ summary: 'Update a schedule (admin only)' })
  @ApiResponse({ status: 200, description: 'Schedule updated', type: ReportSchedule })
  async updateSchedule(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleDto,
    @GetUser() user: User,
  ): Promise<ReportSchedule> {
    return this.reportingService.updateSchedule(id, dto, user);
  }

  /**
   * DELETE /reporting/schedules/:id
   *
   * Delete a scheduled report (admin only).
   */
  @Delete('schedules/:id')
  @Roles(...REPORTING_ADMINS)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a schedule (admin only)' })
  @ApiResponse({ status: 204, description: 'Schedule deleted' })
  async deleteSchedule(@Param('id') id: string, @GetUser() user: User): Promise<void> {
    return this.reportingService.deleteSchedule(id, user);
  }
}
