import { IsUUID, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for assigning a task to a worker
 */
export class AssignTaskDto {
  @ApiProperty({
    description: 'User ID to assign the task to',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  assigned_to: string;
}
