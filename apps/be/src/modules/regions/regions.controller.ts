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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { RegionsService } from './regions.service';
import { Region } from './entities/region.entity';
import { CreateRegionDto } from './dto/create-region.dto';
import { UpdateRegionDto } from './dto/update-region.dto';
import { AssignAreasDto } from './dto/assign-areas.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

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
  @ApiOperation({ summary: 'List regions (optionally filtered by rayon)' })
  @ApiQuery({ name: 'rayon_id', required: false })
  @ApiResponse({ status: 200, type: [Region] })
  findAll(@Query('rayon_id') rayonId?: string): Promise<Region[]> {
    return this.regionsService.findAll(rayonId);
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
  @ApiOperation({ summary: 'Re-parent areas into this region (same rayon only)' })
  @ApiResponse({ status: 200, description: '{ updated: number }' })
  @ApiResponse({ status: 400, description: 'Area rayon mismatch' })
  assignAreas(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: AssignAreasDto,
  ): Promise<{ updated: number }> {
    return this.regionsService.assignAreas(id, dto.areaIds);
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
