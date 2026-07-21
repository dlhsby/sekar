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
import { UserLocationsService } from '../../modules/user-locations/user-locations.service';
import { AuditLogService } from '../audit/audit.service';
import { CityStatsDto } from './dto/city-stats.dto';
import { DistrictStatsDto } from './dto/district-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { LocationHistoryQueryDto, LocationHistoryResponseDto } from './dto/location-history.dto';
import { ReassignmentHistoryResponseDto } from './dto/reassignment-history.dto';
import { UserDaySummaryDto } from './dto/user-day-summary.dto';
import {
  MonitoringConfigResponseDto,
  UpdateMonitoringConfigDto,
} from './dto/monitoring-config.dto';
import { StaffingSummaryQueryDto, StaffingSummaryResponseDto } from './dto/staffing-summary.dto';
import { BoundariesResponseDto } from './dto/boundaries.dto';
import { AggregateResponseDto } from './dto/aggregate.dto';
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
  MONITORING_DISTRICT,
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
    private readonly userAreasService: UserLocationsService,
    private readonly areaPlantStatusService: AreaPlantStatusService,
    private readonly auditLogService: AuditLogService,
  ) {}

  @Get('city')
  @Roles(...MONITORING_CITY)
  @ApiOperation({ summary: 'Get city-wide monitoring statistics' })
  @ApiResponse({ status: 200, type: CityStatsDto })
  async getCityStats(): Promise<CityStatsDto> {
    return this.monitoringService.getCityStats();
  }

  @Get('district/:id')
  @Roles(...MONITORING_DISTRICT)
  @ApiOperation({ summary: 'Get district-level monitoring statistics' })
  @ApiParam({ name: 'id', description: 'District ID (UUID)' })
  @ApiResponse({ status: 200, type: DistrictStatsDto })
  @ApiResponse({ status: 404, description: 'District not found' })
  async getDistrictStats(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<DistrictStatsDto> {
    this.enforceScopeDistrict(user, id);
    return this.monitoringService.getDistrictStats(id);
  }

  @Get('area/:id')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get area-level monitoring statistics' })
  @ApiParam({ name: 'id', description: 'Location ID (UUID)' })
  @ApiResponse({ status: 200, type: AreaStatsDto })
  @ApiResponse({ status: 404, description: 'Location not found' })
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

  @Get('search')
  @Roles(...MONITORING_AREA)
  @ApiOperation({
    summary:
      'Server-side monitoring search — workers clocked in with a fix in the last 24h whose name ' +
      'or lokasi matches, scope-filtered. Surfaces monitorable-but-unscheduled clock-ins too.',
  })
  @ApiQuery({ name: 'q', description: 'Search term (worker or lokasi name)' })
  @ApiResponse({ status: 200, type: LiveUsersResponseDto })
  async searchMonitoring(
    @Query() filters: LiveUsersFilterDto,
    @GetUser() user: User,
  ): Promise<LiveUsersResponseDto> {
    // Empty query returns nothing rather than the whole scoped fleet.
    if (!filters.q || !filters.q.trim()) {
      return {
        total_active: 0,
        total_offline: 0,
        total_absent: 0,
        total_outside_area: 0,
        total_online: 0,
        users: [],
        expected_count: 0,
        present_count: 0,
        absent_count: 0,
        on_leave_count: 0,
        off_schedule_count: 0,
        absent_users: [],
        generated_at: new Date(),
      };
    }
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

  @Get('users/:userId/reassignment-history')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get user reassignment history audit log' })
  @ApiParam({ name: 'userId', description: 'User ID (UUID)' })
  @ApiResponse({ status: 200, type: ReassignmentHistoryResponseDto })
  @ApiResponse({ status: 404, description: 'User not found' })
  async getReassignmentHistory(
    @Param('userId', ParseUUIDPipe) userId: string,
    @GetUser() user: User,
  ): Promise<ReassignmentHistoryResponseDto> {
    await this.enforceScopeUser(user, userId);
    const logs = await this.auditLogService.getEntityHistory('user', userId);
    const reassignmentLogs = logs.filter((log) => log.action === 'reassign').slice(0, 20);

    return {
      user_id: userId,
      history: reassignmentLogs.map((log) => ({
        id: log.id,
        previous_area_id: log.old_value?.location_id ?? null,
        previous_area_name: log.old_value?.location_name ?? null,
        new_area_id: log.new_value?.location_id ?? null,
        new_area_name: log.new_value?.location_name ?? null,
        reason: log.metadata?.reason ?? null,
        effective_date: log.metadata?.effective_date ?? null,
        actor_id: log.actor_id,
        actor_name: log.actor?.full_name ?? 'Unknown',
        created_at: log.created_at,
      })),
    };
  }

  @Get('boundaries')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get district and area boundary polygons' })
  @ApiQuery({
    name: 'level',
    enum: ['district', 'area'],
    required: false,
    description: 'district → outlines only (lightest); area (default) → full area geometry',
  })
  @ApiResponse({ status: 200, type: BoundariesResponseDto })
  async getBoundaries(
    @Query('district_id') districtId: string | undefined,
    @GetUser() user: User,
    @Query('level') level?: 'district' | 'area',
  ): Promise<BoundariesResponseDto> {
    const filters: {
      district_id?: string;
      area_ids?: string[];
      location_id?: string;
      level?: 'district' | 'area';
    } = {};
    if (districtId) filters.district_id = districtId;
    if (level === 'district' || level === 'area') filters.level = level;
    await this.applyScopeFilters(user, filters);
    // Korlap scope: collapse location_id / area_ids into a single area_ids list so
    // the service only returns assigned areas, not the entire district.
    if (user.role === UserRole.KORLAP) {
      const ids: string[] = [];
      if (filters.area_ids) ids.push(...filters.area_ids);
      if (filters.location_id) ids.push(filters.location_id);
      if (ids.length > 0) {
        filters.area_ids = ids;
        delete filters.location_id;
        // Korlap can be assigned to areas in different districts (e.g. Taman
        // Bungkul lives in 'Rayon Taman Aktif' while the korlap's home district
        // is Pusat). Drop the district anchor so the cross-district assignments
        // remain visible — the area_ids filter is sufficient.
        delete filters.district_id;
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
  @ApiParam({ name: 'id', description: 'Location ID (UUID)' })
  @ApiResponse({ status: 200, type: AreaPlantStatusDto })
  @ApiResponse({ status: 404, description: 'Location not found' })
  async getAreaPlantStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<AreaPlantStatusDto> {
    await this.enforceScopeArea(user, id);
    return this.areaPlantStatusService.getAreaPlantStatus(id);
  }

  @Get('plant-status/summary')
  @Roles(...MONITORING_DISTRICT)
  @ApiOperation({
    summary: 'Per-district plant status rollup (Phase 3-8 close-out)',
    description:
      'Aggregated ok/due_soon/overdue/unknown counts grouped by district, with the areas that ' +
      'currently have overdue species. City roles see all districts; district-scoped roles are ' +
      'forced to their own district.',
  })
  @ApiQuery({ name: 'district_id', required: false, description: 'Limit to one district (UUID)' })
  @ApiResponse({ status: 200, description: 'Summary returned' })
  async getPlantStatusSummary(@GetUser() user: User, @Query('district_id') districtId?: string) {
    const isCityRole = MONITORING_CITY.includes(user.role as UserRole);
    // Rayon-scoped roles always get their own district, whatever they ask for
    const effectiveDistrictId = isCityRole ? districtId : (user.district_id ?? undefined);
    if (!isCityRole && !effectiveDistrictId) {
      return { generated_at: new Date(), districts: [] };
    }
    return this.areaPlantStatusService.getSummary(effectiveDistrictId);
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

  @Get('aggregate')
  @Roles(...MONITORING_CITY, ...MONITORING_DISTRICT)
  @ApiOperation({
    summary:
      'Aggregate map summary (Ringkasan mode) — district/region/area rollups, no worker coords',
    description:
      'scope=city → one node per district; scope=district → one node per area in the district; ' +
      'scope=region → one node per kawasan in the district. Returns grouped status/role counts + ' +
      'centers only, for lightweight drill-down bubbles.',
  })
  @ApiQuery({ name: 'scope', enum: ['city', 'district', 'region'], required: false })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'District UUID (required for district + region scope)',
  })
  @ApiResponse({ status: 200, type: AggregateResponseDto })
  async getAggregate(
    @GetUser() user: User,
    @Query('scope') scope: 'city' | 'district' | 'region' = 'city',
    @Query('id') id?: string,
  ): Promise<AggregateResponseDto> {
    // City-scope aggregate is city-role only; district-scoped roles are forced to
    // their own district and cannot request the city rollup.
    if (scope === 'city' && !MONITORING_CITY.includes(user.role as UserRole)) {
      throw new ForbiddenException('City-scope aggregate requires city-level role');
    }
    let districtId = id;
    // `region` scope is district-parametrised (kawasan of a district), so it enforces
    // identically to `district`: a district role only ever sees its own district.
    if (scope === 'district' || scope === 'region') {
      const isCityRole = MONITORING_CITY.includes(user.role as UserRole);
      districtId = isCityRole ? id : (user.district_id ?? undefined);
      if (districtId) this.enforceScopeDistrict(user, districtId);
    }
    return this.statsService.getAggregate(scope, districtId);
  }

  @Get('snapshot')
  @Roles(...MONITORING_CITY, ...MONITORING_DISTRICT, ...MONITORING_AREA)
  @ApiOperation({ summary: 'Unified monitoring snapshot — workers + scope metadata' })
  @ApiQuery({ name: 'scope', enum: ['city', 'district', 'location'], required: false })
  @ApiQuery({
    name: 'id',
    required: false,
    description: 'District or Location UUID (required for district/location scope)',
  })
  @ApiResponse({ status: 200, description: 'Snapshot returned successfully' })
  async getSnapshot(
    @GetUser() user: User,
    @Query('scope') scope: 'city' | 'district' | 'location' = 'city',
    @Query('id') id?: string,
  ) {
    const cityOnlyRoles: UserRole[] = [
      UserRole.SUPERADMIN,
      UserRole.ADMIN_SYSTEM,
      UserRole.MANAGEMENT,
    ];
    if (scope === 'city' && !cityOnlyRoles.includes(user.role as UserRole)) {
      throw new ForbiddenException('City-scope snapshot requires city-level role');
    }
    if (scope === 'district' && id) this.enforceScopeDistrict(user, id);
    if (scope === 'location' && id) await this.enforceScopeArea(user, id);
    return this.monitoringService.getSnapshot(scope, id);
  }

  @Post('reassign')
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Reassign a worker to a different area' })
  @ApiResponse({ status: 201, type: ReassignWorkerResponseDto })
  @ApiResponse({ status: 403, description: 'Forbidden - wrong district' })
  @ApiResponse({ status: 404, description: 'User or area not found' })
  async reassignWorker(
    @Body() dto: ReassignWorkerDto,
    @GetUser() user: User,
  ): Promise<ReassignWorkerResponseDto> {
    return this.reassignService.reassign(dto, user);
  }

  // ---- Scope enforcement helpers ----

  private enforceScopeDistrict(user: User, districtId: string): void {
    const scopedRoles = [UserRole.KEPALA_RAYON, UserRole.ADMIN_RAYON];
    if (scopedRoles.includes(user.role as UserRole) && user.district_id !== districtId) {
      throw new ForbiddenException('You can only view monitoring for your own district');
    }
  }

  /**
   * A korlap's monitoring coverage (ADR-046, PR0b) = the union of location ids they
   * may view: their STATIC assignment (permanent lokasi ∪ member lokasi of their
   * `region_id` ∪ their `location_id`) PLUS today's SCHEDULE occurrences (individual
   * or team) expanded to concrete lokasi — occurrence lokasi, member lokasi of any
   * kawasan-scoped occurrence, and member lokasi of any rayon-scoped occurrence.
   * Static assignment is the fallback when there is no occurrence that day.
   */
  private async resolveKorlapCoverage(user: User): Promise<string[]> {
    const shift = await this.statsService.getCurrentShiftDefinition();
    const [permanent, occ] = await Promise.all([
      this.userAreasService.getPermanentLocationIds(user.id),
      this.statsService.occurrenceCoverageForCurrentShift(user.id, shift?.id),
    ]);
    const regionIds = [...(user.region_id ? [user.region_id] : []), ...occ.regionIds];
    const [regionLocs, districtLocs] = await Promise.all([
      this.statsService.locationIdsForRegions(regionIds),
      this.statsService.locationIdsForDistricts(occ.districtIds),
    ]);
    // Permanent (multi-location) assignment supersedes the legacy single
    // `location_id`; the latter is only a fallback when no permanent rows exist.
    const staticLocations =
      permanent.length > 0 ? permanent : user.location_id ? [user.location_id] : [];
    return [
      ...new Set<string>([...staticLocations, ...occ.locationIds, ...regionLocs, ...districtLocs]),
    ];
  }

  private async enforceScopeArea(user: User, locationId: string): Promise<void> {
    if (user.role === UserRole.KORLAP) {
      const coverage = await this.resolveKorlapCoverage(user);
      if (!coverage.includes(locationId)) {
        throw new ForbiddenException(
          'You can only view monitoring for your assigned or scheduled areas',
        );
      }
    }
  }

  private async applyScopeFilters(
    user: User,
    filters: { location_id?: string; area_ids?: string[]; district_id?: string },
  ): Promise<void> {
    // City-level roles see everything — no scope filter applied.
    if (MONITORING_CITY.includes(user.role as UserRole)) {
      return;
    }

    if (user.role === UserRole.KORLAP) {
      // Coverage = static assignment ∪ today's schedule occurrences (see above).
      const coverage = await this.resolveKorlapCoverage(user);
      if (coverage.length > 0) {
        filters.area_ids = coverage;
      } else if (user.location_id) {
        filters.location_id = user.location_id;
      }
      // Anchor to the korlap's district so endpoints that honor only `district_id`
      // (e.g. boundaries) never leak other-district data. (Cross-district coverage
      // via an occurrence in another rayon is out of scope; the common case is
      // kawasan/lokasi within the korlap's own district.)
      if (user.district_id) {
        filters.district_id = user.district_id;
      }
    } else if (
      (user.role === UserRole.ADMIN_RAYON || user.role === UserRole.KEPALA_RAYON) &&
      user.district_id
    ) {
      filters.district_id = user.district_id;
    }
  }

  private async enforceScopeUser(viewer: User, targetUserId: string): Promise<void> {
    const cityRoles = [UserRole.SUPERADMIN, UserRole.ADMIN_SYSTEM, UserRole.MANAGEMENT];
    if (cityRoles.includes(viewer.role as UserRole)) return;

    const target = await this.monitoringService.getUserDaySummary(targetUserId);

    if (viewer.role === UserRole.KORLAP) {
      // Allow if target area is unknown (not yet clocked in or district-scoped)
      if (!target.location_id) return;
      const assignedAreaIds = await this.userAreasService.getPermanentLocationIds(viewer.id);
      if (assignedAreaIds.length > 0) {
        if (!assignedAreaIds.includes(target.location_id)) {
          throw new ForbiddenException('You can only view users in your assigned areas');
        }
      } else if (target.location_id !== viewer.location_id) {
        throw new ForbiddenException('You can only view users in your own area');
      }
      return;
    }
    if (viewer.role === UserRole.KEPALA_RAYON || viewer.role === UserRole.ADMIN_RAYON) {
      // Allow if target district is unknown (not yet tracked)
      if (!target.district_id) return;
      if (target.district_id !== viewer.district_id) {
        throw new ForbiddenException('You can only view users in your own district');
      }
    }
  }
}
