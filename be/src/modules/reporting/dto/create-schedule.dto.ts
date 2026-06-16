import {
  IsString,
  IsUUID,
  IsEnum,
  IsOptional,
  IsObject,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * Create Report Schedule DTO
 *
 * Used by admins to create custom scheduled reports.
 */
export class CreateScheduleDto {
  @ApiProperty({ description: 'Schedule name', maxLength: 100 })
  @IsString()
  @MaxLength(100)
  name: string;

  @ApiProperty({ description: 'Report template ID (UUID)' })
  @IsUUID()
  template_id: string;

  @ApiProperty({
    enum: ['daily', 'weekly', 'monthly'],
    description: 'Schedule frequency',
  })
  @IsEnum(['daily', 'weekly', 'monthly'])
  frequency: 'daily' | 'weekly' | 'monthly';

  @ApiProperty({
    description: 'Cron expression (e.g., "0 6 * * *" for daily at 06:00)',
    pattern: '^(\\d{1,2}\\s){4}\\d{1,2}$|^(\\*|\\d{1,2})(\\/(\\d{1,2}))?(,(\\d{1,2}|\\*))*\\s',
  })
  @IsString()
  @Matches(/^.+$/, { message: 'Cron expression must be valid' })
  cron_expression: string;

  @ApiPropertyOptional({ description: 'Timezone (default: Asia/Jakarta)' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: 'Report parameters' })
  @IsOptional()
  @IsObject()
  parameters?: Record<string, any>;
}
