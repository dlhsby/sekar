import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { MonitoringConfigService } from './services/monitoring-config.service';
import { MonitoringStatsService } from './services/monitoring-stats.service';
import { MonitoringReassignService } from './services/monitoring-reassign.service';
import { UserAreasService } from '../user-areas/user-areas.service';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { LocationHistoryQueryDto, LocationHistoryResponseDto } from './dto/location-history.dto';
import { UserDaySummaryDto } from './dto/user-day-summary.dto';
import {
  MonitoringConfigResponseDto,
  UpdateMonitoringConfigDto,
} from './dto/monitoring-config.dto';
import { StaffingSummaryQueryDto, StaffingSummaryResponseDto } from './dto/staffing-summary.dto';
import { BoundariesResponseDto } from './dto/boundaries.dto';
import { ReassignWorkerDto, ReassignWorkerResponseDto } from './dto/reassign-worker.dto';
import { AreaPlantStatusDto } from './dto/area-plant-status.dto';
import { AreaPlantStatusService } from './services/area-plant-status.service';
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
    private readonly statsService: MonitoringStatsService,
    private readonly reassignService: MonitoringReassignService,
    private readonly userAreasService: UserAreasService,
    private readonly areaPlantStatusService: AreaPlantStatusService,
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
    await this.enforceScopeArea(user, id);
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
    await this.applyScopeFilters(user, filters);
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

  @Get('boundaries')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get rayon and area boundary polygons' })
  @ApiResponse({ status: 200, type: BoundariesResponseDto })
  async getBoundaries(
    @Query('rayon_id') rayonId: string | undefined,
    @GetUser() user: User,
  ): Promise<BoundariesResponseDto> {
    const filters: { rayon_id?: string; area_ids?: string[]; area_id?: string } = {};
    if (rayonId) filters.rayon_id = rayonId;
    await this.applyScopeFilters(user, filters);
    // Korlap scope: collapse area_id / area_ids into a single area_ids list so
    // the service only returns assigned areas, not the entire rayon.
    if (user.role === UserRole.KORLAP) {
      const ids: string[] = [];
      if (filters.area_ids) ids.push(...filters.area_ids);
      if (filters.area_id) ids.push(filters.area_id);
      if (ids.length > 0) {
        filters.area_ids = ids;
        delete filters.area_id;
        // Korlap can be assigned to areas in different rayons (e.g. Taman
        // Bungkul lives in 'Rayon Taman Aktif' while the korlap's home rayon
        // is Pusat). Drop the rayon anchor so the cross-rayon assignments
        // remain visible — the area_ids filter is sufficient.
        delete filters.rayon_id;
      }
    }
    return this.statsService.getBoundaries(filters);
  }

  @Get('area/:id/plant-status')
  @Roles(...MONITORING_AREA)
  @ApiOperation({
    summary: 'Get plant maintenance status for an area (ADR-034)',
    description:
      'Returns plant status aggregates (ok/due_soon/overdue/unknown) and per-species breakdown for an area. ' +
      'Status is computed using PlantDueDateService with deterministic species-default pruning cycles.',
  })
  @ApiParam({ name: 'id', description: 'Area ID (UUID)' })
  @ApiResponse({ status: 200, type: AreaPlantStatusDto })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async getAreaPlantStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<AreaPlantStatusDto> {
    await this.enforceScopeArea(user, id);
    return this.areaPlantStatusService.getAreaPlantStatus(id);
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
    const filters: StaffingSummaryQueryDto & { area_ids?: string[] } = { ...query };
    await this.applyScopeFilters(user, filters);
    return this.monitoringService.getStaffingSummary(filters);
  }

  @Get('snapshot')
  @Roles(...MONITORING_CITY, ...MONITORING_RAYON, ...MONITORING_AREA)
  @ApiOperation({ summary: 'Unified monitoring snapshot — workers + scope metadata' })
  @ApiQuery({ name: 'scope', enum: ['city', 'rayon', 'area'], required: false })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'Rayon or Area UUID (required for rayon/area scope)',
  })
  @ApiResponse({ status: 200, description: 'Snapshot returned successfully' })
  async getSnapshot(
    @GetUser() user: User,
    @Query('scope') scope: 'city' | 'rayon' | 'area' = 'city',
    @Query('id') id?: string,
  ) {
    const cityOnlyRoles: UserRole[] = [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_SYSTEM,
      UserRole.TOP_MANAGEMENT,
    ];
    if (scope === 'city' && !cityOnlyRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('City-scope snapshot requires city-level role');
    }
    if (scope === 'rayon' && id) this.enforceScopeRayon(user, id);
    if (scope === 'area' && id) await this.enforceScopeArea(user, id);
    return this.monitoringService.getSnapshot(scope, id);
  }

  @Post('reassign')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Reassign a worker to a different area' })
  @ApiResponse({ status: 201, type: ReassignWorkerResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - wrong rayon' })
  @ApiResponse({ status: 404, description: 'User or area not found' })
  async reassignWorker(
    @Body() dto: ReassignWorkerDto,
    @GetUser() user: User,
  ): Promise<ReassignWorkerResponseDto> {
    return this.reassignService.reassign(dto, user);
  }

  // ---- Scope enforcement helpers ----

  private enforceScopeRayon(user: User, rayonId: string): void {
    const scopedRoles = [UserRole.KEPALA_RAYON, UserRole.ADMIN_DATA];
    if (scopedRoles.includes(user.role as UserRole) && user.rayon_id !== rayonId) {
      throw new ForbiddenException('You can only view monitoring for your own rayon');
    }
  }

  private async enforceScopeArea(user: User, areaId: string): Promise<void> {
    if (user.role === UserRole.KORLAP) {
      // Multi-area: check if korlap is assigned to this area
      const assignedAreaIds = await this.userAreasService.getPermanentAreaIds(user.id);
      if (assignedAreaIds.length > 0) {
        if (!assignedAreaIds.includes(areaId)) {
          throw new ForbiddenException('You can only view monitoring for your assigned areas');
        }
      } else if (user.area_id !== areaId) {
        // Fallback to legacy single area
        throw new ForbiddenException('You can only view monitoring for your own area');
      }
    }
  }

  private async applyScopeFilters(
    user: User,
    filters: { area_id?: string; area_ids?: string[]; rayon_id?: string },
  ): Promise<void> {
    // City-level roles see everything — no scope filter applied.
    if (MONITORING_CITY.includes(user.role as UserRole)) {
      return;
    }

    if (user.role === UserRole.KORLAP) {
      // Multi-area: get all assigned area IDs
      const assignedAreaIds = await this.userAreasService.getPermanentAreaIds(user.id);
      if (assignedAreaIds.length > 0) {
        filters.area_ids = assignedAreaIds;
      } else if (user.area_id) {
        filters.area_id = user.area_id;
      }
      // Always anchor to the korlap's rayon as well so endpoints that only
      // honor `rayon_id` (e.g. boundaries) never leak other-rayon data.
      if (user.rayon_id) {
        filters.rayon_id = user.rayon_id;
      }
    } else if (
      (user.role === UserRole.ADMIN_DATA || user.role === UserRole.KEPALA_RAYON) &&
      user.rayon_id
    ) {
      filters.rayon_id = user.rayon_id;
    }
  }

  private async enforceScopeUser(viewer: User, targetUserId: string): Promise<void> {
    const cityRoles = [UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.TOP_MANAGEMENT];
    if (cityRoles.includes(viewer.role as UserRole)) return;

    const target = await this.monitoringService.getUserDaySummary(targetUserId);

    if (viewer.role === UserRole.KORLAP) {
      // Allow if target area is unknown (not yet clocked in or rayon-scoped)
      if (!target.area_id) return;
      const assignedAreaIds = await this.userAreasService.getPermanentAreaIds(viewer.id);
      if (assignedAreaIds.length > 0) {
        if (!assignedAreaIds.includes(target.area_id)) {
          throw new ForbiddenException('You can only view users in your assigned areas');
        }
      } else if (target.area_id !== viewer.area_id) {
        throw new ForbiddenException('You can only view users in your own area');
      }
      return;
    }
    if (viewer.role === UserRole.KEPALA_RAYON || viewer.role === UserRole.ADMIN_DATA) {
      // Allow if target rayon is unknown (not yet tracked)
      if (!target.rayon_id) return;
      if (target.rayon_id !== viewer.rayon_id) {
        throw new ForbiddenException('You can only view users in your own rayon');
      }
    }
  }
}
