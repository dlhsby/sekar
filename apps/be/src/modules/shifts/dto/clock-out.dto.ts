import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  IsISO8601,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

/**
 * Clock-Out DTO
 *
 * Data required for a worker to clock out from their shift.
 * Only requires GPS coordinates for validation.
 */
export class ClockOutDto {
  @ApiPropertyOptional({
    description:
      'Client-generated UUID for the punch (idempotency key, ADR-055). ' +
      'Server generates one if omitted.',
  })
  @IsOptional()
  @IsUUID()
  client_uuid?: string;

  @ApiPropertyOptional({
    description:
      'When the punch actually happened (ISO 8601). Set by an OFFLINE client so a ' +
      'later sync records the capture time, not the sync time. Clamped to ≤ now.',
  })
  @IsOptional()
  @IsISO8601()
  punched_at?: string;

  @ApiPropertyOptional({ description: 'GPS accuracy in metres, if the device reports it' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  accuracy_m?: number;

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
