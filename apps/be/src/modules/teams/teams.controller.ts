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
import { TeamsService } from './teams.service';
import { Team } from './entities/team.entity';
import { TeamType } from './entities/team-type.entity';
import { CreateTeamDto } from './dto/create-team.dto';
import { UpdateTeamDto } from './dto/update-team.dto';
import { CreateTeamTypeDto, UpdateTeamTypeDto } from './dto/team-type.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';

/** Teams (crews) + team-type catalog (ADR-048). Gated by `team:*`. */
@ApiTags('teams')
@ApiBearerAuth('JWT-auth')
@Controller()
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class TeamsController {
  constructor(private readonly teamsService: TeamsService) {}

  // ── Team types (catalog) ──────────────────────────────────────────────────
  @Get('team-types')
  @RequirePermissions('team:read')
  @ApiOperation({ summary: 'List team types (crew-type catalog; active only by default)' })
  @ApiQuery({ name: 'include_inactive', required: false, type: Boolean })
  @ApiResponse({ status: 200, type: [TeamType] })
  listTypes(@Query('include_inactive') includeInactive?: string): Promise<TeamType[]> {
    return this.teamsService.listTypes(includeInactive === 'true');
  }

  @Post('team-types')
  @RequirePermissions('team:manage')
  @ApiOperation({ summary: 'Add a team type' })
  createType(@Body() dto: CreateTeamTypeDto): Promise<TeamType> {
    return this.teamsService.createType(dto);
  }

  @Patch('team-types/:id')
  @RequirePermissions('team:manage')
  @ApiOperation({ summary: 'Update a team type' })
  updateType(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateTeamTypeDto,
  ): Promise<TeamType> {
    return this.teamsService.updateType(id, dto);
  }

  // ── Teams ────────────────────────────────────────────────────────────────
  @Get('teams')
  @RequirePermissions('team:read')
  @ApiOperation({ summary: 'List teams' })
  @ApiResponse({ status: 200, type: [Team] })
  findAll(): Promise<Team[]> {
    return this.teamsService.findAll();
  }

  @Get('teams/:id')
  @RequirePermissions('team:read')
  @ApiOperation({ summary: 'Get a team by id' })
  @ApiResponse({ status: 200, type: Team })
  @ApiResponse({ status: 404, description: 'Team not found' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<Team> {
    return this.teamsService.findOne(id);
  }

  @Post('teams')
  @RequirePermissions('team:create')
  @ApiOperation({ summary: 'Create a team' })
  @ApiResponse({ status: 201, type: Team })
  create(@Body() dto: CreateTeamDto): Promise<Team> {
    return this.teamsService.create(dto);
  }

  @Patch('teams/:id')
  @RequirePermissions('team:update')
  @ApiOperation({ summary: 'Update a team' })
  @ApiResponse({ status: 200, type: Team })
  update(@Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateTeamDto): Promise<Team> {
    return this.teamsService.update(id, dto);
  }

  @Delete('teams/:id')
  @RequirePermissions('team:delete')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a team' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.teamsService.remove(id);
  }
}
