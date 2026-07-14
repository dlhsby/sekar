import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsUUID,
  IsBoolean,
  IsArray,
  IsNumber,
  Min,
  Max,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleScope } from '../enums/schedule-scope.enum';

/**
 * Structured recurrence payload (ADR-047). A real class (not the entity's
 * interface): the global ValidationPipe whitelists nested objects by their
 * decorated properties, so `@Type(() => Object)` would reject every key.
 */
export class RecurrenceConfigDto {
  @ApiPropertyOptional({ description: 'Every-N-days interval (2–30)', example: 3 })
  @IsOptional()
  @IsNumber()
  @Min(2)
  @Max(30)
  interval_n?: number;

  @ApiPropertyOptional({
    description: 'Weekly recurrence weekdays (0=Sunday … 6=Saturday)',
    example: [1, 3, 5],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @IsNumber({}, { each: true })
  @Min(0, { each: true })
  @Max(6, { each: true })
  weekdays?: number[];

  @ApiPropertyOptional({
    description: 'Specific dates (YYYY-MM-DD) within [start_date, end_date]',
    example: ['2026-07-20', '2026-07-27'],
  })
  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(120)
  @IsDateString({}, { each: true })
  dates?: string[];
}

export class CreateScheduleEventDto {
  @ApiPropertyOptional({ description: 'Optional human-readable title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ enum: RecurrenceType, description: 'Recurrence type' })
  @IsEnum(RecurrenceType)
  recurrence_type: RecurrenceType;

  @ApiProperty({ description: 'Start date (YYYY-MM-DD)', example: '2026-07-15' })
  @IsDateString()
  start_date: string;

  @ApiPropertyOptional({ description: 'End date (YYYY-MM-DD)', example: '2026-08-15' })
  @IsOptional()
  @IsDateString()
  end_date?: string;

  @ApiPropertyOptional({ description: 'Recurrence configuration', type: RecurrenceConfigDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => RecurrenceConfigDto)
  recurrence_config?: RecurrenceConfigDto;

  @ApiProperty({ description: 'Shift definition id' })
  @IsUUID()
  shift_definition_id: string;

  @ApiProperty({ enum: ScheduleScope, description: 'Scope: static or mobile' })
  @IsEnum(ScheduleScope)
  scope: ScheduleScope;

  @ApiPropertyOptional({ description: 'Location id (required for static scope)' })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiPropertyOptional({ description: 'Region id (required for mobile scope)' })
  @IsOptional()
  @IsUUID()
  region_id?: string;

  @ApiPropertyOptional({ description: 'Rayon id (required for rayon scope)' })
  @IsOptional()
  @IsUUID()
  rayon_id?: string;

  @ApiProperty({ description: 'Is team event', default: false })
  @IsBoolean()
  is_team: boolean;

  @ApiPropertyOptional({ description: 'User id (required for individual events)' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({
    description: 'Team type id (crew category; required for team events)',
  })
  @IsOptional()
  @IsUUID()
  team_category_id?: string;

  @ApiPropertyOptional({ description: 'PIC user id (required for team events)' })
  @IsOptional()
  @IsUUID()
  pic_user_id?: string;

  @ApiPropertyOptional({
    description: 'Member user ids for team events',
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
