import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsUUID,
  IsNotEmpty,
  IsOptional,
  IsArray,
  ArrayMinSize,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

export class EndOvertimeDto {
  @ApiProperty({ description: 'GPS latitude', example: -7.2905 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  gps_lat: number;

  @ApiProperty({ description: 'GPS longitude', example: 112.7398 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  gps_lng: number;

  @ApiPropertyOptional({ description: 'Base64 encoded selfie photo (optional)' })
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

  @ApiProperty({ description: 'Activity type ID' })
  @IsUUID()
  activity_type_id: string;

  @ApiProperty({ description: 'Activity description' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  description: string;

  @ApiProperty({ description: 'Photo URLs (1-3)', type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  photo_urls: string[];
}
