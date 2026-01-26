import { IsString, IsNotEmpty, MaxLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for declining a task with reason
 */
export class DeclineTaskDto {
  @ApiProperty({
    description: 'Reason for declining the task',
    example: 'Peralatan tidak tersedia untuk tugas ini',
    maxLength: 500,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  reason: string;
}
