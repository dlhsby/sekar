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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { TeamsService } from './teams.service';
import { TeamCategory } from './entities/team-category.entity';
import { CreateTeamCategoryDto, UpdateTeamCategoryDto } from './dto/team-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

/**
 * Team types — crew-type catalog (ADR-048, Phase 4).
 * Concrete teams (name, PIC, members) live on schedule_events, not here.
 * Gated by `team:*` permissions.
 */
@ApiTags('teams')
@ApiBearerAuth('JWT-auth')
@Controller('team-categories')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  @Get()
  @RequirePermissions('team:read')
  @ApiOperation({
    summary:
      'List team categories (crew-type catalog; active only by default). Phase 4: team categories define markers; concrete teams live on schedule_events.',
  })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [TeamCategory] })
  listTypes(@Query('include_inactive') includeInactive?: string): Promise<TeamCategory[]> {
    return this.teamsService.listTypes(includeInactive === 'true');
  }

  @Post()
  @RequirePermissions('team:manage')
  @ApiOperation({ summary: 'Add a team category' })
  @ApiResponse({ status: 201, type: TeamCategory })
  createType(@Body() dto: CreateTeamCategoryDto): Promise<TeamCategory> {
    return this.teamsService.createType(dto);
  }

  @Patch(':id')
  @RequirePermissions('team:manage')
  @ApiOperation({ summary: 'Update a team category' })
  @ApiResponse({ status: 200, type: TeamCategory })
  updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamCategoryDto,
  ): Promise<TeamCategory> {
    return this.teamsService.updateType(id, dto);
  }
}
