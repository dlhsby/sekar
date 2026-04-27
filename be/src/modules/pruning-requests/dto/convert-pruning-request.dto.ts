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
export class ConvertPruningRequestDto {
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
   * @example '2026-04-28'
   */
  @ApiProperty({
    description: 'Scheduled date for pruning work (ISO 8601)',
    example: '2026-04-28',
  })
  @IsDateString()
  @IsNotEmpty({ message: 'Scheduled date is required' })
  scheduledDate: string;

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
