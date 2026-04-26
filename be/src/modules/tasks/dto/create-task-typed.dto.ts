import { IsString, IsOptional, IsObject, IsInt, IsPositive } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreateTaskDto } from './create-task.dto';

/**
 * Extended task creation DTO with Phase 3 task-typing fields.
 * Inherits all fields from CreateTaskDto and adds task_type,
 * custom_fields, and target_plant_count.
 */
export class CreateTaskTypedDto extends CreateTaskDto {
  @ApiPropertyOptional({
    description: 'Task type (generic | pruning | planting | cleaning)',
    default: 'generic',
    example: 'pruning',
  })
  @IsOptional()
  @IsString()
  task_type?: string;

  @ApiPropertyOptional({
    description: 'Type-specific custom fields validated against the task type schema',
    example: { area_type: 'road', pruning_action: 'PM', source: 'TIW' },
  })
  @IsOptional()
  @IsObject()
  custom_fields?: Record<string, unknown>;

  @ApiPropertyOptional({
    description: 'Total number of plants/units to be processed in this task',
    example: 50,
  })
  @IsOptional()
  @IsInt()
  @IsPositive()
  target_plant_count?: number;
}
