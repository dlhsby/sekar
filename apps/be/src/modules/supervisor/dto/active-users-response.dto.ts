import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for latest location in active user response
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
 * DTO for area info in active user response
 */
export class AreaInfoDto {
  @ApiProperty({ description: 'Area UUID' })
  id: string;

  @ApiProperty({ description: 'Area name', example: 'Taman Bungkul' })
  name: string;
}

/**
 * DTO for shift info in active user response
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
 * DTO for individual active user
 */
export class ActiveUserDto {
  @ApiProperty({ description: 'User UUID' })
  id: string;

  @ApiProperty({ description: 'User username', example: 'satgas1' })
  username: string;

  @ApiProperty({ description: 'User full name', example: 'Satgas One' })
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
 * Response DTO for active users endpoint
 */
export class ActiveUsersResponseDto {
  @ApiProperty({
    type: [ActiveUserDto],
    description: 'List of currently active users',
  })
  users: ActiveUserDto[];
}
