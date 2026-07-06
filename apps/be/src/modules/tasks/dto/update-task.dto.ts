import { IsString, IsOptional, IsUUID, IsEnum, IsDateString, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../entities/task.entity';

/**
 * DTO for updating an existing task
 */
export class UpdateTaskDto {
  @ApiPropertyOptional({
    description: 'Task title',
    example: 'Penyiraman Area Timur - Updated',
    maxLength: 200,
  })
  @IsString()
  @IsOptional()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional({
    description: 'Task description with detailed instructions',
    example: 'Updated instructions for watering',
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  description?: string;

  @ApiPropertyOptional({
    description: 'Task priority level',
    enum: TaskPriority,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Task deadline (ISO 8601 format)',
    example: '2026-01-25T14:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiPropertyOptional({
    description: 'Area ID where the task should be performed',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID()
  @IsOptional()
  area_id?: string;

  @ApiPropertyOptional({
    description: 'Activity type ID for the task',
    example: '33333333-3333-3333-3333-333333333301',
  })
  @IsUUID()
  @IsOptional()
  activity_type_id?: string;
}
