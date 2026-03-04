import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { MonitoringConfigService } from './services/monitoring-config.service';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { LocationHistoryQueryDto, LocationHistoryResponseDto } from './dto/location-history.dto';
import { UserDaySummaryDto } from './dto/user-day-summary.dto';
import { MonitoringConfigResponseDto, UpdateMonitoringConfigDto } from './dto/monitoring-config.dto';
import { StaffingSummaryQueryDto, StaffingSummaryResponseDto } from './dto/staffing-summary.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import {
  MONITORING_CITY,
  MONITORING_RAYON,
  MONITORING_AREA,
  USER_MANAGERS,
} from '../users/constants/role-groups';

@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(
    private readonly monitoringService: MonitoringService,
    private readonly configService: MonitoringConfigService,
  ) {}

  @Get('city')
  @Roles(...MONITORING_CITY)
  @ApiOperation({ summary: 'Get city-wide monitoring statistics' })
  @ApiResponse({ status: 200, type: CityStatsDto })
  async getCityStats(): Promise<CityStatsDto> {
    return this.monitoringService.getCityStats();
  }

  @Get('rayon/:id')
  @Roles(...MONITORING_RAYON)
  @ApiOperation({ summary: 'Get rayon-level monitoring statistics' })
  @ApiParam({ name: 'id', description: 'Rayon ID (UUID)' })
  @ApiResponse({ status: 200, type: RayonStatsDto })
  @ApiResponse({ status: 404, description: 'Rayon not found' })
  async getRayonStats(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<RayonStatsDto> {
    this.enforceScopeRayon(user, id);
    return this.monitoringService.getRayonStats(id);
  }

  @Get('area/:id')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get area-level monitoring statistics' })
  @ApiParam({ name: 'id', description: 'Area ID (UUID)' })
  @ApiResponse({ status: 200, type: AreaStatsDto })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async getAreaStats(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<AreaStatsDto> {
    this.enforceScopeArea(user, id);
    return this.monitoringService.getAreaStats(id);
  }

  @Get('live-users')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get real-time user positions' })
  @ApiResponse({ status: 200, type: LiveUsersResponseDto })
  async getLiveUsers(
    @Query() filters: LiveUsersFilterDto,
    @GetUser() user: User,
  ): Promise<LiveUsersResponseDto> {
    this.applyScopeFilters(user, filters);
    return this.monitoringService.getLiveUsers(filters);
  }

  @Get('users/:userId/location-history')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get user location history for a date' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, type: LocationHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getLocationHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @Query() query: LocationHistoryQueryDto,
    @GetUser() user: User,
  ): Promise<LocationHistoryResponseDto> {
    await this.enforceScopeUser(user, userId);
    return this.monitoringService.getLocationHistory(userId, query.date, query.shift_id);
  }

  @Get('users/:userId/day-summary')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get user day summary for detail panel' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, type: UserDaySummaryDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getUserDaySummary(
    @Param('userId', ParseUUIDPipe) userId: string,
    @GetUser() user: User,
  ): Promise<UserDaySummaryDto> {
    await this.enforceScopeUser(user, userId);
    return this.monitoringService.getUserDaySummary(userId);
  }

  @Get('config')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'List all monitoring configuration' })
  @ApiResponse({ status: 200, type: MonitoringConfigResponseDto })
  async getConfig(): Promise<MonitoringConfigResponseDto> {
    const configs = await this.configService.findAll();
    return {
      configs: configs.map((c: any) => ({
        key: c.key,
        value: c.value,
        description: c.description,
        updated_at: c.updated_at,
      })),
    };
  }

  @Patch('config/:key')
  @Roles(...USER_MANAGERS)
  @ApiOperation({ summary: 'Update a monitoring configuration value' })
  @ApiParam({ name: 'key', description: 'Configuration key' })
  @ApiResponse({ status: 200, description: 'Configuration updated' })
  async updateConfig(
    @Param('key') key: string,
    @Body() dto: UpdateMonitoringConfigDto,
  ): Promise<{ key: string; value: Record<string, any>; updated_at: Date }> {
    const config = await this.configService.updateByKey(key, dto.value);
    return { key: config.key, value: config.value, updated_at: config.updated_at };
  }

  @Get('staffing-summary')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get staffing summary by area' })
  @ApiResponse({ status: 200, type: StaffingSummaryResponseDto })
  async getStaffingSummary(
    @Query() query: StaffingSummaryQueryDto,
    @GetUser() user: User,
  ): Promise<StaffingSummaryResponseDto> {
    const filters = { ...query };
    this.applyScopeFilters(user, filters);
    return this.monitoringService.getStaffingSummary(filters);
  }

  // ---- Scope enforcement helpers ----

  private enforceScopeRayon(user: User, rayonId: string): void {
    const scopedRoles = [UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA];
    if (scopedRoles.includes(user.role as UserRole) && user.rayon_id !== rayonId) {
      throw new ForbiddenException('You can only view monitoring for your own rayon');
    }
  }

  private enforceScopeArea(user: User, areaId: string): void {
    if (user.role === UserRole.KORLAP && user.area_id !== areaId) {
      throw new ForbiddenException('You can only view monitoring for your own area');
    }
  }

  private applyScopeFilters(
    user: User,
    filters: { area_id?: string; rayon_id?: string },
  ): void {
    if (user.role === UserRole.KORLAP && user.area_id) {
      filters.area_id = user.area_id;
    } else if (user.role === UserRole.ADMIN_DATA && user.rayon_id) {
      filters.rayon_id = user.rayon_id;
    }
  }

  private async enforceScopeUser(viewer: User, targetUserId: string): Promise<void> {
    const cityRoles = [UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.TOP_MANAGEMENT];
    if (cityRoles.includes(viewer.role as UserRole)) return;

    const target = await this.monitoringService.getUserDaySummary(targetUserId);

    if (viewer.role === UserRole.KORLAP && target.area_id !== viewer.area_id) {
      throw new ForbiddenException('You can only view users in your own area');
    }
    if (
      (viewer.role === UserRole.KEPALA_RAYON || viewer.role === UserRole.ADMIN_DATA) &&
      target.rayon_id !== viewer.rayon_id
    ) {
      throw new ForbiddenException('You can only view users in your own rayon');
    }
  }
}
