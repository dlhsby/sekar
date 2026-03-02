import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  ParseUUIDPipe,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { MonitoringService } from './monitoring.service';
import { CityStatsDto } from './dto/city-stats.dto';
import { RayonStatsDto } from './dto/rayon-stats.dto';
import { AreaStatsDto } from './dto/area-stats.dto';
import { LiveUsersResponseDto, LiveUsersFilterDto } from './dto/live-users.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User, UserRole } from '../users/entities/user.entity';
import { MONITORING_CITY, MONITORING_RAYON, MONITORING_AREA } from '../users/constants/role-groups';

/**
 * Controller for real-time monitoring
 *
 * Provides role-scoped access to monitoring statistics:
 * - City-wide: Admin, TopManagement
 * - Rayon-level: KepalaRayon and above
 * - Area-level: Korlap and above
 * - Live users: All supervisory roles
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
  @Roles(...MONITORING_CITY)
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
  @Roles(...MONITORING_RAYON)
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
  async getRayonStats(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<RayonStatsDto> {
    if (
      (user.role === UserRole.KEPALA_RAYON || user.role === UserRole.ADMIN_DATA) &&
      user.rayon_id !== id
    ) {
      throw new ForbiddenException('You can only view monitoring for your own rayon');
    }
    return this.monitoringService.getRayonStats(id);
  }

  /**
   * Get area-level statistics
   */
  @Get('area/:id')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get area-level monitoring statistics' })
  @ApiParam({ name: 'id', description: 'Area ID (UUID)' })
  @ApiResponse({
    status: 200,
    description: 'Area statistics',
    type: AreaStatsDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Korlap+ only' })
  @ApiResponse({ status: 404, description: 'Area not found' })
  async getAreaStats(
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() user: User,
  ): Promise<AreaStatsDto> {
    if (user.role === UserRole.KORLAP && user.area_id !== id) {
      throw new ForbiddenException('You can only view monitoring for your own area');
    }
    return this.monitoringService.getAreaStats(id);
  }

  /**
   * Get live user positions
   */
  @Get('live-users')
  @Roles(...MONITORING_AREA)
  @ApiOperation({ summary: 'Get real-time user positions' })
  @ApiResponse({
    status: 200,
    description: 'Live user positions',
    type: LiveUsersResponseDto,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Monitoring roles only' })
  async getLiveUsers(
    @Query() filters: LiveUsersFilterDto,
    @GetUser() user: User,
  ): Promise<LiveUsersResponseDto> {
    if (user.role === UserRole.KORLAP && user.area_id) {
      filters.area_id = user.area_id;
    } else if (user.role === UserRole.ADMIN_DATA && user.rayon_id) {
      filters.rayon_id = user.rayon_id;
    }
    return this.monitoringService.getLiveUsers(filters);
  }
}
