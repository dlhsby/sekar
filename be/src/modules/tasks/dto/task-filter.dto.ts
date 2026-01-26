import { IsOptional, IsUUID, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskStatus, TaskPriority } from '../entities/task.entity';

/**
 * DTO for filtering tasks
 */
export class TaskFilterDto {
  @ApiPropertyOptional({
    description: 'Filter by area ID',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @ApiPropertyOptional({
    description: 'Filter by assigned user ID',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({
    description: 'Filter by creator user ID',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  @IsOptional()
  created_by?: string;

  @ApiPropertyOptional({
    description: 'Filter by task status',
    enum: TaskStatus,
  })
  @IsEnum(TaskStatus)
  @IsOptional()
  status?: TaskStatus;

  @ApiPropertyOptional({
    description: 'Filter by task priority',
    enum: TaskPriority,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Filter by activity type ID',
    example: '33333333-3333-3333-3333-333333333301',
  })
  @IsUUID()
  @IsOptional()
  activity_type_id?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks with deadline before this date',
    example: '2026-01-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  deadline_before?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks with deadline after this date',
    example: '2026-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  deadline_after?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks created after this date',
    example: '2026-01-01T00:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  created_after?: string;

  @ApiPropertyOptional({
    description: 'Filter tasks created before this date',
    example: '2026-01-31T23:59:59Z',
  })
  @IsDateString()
  @IsOptional()
  created_before?: string;
}
