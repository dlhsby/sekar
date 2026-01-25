import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, IsString, IsUUID, Min, Max, MaxLength, Matches } from 'class-validator';

/**
 * Clock-In DTO
 *
 * Data required for a worker to clock in to their shift.
 * Includes area ID, GPS coordinates for validation, and selfie photo.
 */
export class ClockInDto {
  @ApiProperty({
    description: 'Area UUID where worker is clocking in',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
  })
  @IsUUID()
  area_id: string;

  @ApiProperty({
    description: 'GPS latitude of worker location',
    example: -7.2905,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude of worker location',
    example: 112.7398,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng: number;

  @ApiProperty({
    description: 'Base64 encoded selfie photo (data:image/jpeg;base64,...). Max size ~7.5MB (10MB base64 encoded)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
  })
  @IsString()
  @MaxLength(10_000_000, { message: 'Photo size must not exceed ~7.5MB (10MB base64 encoded)' })
  @Matches(/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/, {
    message: 'Invalid base64 image format. Must be data:image/(jpeg|jpg|png);base64,<data>',
  })
  selfie_photo: string;
}
