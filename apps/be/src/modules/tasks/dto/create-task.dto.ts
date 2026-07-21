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
import { AssignmentScope } from '../../../common/enums/assignment-scope.enum';

/**
 * DTO for creating a new task
 */
export class CreateTaskDto {
  @ApiProperty({
    description: 'Task title',
    example: 'Penyiraman Location Timur',
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
  @MaxLength(2000)
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

  @ApiPropertyOptional({
    description:
      'Explicit geographic scope for the task (ADR-046). Omit to derive it from ' +
      "the assignee's schedule occurrence on the task date; provide it (with the " +
      'matching id below) to override — e.g. an ad-hoc district-scoped task.',
    enum: AssignmentScope,
  })
  @IsEnum(AssignmentScope)
  @IsOptional()
  scope?: AssignmentScope;

  @ApiPropertyOptional({
    description: 'Location ID where the task should be performed (optional)',
    example: 'c3d4e5f6-a7b8-9012-cdef-123456789012',
  })
  @IsUUID()
  @IsOptional()
  location_id?: string;

  @ApiPropertyOptional({
    description: 'Region (Kawasan) ID for region-scoped tasks (optional)',
    example: 'k1k2k3k4-a5b6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  region_id?: string;

  @ApiPropertyOptional({
    description: 'District ID for district-scoped tasks (optional)',
    example: 'r1r2r3r4-a5b6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  district_id?: string;

  @ApiPropertyOptional({
    description: 'User ID to assign the task to (optional at creation)',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsOptional()
  assigned_to?: string;

  @ApiPropertyOptional({
    description: 'Array of user IDs to tag in this task',
    example: ['u1u1u1u1-a2b3-4567-abcd-ef1234567890', 'u2u2u2u2-a2b3-4567-abcd-ef1234567890'],
    type: [String],
  })
  @IsUUID('all', { each: true })
  @IsOptional()
  tagged_user_ids?: string[];
}
