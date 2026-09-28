import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseEnumPipe,
  ParseUUIDPipe,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { GetUser } from '../auth/decorators/get-user.decorator';
import type { User } from '../users/entities/user.entity';
import { DeletionService } from './deletion.service';
import { DELETABLE_TYPES, type DeletableType } from './deletion-plans';
import { ForceDeleteDto } from './dto/force-delete.dto';

const TYPE_ENUM = Object.fromEntries(DELETABLE_TYPES.map((t) => [t, t])) as Record<
  string,
  DeletableType
>;

/**
 * Force delete of in-use master data and accounts (ADR-062). Permission is
 * per type (`<resource>:delete`) and checked in the service, since one route
 * serves several resources.
 */
@ApiTags('deletions')
@ApiBearerAuth('JWT-auth')
@Controller('deletions')
@UseGuards(JwtAuthGuard)
export class DeletionController {
  constructor(private readonly deletions: DeletionService) {}

  @Get(':type/:id/impact')
  @ApiOperation({ summary: 'What a force delete would remove or change (dry run)' })
  @ApiParam({ name: 'type', enum: DELETABLE_TYPES })
  impact(
    @Param('type', new ParseEnumPipe(TYPE_ENUM)) type: DeletableType,
    @Param('id', ParseUUIDPipe) id: string,
    @GetUser() actor: User,
  ) {
    return this.deletions.impact(type, id, actor);
  }

  @Post(':type/:id')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary:
      'Soft-delete an in-use record: cancels its future schedules, keeps all history, audited with a reason',
  })
  @ApiParam({ name: 'type', enum: DELETABLE_TYPES })
  @ApiResponse({ status: 400, description: 'DELETE_CONFIRMATION_MISMATCH / validation' })
  @ApiResponse({ status: 403, description: 'Missing <resource>:delete, or DELETE_NOT_ALLOWED' })
  @ApiResponse({ status: 409, description: 'DELETE_REPLACEMENT_REQUIRED' })
  forceDelete(
    @Param('type', new ParseEnumPipe(TYPE_ENUM)) type: DeletableType,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: ForceDeleteDto,
    @GetUser() actor: User,
  ) {
    return this.deletions.forceDelete(type, id, dto, actor);
  }
}
