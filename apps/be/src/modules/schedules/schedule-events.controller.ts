import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { RequirePermissions } from '../auth/decorators/require-permissions.decorator';
import { GetUser } from '../auth/decorators/get-user.decorator';
import { User } from '../users/entities/user.entity';
import { ScheduleEventsService } from './services/schedule-events.service';
import { CreateScheduleEventDto } from './dto/create-schedule-event.dto';
import { UpdateScheduleEventDto } from './dto/update-schedule-event.dto';
import { DeleteScheduleEventDto } from './dto/delete-schedule-event.dto';
import { EditScope } from './enums/edit-scope.enum';

@ApiTags('Schedule Events')
@Controller('schedule-events')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class ScheduleEventsController {
  constructor(private readonly eventsService: ScheduleEventsService) {}

  @Get()
  @RequirePermissions('schedule:read')
  @ApiOperation({ summary: 'List schedule events' })
  @ApiResponse({ status: 200, description: 'Schedule events' })
  async list(
    @Query('from') from?: string,
    @Query('to') to?: string,
    @Query('rayon_id') rayonId?: string,
    @Query('user_id') userId?: string,
    @Query('team_category_id') teamCategoryId?: string,
    @Query('shift_definition_id') shiftDefinitionId?: string,
    @Query('is_team') isTeam?: string,
    @GetUser() actor?: User,
  ) {
    return this.eventsService.list(
      {
        from,
        to,
        rayon_id: rayonId,
        user_id: userId,
        team_category_id: teamCategoryId,
        shift_definition_id: shiftDefinitionId,
        is_team: isTeam === 'true' ? true : isTeam === 'false' ? false : undefined,
      },
      actor!,
    );
  }

  @Get(':id')
  @RequirePermissions('schedule:read')
  @ApiOperation({ summary: 'Get a schedule event by id' })
  @ApiResponse({ status: 200, description: 'Schedule event' })
  async findOne(@Param('id') id: string, @GetUser() actor?: User) {
    return this.eventsService.findOne(id, actor!);
  }

  @Post()
  @RequirePermissions('schedule:create')
  @ApiOperation({ summary: 'Create a schedule event' })
  @ApiResponse({ status: 201, description: 'Created event + materialization result' })
  async create(@Body() dto: CreateScheduleEventDto, @GetUser() actor?: User) {
    return this.eventsService.create(dto, actor!);
  }

  @Patch(':id')
  @RequirePermissions('schedule:update')
  @ApiOperation({ summary: 'Update a schedule event' })
  @ApiResponse({ status: 200, description: 'Updated event + materialization result' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateScheduleEventDto,
    @Query('edit_scope') editScope: EditScope = EditScope.SERIES,
    @Query('from_date') fromDate?: string,
    @GetUser() actor?: User,
  ) {
    return this.eventsService.update(id, dto, editScope, fromDate, actor!);
  }

  @Delete(':id')
  @HttpCode(204)
  @RequirePermissions('schedule:delete')
  @ApiOperation({ summary: 'Delete a schedule event' })
  @ApiResponse({ status: 204, description: 'Deleted' })
  async delete(
    @Param('id') id: string,
    @Query() query: DeleteScheduleEventDto,
    @GetUser() actor?: User,
  ) {
    const scope = (query.scope || EditScope.SERIES) as EditScope;
    await this.eventsService.delete(id, scope, query.date, actor!);
  }
}
