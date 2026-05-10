import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsDateString,
  IsIn,
  IsNumber,
  IsPositive,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for converting a pruning request to a task.
 *
 * Used by admin_data, kepala_rayon, top_management, admin_system, or superadmin
 * to convert an approved pruning request into a task for workers to execute.
 */
export class AssignPruningRequestDto {
  /**
   * Area ID where the pruning task will be assigned.
   *
   * @example '11111111-1111-1111-1111-111111111101'
   */
  @ApiProperty({
    description: 'Area ID where the pruning task will be executed',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Area ID is required' })
  areaId: string;

  /**
   * User ID of the worker assigned to this pruning task.
   *
   * @example '33333333-3333-3333-3333-333333333301'
   */
  @ApiProperty({
    description: 'User ID of the assigned worker (satgas)',
    example: '33333333-3333-3333-3333-333333333301',
  })
  @IsUUID()
  @IsNotEmpty({ message: 'Assigned worker ID is required' })
  assignedTo: string;

  /**
   * Scheduled date for the pruning work (ISO date, today or future).
   *
   * **May 2026 (ADR-035 amendment):** optional. When omitted, the service
   * scans Mon→Sun of the request's preferred ISO week and books the first
   * day where capacity allows; the picked day is written back as the task
   * deadline and `expected_date`. If supplied, the date must fall inside
   * `(request.expectedYear, request.expectedIsoWeek)` when those are set.
   *
   * @example '2026-04-28'
   */
  @ApiPropertyOptional({
    description:
      'Scheduled date for pruning work (ISO 8601). Optional — when omitted, server picks the first available day of the requested ISO week.',
    example: '2026-04-28',
  })
  @IsDateString()
  @IsOptional()
  scheduledDate?: string;

  /**
   * Case type (GT, PT, PS, PD, PK).
   *
   * @example 'GT'
   */
  @ApiProperty({
    description: 'Case type',
    enum: ['GT', 'PT', 'PS', 'PD', 'PK'],
    example: 'GT',
  })
  @IsString()
  @IsNotEmpty({ message: 'Case type is required' })
  @IsIn(['GT', 'PT', 'PS', 'PD', 'PK'], {
    message: 'Case type must be GT, PT, PS, PD, or PK',
  })
  caseType: 'GT' | 'PT' | 'PS' | 'PD' | 'PK';

  /**
   * Pruning action (PM, PB, PC).
   *
   * @example 'PM'
   */
  @ApiProperty({
    description: 'Pruning action',
    enum: ['PM', 'PB', 'PC'],
    example: 'PM',
  })
  @IsString()
  @IsNotEmpty({ message: 'Pruning action is required' })
  @IsIn(['PM', 'PB', 'PC'], {
    message: 'Pruning action must be PM, PB, or PC',
  })
  pruningAction: 'PM' | 'PB' | 'PC';

  /**
   * Number of plants/units to be pruned (default 1).
   *
   * @example 15
   */
  @ApiPropertyOptional({
    description: 'Number of plants/units to be pruned',
    example: 15,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive({ message: 'Units must be a positive number' })
  @Min(1, { message: 'Units must be at least 1' })
  units?: number;
}
