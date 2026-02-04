import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { SpecialDayOverridesService } from './special-day-overrides.service';
import { CreateSpecialDayOverrideDto } from './dto/create-special-day-override.dto';
import { UpdateSpecialDayOverrideDto } from './dto/update-special-day-override.dto';
import { SpecialDayOverride } from './entities/special-day-override.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('special-day-overrides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('special-day-overrides')
export class SpecialDayOverridesController {
  constructor(private readonly specialDayOverridesService: SpecialDayOverridesService) {}

  @Post()
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Create a special day override (Admin only)' })
  @ApiResponse({
    status: 201,
    description: 'Special day override created successfully',
    type: SpecialDayOverride,
  })
  @ApiResponse({ status: 409, description: 'Date already has an override' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async create(@Body() createDto: CreateSpecialDayOverrideDto): Promise<SpecialDayOverride> {
    return this.specialDayOverridesService.create(createDto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all special day overrides with optional date range filter' })
  @ApiQuery({ name: 'startDate', required: false, description: 'Start date (YYYY-MM-DD)' })
  @ApiQuery({ name: 'endDate', required: false, description: 'End date (YYYY-MM-DD)' })
  @ApiResponse({
    status: 200,
    description: 'List of special day overrides',
    type: [SpecialDayOverride],
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<SpecialDayOverride[]> {
    return this.specialDayOverridesService.findAll(startDate, endDate);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a special day override by ID' })
  @ApiResponse({
    status: 200,
    description: 'Special day override details',
    type: SpecialDayOverride,
  })
  @ApiResponse({ status: 404, description: 'Special day override not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async findOne(@Param('id') id: string): Promise<SpecialDayOverride> {
    return this.specialDayOverridesService.findOne(id);
  }

  @Patch(':id')
  @Roles(UserRole.ADMIN)
  @ApiOperation({ summary: 'Update a special day override (Admin only)' })
  @ApiResponse({
    status: 200,
    description: 'Special day override updated successfully',
    type: SpecialDayOverride,
  })
  @ApiResponse({ status: 404, description: 'Special day override not found' })
  @ApiResponse({ status: 409, description: 'New date already has an override' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateSpecialDayOverrideDto,
  ): Promise<SpecialDayOverride> {
    return this.specialDayOverridesService.update(id, updateDto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a special day override (Admin only)' })
  @ApiResponse({ status: 204, description: 'Special day override deleted successfully' })
  @ApiResponse({ status: 404, description: 'Special day override not found' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async remove(@Param('id') id: string): Promise<void> {
    return this.specialDayOverridesService.remove(id);
  }
}
