import { Controller, Get, Param, Query, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveWorkersResponseDto, LiveWorkersFilterDto } from './dto/live-workers.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

/**
 * Controller for real-time monitoring
 *
 * Provides role-scoped access to monitoring statistics:
 * - City-wide: Admin, TopManagement
 * - Rayon-level: KepalaRayon and above
 * - Area-level: KoordinatorLapangan and above
 * - Live workers: All supervisory roles
 */
@ApiTags('Monitoring')
@ApiBearerAuth()
@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  /**
   * Get city-wide statistics
   */
  @Get('city')
  @Roles(UserRole.ADMIN, UserRole.TOP_MANAGEMENT)
  @ApiOperation({ summary: 'Get city-wide monitoring statistics' })
  @ApiResponse({
    status: 200,
    description: 'City-wide statistics',
    type: CityStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin/TopManagement only' })
  async getCityStats(): Promise<CityStatsDto> {
    return this.monitoringService.getCityStats();
  }

  /**
   * Get rayon-level statistics
   */
  @Get('rayon/:id')
  @Roles(UserRole.ADMIN, UserRole.TOP_MANAGEMENT, UserRole.KEPALA_RAYON)
  @ApiOperation({ summary: 'Get rayon-level monitoring statistics' })
  @ApiParam({ name: 'id', description: 'Rayon ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Rayon statistics',
    type: RayonStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - KepalaRayon+ only' })
  @ApiResponse({ status: 404, description: 'Rayon not found' })
  async getRayonStats(@Param('id', ParseUUIDPipe) id: string): Promise<RayonStatsDto> {
    return this.monitoringService.getRayonStats(id);
  }

  /**
   * Get area-level statistics
   */
  @Get('area/:id')
  @Roles(
    UserRole.ADMIN,
    UserRole.TOP_MANAGEMENT,
    UserRole.KEPALA_RAYON,
    UserRole.KOORDINATOR_LAPANGAN,
    UserRole.SUPERVISOR,
  )
  @ApiOperation({ summary: 'Get area-level monitoring statistics' })
  @ApiParam({ name: 'id', description: 'Area ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Area statistics',
    type: AreaStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - KoordinatorLapangan+ only' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async getAreaStats(@Param('id', ParseUUIDPipe) id: string): Promise<AreaStatsDto> {
    return this.monitoringService.getAreaStats(id);
  }

  /**
   * Get live worker positions
   */
  @Get('live-workers')
  @Roles(
    UserRole.ADMIN,
    UserRole.TOP_MANAGEMENT,
    UserRole.KEPALA_RAYON,
    UserRole.KOORDINATOR_LAPANGAN,
    UserRole.SUPERVISOR,
  )
  @ApiOperation({ summary: 'Get real-time worker positions' })
  @ApiResponse({
    status: 200,
    description: 'Live worker positions',
    type: LiveWorkersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Supervisory roles only' })
  async getLiveWorkers(@Query() filters: LiveWorkersFilterDto): Promise<LiveWorkersResponseDto> {
    return this.monitoringService.getLiveWorkers(filters);
  }
}
