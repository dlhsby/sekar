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
   * Area ID where the pruning task will be executed.
   *
   * **May 11, 2026:** now optional. Pruning happens in neighborhoods /
   * private yards that are not managed areas, so most kecamatan-driven
   * pruning tasks have no `area_id` — they inherit GPS coords + address
   * from the parent pruning_request instead. The Task entity already has
   * `area_id` nullable; monitoring queries that filter by area simply
   * exclude these rows (covered in the Phase 4 monitoring polish backlog).
   *
   * @example '11111111-1111-1111-1111-111111111101'
   */
  @ApiPropertyOptional({
    description:
      'Optional area ID. Pruning tasks typically have no managed area — leave blank for neighborhood / private-yard work.',
    example: '11111111-1111-1111-1111-111111111101',
  })
  @IsUUID()
  @IsOptional()
  areaId?: string;

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
   * Case type (GT, PT, PS, PD, PK). **May 11, 2026:** optional.
   * Admins no longer classify the case at assignment time — the satgas
   * records the actual case on the activity report once on-site.
   *
   * @example 'GT'
   */
  @ApiPropertyOptional({
    description:
      'Case type. Optional at assignment — the satgas captures this on the activity report.',
    enum: ['GT', 'PT', 'PS', 'PD', 'PK'],
    example: 'GT',
  })
  @IsString()
  @IsOptional()
  @IsIn(['GT', 'PT', 'PS', 'PD', 'PK'], {
    message: 'Case type must be GT, PT, PS, PD, or PK',
  })
  caseType?: 'GT' | 'PT' | 'PS' | 'PD' | 'PK';

  /**
   * Pruning action (PM, PB, PC). **May 11, 2026:** optional.
   * Admins no longer pre-decide the action; the satgas records what was
   * actually done on the activity report.
   *
   * @example 'PM'
   */
  @ApiPropertyOptional({
    description:
      'Pruning action. Optional at assignment — the satgas captures this on the activity report.',
    enum: ['PM', 'PB', 'PC'],
    example: 'PM',
  })
  @IsString()
  @IsOptional()
  @IsIn(['PM', 'PB', 'PC'], {
    message: 'Pruning action must be PM, PB, or PC',
  })
  pruningAction?: 'PM' | 'PB' | 'PC';

  /**
   * Capacity units to consume on `service_capacity`. **May 11, 2026:**
   * almost always omitted by the client. When absent, the service
   * defaults to `1` (one unit per request — capacity is measured in
   * "permohonan slots", not in number of trees). The original 15-tree
   * count etc. lives on the request itself (`request.treeCount`).
   *
   * @example 1
   */
  @ApiPropertyOptional({
    description:
      'Capacity units to book (default 1). Capacity tracks permohonan slots, not tree count — the tree count is on the request.',
    example: 1,
    minimum: 1,
  })
  @IsNumber()
  @IsOptional()
  @IsPositive({ message: 'Units must be a positive number' })
  @Min(1, { message: 'Units must be at least 1' })
  units?: number;
}
