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
  UseInterceptors,
  UploadedFile,
  ParseFilePipeBuilder,
  HttpStatus,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiConsumes,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { ReportsService } from './reports.service';
import { CreateReportDto } from './dto/create-report.dto';
import { CreateReportJsonDto } from './dto/create-report-json.dto';
import { UpdateReportDto } from './dto/update-report.dto';
import { Report, ReportType } from './entities/report.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';
import { ReportsFilterDto } from './dto/reports-filter.dto';

/**
 * Reports Controller
 *
 * Handles HTTP requests for work report management.
 * Workers submit reports with photos during their shifts.
 */
@ApiTags('reports')
@ApiBearerAuth()
@Controller('reports')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  /**
   * Create a new work report
   * Worker can submit reports during active shift with optional photo
   */
  @Post()
  @Roles(UserRole.WORKER)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Create work report (Worker only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shift_id: { type: 'string', format: 'uuid' },
        report_type: { type: 'string', enum: Object.values(ReportType) },
        description: { type: 'string' },
        gps_lat: { type: 'number' },
        gps_lng: { type: 'number' },
        photos: {
          type: 'array',
          items: { type: 'string' },
          description: 'Base64-encoded photo strings (max 5)',
        },
      },
      required: ['shift_id', 'report_type', 'description', 'gps_lat', 'gps_lng'],
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Report created successfully',
    type: Report,
  })
  @ApiResponse({ status: 400, description: 'Invalid input or shift not active' })
  @ApiResponse({ status: 404, description: 'Shift not found' })
  async create(
    @Body() createReportDto: CreateReportJsonDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    file: Express.Multer.File | undefined,
    @GetUser() user: User,
  ): Promise<Report> {
    return this.reportsService.createFromJson(createReportDto, user.id, file);
  }

  /**
   * Get all reports with optional filters and pagination
   * Admin and Supervisor can view all reports
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'List all reports with filters and pagination (Admin, Supervisor)' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'worker_id', required: false, type: String })
  @ApiQuery({ name: 'shift_id', required: false, type: String })
  @ApiQuery({ name: 'report_type', required: false, enum: ReportType })
  @ApiQuery({ name: 'from_date', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to_date', required: false, type: String, description: 'ISO date string' })
  @ApiResponse({
    status: 200,
    description: 'Paginated list of reports',
    schema: {
      example: {
        data: [
          {
            id: 'report-uuid',
            worker_id: 'worker-uuid',
            shift_id: 'shift-uuid',
            report_type: 'cleaning',
            description: 'Cleaned the park',
            photo_url: 'https://s3.amazonaws.com/...',
            gps_lat: -7.250445,
            gps_lng: 112.768845,
            created_at: '2026-01-16T10:00:00.000Z',
          },
        ],
        meta: {
          total: 150,
          page: 1,
          limit: 50,
          totalPages: 3,
        },
      },
    },
  })
  async findAll(@Query() filterDto: ReportsFilterDto): Promise<PaginatedResponseDto<Report>> {
    return this.reportsService.findAllPaginated(
      {
        worker_id: filterDto.worker_id,
        shift_id: filterDto.shift_id,
        report_type: filterDto.report_type,
        from_date: filterDto.from_date,
        to_date: filterDto.to_date,
      },
      filterDto.page,
      filterDto.limit,
    );
  }

  /**
   * Get worker's own reports
   * Worker can view their own reports
   */
  @Get('my-reports')
  @Roles(UserRole.WORKER)
  @ApiOperation({ summary: 'Get my reports (Worker only)' })
  @ApiQuery({
    name: 'date',
    required: false,
    type: String,
    description: 'Filter by date (YYYY-MM-DD)',
  })
  @ApiResponse({
    status: 200,
    description: 'List of worker reports',
    type: [Report],
  })
  async getMyReports(
    @Query('date') date: string | undefined,
    @GetUser() user: User,
  ): Promise<Report[]> {
    return this.reportsService.findMyReports(user.id, date);
  }

  /**
   * Get report by ID
   * Admin/Supervisor can view all, Worker can view own reports only
   */
  @Get(':id')
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR, UserRole.WORKER)
  @ApiOperation({ summary: 'Get report details (Admin, Supervisor, Owner)' })
  @ApiResponse({
    status: 200,
    description: 'Report details',
    type: Report,
  })
  @ApiResponse({ status: 404, description: 'Report not found' })
  @ApiResponse({ status: 403, description: 'Access denied' })
  async findOne(@Param('id') id: string, @GetUser() user: User): Promise<Report> {
    return this.reportsService.findOne(id, user.id, user.role);
  }

  /**
   * Update report
   * Worker can update own reports within 1 hour of creation
   */
  @Patch(':id')
  @Roles(UserRole.WORKER)
  @UseInterceptors(FileInterceptor('photo'))
  @ApiOperation({ summary: 'Update report (Worker, own reports, within 1 hour)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        description: { type: 'string' },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'New photo file (max 10MB, jpeg/png)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Report updated successfully',
    type: Report,
  })
  @ApiResponse({ status: 403, description: 'Access denied or time limit exceeded' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async update(
    @Param('id') id: string,
    @Body() updateReportDto: UpdateReportDto,
    @UploadedFile(
      new ParseFilePipeBuilder()
        .addMaxSizeValidator({ maxSize: 10 * 1024 * 1024 }) // 10MB
        .build({
          errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
          fileIsRequired: false,
        }),
    )
    file: Express.Multer.File | undefined,
    @GetUser() user: User,
  ): Promise<Report> {
    return this.reportsService.update(id, updateReportDto, file, user.id);
  }

  /**
   * Delete report
   * Admin only
   */
  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Delete report (Admin only)' })
  @ApiResponse({ status: 200, description: 'Report deleted successfully' })
  @ApiResponse({ status: 404, description: 'Report not found' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.reportsService.remove(id);
  }
}
