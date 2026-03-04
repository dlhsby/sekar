import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDateString, IsOptional, IsUUID } from 'class-validator';

export class LocationHistoryQueryDto {
  @ApiProperty({ example: '2024-01-24', description: 'Date in YYYY-MM-DD format' })
  @IsDateString()
  date: string;

  @ApiPropertyOptional({ example: 'shift-uuid' })
  @IsUUID()
  @IsOptional()
  shift_id?: string;
}

export class LocationHistoryPointDto {
  @ApiProperty({ example: -7.2575 })
  latitude: number;

  @ApiProperty({ example: 112.7521 })
  longitude: number;

  @ApiProperty({ example: 10 })
  accuracy: number | null;

  @ApiProperty({ example: 85 })
  battery_level: number | null;

  @ApiProperty({ example: '2024-01-24T06:30:00Z' })
  logged_at: Date;

  @ApiProperty({ example: true })
  is_within_area: boolean;
}

export class LocationHistoryResponseDto {
  @ApiProperty({ example: 'user-uuid' })
  user_id: string;

  @ApiProperty({ example: 'John Doe' })
  user_name: string;

  @ApiProperty({ example: 'satgas' })
  role: string;

  @ApiProperty({ example: '2024-01-24' })
  date: string;

  @ApiProperty({ example: 'shift-uuid' })
  shift_id: string | null;

  @ApiProperty({ example: 'Shift 1' })
  shift_name: string | null;

  @ApiProperty({ example: 'area-uuid' })
  area_id: string | null;

  @ApiProperty({ example: 'Taman Bungkul' })
  area_name: string | null;

  @ApiProperty({ example: '2024-01-24T06:00:00Z' })
  clock_in_time: Date | null;

  @ApiProperty({ example: '2024-01-24T14:00:00Z' })
  clock_out_time: Date | null;

  @ApiProperty({ type: [LocationHistoryPointDto] })
  points: LocationHistoryPointDto[];

  @ApiProperty({ example: 120 })
  total_points: number;

  @ApiProperty({ example: 2500.5 })
  total_distance_meters: number;

  @ApiProperty({ example: 420 })
  time_inside_area_minutes: number;

  @ApiProperty({ example: 30 })
  time_outside_area_minutes: number;

  @ApiProperty({ example: '2024-01-24T10:30:00Z' })
  generated_at: Date;
}
