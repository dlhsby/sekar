import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsUUID, IsOptional, IsBoolean, IsDateString, IsString } from 'class-validator';

export class ReassignWorkerDto {
  @ApiProperty({ example: 'user-uuid', description: 'Worker user ID to reassign' })
  @IsUUID()
  user_id: string;

  @ApiProperty({ example: 'area-uuid', description: 'Target area ID' })
  @IsUUID()
  target_area_id: string;

  @ApiPropertyOptional({
    example: 'shift-def-uuid',
    description: 'Shift definition ID for the new schedule',
  })
  @IsUUID()
  @IsOptional()
  shift_definition_id?: string;

  @ApiPropertyOptional({
    example: '2026-03-07',
    description: 'Effective date for reassignment (defaults to today)',
  })
  @IsDateString()
  @IsOptional()
  effective_date?: string;

  @ApiPropertyOptional({
    example: false,
    description: 'Whether to end current schedule before reassigning',
  })
  @IsBoolean()
  @IsOptional()
  end_current_schedule?: boolean;

  @ApiPropertyOptional({
    example: 'Understaffed at target area',
    description: 'Reason for reassignment',
  })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class ReassignWorkerResponseDto {
  @ApiProperty({ example: 'user-uuid' })
  user_id: string;

  @ApiProperty({ example: 'John Doe' })
  user_name: string;

  @ApiProperty({ example: 'area-uuid' })
  previous_area_id: string | null;

  @ApiProperty({ example: 'Taman Bungkul' })
  previous_area_name: string | null;

  @ApiProperty({ example: 'area-uuid' })
  new_area_id: string;

  @ApiProperty({ example: 'Taman Mundu' })
  new_area_name: string;

  @ApiPropertyOptional({ example: 'schedule-uuid', description: 'New schedule ID if created' })
  new_schedule_id: string | null;

  @ApiProperty({ example: '2026-03-07', description: 'Effective date of reassignment' })
  effective_date: string;

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  reassigned_at: Date;
}
