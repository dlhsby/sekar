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
  IsNotEmpty,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { RecurrenceType } from '../enums/recurrence-type.enum';
import { ScheduleScope } from '../enums/schedule-scope.enum';
import { RecurrenceConfig } from '../entities/schedule-event.entity';

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

  @ApiPropertyOptional({ description: 'Recurrence configuration' })
  @IsOptional()
  @ValidateNested()
  @Type(() => Object)
  recurrence_config?: RecurrenceConfig;

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

  @ApiProperty({ description: 'Is team event', default: false })
  @IsBoolean()
  is_team: boolean;

  @ApiPropertyOptional({ description: 'User id (required for individual events)' })
  @IsOptional()
  @IsUUID()
  user_id?: string;

  @ApiPropertyOptional({ description: 'Team id (required for team events)' })
  @IsOptional()
  @IsUUID()
  team_id?: string;

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
  @IsUUID('4', { each: true })
  member_ids?: string[];

  @ApiPropertyOptional({ description: 'Notes / reason' })
  @IsOptional()
  @IsString()
  notes?: string;
}
