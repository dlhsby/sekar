import { IsString, IsOptional, IsEnum, IsBoolean, IsObject, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Update Report Schedule DTO
 *
 * Used by admins to modify existing scheduled reports.
 */
export class UpdateScheduleDto {
  @ApiPropertyOptional({ description: 'Schedule name', maxLength: 100 })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  name?: string;

  @ApiPropertyOptional({ enum: ['daily', 'weekly', 'monthly'] })
  @IsOptional()
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency?: 'daily' | 'weekly' | 'monthly';

  @ApiPropertyOptional({ description: 'Cron expression' })
  @IsOptional()
  @IsString()
  cron_expression?: string;

  @ApiPropertyOptional({ description: 'Timezone' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Enable/disable the schedule' })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @ApiPropertyOptional({ description: 'Report parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
