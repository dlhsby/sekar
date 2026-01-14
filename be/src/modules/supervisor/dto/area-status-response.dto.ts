import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for individual area status
 */
export class AreaStatusDto {
  @ApiProperty({ description: 'Area UUID' })
  id: string;

  @ApiProperty({ description: 'Area name', example: 'Taman Bungkul' })
  name: string;

  @ApiProperty({
    description: 'Number of workers assigned to this area',
    example: 3,
  })
  assigned_workers_count: number;

  @ApiProperty({
    description: 'Number of workers currently working in this area',
    example: 2,
  })
  active_workers_count: number;
}

/**
 * Response DTO for area status endpoint
 */
export class AreaStatusResponseDto {
  @ApiProperty({
    type: [AreaStatusDto],
    description: 'Status of all active areas',
  })
  areas: AreaStatusDto[];
}
