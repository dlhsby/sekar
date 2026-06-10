import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Res,
  HttpStatus,
  StreamableFile,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import type { Response } from 'express';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { EXPORTERS } from '../users/constants/role-groups';
import { UserThrottlerGuard } from '../../common/guards/user-throttler.guard';
import { ExportService } from './export.service';
import { ExportRequestDto } from './dto/export-request.dto';
import { ExportJobResponseDto } from './dto/export-job-response.dto';

/**
 * Data export endpoints (Phase 4-5). Exports ≤5000 rows stream back inline;
 * larger exports create a background job polled via `GET /export/jobs/:id`.
 */
@ApiTags('Export')
@ApiBearerAuth()
@Controller('export')
@UseGuards(JwtAuthGuard, RolesGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Post()
  @Roles(...EXPORTERS)
  @UseGuards(UserThrottlerGuard)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Export an entity to CSV/XLSX/KMZ (sync ≤5000 rows, else async job)' })
  @ApiResponse({ status: 200, description: 'File streamed (sync export)' })
  @ApiResponse({ status: 202, description: 'Async export job created', type: ExportJobResponseDto })
  async export(
    @Body() dto: ExportRequestDto,
    @GetUser() user: User,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile | ExportJobResponseDto> {
    const result = await this.exportService.requestExport(dto, user);

    if (result.kind === 'job') {
      res.status(HttpStatus.ACCEPTED);
      return ExportJobResponseDto.fromEntity(result.job);
    }

    res.set({
      'Content-Type': result.file.contentType,
      'Content-Disposition': `attachment; filename="${result.filename}"`,
    });
    return new StreamableFile(result.file.buffer);
  }

  @Get('jobs')
  @Roles(...EXPORTERS)
  @ApiOperation({ summary: 'List my export jobs (last 30 days)' })
  @ApiResponse({ status: 200, type: [ExportJobResponseDto] })
  async listJobs(@GetUser() user: User): Promise<ExportJobResponseDto[]> {
    const jobs = await this.exportService.listJobsForUser(user);
    return jobs.map((job) => ExportJobResponseDto.fromEntity(job));
  }

  @Get('jobs/:jobId')
  @Roles(...EXPORTERS)
  @ApiOperation({ summary: 'Get an export job with a fresh 15-min download URL' })
  @ApiResponse({ status: 200, type: ExportJobResponseDto })
  @ApiResponse({ status: 403, description: 'Not the job owner' })
  @ApiResponse({ status: 404, description: 'Job not found' })
  async getJob(
    @Param('jobId', ParseUUIDPipe) jobId: string,
    @GetUser() user: User,
  ): Promise<ExportJobResponseDto> {
    const { job, downloadUrl } = await this.exportService.getJobForUser(jobId, user);
    return ExportJobResponseDto.fromEntity(job, downloadUrl);
  }
}
