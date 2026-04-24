import { ApiProperty } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Clock-In DTO
 *
 * Data required for a worker to clock in to their shift.
 * Phase 2C: area_id is optional (auto-detected from schedule if not provided).
 * Includes GPS coordinates and selfie photo.
 */
export class ClockInDto {
  @ApiProperty({
    description:
      'Area UUID where user is clocking in (optional - auto-detected from schedule if not provided)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  area_id?: string;

  @ApiProperty({
    description: 'GPS latitude of user location',
    example: -7.2905,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude of user location',
    example: 112.7398,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng: number;

  @ApiProperty({
    description:
      'Base64 encoded selfie photo (optional). Max size ~7.5MB (10MB base64 encoded)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000_000, { message: 'Photo size must not exceed ~7.5MB (10MB base64 encoded)' })
  @Matches(/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/, {
    message: 'Invalid base64 image format. Must be data:image/(jpeg|jpg|png);base64,<data>',
  })
  selfie_photo?: string;
}
