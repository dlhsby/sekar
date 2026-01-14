import { IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for assigning a worker to an area
 */
export class AssignWorkerDto {
  @ApiProperty({
    description: 'Area UUID to assign the worker to',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    type: 'string',
  })
  @IsUUID()
  area_id: string;
}
