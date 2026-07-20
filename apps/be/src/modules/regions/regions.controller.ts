import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { Region } from './entities/region.entity';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { AssignAreasDto } from './dto/assign-areas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';

/**
 * Regions (Kawasan) master data (ADR-045). Gated by the permission model
 * (`region:*`) — a new endpoint, so it uses `@RequirePermissions` from the start.
 */
@ApiTags('regions')
@ApiBearerAuth('JWT-auth')
@Controller('regions')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class RegionsController {
  constructor(private readonly regionsService: RegionsService) {}

  @Get()
  @RequirePermissions('region:read')
  @ApiOperation({
    summary: 'List regions (optionally filtered by district); active-only by default',
  })
  @ApiQuery({ name: 'district_id', required: false })
  @ApiQuery({
    name: 'include_inactive',
    required: false,
    type: Boolean,
    description:
      'When true, also return deactivated regions — for the admin management grid, so a ' +
      'deactivated kawasan stays visible/reactivatable. Defaults to false everywhere else ' +
      '(pickers, schedule forms), keeping deactivated kawasan out of live ops.',
  })
  @ApiResponse({ status: 200, type: [Region] })
  findAll(
    @GetUser() user: User,
    @Query('district_id') districtId?: string,
    @Query('include_inactive') includeInactive?: string,
  ): Promise<Region[]> {
    return this.regionsService.findAll(user, districtId, includeInactive === 'true');
  }

  @Patch(':id/deactivate')
  @RequirePermissions('region:manage')
  @ApiOperation({
    summary: 'Deactivate region (Kawasan)',
    description:
      'Set is_active=false. Reversible. Refused with 409 while the region still has active locations.',
  })
  @ApiParam({ name: 'id', description: 'Region UUID' })
  @ApiResponse({ status: 200, type: Region })
  @ApiResponse({ status: 409, description: 'Region still has active locations.' })
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<Region> {
    return this.regionsService.deactivate(id);
  }

  @Patch(':id/activate')
  @RequirePermissions('region:manage')
  @ApiOperation({ summary: 'Reactivate region (Kawasan)', description: 'Set is_active=true.' })
  @ApiParam({ name: 'id', description: 'Region UUID' })
  @ApiResponse({ status: 200, type: Region })
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<Region> {
    return this.regionsService.activate(id);
  }

  @Get(':id')
  @RequirePermissions('region:read')
  @ApiOperation({ summary: 'Get a region by id' })
  @ApiResponse({ status: 200, type: Region })
  @ApiResponse({ status: 404, description: 'Region not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Region> {
    return this.regionsService.findOne(id);
  }

  @Post()
  @RequirePermissions('region:create')
  @ApiOperation({ summary: 'Create a region' })
  @ApiResponse({ status: 201, type: Region })
  create(@Body() dto: CreateRegionDto): Promise<Region> {
    return this.regionsService.create(dto);
  }

  @Patch(':id')
  @RequirePermissions('region:update')
  @ApiOperation({ summary: 'Update a region (incl. styling / boundary)' })
  @ApiResponse({ status: 200, type: Region })
  @ApiResponse({ status: 404, description: 'Region not found' })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateRegionDto): Promise<Region> {
    return this.regionsService.update(id, dto);
  }

  @Patch(':id/areas')
  @RequirePermissions('region:update')
  @ApiOperation({ summary: 'Re-parent areas into this region (same district only)' })
  @ApiResponse({ status: 200, description: '{ updated: number }' })
  @ApiResponse({ status: 400, description: 'Location district mismatch' })
  assignLocations(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAreasDto,
  ): Promise<{ updated: number }> {
    return this.regionsService.assignLocations(id, dto.locationIds);
  }

  @Delete(':id')
  @RequirePermissions('region:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a region (child areas keep, region_id set null)' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  @ApiResponse({ status: 404, description: 'Region not found' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.regionsService.remove(id);
  }
}
