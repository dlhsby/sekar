import {
  IsArray,
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

/**
 * DTO for a single location point
 */
export class LocationPointDto {
  @ApiProperty({
    description: 'GPS latitude',
    example: -7.2905,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude',
    example: 112.7398,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng: number;

  @ApiProperty({
    description: 'GPS accuracy in meters',
    example: 12.5,
    required: false,
  })
  @IsNumber()
  @Min(0)
  @IsOptional()
  accuracy_meters?: number;

  @ApiProperty({
    description: 'Device battery level (0-100)',
    example: 85,
    minimum: 0,
    maximum: 100,
    required: false,
  })
  @IsInt()
  @Min(0)
  @Max(100)
  @IsOptional()
  battery_level?: number;

  @ApiProperty({
    description: 'Timestamp when location was captured',
    example: '2026-01-09T10:30:00Z',
  })
  @IsDateString()
  logged_at: string;
}

/**
 * DTO for batch uploading location logs
 *
 * Workers send multiple location pings (collected offline or over time)
 * in a single batch request for efficiency.
 */
export class CreateLocationBatchDto {
  @ApiProperty({
    description: 'Shift UUID for which locations are being uploaded',
    example: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
  })
  @IsUUID()
  @IsNotEmpty()
  shift_id: string;

  @ApiProperty({
    description: 'Array of location points (max 100 per batch)',
    type: [LocationPointDto],
    example: [
      {
        gps_lat: -7.2905,
        gps_lng: 112.7398,
        accuracy_meters: 12.5,
        battery_level: 85,
        logged_at: '2026-01-09T10:30:00Z',
      },
    ],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => LocationPointDto)
  locations: LocationPointDto[];
}
