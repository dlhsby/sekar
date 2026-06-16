import { Controller, Get, Post, Param, Query, UseGuards, HttpCode } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ANALYTICS_VIEWERS, ANALYTICS_ADMINS } from '../users/constants/role-groups';
import { DashboardSummaryDto } from './dto/dashboard-summary.dto';
import { WorkerAnalyticsDto } from './dto/worker-analytics.dto';
import { AreaAnalyticsDto } from './dto/area-analytics.dto';
import { OperationalAnalyticsDto } from './dto/operational-analytics.dto';
import { WorkerAnalyticsQueryDto } from './dto/worker-analytics-query.dto';
import { AreaAnalyticsQueryDto } from './dto/area-analytics-query.dto';
import { OperationalQueryDto } from './dto/operational-query.dto';
import { PaginatedResponseDto } from '../../common/dto/pagination.dto';

@ApiTags('analytics')
@ApiBearerAuth()
@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  @Roles(...ANALYTICS_VIEWERS)
  @ApiOperation({ summary: 'Get dashboard summary with KPIs and trends' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary',
    type: DashboardSummaryDto,
  })
  async getDashboard(@GetUser() user: User): Promise<DashboardSummaryDto> {
    return this.analyticsService.getDashboardSummary(user);
  }

  @Get('workers')
  @Roles(...ANALYTICS_VIEWERS)
  @ApiOperation({ summary: 'List worker analytics (paginated, role-scoped)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated worker analytics',
  })
  async listWorkers(
    @Query() query: WorkerAnalyticsQueryDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<WorkerAnalyticsDto>> {
    return this.analyticsService.listWorkers(user, query);
  }

  @Get('workers/:id')
  @Roles(...ANALYTICS_VIEWERS)
  @ApiOperation({ summary: 'Get worker analytics by ID' })
  @ApiResponse({
    status: 200,
    description: 'Worker analytics',
    type: WorkerAnalyticsDto,
  })
  async getWorker(
    @Param('id') id: string,
    @Query() query: WorkerAnalyticsQueryDto,
    @GetUser() user: User,
  ): Promise<WorkerAnalyticsDto> {
    return this.analyticsService.getWorker(id, user, query);
  }

  @Get('areas')
  @Roles(...ANALYTICS_VIEWERS)
  @ApiOperation({ summary: 'List area analytics (paginated, role-scoped)' })
  @ApiResponse({
    status: 200,
    description: 'Paginated area analytics',
  })
  async listAreas(
    @Query() query: AreaAnalyticsQueryDto,
    @GetUser() user: User,
  ): Promise<PaginatedResponseDto<AreaAnalyticsDto>> {
    return this.analyticsService.listAreas(user, query);
  }

  @Get('areas/:id')
  @Roles(...ANALYTICS_VIEWERS)
  @ApiOperation({ summary: 'Get area analytics by ID' })
  @ApiResponse({
    status: 200,
    description: 'Area analytics',
    type: AreaAnalyticsDto,
  })
  async getArea(
    @Param('id') id: string,
    @Query() query: AreaAnalyticsQueryDto,
    @GetUser() user: User,
  ): Promise<AreaAnalyticsDto> {
    return this.analyticsService.getArea(id, user, query);
  }

  @Get('operational')
  @Roles(...ANALYTICS_VIEWERS)
  @ApiOperation({ summary: 'Get system-wide operational analytics' })
  @ApiResponse({
    status: 200,
    description: 'Operational analytics',
    type: OperationalAnalyticsDto,
  })
  async getOperational(@Query() query: OperationalQueryDto): Promise<OperationalAnalyticsDto> {
    return this.analyticsService.getOperational(query);
  }

  @Get('operational/trends')
  @Roles(...ANALYTICS_VIEWERS)
  @ApiOperation({ summary: 'Get operational analytics trends' })
  @ApiResponse({
    status: 200,
    description: 'Operational trends',
    type: [OperationalAnalyticsDto],
  })
  async getOperationalTrends(
    @Query() query: OperationalQueryDto,
  ): Promise<OperationalAnalyticsDto[]> {
    return this.analyticsService.getOperationalTrends(query);
  }

  @Post('refresh')
  @HttpCode(202)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @Roles(...ANALYTICS_ADMINS)
  @ApiOperation({ summary: 'Refresh materialized views (admin only)' })
  @ApiResponse({
    status: 202,
    description: 'Refresh started',
  })
  async refreshViews(): Promise<{ status: string }> {
    this.analyticsService.refreshViews().catch(() => null);
    return { status: 'refreshing' };
  }
}
