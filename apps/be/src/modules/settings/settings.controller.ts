import { Controller, Get, Patch, Delete, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { SystemConfigService, SettingDescription } from './services/system-config.service';
import { UpdateSettingDto } from './dto/update-setting.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * System settings (ADR-049). `settings:read` to view (secrets masked),
 * `settings:manage` to change — Management holds only `settings:read`, so the
 * API rejects its mutations.
 */
@ApiTags('settings')
@ApiBearerAuth('JWT-auth')
@Controller('settings')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class SettingsController {
  constructor(private readonly systemConfig: SystemConfigService) {}

  @Get()
  @RequirePermissions('settings:read')
  @ApiOperation({ summary: 'List system settings with source + effective value (secrets masked)' })
  @ApiResponse({ status: 200, description: 'Settings descriptions' })
  list(): SettingDescription[] {
    return this.systemConfig.describeAll();
  }

  @Patch(':key')
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Set a system setting override' })
  @ApiParam({ name: 'key', example: 'monitoring.idle_threshold_min' })
  @ApiResponse({ status: 200, description: 'Updated setting' })
  @ApiResponse({ status: 400, description: 'Invalid value / secret without encryption key' })
  @ApiResponse({ status: 404, description: 'Unknown setting key' })
  set(
    @Param('key') key: string,
    @Body() dto: UpdateSettingDto,
    @GetUser() user: User,
  ): Promise<SettingDescription> {
    return this.systemConfig.set(key, dto.value, user.id);
  }

  @Delete(':key')
  @RequirePermissions('settings:manage')
  @ApiOperation({ summary: 'Clear a system setting override (fall back to env/default)' })
  @ApiParam({ name: 'key', example: 'monitoring.active_max_age_sec' })
  @ApiResponse({ status: 200, description: 'Cleared setting' })
  @ApiResponse({ status: 404, description: 'Unknown setting key' })
  clear(@Param('key') key: string, @GetUser() user: User): Promise<SettingDescription> {
    return this.systemConfig.clear(key, user.id);
  }
}
