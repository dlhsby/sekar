import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for latest location in active worker response
 */
export class LatestLocationDto {
  @ApiProperty({ description: 'GPS latitude', example: -7.2905 })
  gps_lat: number;

  @ApiProperty({ description: 'GPS longitude', example: 112.7398 })
  gps_lng: number;

  @ApiProperty({ description: 'Timestamp when location was logged' })
  logged_at: Date;
}

/**
 * DTO for area info in active worker response
 */
export class AreaInfoDto {
  @ApiProperty({ description: 'Area UUID' })
  id: string;

  @ApiProperty({ description: 'Area name', example: 'Taman Bungkul' })
  name: string;
}

/**
 * DTO for shift info in active worker response
 */
export class ShiftInfoDto {
  @ApiProperty({ description: 'Shift UUID' })
  id: string;

  @ApiProperty({ description: 'Clock-in timestamp' })
  clock_in_time: Date;

  @ApiProperty({ type: AreaInfoDto, description: 'Assigned area', nullable: true })
  area: AreaInfoDto | null;
}

/**
 * DTO for individual active worker
 */
export class ActiveWorkerDto {
  @ApiProperty({ description: 'Worker UUID' })
  id: string;

  @ApiProperty({ description: 'Worker username', example: 'worker1' })
  username: string;

  @ApiProperty({ description: 'Worker full name', example: 'Worker One' })
  full_name: string;

  @ApiProperty({ type: ShiftInfoDto, description: 'Current active shift' })
  shift: ShiftInfoDto;

  @ApiProperty({
    type: LatestLocationDto,
    description: 'Latest GPS location',
    nullable: true,
  })
  latest_location: LatestLocationDto | null;
}

/**
 * Response DTO for active workers endpoint
 */
export class ActiveWorkersResponseDto {
  @ApiProperty({
    type: [ActiveWorkerDto],
    description: 'List of currently active workers',
  })
  workers: ActiveWorkerDto[];
}
