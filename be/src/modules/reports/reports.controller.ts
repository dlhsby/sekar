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
import { UpdateReportDto } from './dto/update-report.dto';
import { Report, ReportType } from './entities/report.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';

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
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shift_id: { type: 'string', format: 'uuid' },
        report_type: { type: 'string', enum: Object.values(ReportType) },
        description: { type: 'string' },
        gps_lat: { type: 'number' },
        gps_lng: { type: 'number' },
        photo: {
          type: 'string',
          format: 'binary',
          description: 'Photo file (max 10MB, jpeg/png)',
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
    @Body() createReportDto: CreateReportDto,
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
    return this.reportsService.create(createReportDto, file, user.id);
  }

  /**
   * Get all reports with optional filters
   * Admin and Supervisor can view all reports
   */
  @Get()
  @Roles(UserRole.ADMIN, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'List all reports with filters (Admin, Supervisor)' })
  @ApiQuery({ name: 'worker_id', required: false, type: String })
  @ApiQuery({ name: 'shift_id', required: false, type: String })
  @ApiQuery({ name: 'report_type', required: false, enum: ReportType })
  @ApiQuery({ name: 'from_date', required: false, type: String, description: 'ISO date string' })
  @ApiQuery({ name: 'to_date', required: false, type: String, description: 'ISO date string' })
  @ApiResponse({
    status: 200,
    description: 'List of reports',
    type: [Report],
  })
  async findAll(
    @Query('worker_id') workerId?: string,
    @Query('shift_id') shiftId?: string,
    @Query('report_type') reportType?: string,
    @Query('from_date') fromDate?: string,
    @Query('to_date') toDate?: string,
  ): Promise<Report[]> {
    return this.reportsService.findAll({
      worker_id: workerId,
      shift_id: shiftId,
      report_type: reportType,
      from_date: fromDate,
      to_date: toDate,
    });
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
