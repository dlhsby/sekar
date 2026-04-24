import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Matches, Max, MaxLength, Min } from 'class-validator';

/**
 * Clock-Out DTO
 *
 * Data required for a worker to clock out from their shift.
 * Only requires GPS coordinates for validation.
 */
export class ClockOutDto {
  @ApiProperty({
    description: 'GPS latitude of user location at clock-out',
    example: -7.2906,
    minimum: -90,
    maximum: 90,
  })
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({
    description: 'GPS longitude of user location at clock-out',
    example: 112.7399,
    minimum: -180,
    maximum: 180,
  })
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng: number;

  @ApiPropertyOptional({ description: 'Optional clock-out selfie (base64)' })
  @IsOptional()
  @IsString()
  @MaxLength(10_000_000)
  @Matches(/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/, {
    message: 'Invalid base64 image format',
  })
  selfie_photo?: string;
}
