import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

/** HH:MM or HH:MM:SS, 24-hour. */
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d(:[0-5]\d)?$/;

/**
 * Create a shift definition (ADR-055). The day's shifts are operator-configurable
 * — 3 today, but any number (a single all-day shift, two, five, …). The
 * attribution window (`early_window_min`/`cutoff_grace_min`) is per shift.
 */
export class CreateShiftDefinitionDto {
  @ApiProperty({ description: 'Display name (unique)', example: 'Shift 1', maxLength: 50 })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  name: string;

  @ApiProperty({ description: 'Short code (unique)', example: 'SHIFT1', maxLength: 10 })
  @IsString()
  @MinLength(1)
  @MaxLength(10)
  code: string;

  @ApiProperty({ description: 'Start time (HH:MM[:SS], 24h)', example: '06:00' })
  @Matches(TIME_RE, { message: 'start_time must be HH:MM or HH:MM:SS (24-hour)' })
  start_time: string;

  @ApiProperty({ description: 'End time (HH:MM[:SS], 24h)', example: '15:00' })
  @Matches(TIME_RE, { message: 'end_time must be HH:MM or HH:MM:SS (24-hour)' })
  end_time: string;

  @ApiPropertyOptional({
    description:
      'Whether the shift crosses midnight (e.g. 21:00–05:00). Auto-derived when omitted.',
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  crosses_midnight?: boolean;

  @ApiPropertyOptional({
    description: 'Attribution: minutes before start (default 60)',
    example: 60,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  early_window_min?: number;

  @ApiPropertyOptional({ description: 'Attribution: minutes after end (default 60)', example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(1440)
  cutoff_grace_min?: number;

  @ApiPropertyOptional({ description: 'Whether the shift is active/offered', example: true })
  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
