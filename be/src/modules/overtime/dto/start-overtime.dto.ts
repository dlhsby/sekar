import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsNumber,
  IsString,
  IsOptional,
  Min,
  Max,
  MaxLength,
  Matches,
} from 'class-validator';

export class StartOvertimeDto {
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
  @Matches(/^data:image\/(jpeg|jpg|png);base64,[A-Za-z0-9+/=]+$/, {
    message: 'Invalid base64 image format',
  })
  selfie_photo?: string;

  @ApiPropertyOptional({ description: 'Reason for overtime', example: 'Additional cleanup needed' })
  @IsOptional()
  @IsString()
  reason?: string;
}
