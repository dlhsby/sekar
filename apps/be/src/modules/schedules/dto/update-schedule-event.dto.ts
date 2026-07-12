import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsArray,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleScope } from '../enums/schedule-scope.enum';
import { EditScope } from '../enums/edit-scope.enum';
import { RecurrenceConfigDto } from './create-schedule-event.dto';

/**
 * Update DTO for schedule events.
 * Note: is_team, user_id, team_id (the "kind") are immutable after creation.
 * Changing who an event is for requires delete + recreate.
 * PATCH accepts query param `edit_scope` (series|this_and_future|this, default series).
 * For this_and_future, `from_date` query param is required.
 */
export class UpdateScheduleEventDto {
  @ApiPropertyOptional({ description: 'Optional human-readable title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ enum: RecurrenceType, description: 'Recurrence type' })
  @IsOptional()
  @IsEnum(RecurrenceType)
  recurrence_type?: RecurrenceType;

  @ApiPropertyOptional({ description: 'Start date (YYYY-MM-DD)', example: '2026-07-15' })
  @IsOptional()
  @IsDateString()
  start_date?: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Recurrence configuration', type: RecurrenceConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceConfigDto)
  recurrence_config?: RecurrenceConfigDto;

  @ApiPropertyOptional({ description: 'Shift definition id' })
  @IsOptional()
  @IsUUID()
  shift_definition_id?: string;

  @ApiPropertyOptional({ enum: ScheduleScope, description: 'Scope: static or mobile' })
  @IsOptional()
  @IsEnum(ScheduleScope)
  scope?: ScheduleScope;

  @ApiPropertyOptional({ description: 'Location id (required for static scope)' })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({ description: 'Region id (required for mobile scope)' })
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional({
    description: 'Member user ids for team events (immutable: cannot change kind)',
    type: [String],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(100)
  @IsUUID('all', { each: true })
  member_ids?: string[];

  @ApiPropertyOptional({ description: 'Notes / reason' })
  @IsOptional()
  @IsString()
  notes?: string;
}
