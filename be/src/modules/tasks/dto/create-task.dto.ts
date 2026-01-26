import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsUUID,
  IsEnum,
  IsDateString,
  MaxLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TaskPriority } from '../entities/task.entity';

/**
 * DTO for creating a new task
 */
export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Penyiraman Area Timur',
    maxLength: 200,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title: string;

  @ApiPropertyOptional({
    description: 'Task description with detailed instructions',
    example: 'Siram semua tanaman di area timur taman, fokus pada tanaman yang baru ditanam',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Task priority level',
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  @IsEnum(TaskPriority)
  @IsOptional()
  priority?: TaskPriority;

  @ApiPropertyOptional({
    description: 'Task deadline (ISO 8601 format)',
    example: '2026-01-25T10:00:00Z',
  })
  @IsDateString()
  @IsOptional()
  deadline?: string;

  @ApiProperty({
    description: 'Area ID where the task should be performed',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID()
  @IsNotEmpty()
  area_id: string;

  @ApiPropertyOptional({
    description: 'Activity type ID for the task',
    example: '33333333-3333-3333-3333-333333333301',
  })
  @IsUUID()
  @IsOptional()
  activity_type_id?: string;

  @ApiPropertyOptional({
    description: 'User ID to assign the task to (optional at creation)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;
}
