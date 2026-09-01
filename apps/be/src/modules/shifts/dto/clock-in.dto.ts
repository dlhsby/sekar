import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsString,
  IsUUID,
  IsOptional,
  IsISO8601,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

/**
 * Clock-In DTO
 *
 * Data required for a worker to clock in to their shift.
 * Phase 2C: location_id is optional (auto-detected from schedule if not provided).
 * Includes GPS coordinates and selfie photo.
 */
export class ClockInDto {
  @ApiProperty({
    description:
      'Location UUID where user is clocking in (optional - auto-detected from schedule if not provided)',
    example: 'b2c3d4e5-f6a7-8901-bcde-f12345678901',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  location_id?: string;

  @ApiProperty({
    description:
      'Client-generated UUID for the punch (idempotency key, ADR-055). ' +
      'A retried offline punch with the same id is a no-op. Server generates one if omitted.',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  client_uuid?: string;

  @ApiProperty({
    description:
      'Client report of the OS mock-provider flag. Advisory input, never proof: ' +
      'a patched client can always send false, so the server also applies checks ' +
      'that do not depend on this value.',
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  is_mocked?: boolean;

  @ApiProperty({ description: 'GPS accuracy in metres, if the device reports it', required: false })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy_m?: number;

  @ApiProperty({
    description:
      'Explicit shift chosen from the picker (ADR-055). When set, overrides the ' +
      'automatic attribution — used near midnight / for a dangling shift. Omit to auto-resolve.',
    required: false,
  })
  @IsOptional()
  @IsUUID()
  shift_definition_id?: string;

  @ApiProperty({
    description:
      'WIB service-day (YYYY-MM-DD) the chosen shift belongs to; pairs with shift_definition_id.',
    required: false,
  })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'service_day must be YYYY-MM-DD' })
  service_day?: string;

  @ApiProperty({
    description:
      'When the punch actually happened (ISO 8601). Set by an OFFLINE client so a ' +
      'later sync records the capture time, not the sync time. Clamped to ≤ now server-side.',
    required: false,
  })
  @IsOptional()
  @IsISO8601()
  punched_at?: string;

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
    description: 'Base64 encoded selfie photo (optional). Max size ~7.5MB (10MB base64 encoded)',
    example: 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD...',
    required: false,
  })
  @IsOptional()
  @IsString()
  @MaxLength(10_000_000, { message: 'Photo size must not exceed ~7.5MB (10MB base64 encoded)' })
  // Accepts a data URI (what the apps send today) OR an already-stored photo
  // URL/key. The backend uploads inline payloads to object storage before
  // persisting, so a client that starts uploading separately does not need a
  // matching API change — it can just send the URL.
  @Matches(
    /^(data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+|https?:\/\/\S+|[\w.\-/]+\.(jpe?g|png|webp))$/,
    {
      message:
        'Selfie must be a data:image/(jpeg|jpg|png);base64 payload or a stored photo URL/key',
    },
  )
  selfie_photo?: string;
}
